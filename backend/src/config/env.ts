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

export const env = {
  nodeEnv: process.env.NODE_ENV ?? 'development',
  port: int('PORT', 4000),
  databaseUrl: required('DATABASE_URL', 'file:./dev.db'),
  jwtAccessSecret: required('JWT_ACCESS_SECRET', 'dev-access-secret'),
  jwtRefreshSecret: required('JWT_REFRESH_SECRET', 'dev-refresh-secret'),
  accessTokenTtl: process.env.ACCESS_TOKEN_TTL ?? '15m',
  refreshTokenTtl: process.env.REFRESH_TOKEN_TTL ?? '30d',
  bcryptRounds: int('BCRYPT_ROUNDS', 10),
  corsOrigin: process.env.CORS_ORIGIN ?? 'http://localhost:8081',
};
