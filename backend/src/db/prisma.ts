import { PrismaClient } from '@prisma/client';

// Raw client — never imported by services. Services use the tenant-scoped
// client from src/db/tenant.ts (tenancy enforcement, ADR-05).
export const prisma = new PrismaClient();
