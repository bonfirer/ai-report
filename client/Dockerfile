# ── Build stage ─────────────────────────────────────────────
FROM node:20-alpine AS build

WORKDIR /app

# Install deps first for better layer caching.
COPY package.json package-lock.json ./
RUN npm ci

# Build the production SPA bundle.
COPY . .
RUN npm run build

# ── Runtime stage ───────────────────────────────────────────
# Nginx serves the static SPA and reverse-proxies /api (incl. the chat
# WebSocket) to the API server container.
FROM nginx:1.27-alpine AS runtime

COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/dist /usr/share/nginx/html

EXPOSE 80
