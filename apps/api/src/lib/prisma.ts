// Ensure env vars (DATABASE_URL, etc.) are populated before the Prisma Client is constructed.
import "../config/env";
import { PrismaClient } from "@prisma/client";

declare global {
  // eslint-disable-next-line no-var
  var __digiCasinoPrisma: PrismaClient | undefined;
}

// Reuse a single PrismaClient instance across module reloads (relevant for `tsx watch`) and
// across test files within the same process to avoid exhausting SQLite file handles.
export const prisma: PrismaClient = global.__digiCasinoPrisma ?? new PrismaClient();

if (process.env.NODE_ENV !== "production") {
  global.__digiCasinoPrisma = prisma;
}
