import 'dotenv/config';

function required(name: string, fallback?: string): string {
  const v = process.env[name] ?? fallback;
  if (!v) throw new Error(`Missing required env: ${name}`);
  return v;
}

function int(name: string, fallback?: number): number {
  const raw = process.env[name];
  if (raw === undefined) return fallback ?? 0;
  const n = parseInt(raw, 10);
  if (Number.isNaN(n)) throw new Error(`Env ${name} must be an integer`);
  return n;
}

const nodeEnv = process.env.NODE_ENV ?? 'development';

// In production, security-critical secrets MUST come from the environment —
// no silent fallback to a guessable default.
if (nodeEnv === 'production') {
  const missing: string[] = [];
  if (!process.env.JWT_ACCESS_SECRET || process.env.JWT_ACCESS_SECRET === 'dev-access-secret') {
    missing.push('JWT_ACCESS_SECRET (must be a strong unique value)');
  }
  if (!process.env.JWT_REFRESH_SECRET || process.env.JWT_REFRESH_SECRET === 'dev-refresh-secret') {
    missing.push('JWT_REFRESH_SECRET (must be a strong unique value)');
  }
  if (!process.env.DATABASE_URL) missing.push('DATABASE_URL');
  if (missing.length > 0) {
    throw new Error(`Production env validation failed:\n  - ${missing.join('\n  - ')}`);
  }
}

function list(name: string, fallback: string): string[] {
  const raw = process.env[name] ?? fallback;
  return raw
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);
}

export const env = {
  nodeEnv,
  isProd: nodeEnv === 'production',
  port: int('PORT', 4000),
  databaseUrl: required('DATABASE_URL', 'file:./dev.db'),
  jwtAccessSecret: required('JWT_ACCESS_SECRET', 'dev-access-secret'),
  jwtRefreshSecret: required('JWT_REFRESH_SECRET', 'dev-refresh-secret'),
  accessTokenTtl: process.env.ACCESS_TOKEN_TTL ?? '15m',
  refreshTokenTtl: process.env.REFRESH_TOKEN_TTL ?? '30d',
  bcryptRounds: int('BCRYPT_ROUNDS', 10),
  // Comma-separated allowlist, e.g. "http://localhost:8081,https://app.learnix.dev"
  corsOrigins: list('CORS_ORIGIN', 'http://localhost:8081,http://localhost:19006'),
  trustProxy: process.env.TRUST_PROXY === 'true',
};
