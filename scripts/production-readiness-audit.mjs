import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { PrismaClient } from "@prisma/client";

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const activeRosterStatuses = ["Recruit", "ProbationaryMember", "Active", "Reserve", "LeaveOfAbsence"];
const recordOnlyStatuses = ["Inactive", "Discharged", "BannedDoNotRehire"];

const args = new Map();
for (const arg of process.argv.slice(2)) {
  const [key, value] = arg.split("=");
  if (key.startsWith("--")) {
    args.set(key, value ?? "true");
  }
}

if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL is not configured. Set it before running the production readiness audit.");
}

const outputPath = args.get("--output") ? path.resolve(args.get("--output")) : null;
const prisma = new PrismaClient();

const readinessInclude = {
  user: {
    select: {
      id: true,
      discordId: true,
      discordUsername: true,
      discordDisplayName: true,
      displayAlias: true,
      steam64Id: true,
      accountStatus: true,
      accountDisabled: true,
    },
  },
  currentRank: true,
  primaryUnit: true,
  primaryBillet: true,
};

try {
  const report = await buildReport();
  const serialized = JSON.stringify(report, null, 2);
  if (outputPath) {
    fs.mkdirSync(path.dirname(outputPath), { recursive: true });
    fs.writeFileSync(outputPath, `${serialized}\n`);
    console.log(`Production readiness audit written to ${path.relative(projectRoot, outputPath)}`);
  } else {
    console.log(serialized);
  }

  if (args.has("--fail-on-action-required") && report.summary.actionRequiredCount > 0) {
    process.exitCode = 1;
  }
} finally {
  await prisma.$disconnect();
}

async function buildReport() {
  const [activeProfiles, recordOnlyProfiles, usersWithoutProfiles, pendingApplications, pendingLoa, pendingAttendance, failedDiscordSync] =
    await Promise.all([
      prisma.personnelProfile.findMany({
        where: { currentStatus: { in: activeRosterStatuses } },
        orderBy: [{ updatedAt: "desc" }],
        include: readinessInclude,
      }),
      prisma.personnelProfile.findMany({
        where: { currentStatus: { in: recordOnlyStatuses } },
        orderBy: [{ updatedAt: "desc" }],
        include: readinessInclude,
      }),
      prisma.user.findMany({
        where: { profile: { is: null }, accountDisabled: false },
        orderBy: [{ createdAt: "desc" }],
        select: {
          id: true,
          discordId: true,
          discordUsername: true,
          discordDisplayName: true,
          displayAlias: true,
          accountStatus: true,
          steam64Id: true,
          createdAt: true,
        },
      }),
      prisma.application.count({
        where: { status: { in: ["Submitted", "UnderReview", "Contacted", "InterviewScheduled", "InterviewPassed", "Accepted"] } },
      }),
      prisma.lOARequest.count({ where: { status: "Submitted" } }),
      prisma.attendanceRecord.count({ where: { status: "PendingReview" } }),
      prisma.discordSyncLog.count({ where: { status: { notIn: ["Success", "Reconciled"] } } }),
    ]);

  const missingRows = activeProfiles
    .map((profile) => ({
      ...profileSummary(profile),
      missingFields: missingFieldsForActiveProfile(profile),
    }))
    .filter((row) => row.missingFields.length);

  const usersMissingProfile = usersWithoutProfiles.map((user) => ({
    userId: user.id,
    discordId: user.discordId,
    alias: displayUser(user),
    discord: user.discordUsername || "",
    accountStatus: user.accountStatus,
    steam64Id: user.steam64Id || "",
    joinedAt: user.createdAt,
    missingFields: ["personnelProfile"],
  }));

  return {
    generatedAt: new Date().toISOString(),
    summary: {
      activeRosterCount: activeProfiles.length,
      readyActiveRosterCount: activeProfiles.length - missingRows.length,
      activeRosterMissingDataCount: missingRows.length,
      recordOnlyCount: recordOnlyProfiles.length,
      usersMissingProfileCount: usersMissingProfile.length,
      pendingApplications,
      pendingLoa,
      pendingAttendance,
      failedDiscordSync,
      actionRequiredCount: missingRows.length + usersMissingProfile.length + pendingApplications + pendingLoa + pendingAttendance + failedDiscordSync,
      missingFieldCounts: countMissingFields(missingRows),
      activeRosterByUnit: countBy(activeProfiles, (profile) => profile.primaryUnit?.name || "Unassigned"),
      recordOnlyByStatus: countBy(recordOnlyProfiles, (profile) => profile.currentStatus || "Unknown"),
    },
    missingActiveRosterFields: missingRows,
    usersMissingProfiles: usersMissingProfile,
    recordOnlyProfiles: recordOnlyProfiles.map(profileSummary),
  };
}

function missingFieldsForActiveProfile(profile) {
  return [
    !profile.user?.discordId ? "discordId" : "",
    !profile.user?.displayAlias ? "displayAlias" : "",
    !profile.currentRankId ? "rank" : "",
    !profile.primaryUnitId ? "unit" : "",
    !profile.primaryBilletId ? "billet" : "",
    !profile.primaryMos ? "primaryMos" : "",
    !profile.user?.steam64Id ? "steam64Id" : "",
    !profile.user?.accountStatus ? "accountStatus" : "",
  ].filter(Boolean);
}

function profileSummary(profile) {
  return {
    profileId: profile.id,
    userId: profile.userId,
    discordId: profile.user?.discordId || "",
    alias: displayUser(profile.user),
    discord: profile.user?.discordUsername || "",
    rank: profile.currentRank?.abbreviation || "",
    unit: profile.primaryUnit?.name || "",
    billet: profile.primaryBillet?.name || "",
    primaryMos: profile.primaryMos || "",
    status: profile.currentStatus,
    accountStatus: profile.user?.accountStatus || "",
    steam64Id: profile.user?.steam64Id || "",
    accountDisabled: Boolean(profile.user?.accountDisabled),
    separationDate: profile.separationDate || null,
  };
}

function displayUser(user) {
  return user?.displayAlias || user?.discordDisplayName || user?.discordUsername || "";
}

function countMissingFields(rows) {
  const counts = {};
  for (const row of rows) {
    for (const field of row.missingFields) {
      counts[field] = (counts[field] || 0) + 1;
    }
  }
  return counts;
}

function countBy(items, getKey) {
  return Object.fromEntries(
    [...items.reduce((counts, item) => {
      const key = getKey(item);
      counts.set(key, (counts.get(key) || 0) + 1);
      return counts;
    }, new Map())].sort((a, b) => a[0].localeCompare(b[0])),
  );
}
