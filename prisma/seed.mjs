import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const permissions = [
  { key: "applications:read", description: "View recruiting applications and pipeline metadata." },
  { key: "applications:write", description: "Update recruiting application status, notes, and conversion steps." },
  { key: "personnel:read", description: "View personnel roster and non-restricted personnel profile data." },
  { key: "personnel:write", description: "Update personnel profile, assignment, rank, billet, and status records." },
  { key: "audit:read", description: "View audit log entries." },
  { key: "audit:write", description: "Create audit log entries for staff actions." },
  { key: "discord:sync", description: "Queue and review Discord role synchronization work." },
  { key: "system:admin", description: "Manage technical system settings and integrations." },
];

const roles = [
  {
    name: "Applicant",
    description: "Default role for Discord-linked applicants before acceptance.",
    permissions: [],
  },
  {
    name: "Member",
    description: "Standard unit member access after acceptance.",
    permissions: [],
  },
  {
    name: "Recruiter",
    description: "Recruiting team access for application review.",
    permissions: ["applications:read", "applications:write", "audit:write"],
  },
  {
    name: "Staff",
    description: "Administrative staff access for routine personnel management.",
    permissions: [
      "applications:read",
      "applications:write",
      "personnel:read",
      "personnel:write",
      "audit:read",
      "audit:write",
      "discord:sync",
    ],
  },
  {
    name: "Command Staff",
    description: "Command authority for personnel and application decisions.",
    permissions: [
      "applications:read",
      "applications:write",
      "personnel:read",
      "personnel:write",
      "audit:read",
      "audit:write",
      "discord:sync",
    ],
  },
  {
    name: "System Admin",
    description: "Full technical administration role for portal access, user roles, and system workflows.",
    permissions: [
      "applications:read",
      "applications:write",
      "personnel:read",
      "personnel:write",
      "audit:read",
      "audit:write",
      "discord:sync",
      "system:admin",
    ],
  },
];

async function main() {
  const permissionsByKey = new Map();

  for (const permission of permissions) {
    const record = await prisma.permission.upsert({
      where: { key: permission.key },
      update: { description: permission.description },
      create: permission,
    });
    permissionsByKey.set(record.key, record);
  }

  for (const roleDefinition of roles) {
    const role = await prisma.role.upsert({
      where: { name: roleDefinition.name },
      update: { description: roleDefinition.description },
      create: {
        name: roleDefinition.name,
        description: roleDefinition.description,
      },
    });

    for (const permissionKey of roleDefinition.permissions) {
      const permission = permissionsByKey.get(permissionKey);
      if (!permission) continue;

      await prisma.rolePermission.upsert({
        where: {
          roleId_permissionId: {
            roleId: role.id,
            permissionId: permission.id,
          },
        },
        update: {},
        create: {
          roleId: role.id,
          permissionId: permission.id,
        },
      });
    }
  }
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (error) => {
    console.error(error);
    await prisma.$disconnect();
    process.exit(1);
  });
