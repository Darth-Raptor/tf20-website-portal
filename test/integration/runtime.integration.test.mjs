import assert from "node:assert/strict";
import { test } from "node:test";

import { PrismaClient } from "@prisma/client";

import { catalogSource } from "../../prisma/catalog-source.mjs";
import { syncCatalogs } from "../../prisma/seed.mjs";
import {
  acceptApplication,
  createOrResumeOwnApplication,
  recommendApplication,
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

test("pending account can create one application and acceptance converts it to a member", async () => {
  const targetUnit = await activeUnit("tf20_ranger_a");
  const pending = await createAccountWithRole("pending-user", "Pending");
  const reviewer = await createAccountWithRole("unit-staff", "Active");

  const created = await createOrResumeOwnApplication({
    prisma,
    account: pending,
    body: applicationBody(targetUnit.id, "Raptor"),
  });

  assert.equal(created.ok, true);
  assert.equal(created.created, true);
  assert.equal(
    created.application.answers.find((answer) => answer.questionKey === "preferred-name")?.answer,
    "Raptor",
  );

  const resumed = await createOrResumeOwnApplication({
    prisma,
    account: pending,
    body: applicationBody(targetUnit.id, "Second Name"),
  });

  assert.equal(resumed.ok, true);
  assert.equal(resumed.created, false);
  assert.equal(resumed.application.id, created.application.id);

  const recommended = await recommendApplication({
    prisma,
    actor: reviewer,
    applicationId: created.application.id,
    reason: "Integration recruiter recommendation.",
    noteBody: "Looks ready.",
  });

  assert.equal(recommended.ok, true);
  assert.equal(recommended.application.status, "RecruiterRecommended");

  const accepted = await acceptApplication({
    prisma,
    actor: reviewer,
    applicationId: created.application.id,
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
  assert.equal(convertedAccount.personnelProfile?.name, "Raptor");
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

test("personnel updates require reason, enforce MOS/name fields, and reject low-rank billet assignment", async () => {
  const targetUnit = await activeUnit("tf20_ranger_a");
  const pending = await createAccountWithRole("pending-user", "Pending");
  const reviewer = await createAccountWithRole("unit-staff", "Active");
  const application = await createConvertedApplication({
    pending,
    reviewer,
    targetUnit,
    preferredName: "Falcon",
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
      name: "Falcon One",
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
  assert.equal(updated.profile.name, "Falcon One");
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
      name: "Falcon Two",
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

  assert.deepEqual(flattenPermissions(account), []);

  const result = await createOrResumeOwnApplication({
    prisma,
    account,
    body: applicationBody(targetUnit.id, "No Access"),
  });

  assert.equal(result.ok, false);
  assert.equal(result.code, "permission_denied");
});

async function createConvertedApplication({ pending, reviewer, targetUnit, preferredName }) {
  const created = await createOrResumeOwnApplication({
    prisma,
    account: pending,
    body: applicationBody(targetUnit.id, preferredName),
  });
  assert.equal(created.ok, true);

  const recommended = await recommendApplication({
    prisma,
    actor: reviewer,
    applicationId: created.application.id,
    reason: "Integration recommendation.",
  });
  assert.equal(recommended.ok, true);

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
        scopeIncludesDescendants: true,
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

function applicationBody(targetUnitId, preferredName) {
  return {
    targetUnitId,
    preferredName,
    age: "21",
    timezone: "America/Chicago",
    availability: "Weekends",
    experience: "Integration test experience",
    motivation: "Integration test motivation",
  };
}

function uniqueKey(prefix) {
  sequence += 1;
  return `${prefix}-${Date.now()}-${sequence}`;
}
