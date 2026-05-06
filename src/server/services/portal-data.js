import { getDb, isDbConfigured } from "../db.js";

const applicationStatuses = new Set([
  "NotStarted",
  "Draft",
  "Submitted",
  "UnderReview",
  "Contacted",
  "InterviewScheduled",
  "InterviewPassed",
  "Accepted",
  "Denied",
  "Withdrawn",
  "ConvertedToRecruit",
]);

const accountStatuses = new Set([
  "Applicant",
  "Recruit",
  "ProbationaryMember",
  "Active",
  "Reserve",
  "LeaveOfAbsence",
  "Inactive",
  "Discharged",
  "BannedDoNotRehire",
]);

const auditSeverities = new Set(["Info", "ActionRequired", "Warning", "Critical"]);
const activeApplicationStatuses = [
  "Draft",
  "Submitted",
  "UnderReview",
  "Contacted",
  "InterviewScheduled",
  "InterviewPassed",
  "Accepted",
];
const finalApplicationStatuses = new Set(["Denied", "Withdrawn", "ConvertedToRecruit"]);

function normalizeText(value, maxLength = 1000) {
  const normalized = String(value ?? "").trim();
  return normalized.length > maxLength ? normalized.slice(0, maxLength) : normalized;
}

function assertCanReadApplication(user, application) {
  const permissions = user?.permissions || [];
  if (permissions.includes("applications:read") || permissions.includes("system:admin")) return;
  if (application.userId === user?.id) return;

  const error = new Error("Forbidden");
  error.statusCode = 403;
  throw error;
}

export function assertDatabaseReady() {
  if (!isDbConfigured()) {
    const error = new Error("Database is not configured. Set DATABASE_URL before enabling this portal feature.");
    error.statusCode = 503;
    throw error;
  }
}

export function parseLimit(value, fallback = 50, max = 100) {
  const parsed = Number.parseInt(value, 10);
  if (!Number.isFinite(parsed) || parsed <= 0) return fallback;
  return Math.min(parsed, max);
}

export async function listApplications({ status, search, limit = 50, actorUser } = {}) {
  assertDatabaseReady();

  const where = {};
  const canReadAll =
    actorUser?.permissions?.includes("applications:read") ||
    actorUser?.permissions?.includes("system:admin") ||
    actorUser?.roles?.some((role) => ["staff", "command-staff", "system-admin", "recruiter"].includes(role));

  if (!canReadAll) {
    where.userId = actorUser?.id;
  }

  if (status && applicationStatuses.has(status)) {
    where.status = status;
  }
  if (search) {
    where.OR = [
      { roleInterest: { contains: search } },
      { availability: { contains: search } },
      { user: { is: { discordUsername: { contains: search } } } },
      { user: { is: { discordDisplayName: { contains: search } } } },
      { user: { is: { displayAlias: { contains: search } } } },
    ];
  }

  const applications = await getDb().application.findMany({
    where,
    take: limit,
    orderBy: [{ submittedAt: "desc" }, { createdAt: "desc" }],
    include: {
      user: {
        select: {
          id: true,
          discordId: true,
          discordUsername: true,
          discordDisplayName: true,
          displayAlias: true,
          steam64Id: true,
          timezone: true,
          accountStatus: true,
        },
      },
      answers: {
        orderBy: [{ section: "asc" }, { questionKey: "asc" }],
      },
      history: {
        take: 6,
        orderBy: { createdAt: "desc" },
      },
      notes: {
        take: 3,
        orderBy: { createdAt: "desc" },
      },
      _count: {
        select: {
          answers: true,
          notes: true,
          history: true,
        },
      },
    },
  });

  return applications.map((application) => ({
    id: application.id,
    status: application.status,
    roleInterest: application.roleInterest,
    availability: application.availability,
    experience: application.experience,
    technicalReadiness: application.technicalReadiness,
    submittedAt: application.submittedAt,
    decidedAt: application.decidedAt,
    createdAt: application.createdAt,
    updatedAt: application.updatedAt,
    user: application.user,
    answers: application.answers.map((answer) => ({
      section: answer.section,
      questionKey: answer.questionKey,
      questionText: answer.questionText,
      answer: answer.answer,
    })),
    history: application.history.map((entry) => ({
      oldStatus: entry.oldStatus,
      newStatus: entry.newStatus,
      reason: entry.reason,
      createdAt: entry.createdAt,
    })),
    notes: application.notes.map((note) => ({
      note: note.note,
      createdAt: note.createdAt,
    })),
    counts: application._count,
  }));
}

export async function submitApplication({
  actorUserId,
  steam64Id,
  timezone,
  roleInterest,
  availability,
  experience,
  technicalReadiness,
  rulesAcknowledgement,
  motivation,
  armaExperience,
  reason,
  ipSessionMetadata,
}) {
  assertDatabaseReady();

  const db = getDb();
  const cleanedSteam64Id = normalizeText(steam64Id, 32);
  const cleanedTimezone = normalizeText(timezone, 64);
  const applicationData = {
    roleInterest: normalizeText(roleInterest, 160),
    availability: normalizeText(availability, 500),
    experience: normalizeText(experience, 2000),
    technicalReadiness: normalizeText(technicalReadiness, 1000),
  };

  if (!applicationData.roleInterest || !applicationData.availability || !applicationData.experience) {
    const error = new Error("Role interest, availability, and experience are required.");
    error.statusCode = 400;
    throw error;
  }

  if (cleanedSteam64Id) {
    const existingSteamUser = await db.user.findFirst({
      where: {
        steam64Id: cleanedSteam64Id,
        NOT: { id: actorUserId },
      },
      select: { id: true },
    });

    if (existingSteamUser) {
      const error = new Error("That Steam64 ID is already linked to another account.");
      error.statusCode = 409;
      throw error;
    }
  }

  const existingApplication = await db.application.findFirst({
    where: {
      userId: actorUserId,
      status: { in: activeApplicationStatuses },
    },
    orderBy: { updatedAt: "desc" },
  });

  const answers = [
    {
      section: "Identity",
      questionKey: "steam64Id",
      questionText: "Steam64 ID",
      answer: cleanedSteam64Id || "Not provided",
    },
    {
      section: "Identity",
      questionKey: "timezone",
      questionText: "Timezone",
      answer: cleanedTimezone || "Not provided",
    },
    {
      section: "Readiness",
      questionKey: "technicalReadiness",
      questionText: "Modpack, TeamSpeak, ACRE/TFAR, microphone readiness",
      answer: applicationData.technicalReadiness || "Not provided",
    },
    {
      section: "Expectations",
      questionKey: "rulesAcknowledgement",
      questionText: "Rules and expectations acknowledgement",
      answer: normalizeText(rulesAcknowledgement, 1000) || "Not provided",
    },
    {
      section: "Short Answer",
      questionKey: "motivation",
      questionText: "Why do you want to join Task Force 20?",
      answer: normalizeText(motivation, 2000) || "Not provided",
    },
    {
      section: "Experience",
      questionKey: "armaExperience",
      questionText: "Relevant Arma or MILSIM experience",
      answer: normalizeText(armaExperience, 2000) || applicationData.experience,
    },
  ];

  const application = await db.$transaction(async (tx) => {
    await tx.user.update({
      where: { id: actorUserId },
      data: {
        steam64Id: cleanedSteam64Id || undefined,
        timezone: cleanedTimezone || undefined,
      },
    });

    const oldStatus = existingApplication?.status || null;
    const record = existingApplication
      ? await tx.application.update({
          where: { id: existingApplication.id },
          data: {
            ...applicationData,
            status: "Submitted",
            submittedAt: new Date(),
          },
        })
      : await tx.application.create({
          data: {
            userId: actorUserId,
            ...applicationData,
            status: "Submitted",
            submittedAt: new Date(),
          },
        });

    await tx.applicationAnswer.deleteMany({ where: { applicationId: record.id } });
    await tx.applicationAnswer.createMany({
      data: answers.map((answer) => ({
        applicationId: record.id,
        ...answer,
      })),
    });

    if (oldStatus !== "Submitted") {
      await tx.applicationStatusHistory.create({
        data: {
          applicationId: record.id,
          oldStatus,
          newStatus: "Submitted",
          changedById: actorUserId,
          reason: reason || "Application submitted by applicant.",
        },
      });
    }

    await tx.auditLog.create({
      data: {
        actorUserId,
        module: "Application",
        action: existingApplication ? "Resubmitted" : "Submitted",
        newValue: {
          roleInterest: applicationData.roleInterest,
          availability: applicationData.availability,
        },
        reason: reason || "Applicant submitted application.",
        relatedRecordId: record.id,
        severity: "Info",
        systemGenerated: false,
        ipSessionMetadata,
      },
    });

    return tx.application.findUnique({
      where: { id: record.id },
      include: {
        user: {
          select: {
            id: true,
            discordId: true,
            discordUsername: true,
            discordDisplayName: true,
            displayAlias: true,
            steam64Id: true,
            timezone: true,
            accountStatus: true,
          },
        },
        answers: true,
        history: { orderBy: { createdAt: "desc" } },
        notes: { orderBy: { createdAt: "desc" } },
        _count: { select: { answers: true, notes: true, history: true } },
      },
    });
  });

  return (await listApplications({ actorUser: { id: actorUserId }, limit: 1 })).find((item) => item.id === application.id);
}

export async function updateApplicationStatus({
  actorUser,
  applicationId,
  status,
  note,
  reason,
  ipSessionMetadata,
}) {
  assertDatabaseReady();

  if (!applicationStatuses.has(status)) {
    const error = new Error("Invalid application status.");
    error.statusCode = 400;
    throw error;
  }

  const db = getDb();
  const application = await db.application.findUnique({
    where: { id: applicationId },
    include: {
      user: true,
    },
  });

  if (!application) {
    const error = new Error("Application not found.");
    error.statusCode = 404;
    throw error;
  }

  assertCanReadApplication(actorUser, application);

  const noteText = normalizeText(note, 2000);
  const reasonText = normalizeText(reason, 1000) || `Application status changed to ${status}.`;
  const targetStatus = status === "Accepted" ? "ConvertedToRecruit" : status;

  await db.$transaction(async (tx) => {
    await tx.application.update({
      where: { id: applicationId },
      data: {
        status: targetStatus,
        decidedAt: finalApplicationStatuses.has(targetStatus) ? new Date() : application.decidedAt,
      },
    });

    await tx.applicationStatusHistory.create({
      data: {
        applicationId,
        oldStatus: application.status,
        newStatus: targetStatus,
        changedById: actorUser?.id,
        reason: reasonText,
      },
    });

    if (noteText) {
      await tx.applicationNote.create({
        data: {
          applicationId,
          authorUserId: actorUser?.id,
          note: noteText,
        },
      });
    }

    if (targetStatus === "ConvertedToRecruit") {
      await tx.user.update({
        where: { id: application.userId },
        data: { accountStatus: "Recruit" },
      });

      await tx.personnelProfile.upsert({
        where: { userId: application.userId },
        update: {
          currentStatus: "Recruit",
          dateAccepted: new Date(),
          dateJoined: new Date(),
        },
        create: {
          userId: application.userId,
          currentStatus: "Recruit",
          dateAccepted: new Date(),
          dateJoined: new Date(),
        },
      });
    }

    await tx.auditLog.create({
      data: {
        actorUserId: actorUser?.id,
        module: "Application",
        action: targetStatus === "ConvertedToRecruit" ? "Accepted and Converted" : `Status: ${targetStatus}`,
        oldValue: { status: application.status },
        newValue: { status: targetStatus },
        reason: reasonText,
        relatedRecordId: applicationId,
        severity: status === "Denied" ? "Warning" : "Info",
        systemGenerated: false,
        ipSessionMetadata,
      },
    });
  });

  return (await listApplications({ actorUser, limit: 100 })).find((item) => item.id === applicationId);
}

export async function listPersonnel({ status, search, limit = 50 } = {}) {
  assertDatabaseReady();

  const where = {};
  if (status && accountStatuses.has(status)) {
    where.currentStatus = status;
  }
  if (search) {
    where.OR = [
      { user: { is: { discordUsername: { contains: search } } } },
      { user: { is: { discordDisplayName: { contains: search } } } },
      { user: { is: { displayAlias: { contains: search } } } },
      { currentRank: { is: { abbreviation: { contains: search } } } },
      { primaryUnit: { is: { name: { contains: search } } } },
      { primaryBillet: { is: { name: { contains: search } } } },
    ];
  }

  const personnel = await getDb().personnelProfile.findMany({
    where,
    take: limit,
    orderBy: [{ updatedAt: "desc" }],
    include: {
      user: {
        select: {
          id: true,
          discordId: true,
          discordUsername: true,
          discordDisplayName: true,
          displayAlias: true,
          accountStatus: true,
          email: true,
        },
      },
      currentRank: true,
      primaryUnit: true,
      primaryBillet: true,
      _count: {
        select: {
          assignments: true,
          qualifications: true,
          attendanceRecords: true,
          loaRequests: true,
        },
      },
    },
  });

  return personnel.map((profile) => ({
    id: profile.id,
    status: profile.currentStatus,
    dateJoined: profile.dateJoined,
    dateAccepted: profile.dateAccepted,
    recruitClass: profile.recruitClass,
    goodStanding: profile.goodStanding,
    user: profile.user,
    rank: profile.currentRank,
    unit: profile.primaryUnit,
    billet: profile.primaryBillet,
    counts: profile._count,
    updatedAt: profile.updatedAt,
  }));
}

export async function writeAuditLog({
  actorUserId,
  affectedProfileId,
  module,
  action,
  oldValue,
  newValue,
  reason,
  relatedRecordId,
  severity = "Info",
  systemGenerated = false,
  ipSessionMetadata,
}) {
  assertDatabaseReady();

  if (!module || !action) {
    const error = new Error("Audit log requires module and action.");
    error.statusCode = 400;
    throw error;
  }

  return getDb().auditLog.create({
    data: {
      actorUserId,
      affectedProfileId,
      module,
      action,
      oldValue,
      newValue,
      reason,
      relatedRecordId,
      severity: auditSeverities.has(severity) ? severity : "Info",
      systemGenerated,
      ipSessionMetadata,
    },
  });
}
