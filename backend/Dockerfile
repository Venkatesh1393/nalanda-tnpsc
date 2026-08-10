# Sprint 4 Step 68 — Production Readiness.
#
# Four stages so the final image never carries devDependencies, TypeScript
# source, or build tooling — only compiled JS + production node_modules.
# `docker build` alone validates the whole pipeline (npm ci, tsc, a second
# npm ci for prod-only deps) the same way CI does.

# ---- deps: full install (incl. devDependencies), used only to build ----
FROM node:20-alpine AS deps
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci

# ---- build: compile TypeScript -> dist/ ----
FROM node:20-alpine AS build
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN npm run build

# ---- prod-deps: production-only node_modules, installed separately so the
# runtime image never touches devDependencies (tsx, eslint, typescript...) ----
FROM node:20-alpine AS prod-deps
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci --omit=dev

# ---- runtime: the actual image that ships ----
FROM node:20-alpine AS runtime
WORKDIR /app
ENV NODE_ENV=production

# Non-root — the official Node image ships a "node" user, but pinning our
# own with a fixed UID/GID keeps this reproducible across base-image bumps.
RUN addgroup -S nalanda -g 1001 && adduser -S nalanda -u 1001 -G nalanda

COPY --from=prod-deps /app/node_modules ./node_modules
COPY --from=build /app/dist ./dist
COPY package.json ./

# config/logger.ts resolves its log directory to <dist>/../../logs = /app/logs
# at runtime — create it (and hand ownership to the non-root user) up front
# rather than relying on winston to mkdir it as root the first time it writes.
RUN mkdir -p logs && chown -R nalanda:nalanda /app

USER nalanda

EXPOSE 5000

# Liveness only (never the DB-checking readiness endpoint) — Docker's own
# HEALTHCHECK maps to "should this container be restarted," the same
# semantics as a Kubernetes liveness probe (see controllers/health.controller.ts's
# header comment for why readiness and liveness must stay separate signals).
# Node 20 has global `fetch` built in, so no curl/wget needs installing.
HEALTHCHECK --interval=30s --timeout=5s --start-period=15s --retries=3 \
  CMD node -e "fetch('http://127.0.0.1:'+(process.env.PORT||5000)+'/api/health').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"

CMD ["node", "dist/server.js"]
