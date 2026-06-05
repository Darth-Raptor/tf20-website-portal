import assert from "node:assert/strict";
import { test } from "node:test";

import { scanTextForSecretFindings } from "../../scripts/check-secret-hygiene.mjs";

test("secret hygiene detects private key material", () => {
  const privateKey = [
    "-----BEGIN ",
    "OPENSSH",
    " PRIVATE KEY-----\nnot-a-real-key\n-----END ",
    "OPENSSH",
    " PRIVATE KEY-----",
  ].join("");

  const findings = scanTextForSecretFindings("tmp/key.txt", privateKey);
  assert.equal(findings.length, 1);
  assert.match(findings[0], /private key material/);
});

test("secret hygiene detects obvious tracked token files", () => {
  const findings = scanTextForSecretFindings(
    "newtoken.txt",
    "f8c15879-f484-4fda-8afc-9bb25a308549",
  );

  assert.equal(findings.length, 1);
  assert.match(findings[0], /token-only/);
});

test("secret hygiene allows normal source text", () => {
  assert.deepEqual(scanTextForSecretFindings("src/server/app.mjs", "console.log('ok');"), []);
});
