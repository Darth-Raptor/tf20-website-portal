import { spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";

const testDatabaseUrl = process.env.TEST_DATABASE_URL;
const localEnv = readDotEnvFile();
const resolvedTestDatabaseUrl = testDatabaseUrl ?? localEnv.TEST_DATABASE_URL;
const developmentDatabaseUrl = process.env.DATABASE_URL ?? localEnv.DATABASE_URL;

if (!resolvedTestDatabaseUrl) {
  fail("TEST_DATABASE_URL is required for integration tests.");
}

if (
  developmentDatabaseUrl &&
  normalizeUrl(resolvedTestDatabaseUrl) === normalizeUrl(developmentDatabaseUrl)
) {
  fail("TEST_DATABASE_URL must not match DATABASE_URL.");
}

const databaseName = new URL(resolvedTestDatabaseUrl).pathname.replace(/^\//, "");
if (!/(test|ci|spec)/i.test(databaseName)) {
  fail("TEST_DATABASE_URL database name must include test, ci, or spec.");
}

const env = {
  ...localEnv,
  ...process.env,
  DATABASE_URL: resolvedTestDatabaseUrl,
  NODE_ENV: "test",
};

run(process.execPath, [
  path.join(process.cwd(), "node_modules", "prisma", "build", "index.js"),
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

  if (result.error) {
    console.error(`Failed to run ${command}: ${result.error.message}`);
    process.exit(1);
  }

  if (result.status !== 0) {
    process.exit(result.status ?? 1);
  }
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

function readDotEnvFile() {
  const envPath = path.join(process.cwd(), ".env");
  if (!fs.existsSync(envPath)) {
    return {};
  }

  const values = {};
  for (const line of fs.readFileSync(envPath, "utf8").split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;

    const separatorIndex = trimmed.indexOf("=");
    if (separatorIndex <= 0) continue;

    const key = trimmed.slice(0, separatorIndex).trim();
    const rawValue = trimmed.slice(separatorIndex + 1).trim();
    values[key] = rawValue.replace(/^(['"])(.*)\1$/, "$2");
  }

  return values;
}

function fail(message) {
  console.error(message);
  process.exit(1);
}
