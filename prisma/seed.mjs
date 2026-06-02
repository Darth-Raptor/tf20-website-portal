import { PrismaClient } from "@prisma/client";
import { catalogSource } from "./catalog-source.mjs";

const prisma = new PrismaClient();
const mode = parseMode(process.argv.slice(2));

async function main() {
  validateCatalogSource(catalogSource);
  const summary = await syncCatalogs(prisma, catalogSource);
  console.log(
    `${mode === "bootstrap" ? "Catalog bootstrap" : "Catalog sync"} complete: ${JSON.stringify(summary)}`,
  );
}

async function syncCatalogs(prismaClient, source) {
  const summary = {
    mode,
    roles: source.roles.length,
    permissions: source.permissions.length,
    units: source.units.length,
    ranks: source.ranks.length,
    billets: source.billets.length,
    staffSections: source.staffSections.length,
    specialties: source.specialties.length,
    trainingCourses: source.trainingCourses.length,
    qualifications: source.qualifications.length,
    awards: source.awards.length,
  };

  await prismaClient.$transaction(async (tx) => {
    await syncPermissions(tx, source.permissions);
    await syncRoles(tx, source.roles);
    await syncUnits(tx, source.units);
    await syncRanks(tx, source.ranks);
    await syncStaffSections(tx, source.staffSections);
    await syncSpecialties(tx, source.specialties);
    await syncBillets(tx, source.billets);
    await syncTrainingCourses(tx, source.trainingCourses);
    await syncQualifications(tx, source.qualifications);
    await syncAwards(tx, source.awards);
  });

  return summary;
}

async function syncPermissions(tx, permissions) {
  for (const permission of permissions) {
    await tx.permission.upsert({
      where: { key: permission.key },
      update: {
        module: permission.module,
        action: permission.action,
        name: permission.name,
        description: permission.description ?? null,
        sensitiveCategory: permission.sensitiveCategory ?? null,
        requiresRecentAuth: permission.requiresRecentAuth,
        status: permission.status,
      },
      create: {
        key: permission.key,
        module: permission.module,
        action: permission.action,
        name: permission.name,
        description: permission.description ?? null,
        sensitiveCategory: permission.sensitiveCategory ?? null,
        requiresRecentAuth: permission.requiresRecentAuth,
        status: permission.status,
      },
    });
  }
}

async function syncRoles(tx, roles) {
  for (const role of roles) {
    await tx.role.upsert({
      where: { key: role.key },
      update: {
        name: role.name,
        description: role.description ?? null,
        status: role.status,
      },
      create: {
        key: role.key,
        name: role.name,
        description: role.description ?? null,
        status: role.status,
      },
    });
  }

  for (const role of roles) {
    const persistedRole = await tx.role.findUniqueOrThrow({ where: { key: role.key } });
    for (const permissionKey of role.permissionKeys ?? []) {
      const permission = await tx.permission.findUniqueOrThrow({ where: { key: permissionKey } });
      await tx.permissionGrant.upsert({
        where: {
          roleId_permissionId: {
            roleId: persistedRole.id,
            permissionId: permission.id,
          },
        },
        update: {},
        create: {
          roleId: persistedRole.id,
          permissionId: permission.id,
        },
      });
    }
  }
}

async function syncUnits(tx, units) {
  for (const unit of units) {
    await tx.unit.upsert({
      where: { code: unit.code },
      update: {
        name: unit.name,
        type: unit.type ?? null,
        status: unit.status,
        sortOrder: unit.sortOrder ?? 0,
      },
      create: {
        code: unit.code,
        name: unit.name,
        type: unit.type ?? null,
        status: unit.status,
        sortOrder: unit.sortOrder ?? 0,
      },
    });
  }

  for (const unit of units) {
    const parent = unit.parentCode
      ? await tx.unit.findUniqueOrThrow({ where: { code: unit.parentCode } })
      : null;
    await tx.unit.update({
      where: { code: unit.code },
      data: {
        parentId: parent?.id ?? null,
      },
    });
  }
}

async function syncRanks(tx, ranks) {
  for (const rank of ranks) {
    await tx.rank.upsert({
      where: { code: rank.code },
      update: {
        name: rank.name,
        abbreviation: rank.abbreviation ?? null,
        category: rank.category ?? null,
        sortOrder: rank.sortOrder ?? 0,
        status: rank.status,
      },
      create: {
        code: rank.code,
        name: rank.name,
        abbreviation: rank.abbreviation ?? null,
        category: rank.category ?? null,
        sortOrder: rank.sortOrder ?? 0,
        status: rank.status,
      },
    });
  }
}

async function syncStaffSections(tx, staffSections) {
  for (const staffSection of staffSections) {
    await tx.staffSection.upsert({
      where: { code: staffSection.code },
      update: {
        name: staffSection.name,
        description: staffSection.description ?? null,
        status: staffSection.status,
      },
      create: {
        code: staffSection.code,
        name: staffSection.name,
        description: staffSection.description ?? null,
        status: staffSection.status,
      },
    });
  }
}

async function syncSpecialties(tx, specialties) {
  for (const specialty of specialties) {
    await tx.specialty.upsert({
      where: { code: specialty.code },
      update: {
        name: specialty.name,
        category: specialty.category ?? null,
        status: specialty.status,
      },
      create: {
        code: specialty.code,
        name: specialty.name,
        category: specialty.category ?? null,
        status: specialty.status,
      },
    });
  }
}

async function syncBillets(tx, billets) {
  for (const billet of billets) {
    const unit = billet.unitCode ? await tx.unit.findUniqueOrThrow({ where: { code: billet.unitCode } }) : null;
    await tx.billet.upsert({
      where: { code: billet.code },
      update: {
        unitId: unit?.id ?? null,
        name: billet.name,
        category: billet.category ?? null,
        status: billet.status,
      },
      create: {
        code: billet.code,
        unitId: unit?.id ?? null,
        name: billet.name,
        category: billet.category ?? null,
        status: billet.status,
      },
    });
  }
}

async function syncTrainingCourses(tx, trainingCourses) {
  for (const course of trainingCourses) {
    await tx.trainingCourse.upsert({
      where: { code: course.code ?? undefined },
      update: {
        name: course.name,
        category: course.category ?? null,
        description: course.description ?? null,
        status: course.status,
      },
      create: {
        code: course.code ?? null,
        name: course.name,
        category: course.category ?? null,
        description: course.description ?? null,
        status: course.status,
      },
    });
  }
}

async function syncQualifications(tx, qualifications) {
  for (const qualification of qualifications) {
    await tx.qualification.upsert({
      where: { code: qualification.code },
      update: {
        name: qualification.name,
        category: qualification.category ?? null,
        expiresAfterDays: qualification.expiresAfterDays ?? null,
        status: qualification.status,
      },
      create: {
        code: qualification.code,
        name: qualification.name,
        category: qualification.category ?? null,
        expiresAfterDays: qualification.expiresAfterDays ?? null,
        status: qualification.status,
      },
    });
  }
}

async function syncAwards(tx, awards) {
  for (const award of awards) {
    await tx.award.upsert({
      where: { code: award.code ?? undefined },
      update: {
        name: award.name,
        category: award.category ?? null,
        status: award.status,
      },
      create: {
        code: award.code ?? null,
        name: award.name,
        category: award.category ?? null,
        status: award.status,
      },
    });
  }
}

function validateCatalogSource(source) {
  const requiredFamilies = [
    "roles",
    "permissions",
    "units",
    "ranks",
    "billets",
    "staffSections",
    "specialties",
    "trainingCourses",
    "qualifications",
    "awards",
  ];

  for (const family of requiredFamilies) {
    if (!Array.isArray(source[family])) {
      throw new Error(`Catalog source is missing required family array ${family}.`);
    }
  }
}

function parseMode(argv) {
  const modeArg = argv.find((arg) => arg.startsWith("--mode="));
  const value = modeArg?.split("=")[1] ?? "bootstrap";
  if (value !== "bootstrap" && value !== "sync") {
    throw new Error(`Unsupported seed mode ${value}. Use bootstrap or sync.`);
  }
  return value;
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
