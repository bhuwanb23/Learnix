// One-shot: report which migration folders have been applied to a given SQLite file.
// Run: node scripts/db-migration-status.js <path-to-db>
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { PrismaClient } from '@prisma/client';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const MIGRATIONS = path.resolve(HERE, '..', 'prisma', 'schema', 'migrations');

const dbPath = process.argv[2] ?? path.resolve(HERE, '..', 'prisma', 'schema', 'dev.db');
const prisma = new PrismaClient({ datasources: { db: { url: `file:${dbPath}` } } });

try {
  const applied = await prisma.$queryRawUnsafe(
    'SELECT migration_name AS name FROM _prisma_migrations ORDER BY finished_at',
  );
  const appliedNames = new Set(applied.map((r) => r.name));

  const folders = fs
    .readdirSync(MIGRATIONS, { withFileTypes: true })
    .filter((d) => d.isDirectory())
    .map((d) => d.name)
    .sort();

  console.log(`DATABASE: ${dbPath}`);
  console.log(`applied: ${appliedNames.size}\n`);
  for (const f of folders) {
    console.log(`${appliedNames.has(f) ? '  applied ' : '  PENDING '} ${f}`);
  }
} catch (e) {
  console.error(e.message);
  process.exitCode = 1;
} finally {
  await prisma.$disconnect();
}
