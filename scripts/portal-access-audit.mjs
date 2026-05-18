import assert from "node:assert/strict";

import { canAccessPortalPage, getPortalPage, portalPages } from "../src/server/services/portal-pages.js";

const fixtures = {
  applicant: {
    accountStatus: "Applicant",
    access: { personnelScope: "own" },
    permissions: [],
    roles: ["applicant"],
  },
  member: {
    accountStatus: "Active",
    access: { personnelScope: "own" },
    permissions: [],
    roles: ["member"],
    profile: {
      unit: { name: "A Co, 1/75th Ranger Regiment" },
      billet: { name: "Rifleman" },
    },
  },
  staff: {
    accountStatus: "Active",
    access: { personnelScope: "scoped" },
    permissions: ["personnel:read", "personnel:write", "audit:read"],
    roles: ["staff"],
    profile: {
      unit: { name: "1st Squad, 1st Platoon, A Co, 1/75th Ranger Regiment" },
      billet: { name: "Squad Leader" },
    },
  },
  command: {
    accountStatus: "Active",
    access: { personnelScope: "all" },
    permissions: ["personnel:read", "personnel:write", "audit:read", "applications:read", "applications:write"],
    roles: ["command-staff"],
    profile: {
      unit: { name: "Task Force 20" },
      billet: { name: "Commanding Officer" },
    },
  },
  system: {
    accountStatus: "Active",
    access: { personnelScope: "all" },
    permissions: ["system:admin"],
    roles: ["system-admin"],
  },
};

const expectations = {
  applicant: ["dashboard", "profile", "applications", "support"],
  member: ["dashboard", "profile", "loa", "events", "training", "support"],
  staff: ["dashboard", "profile", "applications", "loa", "personnel", "events", "training", "actions", "support", "audit"],
  command: ["dashboard", "profile", "applications", "loa", "personnel", "records", "events", "training", "actions", "support", "systems", "audit"],
  system: portalPages.map((page) => page.id),
};

const matrix = {};
for (const [roleName, user] of Object.entries(fixtures)) {
  const allowed = portalPages.filter((page) => canAccessPortalPage(user, page)).map((page) => page.id);
  matrix[roleName] = allowed;
  assert.deepEqual(allowed, expectations[roleName], `${roleName} portal access drifted`);
}

assert.equal(canAccessPortalPage(fixtures.staff, getPortalPage("records")), false, "staff must not access records");
assert.equal(canAccessPortalPage(fixtures.staff, getPortalPage("users")), false, "staff must not access users");
assert.equal(canAccessPortalPage(fixtures.command, getPortalPage("records")), true, "command must access records");
assert.equal(canAccessPortalPage(fixtures.system, getPortalPage("users")), true, "system admin must access users");

console.log(JSON.stringify({ ok: true, matrix }, null, 2));
