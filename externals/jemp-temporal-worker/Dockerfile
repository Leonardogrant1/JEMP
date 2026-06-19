ARG NODE_VERSION=22
FROM node:${NODE_VERSION}-slim AS base
RUN apt-get update && apt-get install -y python3 make g++ && rm -rf /var/lib/apt/lists/*

# ── Build ────────────────────────────────────────────────────────────────────
FROM base AS builder
WORKDIR /app
COPY externals/jemp-temporal-worker/package.json externals/jemp-temporal-worker/package-lock.json ./
RUN npm ci
COPY externals/jemp-temporal-worker/ .
RUN npm run build

# ── Runtime ──────────────────────────────────────────────────────────────────
FROM base AS runner
WORKDIR /app
COPY externals/jemp-temporal-worker/package.json externals/jemp-temporal-worker/package-lock.json ./
COPY --from=builder /app/node_modules ./node_modules
RUN npm prune --omit=dev
COPY --from=builder /app/dist ./dist
ENV NODE_ENV=production
CMD ["node", "dist/worker.js"]
