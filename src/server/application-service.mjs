const APPLICATION_FORM_VERSION = "enlistment-v2";
const RECRUITING_SOURCES = ["Reddit", "Steam", "Discord"];
const MILITARY_BRANCHES = ["Army", "Navy", "AirForce", "Marines", "CoastGuard"];
const ACTIVE_APPLICATION_STATUSES = [
  "Draft",
  "Submitted",
  "MoreInfoRequested",
  "RecruiterScreening",
  "RecruiterRecommended",
  "TargetUnitReview",
  "Accepted",
];
const EDITABLE_APPLICATION_STATUSES = ["Draft", "MoreInfoRequested"];
const REVIEW_QUEUE_RECRUITER_STATUSES = [
  "Submitted",
  "RecruiterScreening",
  "RecruiterRecommended",
  "TargetUnitReview",
];
const REVIEW_QUEUE_TARGET_STATUSES = ["RecruiterRecommended", "TargetUnitReview"];

function hasPermission(account, permissionKey) {
  return (account.roleAssignments ?? []).some(
    (assignment) =>
      isActiveRoleAssignment(assignment) &&
      (assignment.role?.permissions ?? []).some(
        (grant) => grant.permission?.status === "Active" && grant.permission?.key === permissionKey,
      ),
  );
}

function isHtmlRequest(req) {
  const contentType = req.headers["content-type"] ?? "";
  const accepts = req.headers.accept ?? "";
  return contentType.includes("application/x-www-form-urlencoded") || accepts.includes("text/html");
}

function normalizeText(value) {
  if (typeof value === "string") return value.trim();
  if (typeof value === "number") return String(value);
  return "";
}

export function canCreateOwnApplication(account) {
  return account.status === "Pending" && hasPermission(account, "applications.create-self");
}

export function canViewOwnApplication(account) {
  return hasPermission(account, "applications.view-self");
}

export function canRecruiterReview(account) {
  return hasPermission(account, "applications.review-recruiter");
}

export function canTargetUnitReview(account) {
  return hasPermission(account, "applications.review-target-unit");
}

export function canReviewApplicationRecord(account, application) {
  if (canRecruiterReview(account) && application.status !== "Draft") return true;
  if (!canTargetUnitReview(account) || !application.targetUnitId) return false;
  return isUnitInActorScope(account, application.targetUnitId) || hasGlobalReviewOverride(account);
}

export async function getApplicationUnits(prisma) {
  const options = await getRecruitingOptions(prisma);
  return options.units;
}

export async function getRecruitingOptions(prisma, selectedUnitIds = []) {
  const normalizedUnitIds = [...new Set(coerceArray(selectedUnitIds).filter(Boolean))];
  const units = await prisma.unit.findMany({
    where: { status: "Active", recruitingOpen: true, hierarchyBase: 7000 },
    orderBy: { name: "asc" },
    select: { id: true, key: true, name: true, type: true, hierarchyBase: true },
  });
  const mosWhere = {
    status: "Active",
    recruitingOpen: true,
    ...(normalizedUnitIds.length ? { unitId: { in: normalizedUnitIds } } : {}),
  };
  const mos = await prisma.mOS.findMany({
    where: mosWhere,
    orderBy: [{ identifier: "asc" }, { name: "asc" }],
    select: {
      id: true,
      key: true,
      identifier: true,
      name: true,
      unitId: true,
      unit: { select: { id: true, key: true, name: true } },
    },
  });

  return {
    sources: RECRUITING_SOURCES,
    branches: MILITARY_BRANCHES,
    units,
    mos,
  };
}

export async function getOwnApplication(prisma, accountId) {
  return prisma.application.findFirst({
    where: { accountId },
    orderBy: [{ createdAt: "desc" }],
    include: applicationInclude(),
  });
}

export async function getApplicationById(prisma, applicationId) {
  return prisma.application.findUnique({
    where: { id: applicationId },
    include: applicationInclude(),
  });
}

export async function listReviewQueue(prisma, account) {
  const recruiter = canRecruiterReview(account);
  const targetUnitReviewer = canTargetUnitReview(account);
  if (!recruiter && !targetUnitReviewer) return [];

  const scopedUnitIds = recruiter ? [] : activeUnitScopeIds(account);
  const where =
    recruiter && targetUnitReviewer
      ? {
          OR: [
            { status: { in: REVIEW_QUEUE_RECRUITER_STATUSES } },
            { status: { in: REVIEW_QUEUE_TARGET_STATUSES }, targetUnitId: { not: null } },
          ],
        }
      : recruiter
        ? { status: { in: REVIEW_QUEUE_RECRUITER_STATUSES } }
        : {
            status: { in: REVIEW_QUEUE_TARGET_STATUSES },
            targetUnitId: { in: scopedUnitIds.length ? scopedUnitIds : [""] },
          };

  return prisma.application.findMany({
    where,
    orderBy: [{ submittedAt: "asc" }, { createdAt: "asc" }],
    include: applicationInclude(),
  });
}

export async function createOrResumeDraftApplication({ prisma, account }) {
  const eligibility = await validateApplicantEligibility(prisma, account);
  if (!eligibility.ok) return eligibility;

  const activeExisting = await findActiveOwnApplication(prisma, account.id);
  if (activeExisting) {
    return { ok: true, created: false, application: activeExisting };
  }

  const application = await prisma.$transaction(async (tx) => {
    const created = await tx.application.create({
      data: {
        accountId: account.id,
        status: "Draft",
        formVersion: APPLICATION_FORM_VERSION,
        statusHistory: {
          create: {
            oldStatus: null,
            newStatus: "Draft",
            stage: "RecruiterScreening",
            changedByAccountId: account.id,
            reason: "Pending user started an enlistment application draft.",
            permissionContext: {
              actorAccountId: account.id,
              actorStatus: account.status,
            },
          },
        },
      },
      include: applicationInclude(),
    });

    await tx.auditLog.create({
      data: {
        actorAccountId: account.id,
        targetAccountId: account.id,
        module: "applications",
        action: "draft-self",
        recordType: "Application",
        recordId: created.id,
        newValue: { status: "Draft" },
        reason: "Pending user started their own enlistment application draft.",
      },
    });

    return created;
  });

  return { ok: true, created: true, application };
}

export async function updateOwnApplication({ prisma, account, body }) {
  const eligibility = await validateApplicantEligibility(prisma, account);
  if (!eligibility.ok) return eligibility;

  const draft = await createOrResumeDraftApplication({ prisma, account });
  if (!draft.ok) return draft;

  const application = draft.application;
  if (!EDITABLE_APPLICATION_STATUSES.includes(application.status)) {
    return failure("invalid_transition", "This application is not editable right now.");
  }

  const data = normalizeApplicationData(body);
  const validation = await validateApplicationData(prisma, data, { requireComplete: false });
  if (!validation.ok) return validation;

  const updated = await prisma.$transaction(async (tx) => {
    await persistApplicationData(tx, application.id, data);
    return tx.application.findUniqueOrThrow({
      where: { id: application.id },
      include: applicationInclude(),
    });
  });

  return { ok: true, application: updated };
}

export async function submitOwnApplication({ prisma, account, body }) {
  const eligibility = await validateApplicantEligibility(prisma, account);
  if (!eligibility.ok) return eligibility;

  const draft = await createOrResumeDraftApplication({ prisma, account });
  if (!draft.ok) return draft;

  const application = draft.application;
  if (!EDITABLE_APPLICATION_STATUSES.includes(application.status)) {
    return failure(
      "invalid_transition",
      "This application cannot be submitted from its current state.",
    );
  }

  const data = normalizeApplicationData(body);
  const validation = await validateApplicationData(prisma, data, { requireComplete: true });
  if (!validation.ok) return validation;

  const now = new Date();
  const result = await prisma.$transaction(async (tx) => {
    await persistApplicationData(tx, application.id, data);
    const updated = await tx.application.update({
      where: { id: application.id },
      data: {
        status: "Submitted",
        submittedAt: now,
      },
      include: applicationInclude(),
    });

    await tx.applicationStatusHistory.create({
      data: {
        applicationId: application.id,
        oldStatus: application.status,
        newStatus: "Submitted",
        stage: "RecruiterScreening",
        changedByAccountId: account.id,
        reason:
          application.status === "MoreInfoRequested"
            ? "Applicant resubmitted requested enlistment application information."
            : "Pending user submitted enlistment application.",
        permissionContext: {
          actorAccountId: account.id,
          actorStatus: account.status,
        },
      },
    });

    await tx.auditLog.create({
      data: {
        actorAccountId: account.id,
        targetAccountId: account.id,
        module: "applications",
        action: application.status === "MoreInfoRequested" ? "resubmit-self" : "submit-self",
        recordType: "Application",
        recordId: application.id,
        oldValue: { status: application.status },
        newValue: {
          status: "Submitted",
          interestedUnitIds: data.interestedUnitIds,
          desiredMOSIds: data.desiredMOSIds,
        },
        reason: "Pending user submitted their own enlistment application.",
      },
    });

    await tx.notification.create({
      data: {
        accountId: account.id,
        category: "applications",
        workflowEvent:
          application.status === "MoreInfoRequested"
            ? "application-resubmitted"
            : "application-submitted",
        title: "Application submitted",
        body: "Your enlistment application was submitted and is awaiting recruiter screening.",
        relatedRecordType: "Application",
        relatedRecordId: application.id,
      },
    });

    return updated;
  });

  return { ok: true, application: result };
}

export async function withdrawOwnApplication({ prisma, account, reason }) {
  if (!canViewOwnApplication(account)) {
    return failure("permission_denied", "Your account cannot withdraw an application.");
  }

  const application = await findActiveOwnApplication(prisma, account.id);
  if (!application) {
    return failure("not_found", "No active application was found.");
  }

  if (["Accepted", "Converted", "Denied", "Withdrawn", "Closed"].includes(application.status)) {
    return failure("invalid_transition", "This application can no longer be withdrawn.");
  }

  const now = new Date();
  const result = await prisma.$transaction(async (tx) => {
    const updated = await tx.application.update({
      where: { id: application.id },
      data: {
        status: "Withdrawn",
        closedAt: now,
      },
      include: applicationInclude(),
    });

    await tx.applicationStatusHistory.create({
      data: {
        applicationId: application.id,
        oldStatus: application.status,
        newStatus: "Withdrawn",
        stage: "FinalDecision",
        changedByAccountId: account.id,
        reason: reason || "Applicant withdrew their enlistment application.",
        permissionContext: { actorAccountId: account.id, action: "withdraw-self" },
      },
    });

    await tx.auditLog.create({
      data: {
        actorAccountId: account.id,
        targetAccountId: account.id,
        module: "applications",
        action: "withdraw-self",
        recordType: "Application",
        recordId: application.id,
        oldValue: { status: application.status },
        newValue: { status: "Withdrawn" },
        reason: reason || "Applicant withdrew their enlistment application.",
      },
    });

    return updated;
  });

  return { ok: true, application: result };
}

export async function requestApplicationInfo({ prisma, actor, applicationId, reason, noteBody }) {
  if (!canRecruiterReview(actor)) {
    return failure("permission_denied", "Recruiter review permission is required.");
  }

  const application = await prisma.application.findUnique({
    where: { id: applicationId },
    include: applicationInclude(),
  });
  if (!application) {
    return failure("not_found", "Application was not found.");
  }

  if (!REVIEW_QUEUE_RECRUITER_STATUSES.includes(application.status)) {
    return failure("invalid_transition", "More information cannot be requested from this status.");
  }

  const result = await prisma.$transaction(async (tx) => {
    const updated = await tx.application.update({
      where: { id: applicationId },
      data: { status: "MoreInfoRequested" },
      include: applicationInclude(),
    });

    await tx.applicationStatusHistory.create({
      data: {
        applicationId,
        oldStatus: application.status,
        newStatus: "MoreInfoRequested",
        stage: "RecruiterScreening",
        changedByAccountId: actor.id,
        reason,
        permissionContext: { actorAccountId: actor.id, action: "request-info" },
      },
    });

    await tx.applicationReviewNote.create({
      data: {
        applicationId,
        authorAccountId: actor.id,
        stage: "RecruiterScreening",
        body: noteBody || reason,
        visibility: "Applicant",
      },
    });

    await tx.auditLog.create({
      data: {
        actorAccountId: actor.id,
        targetAccountId: application.accountId,
        module: "applications",
        action: "request-info",
        recordType: "Application",
        recordId: applicationId,
        oldValue: { status: application.status },
        newValue: { status: "MoreInfoRequested" },
        reason,
      },
    });

    await tx.notification.create({
      data: {
        accountId: application.accountId,
        category: "applications",
        workflowEvent: "application-more-info-requested",
        title: "Application update requested",
        body: "Recruiting staff requested more information on your enlistment application.",
        relatedRecordType: "Application",
        relatedRecordId: applicationId,
      },
    });

    return updated;
  });

  return { ok: true, application: result };
}

export async function createOrResumeOwnApplication({ prisma, account, body }) {
  const normalized = normalizeLegacyApplicationBody(body);
  if (!normalized.desiredMOSIds.length && normalized.interestedUnitIds.length) {
    const fallbackMOS = await prisma.mOS.findFirst({
      where: {
        unitId: { in: normalized.interestedUnitIds },
        status: "Active",
        recruitingOpen: true,
      },
      orderBy: [{ identifier: "asc" }, { name: "asc" }],
      select: { id: true },
    });
    if (fallbackMOS) {
      normalized.desiredMOSIds = [fallbackMOS.id];
    }
  }

  return submitOwnApplication({ prisma, account, body: normalized });
}

export async function recommendApplication({ prisma, actor, applicationId, reason, noteBody }) {
  if (!canRecruiterReview(actor)) {
    return failure("permission_denied", "Recruiter review permission is required.");
  }

  const application = await prisma.application.findUnique({
    where: { id: applicationId },
    include: applicationInclude(),
  });

  if (!application) {
    return failure("not_found", "Application was not found.");
  }

  if (!["Submitted", "RecruiterScreening"].includes(application.status)) {
    return failure("invalid_transition", "Application is not in recruiter screening.");
  }

  const result = await prisma.$transaction(async (tx) => {
    const updated = await tx.application.update({
      where: { id: applicationId },
      data: {
        status: "RecruiterRecommended",
        recruiterRecommendedByAccountId: actor.id,
        recruiterRecommendedAt: new Date(),
      },
      include: applicationInclude(),
    });

    await tx.applicationStatusHistory.create({
      data: {
        applicationId,
        oldStatus: application.status,
        newStatus: "RecruiterRecommended",
        stage: "RecruiterScreening",
        changedByAccountId: actor.id,
        reason,
        permissionContext: {
          actorAccountId: actor.id,
          action: "recommend",
        },
      },
    });

    if (noteBody) {
      await tx.applicationReviewNote.create({
        data: {
          applicationId,
          authorAccountId: actor.id,
          stage: "RecruiterScreening",
          body: noteBody,
          visibility: "Staff",
        },
      });
    }

    await tx.auditLog.create({
      data: {
        actorAccountId: actor.id,
        targetAccountId: application.accountId,
        module: "applications",
        action: "recommend",
        recordType: "Application",
        recordId: applicationId,
        oldValue: { status: application.status },
        newValue: { status: "RecruiterRecommended" },
        reason,
      },
    });

    await tx.notification.create({
      data: {
        accountId: application.accountId,
        category: "applications",
        workflowEvent: "recruiter-recommended",
        title: "Application advanced",
        body: "Your application passed recruiter screening and is ready for target-unit assignment.",
        relatedRecordType: "Application",
        relatedRecordId: applicationId,
      },
    });

    return updated;
  });

  return { ok: true, application: result };
}

export async function assignApplicationUnit({
  prisma,
  actor,
  applicationId,
  targetUnitId,
  reason,
}) {
  if (!canRecruiterReview(actor) && !canTargetUnitReview(actor)) {
    return failure("permission_denied", "Application reassignment requires reviewer permission.");
  }

  const application = await prisma.application.findUnique({
    where: { id: applicationId },
    include: applicationInclude(),
  });
  if (!application) {
    return failure("not_found", "Application was not found.");
  }

  if (
    !["Submitted", "RecruiterScreening", "RecruiterRecommended", "TargetUnitReview"].includes(
      application.status,
    )
  ) {
    return failure("invalid_transition", "Application can no longer be assigned.");
  }

  const unit = await prisma.unit.findFirst({
    where: { id: targetUnitId, status: "Active", recruitingOpen: true },
    select: { id: true },
  });
  if (!unit) {
    return failure("validation_error", "Selected target unit is invalid.");
  }

  if (
    canTargetUnitReview(actor) &&
    !canRecruiterReview(actor) &&
    !isUnitInActorScope(actor, targetUnitId)
  ) {
    return failure("permission_denied", "Target-unit scope does not include the requested unit.");
  }

  const result = await prisma.$transaction(async (tx) => {
    const updated = await tx.application.update({
      where: { id: applicationId },
      data: {
        targetUnitId,
        status: "TargetUnitReview",
      },
      include: applicationInclude(),
    });

    await tx.applicationStatusHistory.create({
      data: {
        applicationId,
        oldStatus: application.status,
        newStatus: "TargetUnitReview",
        stage: "TargetUnitReview",
        changedByAccountId: actor.id,
        reason,
        permissionContext: {
          actorAccountId: actor.id,
          action: "assign-unit",
          targetUnitId,
        },
      },
    });

    await tx.auditLog.create({
      data: {
        actorAccountId: actor.id,
        targetAccountId: application.accountId,
        module: "applications",
        action: "assign-unit",
        recordType: "Application",
        recordId: applicationId,
        oldValue: { targetUnitId: application.targetUnitId, status: application.status },
        newValue: { targetUnitId, status: "TargetUnitReview" },
        reason,
      },
    });

    await tx.notification.create({
      data: {
        accountId: application.accountId,
        category: "applications",
        workflowEvent: "application-target-unit-updated",
        title: "Application target assigned",
        body: "Your application was assigned to a target unit for review.",
        relatedRecordType: "Application",
        relatedRecordId: applicationId,
      },
    });

    return updated;
  });

  return { ok: true, application: result };
}

export async function acceptApplication({ prisma, actor, applicationId, reason, noteBody }) {
  if (!canTargetUnitReview(actor)) {
    return failure("permission_denied", "Target-unit review permission is required.");
  }

  const application = await prisma.application.findUnique({
    where: { id: applicationId },
    include: applicationInclude(),
  });
  if (!application) {
    return failure("not_found", "Application was not found.");
  }

  if (!application.targetUnitId) {
    return failure("invalid_transition", "Application must have an assigned target unit.");
  }

  if (!["RecruiterRecommended", "TargetUnitReview"].includes(application.status)) {
    return failure("invalid_transition", "Application is not ready for acceptance.");
  }

  if (!isUnitInActorScope(actor, application.targetUnitId) && !hasGlobalReviewOverride(actor)) {
    return failure(
      "permission_denied",
      "Reviewer does not have target-unit authority for this application.",
    );
  }

  if (application.account.status !== "Pending") {
    return failure("invalid_transition", "Only pending accounts can be accepted.");
  }

  if (application.account.personnelProfile) {
    return failure("invalid_transition", "This account already has a personnel profile.");
  }

  const memberRole = await prisma.role.findUnique({ where: { key: "member" } });
  if (!memberRole || memberRole.status !== "Active") {
    return failure("configuration_error", "Member role is missing from the seeded catalog.");
  }

  const preferredName = buildAcceptedProfileName(application);
  const now = new Date();
  const result = await prisma.$transaction(async (tx) => {
    const accepted = await tx.application.update({
      where: { id: applicationId },
      data: {
        status: "Accepted",
        unitDecisionByAccountId: actor.id,
        unitDecisionAt: now,
        decidedAt: now,
      },
    });

    await tx.applicationStatusHistory.create({
      data: {
        applicationId,
        oldStatus: application.status,
        newStatus: "Accepted",
        stage: "FinalDecision",
        changedByAccountId: actor.id,
        reason,
        permissionContext: {
          actorAccountId: actor.id,
          action: "accept",
          targetUnitId: application.targetUnitId,
        },
      },
    });

    const profile = await tx.personnelProfile.create({
      data: {
        accountId: application.accountId,
        name: preferredName,
        status: "Recruit",
        currentUnitId: application.targetUnitId,
        goodStanding: true,
        militaryService: application.priorService,
        source: application.source,
        joinedAt: now,
        acceptedAt: now,
        createdByAccountId: actor.id,
      },
    });

    await tx.personnelStatusHistory.create({
      data: {
        personnelProfileId: profile.id,
        oldStatus: null,
        newStatus: "Recruit",
        changedByAccountId: actor.id,
        reason: "Created personnel profile from accepted application.",
      },
    });

    await tx.personnelUnitAssignment.create({
      data: {
        personnelProfileId: profile.id,
        unitId: application.targetUnitId,
        assignmentType: "Primary",
        changedByAccountId: actor.id,
        reason: "Initial unit assignment from accepted application.",
      },
    });

    await tx.account.update({
      where: { id: application.accountId },
      data: {
        status: "Active",
        activatedAt: now,
        statusReason: "Activated through accepted application.",
      },
    });

    await tx.roleAssignment.updateMany({
      where: {
        accountId: application.accountId,
        endsAt: null,
        role: { key: "pending-user" },
      },
      data: {
        endsAt: now,
        reason: "Pending-user role ended after application acceptance.",
      },
    });

    const existingMemberRole = await tx.roleAssignment.findFirst({
      where: {
        accountId: application.accountId,
        roleId: memberRole.id,
        endsAt: null,
      },
    });
    if (!existingMemberRole) {
      await tx.roleAssignment.create({
        data: {
          accountId: application.accountId,
          roleId: memberRole.id,
          scopeType: "Global",
          scopeIncludesDescendants: true,
          grantedByAccountId: actor.id,
          reason: "Initial member role assignment after application acceptance.",
        },
      });
    }

    if (noteBody) {
      await tx.applicationReviewNote.create({
        data: {
          applicationId,
          authorAccountId: actor.id,
          stage: "FinalDecision",
          body: noteBody,
          visibility: "Staff",
        },
      });
    }

    const converted = await tx.application.update({
      where: { id: applicationId },
      data: {
        status: "Converted",
        convertedProfileId: profile.id,
        closedAt: now,
      },
      include: applicationInclude(),
    });

    await tx.applicationStatusHistory.create({
      data: {
        applicationId,
        oldStatus: accepted.status,
        newStatus: "Converted",
        stage: "FinalDecision",
        changedByAccountId: actor.id,
        reason: "Accepted application converted into active member profile.",
        permissionContext: {
          actorAccountId: actor.id,
          action: "convert",
          personnelProfileId: profile.id,
        },
      },
    });

    await tx.auditLog.create({
      data: {
        actorAccountId: actor.id,
        targetAccountId: application.accountId,
        targetPersonnelProfileId: profile.id,
        module: "applications",
        action: "accept-convert",
        recordType: "Application",
        recordId: applicationId,
        oldValue: {
          accountStatus: application.account.status,
          applicationStatus: application.status,
        },
        newValue: {
          accountStatus: "Active",
          applicationStatus: "Converted",
          personnelProfileId: profile.id,
          targetUnitId: application.targetUnitId,
          source: application.source,
          militaryService: application.priorService,
        },
        reason,
      },
    });

    await tx.notification.create({
      data: {
        accountId: application.accountId,
        category: "applications",
        workflowEvent: "application-accepted",
        title: "Application accepted",
        body: "Your application was accepted and your account is now active.",
        relatedRecordType: "Application",
        relatedRecordId: applicationId,
      },
    });

    return converted;
  });

  return { ok: true, application: result };
}

export async function rejectApplication({ prisma, actor, applicationId, reason, noteBody }) {
  const application = await prisma.application.findUnique({
    where: { id: applicationId },
    include: applicationInclude(),
  });
  if (!application) {
    return failure("not_found", "Application was not found.");
  }

  const isRecruiterStage = ["Submitted", "RecruiterScreening", "MoreInfoRequested"].includes(
    application.status,
  );
  const isTargetUnitStage = ["RecruiterRecommended", "TargetUnitReview"].includes(
    application.status,
  );

  if (isRecruiterStage && !canRecruiterReview(actor)) {
    return failure("permission_denied", "Recruiter review permission is required.");
  }

  if (isTargetUnitStage) {
    if (!canTargetUnitReview(actor)) {
      return failure("permission_denied", "Target-unit review permission is required.");
    }
    if (
      !application.targetUnitId ||
      (!isUnitInActorScope(actor, application.targetUnitId) && !hasGlobalReviewOverride(actor))
    ) {
      return failure(
        "permission_denied",
        "Reviewer does not have target-unit authority for this application.",
      );
    }
  }

  if (!isRecruiterStage && !isTargetUnitStage) {
    return failure("invalid_transition", "Application cannot be rejected from its current status.");
  }

  const stage = isRecruiterStage ? "RecruiterScreening" : "FinalDecision";
  const now = new Date();
  const result = await prisma.$transaction(async (tx) => {
    const updated = await tx.application.update({
      where: { id: applicationId },
      data: {
        status: "Denied",
        unitDecisionByAccountId: isTargetUnitStage ? actor.id : application.unitDecisionByAccountId,
        unitDecisionAt: isTargetUnitStage ? now : application.unitDecisionAt,
        decidedAt: now,
        closedAt: now,
      },
      include: applicationInclude(),
    });

    await tx.applicationStatusHistory.create({
      data: {
        applicationId,
        oldStatus: application.status,
        newStatus: "Denied",
        stage,
        changedByAccountId: actor.id,
        reason,
        permissionContext: {
          actorAccountId: actor.id,
          action: "reject",
        },
      },
    });

    if (noteBody) {
      await tx.applicationReviewNote.create({
        data: {
          applicationId,
          authorAccountId: actor.id,
          stage,
          body: noteBody,
          visibility: "Staff",
        },
      });
    }

    await tx.auditLog.create({
      data: {
        actorAccountId: actor.id,
        targetAccountId: application.accountId,
        module: "applications",
        action: "reject",
        recordType: "Application",
        recordId: applicationId,
        oldValue: { status: application.status },
        newValue: { status: "Denied" },
        reason,
      },
    });

    await tx.notification.create({
      data: {
        accountId: application.accountId,
        category: "applications",
        workflowEvent: "application-denied",
        title: "Application decision recorded",
        body: "Your application was denied. Contact staff if you need clarification.",
        relatedRecordType: "Application",
        relatedRecordId: applicationId,
      },
    });

    return updated;
  });

  return { ok: true, application: result };
}

export function applicantFormState(body = {}) {
  const data = normalizeApplicationData(body);
  return {
    ...data,
    targetUnitId: normalizeText(body.targetUnitId),
    preferredName: [data.firstName, data.lastName].filter(Boolean).join(" "),
  };
}

function normalizeApplicationData(body = {}) {
  const firstName = normalizeText(body.firstName) || firstLegacyName(body).firstName;
  const lastName = normalizeText(body.lastName) || firstLegacyName(body).lastName;
  const priorService = readBoolean(body.priorService ?? body.militaryService);
  const priorArma = readBoolean(body.priorArma);
  const leadership = readBoolean(body.leadership);
  const interestedUnitIds = uniqueValues(
    coerceArray(body.interestedUnitIds ?? body.interestedUnits ?? body.interestedUnit),
  );
  const targetUnitId = normalizeText(body.targetUnitId);
  const normalizedInterestedUnitIds =
    interestedUnitIds.length || !targetUnitId ? interestedUnitIds : [targetUnitId];

  return {
    firstName,
    lastName,
    source: normalizeText(body.source),
    priorService,
    servicePeriods: priorService ? normalizeServicePeriods(body) : [],
    priorArma,
    armaUnits: priorArma ? normalizeArmaUnits(body) : [],
    leadership,
    leadershipDetails: leadership ? normalizeText(body.leadershipDetails) : "",
    interestedUnitIds: normalizedInterestedUnitIds,
    desiredMOSIds: uniqueValues(coerceArray(body.desiredMOSIds ?? body.desiredMOS ?? body.mosIds)),
  };
}

function normalizeLegacyApplicationBody(body = {}) {
  const names = firstLegacyName(body);
  return {
    ...body,
    firstName: normalizeText(body.firstName) || names.firstName,
    lastName: normalizeText(body.lastName) || names.lastName,
    source: normalizeText(body.source) || "Discord",
    priorService: body.priorService ?? false,
    priorArma: body.priorArma ?? false,
    leadership: body.leadership ?? false,
    interestedUnitIds: coerceArray(body.interestedUnitIds ?? body.targetUnitId),
    desiredMOSIds: coerceArray(body.desiredMOSIds),
  };
}

function firstLegacyName(body) {
  const preferredName = normalizeText(body.preferredName);
  if (!preferredName) {
    return { firstName: "", lastName: "" };
  }
  const parts = preferredName.split(/\s+/);
  return {
    firstName: parts[0] ?? "",
    lastName: parts.slice(1).join(" ") || parts[0] || "",
  };
}

async function validateApplicantEligibility(prisma, account) {
  if (!canCreateOwnApplication(account)) {
    return failure("permission_denied", "Your account cannot create an application.");
  }

  const currentAccount = await prisma.account.findUnique({
    where: { id: account.id },
    include: { personnelProfile: true },
  });

  if (currentAccount?.personnelProfile) {
    return failure("already_converted", "This account already has a personnel profile.");
  }

  return { ok: true };
}

async function findActiveOwnApplication(prisma, accountId) {
  return prisma.application.findFirst({
    where: {
      accountId,
      status: { in: ACTIVE_APPLICATION_STATUSES },
    },
    include: applicationInclude(),
    orderBy: { createdAt: "desc" },
  });
}

async function validateApplicationData(prisma, data, { requireComplete }) {
  const errors = [];

  if (requireComplete) {
    if (!data.firstName) errors.push("First name is required.");
    if (!data.lastName) errors.push("Last name is required.");
    if (!data.source) errors.push("Recruiting source is required.");
    if (!data.interestedUnitIds.length) errors.push("At least one interested unit is required.");
    if (!data.desiredMOSIds.length) errors.push("At least one desired MOS is required.");
    if (data.priorService && !data.servicePeriods.length) {
      errors.push("At least one service period is required when prior service is yes.");
    }
    if (data.priorArma && !data.armaUnits.length) {
      errors.push("At least one Arma unit is required when prior Arma experience is yes.");
    }
    if (data.leadership && !data.leadershipDetails) {
      errors.push("Leadership details are required when leadership experience is yes.");
    }
  }

  if (data.source && !RECRUITING_SOURCES.includes(data.source)) {
    errors.push("Recruiting source is invalid.");
  }

  for (const [index, period] of data.servicePeriods.entries()) {
    if (!MILITARY_BRANCHES.includes(period.branch)) {
      errors.push(`Service period ${index + 1} has an invalid branch.`);
    }
    if (!period.mos) errors.push(`Service period ${index + 1} requires a MOS.`);
    if (!Number.isInteger(period.years) || period.years < 0 || period.years > 99) {
      errors.push(`Service period ${index + 1} requires years from 0 to 99.`);
    }
  }

  for (const [index, unit] of data.armaUnits.entries()) {
    if (!unit.unitName) errors.push(`Arma unit ${index + 1} requires a unit name.`);
    if (!unit.joinedAt) errors.push(`Arma unit ${index + 1} requires a join date.`);
    if (!unit.stillMember && !unit.leftAt) {
      errors.push(`Arma unit ${index + 1} requires a leave date or still-member selection.`);
    }
    if (!unit.stillMember && !unit.reasonLeft) {
      errors.push(`Arma unit ${index + 1} requires a reason left.`);
    }
  }

  if (data.interestedUnitIds.length) {
    const units = await prisma.unit.findMany({
      where: { id: { in: data.interestedUnitIds }, status: "Active", recruitingOpen: true },
      select: { id: true },
    });
    const found = new Set(units.map((unit) => unit.id));
    for (const unitId of data.interestedUnitIds) {
      if (!found.has(unitId)) errors.push("One or more interested units are invalid.");
    }
  }

  if (data.desiredMOSIds.length) {
    const mosEntries = await prisma.mOS.findMany({
      where: { id: { in: data.desiredMOSIds }, status: "Active", recruitingOpen: true },
      select: { id: true, unitId: true },
    });
    const found = new Map(mosEntries.map((mos) => [mos.id, mos]));
    const interestedUnitSet = new Set(data.interestedUnitIds);
    for (const mosId of data.desiredMOSIds) {
      const mos = found.get(mosId);
      if (!mos) {
        errors.push("One or more desired MOS choices are invalid.");
        continue;
      }
      if (interestedUnitSet.size && !interestedUnitSet.has(mos.unitId)) {
        errors.push("Desired MOS choices must belong to selected interested units.");
      }
    }
  }

  if (errors.length) {
    return failure("validation_error", errors.join(" "));
  }

  return { ok: true };
}

async function persistApplicationData(tx, applicationId, data) {
  await tx.application.update({
    where: { id: applicationId },
    data: {
      firstName: data.firstName || null,
      lastName: data.lastName || null,
      source: data.source || null,
      priorService: data.priorService,
      priorArma: data.priorArma,
      leadership: data.leadership,
      leadershipDetails: data.leadershipDetails || null,
      servicePeriods: {
        deleteMany: {},
        create: data.servicePeriods.map((period, index) => ({
          branch: period.branch,
          mos: period.mos,
          years: period.years,
          sortOrder: index,
        })),
      },
      armaUnits: {
        deleteMany: {},
        create: data.armaUnits.map((unit, index) => ({
          unitName: unit.unitName,
          joinedAt: unit.joinedAt,
          leftAt: unit.stillMember ? null : unit.leftAt,
          stillMember: unit.stillMember,
          reasonLeft: unit.reasonLeft || null,
          sortOrder: index,
        })),
      },
      interestedUnits: {
        deleteMany: {},
        create: data.interestedUnitIds.map((unitId, index) => ({
          unitId,
          sortOrder: index,
        })),
      },
      desiredMOS: {
        deleteMany: {},
        create: data.desiredMOSIds.map((mosId, index) => ({
          mosId,
          sortOrder: index,
        })),
      },
    },
  });
}

function normalizeServicePeriods(body) {
  if (Array.isArray(body.servicePeriods)) {
    return body.servicePeriods.map(normalizeServicePeriod).filter((period) => period.hasAnyValue);
  }

  const branches = coerceArray(body.serviceBranch);
  const mosValues = coerceArray(body.serviceMos);
  const yearsValues = coerceArray(body.serviceYears);
  const length = Math.max(branches.length, mosValues.length, yearsValues.length);
  return Array.from({ length }, (_, index) =>
    normalizeServicePeriod({
      branch: branches[index],
      mos: mosValues[index],
      years: yearsValues[index],
    }),
  ).filter((period) => period.hasAnyValue);
}

function normalizeServicePeriod(period = {}) {
  const branch = normalizeText(period.branch);
  const mos = normalizeText(period.mos);
  const yearsRaw = normalizeText(period.years);
  const years = yearsRaw === "" ? Number.NaN : Number.parseInt(yearsRaw, 10);
  return {
    branch,
    mos,
    years,
    hasAnyValue: Boolean(branch || mos || yearsRaw),
  };
}

function normalizeArmaUnits(body) {
  if (Array.isArray(body.armaUnits)) {
    return body.armaUnits.map(normalizeArmaUnit).filter((unit) => unit.hasAnyValue);
  }

  const unitNames = coerceArray(body.armaUnit);
  const joinedAt = coerceArray(body.armaJoinedAt);
  const leftAt = coerceArray(body.armaLeftAt);
  const stillMember = coerceArray(body.armaStillMember);
  const reasonLeft = coerceArray(body.armaWhy);
  const length = Math.max(
    unitNames.length,
    joinedAt.length,
    leftAt.length,
    stillMember.length,
    reasonLeft.length,
  );
  return Array.from({ length }, (_, index) =>
    normalizeArmaUnit({
      unitName: unitNames[index],
      joinedAt: joinedAt[index],
      leftAt: leftAt[index],
      stillMember: stillMember[index],
      reasonLeft: reasonLeft[index],
    }),
  ).filter((unit) => unit.hasAnyValue);
}

function normalizeArmaUnit(unit = {}) {
  const unitName = normalizeText(unit.unitName);
  const joinedAt = parseOptionalDate(unit.joinedAt);
  const leftAt = parseOptionalDate(unit.leftAt);
  const stillMember = readBoolean(unit.stillMember);
  const reasonLeft = normalizeText(unit.reasonLeft);
  return {
    unitName,
    joinedAt,
    leftAt,
    stillMember,
    reasonLeft,
    hasAnyValue: Boolean(unitName || joinedAt || leftAt || stillMember || reasonLeft),
  };
}

function parseOptionalDate(value) {
  const text = normalizeText(value);
  if (!text) return null;
  const date = new Date(`${text}T00:00:00.000Z`);
  return Number.isNaN(date.getTime()) ? null : date;
}

function coerceArray(value) {
  if (Array.isArray(value)) return value.map((item) => normalizeText(item)).filter(Boolean);
  if (typeof value === "string") {
    return value
      .split(",")
      .map((item) => normalizeText(item))
      .filter(Boolean);
  }
  return value == null ? [] : [normalizeText(value)].filter(Boolean);
}

function uniqueValues(values) {
  return [...new Set(values.map((value) => normalizeText(value)).filter(Boolean))];
}

function readBoolean(value) {
  if (value === true) return true;
  if (value === false || value == null) return false;
  return ["true", "yes", "on", "1"].includes(String(value).trim().toLowerCase());
}

function buildAcceptedProfileName(application) {
  const typedName = [application.firstName, application.lastName].filter(Boolean).join(" ").trim();
  return (
    typedName ||
    application.account.displayName ||
    application.account.authIdentities.find((identity) => identity.provider === "Discord")
      ?.displayName ||
    application.account.authIdentities.find((identity) => identity.provider === "Discord")
      ?.username ||
    `TF20-${application.account.id.slice(-6)}`
  );
}

function activeUnitScopeIds(account) {
  return (account.roleAssignments ?? [])
    .filter((assignment) => isActiveRoleAssignment(assignment) && assignment.unitId)
    .map((assignment) => assignment.unitId);
}

function isUnitInActorScope(actor, unitId) {
  return (actor.roleAssignments ?? []).some((assignment) => {
    if (!isActiveRoleAssignment(assignment)) return false;
    if (assignment.scopeType === "Global") return true;
    return assignment.unitId === unitId;
  });
}

function hasGlobalReviewOverride(actor) {
  return (actor.roleAssignments ?? []).some(
    (assignment) => isActiveRoleAssignment(assignment) && assignment.scopeType === "Global",
  );
}

function isActiveRoleAssignment(assignment) {
  return !assignment.endsAt && assignment.role?.status === "Active";
}

function failure(code, message) {
  return { ok: false, code, message };
}

function applicationInclude() {
  return {
    account: {
      include: {
        authIdentities: true,
        personnelProfile: true,
      },
    },
    targetUnit: true,
    convertedProfile: true,
    answers: {
      orderBy: { sortOrder: "asc" },
    },
    servicePeriods: {
      orderBy: { sortOrder: "asc" },
    },
    armaUnits: {
      orderBy: { sortOrder: "asc" },
    },
    interestedUnits: {
      orderBy: { sortOrder: "asc" },
      include: { unit: true },
    },
    desiredMOS: {
      orderBy: { sortOrder: "asc" },
      include: { mos: { include: { unit: true } } },
    },
    statusHistory: {
      orderBy: { createdAt: "asc" },
    },
    notes: {
      orderBy: { createdAt: "asc" },
    },
  };
}

export { hasPermission, isHtmlRequest };
