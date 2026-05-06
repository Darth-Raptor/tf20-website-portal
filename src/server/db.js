import { PrismaClient } from "@prisma/client";

import { config } from "./config.js";

let prisma;

export function isDbConfigured() {
  return Boolean(config.databaseUrl);
}

export function getDb() {
  if (!isDbConfigured()) {
    throw new Error("DATABASE_URL is not configured.");
  }

  if (!prisma) {
    prisma = new PrismaClient();
  }
  return prisma;
}

export async function closeDb() {
  if (!prisma) return;
  await prisma.$disconnect();
  prisma = undefined;
}
