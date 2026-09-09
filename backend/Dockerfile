# ── stage 1: production deps (+ prisma CLI & tsx for entrypoint) ──
FROM node:22-alpine AS deps
WORKDIR /app
COPY package.json package-lock.json* ./
RUN npm ci --omit=dev && npm install --omit=dev --no-save prisma@6 tsx@4

# ── stage 2: build ────────────────────────────────────────
FROM node:22-alpine AS build
WORKDIR /app
COPY package.json package-lock.json* ./
RUN npm ci
COPY tsconfig.json ./
COPY prisma ./prisma/
RUN npx prisma generate --schema prisma/schema
COPY src ./src/
RUN npx tsc

# ── stage 3: production ───────────────────────────────────
FROM node:22-alpine AS runner
WORKDIR /app

RUN addgroup -S learnix && adduser -S learnix -G learnix

# Pruned production deps (includes prisma CLI + tsx for the entrypoint)
COPY --from=deps /app/node_modules ./node_modules

# Prisma runtime files (query engine, wasm)
COPY --from=build /app/node_modules/.prisma ./node_modules/.prisma
COPY --from=build /app/node_modules/@prisma ./node_modules/@prisma

# Compiled JS
COPY --from=build /app/dist ./dist

# Schema (needed by entrypoint for db push)
COPY --from=build /app/prisma ./prisma

# Seed files (optional at runtime)
COPY prisma/seed.ts ./prisma/
COPY prisma/seed-realistic.ts ./prisma/

# Entrypoint (normalize CRLF → LF: Windows checkouts can poison the shebang)
COPY docker/entrypoint.sh ./docker/entrypoint.sh
RUN sed -i 's/\r$//' docker/entrypoint.sh && chmod +x docker/entrypoint.sh

# SQLite database lives here — mount a volume on this path
RUN mkdir -p /app/data && chown -R learnix:learnix /app/data
VOLUME ["/app/data"]

USER learnix
EXPOSE 4000

HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD wget -qO- http://localhost:4000/health || exit 1

ENTRYPOINT ["./docker/entrypoint.sh"]
