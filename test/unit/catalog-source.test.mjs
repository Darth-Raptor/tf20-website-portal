import assert from "node:assert/strict";
import { test } from "node:test";

import { catalogSource } from "../../prisma/catalog-source.mjs";
import { validateCatalogSource } from "../../prisma/seed.mjs";

test("catalog source validates with the approved Phase 2 data", () => {
  assert.doesNotThrow(() => validateCatalogSource(catalogSource));
  assert.equal(catalogSource.roles.length, 7);
  assert.equal(catalogSource.permissions.length, 29);
  assert.equal(catalogSource.units.length, 14);
  assert.equal(catalogSource.mos.length, 33);
});

test("catalog validation rejects broken role permission references", () => {
  const brokenSource = structuredClone(catalogSource);
  brokenSource.roles[0].permissionKeys = ["missing.permission"];

  assert.throws(
    () => validateCatalogSource(brokenSource),
    /references missing permission missing\.permission/,
  );
});
