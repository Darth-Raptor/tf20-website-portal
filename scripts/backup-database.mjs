import { spawn } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const args = new Map();
for (const arg of process.argv.slice(2)) {
  const [key, value] = arg.split("=");
  if (key.startsWith("--")) {
    args.set(key, value ?? "true");
  }
}

if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL is not configured. Set it before running a database backup.");
}

const databaseUrl = new URL(process.env.DATABASE_URL);
if (!["mysql:", "mysql2:"].includes(databaseUrl.protocol)) {
  throw new Error(`Unsupported DATABASE_URL protocol for mysqldump backup: ${databaseUrl.protocol}`);
}

const backupDir = path.resolve(args.get("--dir") || process.env.TF20_BACKUP_DIR || path.join(projectRoot, ".private", "backups"));
const databaseName = databaseUrl.pathname.replace(/^\//, "");
const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
const outputPath = path.join(backupDir, `tf20-${databaseName}-${timestamp}.sql.gz`);

fs.mkdirSync(backupDir, { recursive: true });

await runBackup({
  host: databaseUrl.hostname,
  port: databaseUrl.port || "3306",
  user: decodeURIComponent(databaseUrl.username),
  password: decodeURIComponent(databaseUrl.password),
  databaseName,
  outputPath,
});

console.log(JSON.stringify({ ok: true, outputPath }, null, 2));

function runBackup({ host, port, user, password, databaseName, outputPath }) {
  return new Promise((resolve, reject) => {
    const dump = spawn(
      "mysqldump",
      [
        `--host=${host}`,
        `--port=${port}`,
        `--user=${user}`,
        "--single-transaction",
        "--quick",
        "--routines",
        "--triggers",
        databaseName,
      ],
      {
        env: {
          ...process.env,
          MYSQL_PWD: password,
        },
        stdio: ["ignore", "pipe", "pipe"],
      },
    );
    const gzip = spawn("gzip", ["-c"], { stdio: ["pipe", "pipe", "pipe"] });
    const output = fs.createWriteStream(outputPath, { flags: "wx" });
    const stderr = [];
    let dumpDone = false;
    let gzipDone = false;
    let outputDone = false;
    let failed = false;

    function fail(error) {
      if (failed) return;
      failed = true;
      reject(error);
    }

    function finish() {
      if (!failed && dumpDone && gzipDone && outputDone) {
        resolve();
      }
    }

    dump.stderr.on("data", (chunk) => stderr.push(chunk));
    gzip.stderr.on("data", (chunk) => stderr.push(chunk));

    dump.once("error", fail);
    gzip.once("error", fail);
    output.once("error", fail);

    dump.stdout.pipe(gzip.stdin);
    gzip.stdout.pipe(output);

    dump.once("close", (code) => {
      if (code !== 0) {
        fail(new Error(`mysqldump exited with ${code}: ${Buffer.concat(stderr).toString("utf8")}`));
        return;
      }
      dumpDone = true;
      finish();
    });

    gzip.once("close", (code) => {
      if (code !== 0) {
        fail(new Error(`gzip exited with ${code}: ${Buffer.concat(stderr).toString("utf8")}`));
        return;
      }
      gzipDone = true;
      finish();
    });

    output.once("close", () => {
      outputDone = true;
      finish();
    });
  });
}
