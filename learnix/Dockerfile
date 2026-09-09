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
RUN npx expo export --platform web

# ── stage 3: production ───────────────────────────────────
FROM nginx:alpine AS runner
WORKDIR /usr/share/nginx/html

# Remove default nginx config
RUN rm /etc/nginx/conf.d/default.conf

# Custom nginx config for SPA
COPY --from=build /app/dist ./dist

# Nginx config
RUN cat > /etc/nginx/conf.d/default.conf <<'NGINX'
server {
  listen 80;
  server_name _;
  root /usr/share/nginx/html/dist;
  index index.html;

  # SPA fallback
  location / {
    try_files $uri $uri/ /index.html;
  }

  # Cache static assets
  location /_expo/static {
    expires 1y;
    add_header Cache-Control "public, immutable";
  }

  # API proxy (override via env)
  location /api/ {
    proxy_pass http://backend:4000;
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
  }

  # Gzip
  gzip on;
  gzip_types text/plain text/css application/json application/javascript text/xml;
}
NGINX

EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
