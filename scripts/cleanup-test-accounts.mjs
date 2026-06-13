import { PrismaClient } from "@prisma/client";
import { pathToFileURL } from "node:url";

import { loadConfig } from "../src/server/config.mjs";

const KNOWN_TEST_DISCORD_IDS = new Set(["codex-local-ui-preview"]);
const TEST_VALUE_PATTERNS = [
  /^account-\d{10,}-\d+$/,
  /^discord-\d{10,}-\d+$/,
  /^display-\d{10,}-\d+$/,
  /^user-\d{10,}-\d+$/,
  /^existing-discord-\d{10,}-\d+$/,
  /^import-discord-\d{10,}-\d+$/,
  /^TF20 UI Preview$/i,
  /^Codex Local Preview$/i,
  /^smoke-bootstrap-discord-id$/i,
];

export async function cleanupTestAccounts({ prisma, apply = false, bootstrapDiscordId = "" } = {}) {
  const bootstrapIds = [bootstrapDiscordId].filter(Boolean);
  const identities = await prisma.authIdentity.findMany({
    where: {
      OR: [
        { providerAccountId: { in: [...KNOWN_TEST_DISCORD_IDS, ...bootstrapIds] } },
        { providerAccountId: { startsWith: "discord-" } },
        { providerAccountId: { startsWith: "existing-discord-" } },
        { providerAccountId: { startsWith: "import-discord-" } },
        { username: { startsWith: "user-" } },
        { displayName: { startsWith: "display-" } },
      ],
    },
    include: {
      account: {
        include: {
          personnelProfile: true,
          authIdentities: true,
        },
      },
    },
  });

  const accountsById = new Map();
  const skipped = [];

  for (const identity of identities) {
    const account = identity.account;
    if (!account) continue;

    const isKnownTest = isTestIdentity(identity) || isTestAccount(account);
    const isBootstrapOnly =
      bootstrapIds.includes(identity.providerAccountId) && !account.personnelProfile;
    const isLocalPreview = identity.providerAccountId === "codex-local-ui-preview";

    if (isKnownTest || isBootstrapOnly || isLocalPreview) {
      accountsById.set(account.id, account);
      continue;
    }

    if (isKnownTest || isBootstrapOnly || isLocalPreview) {
      skipped.push({
        accountId: account.id,
        displayName: account.displayName,
        providerAccountId: identity.providerAccountId,
        reason: "Matched cleanup pattern but has a personnel profile.",
      });
    }
  }

  const accounts = [...accountsById.values()];
  const accountIds = accounts.map((account) => account.id);
  const profileIds = accounts.map((account) => account.personnelProfile?.id).filter(Boolean);
  const summary = {
    apply,
    accountsMatched: accounts.length,
    accountIds,
    profileIds,
    skipped,
    deleted: {
      sessionRevocations: 0,
      revokedSessionsUpdated: 0,
      sessions: 0,
      roleAssignments: 0,
      authIdentities: 0,
      integrationLogs: 0,
      auditLogs: 0,
      applications: 0,
      personnelProfiles: 0,
      notifications: 0,
      accounts: 0,
    },
  };

  if (!apply || !accountIds.length) {
    return summary;
  }

  await prisma.$transaction(async (tx) => {
    const applications = await tx.application.findMany({
      where: {
        OR: [{ accountId: { in: accountIds } }, { convertedProfileId: { in: profileIds } }],
      },
      select: { id: true },
    });
    const applicationIds = applications.map((application) => application.id);
    const supportTickets = await tx.supportTicket.findMany({
      where: {
        OR: [
          { createdByAccountId: { in: accountIds } },
          { assignedToAccountId: { in: accountIds } },
          { personnelProfileId: { in: profileIds } },
        ],
      },
      select: { id: true },
    });
    const supportTicketIds = supportTickets.map((ticket) => ticket.id);

    if (applicationIds.length) {
      await tx.applicationAnswer.deleteMany({ where: { applicationId: { in: applicationIds } } });
      await tx.applicationServicePeriod.deleteMany({
        where: { applicationId: { in: applicationIds } },
      });
      await tx.applicationArmaUnit.deleteMany({ where: { applicationId: { in: applicationIds } } });
      await tx.applicationInterestUnit.deleteMany({
        where: { applicationId: { in: applicationIds } },
      });
      await tx.applicationDesiredMOS.deleteMany({
        where: { applicationId: { in: applicationIds } },
      });
      await tx.applicationStatusHistory.deleteMany({
        where: { applicationId: { in: applicationIds } },
      });
      await tx.applicationReviewNote.deleteMany({
        where: { applicationId: { in: applicationIds } },
      });
      summary.deleted.applications = (
        await tx.application.deleteMany({ where: { id: { in: applicationIds } } })
      ).count;
    }

    if (supportTicketIds.length) {
      await tx.supportTicketComment.deleteMany({
        where: { ticketId: { in: supportTicketIds } },
      });
      await tx.supportTicket.deleteMany({ where: { id: { in: supportTicketIds } } });
    }
    await tx.supportTicketComment.deleteMany({
      where: { authorAccountId: { in: accountIds } },
    });

    if (profileIds.length) {
      await tx.personnelStatusHistory.deleteMany({
        where: { personnelProfileId: { in: profileIds } },
      });
      await tx.personnelRankHistory.deleteMany({
        where: { personnelProfileId: { in: profileIds } },
      });
      await tx.personnelUnitAssignment.deleteMany({
        where: { personnelProfileId: { in: profileIds } },
      });
      await tx.personnelBilletAssignment.deleteMany({
        where: { personnelProfileId: { in: profileIds } },
      });
      await tx.personnelMOSHistory.deleteMany({
        where: { personnelProfileId: { in: profileIds } },
      });
      await tx.staffAssignment.deleteMany({ where: { personnelProfileId: { in: profileIds } } });
      await tx.personnelStandingHistory.deleteMany({
        where: { personnelProfileId: { in: profileIds } },
      });
      await tx.eventAttendance.deleteMany({ where: { personnelProfileId: { in: profileIds } } });
      await tx.loaRequest.deleteMany({ where: { personnelProfileId: { in: profileIds } } });
      await tx.personnelQualification.deleteMany({
        where: { personnelProfileId: { in: profileIds } },
      });
      await tx.trainingRecord.deleteMany({ where: { personnelProfileId: { in: profileIds } } });
      await tx.promotionRequest.deleteMany({ where: { personnelProfileId: { in: profileIds } } });
      await tx.promotionRecord.deleteMany({ where: { personnelProfileId: { in: profileIds } } });
      await tx.awardRequest.deleteMany({ where: { personnelProfileId: { in: profileIds } } });
      await tx.awardRecord.deleteMany({ where: { personnelProfileId: { in: profileIds } } });
      await tx.disciplinaryRecord.deleteMany({
        where: { personnelProfileId: { in: profileIds } },
      });
      await tx.administrativeNote.deleteMany({
        where: { personnelProfileId: { in: profileIds } },
      });
    }

    summary.deleted.revokedSessionsUpdated = (
      await tx.session.updateMany({
        where: { revokedByAccountId: { in: accountIds } },
        data: { revokedByAccountId: null },
      })
    ).count;
    summary.deleted.sessionRevocations = (
      await tx.sessionRevocation.deleteMany({
        where: {
          OR: [{ issuedByAccountId: { in: accountIds } }, { targetAccountId: { in: accountIds } }],
        },
      })
    ).count;
    summary.deleted.sessions = (
      await tx.session.deleteMany({
        where: { accountId: { in: accountIds } },
      })
    ).count;
    summary.deleted.roleAssignments = (
      await tx.roleAssignment.deleteMany({
        where: {
          OR: [{ accountId: { in: accountIds } }, { grantedByAccountId: { in: accountIds } }],
        },
      })
    ).count;
    await tx.accountRecoveryRequest.deleteMany({
      where: {
        OR: [
          { subjectAccountId: { in: accountIds } },
          { requestedById: { in: accountIds } },
          { reviewedById: { in: accountIds } },
          { completedById: { in: accountIds } },
        ],
      },
    });
    await tx.accessBootstrap.updateMany({
      where: {
        OR: [
          { verifiedAccountId: { in: accountIds } },
          { completedByAccountId: { in: accountIds } },
        ],
      },
      data: {
        verifiedAccountId: null,
        completedByAccountId: null,
      },
    });
    await tx.personnelProfile.updateMany({
      where: { createdByAccountId: { in: accountIds } },
      data: { createdByAccountId: null },
    });
    await tx.application.updateMany({
      where: { claimedByAccountId: { in: accountIds } },
      data: { claimedByAccountId: null, claimedAt: null },
    });
    summary.deleted.authIdentities = (
      await tx.authIdentity.deleteMany({
        where: { accountId: { in: accountIds } },
      })
    ).count;
    summary.deleted.integrationLogs = (
      await tx.integrationLog.deleteMany({
        where: { accountId: { in: accountIds } },
      })
    ).count;
    summary.deleted.notifications = (
      await tx.notification.deleteMany({
        where: { accountId: { in: accountIds } },
      })
    ).count;
    summary.deleted.auditLogs = (
      await tx.auditLog.deleteMany({
        where: {
          OR: [
            { actorAccountId: { in: accountIds } },
            { targetAccountId: { in: accountIds } },
            { targetPersonnelProfileId: { in: profileIds } },
          ],
        },
      })
    ).count;
    if (profileIds.length) {
      summary.deleted.personnelProfiles = (
        await tx.personnelProfile.deleteMany({
          where: { id: { in: profileIds } },
        })
      ).count;
    }
    summary.deleted.accounts = (
      await tx.account.deleteMany({
        where: { id: { in: accountIds } },
      })
    ).count;
  });

  return summary;
}

function isTestIdentity(identity) {
  return [identity.providerAccountId, identity.username, identity.displayName].some(
    matchesTestValue,
  );
}

function isTestAccount(account) {
  return [account.displayName, account.email].some(matchesTestValue);
}

function matchesTestValue(value) {
  if (!value) return false;
  return TEST_VALUE_PATTERNS.some((pattern) => pattern.test(String(value)));
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const apply = process.argv.includes("--apply");
  const prisma = new PrismaClient();
  try {
    const config = loadConfig();
    const summary = await cleanupTestAccounts({
      prisma,
      apply,
      bootstrapDiscordId: config.bootstrapDiscordId,
    });
    console.log(
      `Test/bootstrap account cleanup ${apply ? "applied" : "dry run"}: ${JSON.stringify(summary)}`,
    );
  } finally {
    await prisma.$disconnect();
  }
}
