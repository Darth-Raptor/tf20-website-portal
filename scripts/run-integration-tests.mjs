import { spawnSync } from "node:child_process";

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
run(process.execPath, ["--test", "test/integration/*.test.mjs"]);

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

function fail(message) {
  console.error(message);
  process.exit(1);
}
