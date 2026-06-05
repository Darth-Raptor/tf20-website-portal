import fs from "node:fs";
import { execFileSync } from "node:child_process";
import { pathToFileURL } from "node:url";

const PRIVATE_KEY_HEADERS = [
  ["-----BEGIN ", "OPENSSH", " PRIVATE KEY-----"].join(""),
  ["-----BEGIN ", "RSA", " PRIVATE KEY-----"].join(""),
  ["-----BEGIN ", "DSA", " PRIVATE KEY-----"].join(""),
  ["-----BEGIN ", "EC", " PRIVATE KEY-----"].join(""),
  ["-----BEGIN ", "PRIVATE KEY-----"].join(""),
];

const SENSITIVE_NAME_PATTERN = /(?:^|[/\\])[^/\\]*(token|secret|credential)[^/\\]*$/i;
const SSH_KEY_NAME_PATTERN = /(?:^|[/\\])[^/\\]*ssh[^/\\]*key[^/\\]*$/i;
const TOKEN_ONLY_PATTERN = /^[A-Za-z0-9._-]{20,200}$/;

export function scanTextForSecretFindings(filePath, text) {
  const findings = [];
  const trimmed = text.trim();

  for (const header of PRIVATE_KEY_HEADERS) {
    if (text.includes(header)) {
      findings.push(`${filePath} contains private key material.`);
      break;
    }
  }

  if (SSH_KEY_NAME_PATTERN.test(filePath)) {
    findings.push(`${filePath} has a prohibited SSH key filename.`);
  }

  if (
    SENSITIVE_NAME_PATTERN.test(filePath) &&
    !filePath.endsWith(".example") &&
    !filePath.endsWith(".md") &&
    !filePath.endsWith(".mjs") &&
    TOKEN_ONLY_PATTERN.test(trimmed) &&
    !trimmed.includes("\n")
  ) {
    findings.push(`${filePath} looks like a tracked token-only file.`);
  }

  return findings;
}

function main() {
  const files = execFileSync("git", ["ls-files", "-z"], { encoding: "utf8" })
    .split("\0")
    .filter(Boolean);

  const findings = [];
  for (const file of files) {
    if (!fs.existsSync(file)) continue;
    const content = fs.readFileSync(file);
    if (content.includes(0)) continue;
    findings.push(...scanTextForSecretFindings(file, content.toString("utf8")));
  }

  if (findings.length) {
    console.error("Secret hygiene check failed:");
    for (const finding of findings) {
      console.error(`- ${finding}`);
    }
    process.exit(1);
  }

  console.log("Secret hygiene check passed.");
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  main();
}
