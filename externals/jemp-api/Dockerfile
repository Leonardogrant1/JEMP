ARG NODE_VERSION=22
FROM node:${NODE_VERSION}-slim AS base

# ── Build ────────────────────────────────────────────────────────────────────
FROM base AS builder
# Cross-Repo-Bundle: src/swap-route importiert pure Worker-Module relativ
# (../../../jemp-temporal-worker/src/...) — der Worker-Source muss deshalb im
# Builder an derselben relativen Position liegen wie im Repo. esbuild bündelt
# nur die tatsächlich importierten Dateien (taxonomy, exercise-filter, pool).
WORKDIR /app/externals/jemp-api
COPY externals/jemp-api/package.json externals/jemp-api/package-lock.json ./
RUN npm ci
COPY externals/jemp-temporal-worker/src /app/externals/jemp-temporal-worker/src
COPY externals/jemp-api/src ./src
COPY externals/jemp-api/tsconfig.json ./
RUN npm run build

# ── Runtime ──────────────────────────────────────────────────────────────────
FROM base AS runner
WORKDIR /app
COPY externals/jemp-api/package.json externals/jemp-api/package-lock.json ./
RUN npm ci --omit=dev
COPY --from=builder /app/externals/jemp-api/dist ./dist
ENV NODE_ENV=production
EXPOSE 3001
CMD ["node", "dist/index.js"]
