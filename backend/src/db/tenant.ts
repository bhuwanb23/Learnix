import { prisma } from './prisma.js';
import type { PrismaClient } from '@prisma/client';

// Placeholder base client. Phase 1 replaces this with a Prisma $extends
// model-extension that auto-injects institutionId on every query, per ADR-05.
// Until modules exist, everything goes through the raw client.
export function withTenant(_institutionId: string): PrismaClient {
  return prisma;
}
