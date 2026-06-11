import assert from "node:assert/strict";
import { test } from "node:test";

import { PrismaClient } from "@prisma/client";

import { catalogSource } from "../../prisma/catalog-source.mjs";
import { syncCatalogs } from "../../prisma/seed.mjs";
import {
  acceptApplication,
  assignApplicationUnit,
  createOrResumeDraftApplication,
  getRecruitingOptions,
  recommendApplication,
  requestApplicationInfo,
  submitOwnApplication,
  updateOwnApplication,
  withdrawOwnApplication,
} from "../../src/server/application-service.mjs";
import { flattenPermissions } from "../../src/server/auth-service.mjs";
import { updatePersonnelProfile } from "../../src/server/personnel-service.mjs";

const prisma = new PrismaClient();
let sequence = 0;

test.before(async () => {
  await syncCatalogs(prisma, catalogSource, { mode: "sync" });
});

test.after(async () => {
  await prisma.$disconnect();
});

test("recruiting options expose only active open 7000-level units", async () => {
  const options = await getRecruitingOptions(prisma);

  assert.ok(options.units.length > 0);
  assert.equal(
    options.units.every((unit) => unit.hierarchyBase === 7000),
    true,
  );
});

test("pending account can draft, submit, and convert into an active member", async () => {
  const targetUnit = await activeUnit("tf20_ranger_a");
  const pending = await createAccountWithRole("pending-user", "Pending");
  const reviewer = await createAccountWithRole("unit-staff", "Active");
  const body = await applicationBody(targetUnit.id, "Raptor One");

  const draft = await createOrResumeDraftApplication({ prisma, account: pending });
  assert.equal(draft.ok, true);
  assert.equal(draft.created, true);
  assert.equal(draft.application.status, "Draft");

  const updatedDraft = await updateOwnApplication({ prisma, account: pending, body });
  assert.equal(updatedDraft.ok, true);
  assert.equal(updatedDraft.application.firstName, "Raptor");
  assert.equal(updatedDraft.application.lastName, "One");
  assert.equal(updatedDraft.application.servicePeriods.length, 1);
  assert.equal(updatedDraft.application.armaUnits.length, 1);

  const submitted = await submitOwnApplication({ prisma, account: pending, body });
  assert.equal(submitted.ok, true);
  assert.equal(submitted.application.status, "Submitted");

  const resumed = await createOrResumeDraftApplication({ prisma, account: pending });
  assert.equal(resumed.ok, true);
  assert.equal(resumed.created, false);
  assert.equal(resumed.application.id, draft.application.id);
  assert.equal(resumed.application.status, "Submitted");

  const recommended = await recommendApplication({
    prisma,
    actor: reviewer,
    applicationId: submitted.application.id,
    reason: "Integration recruiter recommendation.",
    noteBody: "Looks ready.",
  });
  assert.equal(recommended.ok, true);
  assert.equal(recommended.application.status, "RecruiterRecommended");

  const assigned = await assignApplicationUnit({
    prisma,
    actor: reviewer,
    applicationId: submitted.application.id,
    targetUnitId: targetUnit.id,
    reason: "Integration target-unit assignment.",
  });
  assert.equal(assigned.ok, true);
  assert.equal(assigned.application.status, "TargetUnitReview");

  const accepted = await acceptApplication({
    prisma,
    actor: reviewer,
    applicationId: submitted.application.id,
    reason: "Integration target-unit acceptance.",
    noteBody: "Accepted for test.",
  });

  assert.equal(accepted.ok, true);
  assert.equal(accepted.application.status, "Converted");

  const convertedAccount = await prisma.account.findUniqueOrThrow({
    where: { id: pending.id },
    include: {
      personnelProfile: true,
      roleAssignments: { include: { role: true } },
    },
  });

  assert.equal(convertedAccount.status, "Active");
  assert.equal(convertedAccount.personnelProfile?.name, "Raptor One");
  assert.equal(convertedAccount.personnelProfile?.source, "Discord");
  assert.equal(convertedAccount.personnelProfile?.militaryService, true);
  assert.equal(convertedAccount.personnelProfile?.currentUnitId, targetUnit.id);
  assert.ok(
    convertedAccount.roleAssignments.some(
      (assignment) => !assignment.endsAt && assignment.role.key === "member",
    ),
  );
  assert.ok(
    convertedAccount.roleAssignments.some(
      (assignment) => assignment.endsAt && assignment.role.key === "pending-user",
    ),
  );
});

test("recruiter can request more information and applicant can resubmit or withdraw", async () => {
  const targetUnit = await activeUnit("tf20_ranger_a");
  const pending = await createAccountWithRole("pending-user", "Pending");
  const reviewer = await createAccountWithRole("unit-staff", "Active");
  const body = await applicationBody(targetUnit.id, "Request Info");

  const submitted = await submitOwnApplication({ prisma, account: pending, body });
  assert.equal(submitted.ok, true);
  assert.equal(submitted.application.status, "Submitted");

  const infoRequested = await requestApplicationInfo({
    prisma,
    actor: reviewer,
    applicationId: submitted.application.id,
    reason: "Integration needs updated details.",
    noteBody: "Please clarify service history.",
  });
  assert.equal(infoRequested.ok, true);
  assert.equal(infoRequested.application.status, "MoreInfoRequested");

  const updated = await updateOwnApplication({
    prisma,
    account: pending,
    body: { ...body, lastName: "Updated" },
  });
  assert.equal(updated.ok, true);
  assert.equal(updated.application.lastName, "Updated");

  const resubmitted = await submitOwnApplication({
    prisma,
    account: pending,
    body: { ...body, lastName: "Updated" },
  });
  assert.equal(resubmitted.ok, true);
  assert.equal(resubmitted.application.status, "Submitted");

  const withdrawn = await withdrawOwnApplication({
    prisma,
    account: pending,
    reason: "Integration applicant withdrawal.",
  });
  assert.equal(withdrawn.ok, true);
  assert.equal(withdrawn.application.status, "Withdrawn");
});

test("target-unit acceptance is denied outside scope and allowed inside scope", async () => {
  const targetUnit = await activeUnit("tf20_ranger_a");
  const outsideUnit = await activeUnit("tf20_ranger_a_1p");
  const pending = await createAccountWithRole("pending-user", "Pending");
  const recruiter = await createAccountWithRole("unit-staff", "Active");
  const outsideReviewer = await createAccountWithRole("unit-staff", "Active", {
    scopeType: "Unit",
    unitId: outsideUnit.id,
  });
  const insideReviewer = await createAccountWithRole("unit-staff", "Active", {
    scopeType: "Unit",
    unitId: targetUnit.id,
  });
  const body = await applicationBody(targetUnit.id, "Scoped Recruit");
  const submitted = await submitOwnApplication({ prisma, account: pending, body });
  assert.equal(submitted.ok, true);

  const recommended = await recommendApplication({
    prisma,
    actor: recruiter,
    applicationId: submitted.application.id,
    reason: "Integration recruiter recommendation.",
  });
  assert.equal(recommended.ok, true);

  const assigned = await assignApplicationUnit({
    prisma,
    actor: recruiter,
    applicationId: submitted.application.id,
    targetUnitId: targetUnit.id,
    reason: "Integration target assignment.",
  });
  assert.equal(assigned.ok, true);

  const outsideAcceptance = await acceptApplication({
    prisma,
    actor: outsideReviewer,
    applicationId: submitted.application.id,
    reason: "Integration out-of-scope acceptance.",
  });
  assert.equal(outsideAcceptance.ok, false);
  assert.equal(outsideAcceptance.code, "permission_denied");

  const insideAcceptance = await acceptApplication({
    prisma,
    actor: insideReviewer,
    applicationId: submitted.application.id,
    reason: "Integration in-scope acceptance.",
  });
  assert.equal(insideAcceptance.ok, true);
  assert.equal(insideAcceptance.application.status, "Converted");
});

test("personnel updates require reason, enforce MOS/name fields, and reject low-rank billet assignment", async () => {
  const targetUnit = await activeUnit("tf20_ranger_a");
  const pending = await createAccountWithRole("pending-user", "Pending");
  const reviewer = await createAccountWithRole("unit-staff", "Active");
  const application = await createConvertedApplication({
    pending,
    reviewer,
    targetUnit,
    preferredName: "Falcon One",
  });
  const profile = await prisma.personnelProfile.findUniqueOrThrow({
    where: { id: application.convertedProfileId },
  });

  const rank = await prisma.rank.findFirstOrThrow({
    where: { status: "Active" },
    orderBy: { precedence: "asc" },
  });
  const mos = await prisma.mOS.findFirstOrThrow({ where: { status: "Active" } });

  const missingReason = await updatePersonnelProfile({
    prisma,
    actor: reviewer,
    personnelProfileId: profile.id,
    body: {
      name: "Falcon",
      status: "Recruit",
      currentUnitId: targetUnit.id,
      currentRankId: rank.id,
      currentBilletId: "",
      currentMOSId: mos.id,
      goodStanding: "true",
    },
  });

  assert.equal(missingReason.ok, false);
  assert.equal(missingReason.code, "validation_error");

  const updated = await updatePersonnelProfile({
    prisma,
    actor: reviewer,
    personnelProfileId: profile.id,
    body: {
      name: "Falcon Two",
      status: "Active",
      currentUnitId: targetUnit.id,
      currentRankId: rank.id,
      currentBilletId: "",
      currentMOSId: mos.id,
      goodStanding: "true",
      reason: "Integration personnel update.",
    },
  });

  assert.equal(updated.ok, true);
  assert.equal(updated.profile.name, "Falcon Two");
  assert.equal(updated.profile.currentMOSId, mos.id);
  assert.equal(
    await prisma.personnelMOSHistory.count({
      where: { personnelProfileId: profile.id, mosId: mos.id },
    }),
    1,
  );

  const billet = await prisma.billet.findFirstOrThrow({
    where: { status: "Active", minimumRankId: { not: null }, unitId: { not: null } },
    include: { minimumRank: true },
    orderBy: { commandPrecedence: "desc" },
  });
  const lowRank = await prisma.rank.findFirstOrThrow({
    where: { status: "Active", precedence: { lt: billet.minimumRank.precedence } },
    orderBy: { precedence: "asc" },
  });

  const lowRankBillet = await updatePersonnelProfile({
    prisma,
    actor: reviewer,
    personnelProfileId: profile.id,
    body: {
      name: "Falcon Three",
      status: "Active",
      currentUnitId: billet.unitId,
      currentRankId: lowRank.id,
      currentBilletId: billet.id,
      currentMOSId: mos.id,
      goodStanding: "true",
      reason: "Integration low-rank billet check.",
    },
  });

  assert.equal(lowRankBillet.ok, false);
  assert.equal(lowRankBillet.code, "validation_error");
  assert.match(lowRankBillet.message, /requires rank/);
});

test("archived roles do not grant application access", async () => {
  const permission = await prisma.permission.findUniqueOrThrow({
    where: { key: "applications.create-self" },
  });
  const archivedRole = await prisma.role.create({
    data: {
      key: uniqueKey("archived-role"),
      name: "Archived Role",
      status: "Archived",
      permissions: {
        create: {
          permissionId: permission.id,
        },
      },
    },
  });
  const account = await createAccountWithRole(null, "Pending", { roleId: archivedRole.id });
  const targetUnit = await activeUnit("tf20_ranger_a");
  const body = await applicationBody(targetUnit.id, "No Access");

  assert.deepEqual(flattenPermissions(account), []);

  const result = await submitOwnApplication({
    prisma,
    account,
    body,
  });

  assert.equal(result.ok, false);
  assert.equal(result.code, "permission_denied");
});

async function createConvertedApplication({ pending, reviewer, targetUnit, preferredName }) {
  const created = await submitOwnApplication({
    prisma,
    account: pending,
    body: await applicationBody(targetUnit.id, preferredName),
  });
  assert.equal(created.ok, true);

  const recommended = await recommendApplication({
    prisma,
    actor: reviewer,
    applicationId: created.application.id,
    reason: "Integration recommendation.",
  });
  assert.equal(recommended.ok, true);

  const assigned = await assignApplicationUnit({
    prisma,
    actor: reviewer,
    applicationId: created.application.id,
    targetUnitId: targetUnit.id,
    reason: "Integration target assignment.",
  });
  assert.equal(assigned.ok, true);

  const accepted = await acceptApplication({
    prisma,
    actor: reviewer,
    applicationId: created.application.id,
    reason: "Integration acceptance.",
  });
  assert.equal(accepted.ok, true);

  return accepted.application;
}

async function createAccountWithRole(roleKey, status, options = {}) {
  const account = await prisma.account.create({
    data: {
      displayName: uniqueKey("account"),
      status,
      authIdentities: {
        create: {
          provider: "Discord",
          providerAccountId: uniqueKey("discord"),
          username: uniqueKey("user"),
          displayName: uniqueKey("display"),
        },
      },
    },
  });

  const roleId =
    options.roleId ??
    (roleKey ? (await prisma.role.findUniqueOrThrow({ where: { key: roleKey } })).id : null);
  if (roleId) {
    await prisma.roleAssignment.create({
      data: {
        accountId: account.id,
        roleId,
        scopeType: options.scopeType ?? "Global",
        scopeIncludesDescendants: options.scopeIncludesDescendants ?? true,
        unitId: options.unitId,
        reason: "Integration test role assignment.",
      },
    });
  }

  return prisma.account.findUniqueOrThrow({
    where: { id: account.id },
    include: {
      authIdentities: true,
      roleAssignments: {
        include: {
          role: {
            include: {
              permissions: {
                include: {
                  permission: true,
                },
              },
            },
          },
        },
      },
    },
  });
}

async function activeUnit(key) {
  return prisma.unit.findFirstOrThrow({ where: { key, status: "Active" } });
}

async function recruitingMOSForUnit(unitId) {
  return prisma.mOS.findFirstOrThrow({
    where: { unitId, status: "Active", recruitingOpen: true },
    orderBy: { identifier: "asc" },
  });
}

async function applicationBody(targetUnitId, preferredName) {
  const mos = await recruitingMOSForUnit(targetUnitId);
  const [firstName, ...lastNameParts] = preferredName.split(/\s+/);
  return {
    firstName,
    lastName: lastNameParts.join(" ") || firstName,
    source: "Discord",
    priorService: true,
    servicePeriods: [{ branch: "Army", mos: "11B", years: 4 }],
    priorArma: true,
    armaUnits: [
      {
        unitName: "Integration Arma Unit",
        joinedAt: "2024-01-01",
        leftAt: "2024-06-01",
        stillMember: false,
        reasonLeft: "Integration test transfer.",
      },
    ],
    leadership: true,
    leadershipDetails: "Integration test fireteam leadership.",
    interestedUnitIds: [targetUnitId],
    desiredMOSIds: [mos.id],
  };
}

function uniqueKey(prefix) {
  sequence += 1;
  return `${prefix}-${Date.now()}-${sequence}`;
}
