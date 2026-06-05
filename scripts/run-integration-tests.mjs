import { spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";

const testDatabaseUrl = process.env.TEST_DATABASE_URL;
const developmentDatabaseUrl = process.env.DATABASE_URL;

if (!testDatabaseUrl) {
  fail("TEST_DATABASE_URL is required for integration tests.");
}

if (
  developmentDatabaseUrl &&
  normalizeUrl(testDatabaseUrl) === normalizeUrl(developmentDatabaseUrl)
) {
  fail("TEST_DATABASE_URL must not match DATABASE_URL.");
}

const databaseName = new URL(testDatabaseUrl).pathname.replace(/^\//, "");
if (!/(test|ci|spec)/i.test(databaseName)) {
  fail("TEST_DATABASE_URL database name must include test, ci, or spec.");
}

const env = {
  ...process.env,
  DATABASE_URL: testDatabaseUrl,
  NODE_ENV: "test",
};

run(resolveNpxCommand(), [
  "prisma",
  "db",
  "push",
  "--force-reset",
  "--accept-data-loss",
  "--skip-generate",
]);
run(process.execPath, ["--test", ...listIntegrationTestFiles()]);

function run(command, args) {
  const result = spawnSync(command, args, {
    env,
    stdio: "inherit",
    shell: false,
  });

  if (result.status !== 0) {
    process.exit(result.status ?? 1);
  }
}

function resolveNpxCommand() {
  return process.platform === "win32" ? "npx.cmd" : "npx";
}

function normalizeUrl(value) {
  return new URL(value).toString();
}

function listIntegrationTestFiles() {
  const testDirectory = path.join(process.cwd(), "test", "integration");
  const files = fs
    .readdirSync(testDirectory)
    .filter((fileName) => fileName.endsWith(".test.mjs"))
    .sort()
    .map((fileName) => path.join(testDirectory, fileName));

  if (!files.length) {
    fail("No integration test files were found.");
  }

  return files;
}

function fail(message) {
  console.error(message);
  process.exit(1);
}
