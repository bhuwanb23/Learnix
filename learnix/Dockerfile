# ── stage 1: install ──────────────────────────────────────
FROM node:22-alpine AS deps
WORKDIR /app
COPY package.json package-lock.json* ./
RUN npm ci

# ── stage 2: build ────────────────────────────────────────
FROM node:22-alpine AS build
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
# API base URL is baked at build time; nginx proxies /api/ to the backend.
# Keep it relative (no host) so the same image works anywhere.
ENV EXPO_PUBLIC_API_URL=/api/v1
RUN npx expo export --platform web

# ── stage 3: production ───────────────────────────────────
FROM nginx:alpine AS runner

# Remove default config, install SPA + API-proxy config
RUN rm /etc/nginx/conf.d/default.conf
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Static export output
COPY --from=build /app/dist /usr/share/nginx/html

EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
