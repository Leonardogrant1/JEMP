ARG NODE_VERSION=22
FROM node:${NODE_VERSION}-slim AS base

# ── Build ────────────────────────────────────────────────────────────────────
FROM base AS builder
WORKDIR /app
COPY externals/jemp-api/package.json externals/jemp-api/package-lock.json ./
RUN npm ci
COPY externals/jemp-api/src ./src
COPY externals/jemp-api/tsconfig.json ./
RUN npm run build

# ── Runtime ──────────────────────────────────────────────────────────────────
FROM base AS runner
WORKDIR /app
COPY externals/jemp-api/package.json externals/jemp-api/package-lock.json ./
RUN npm ci --omit=dev
COPY --from=builder /app/dist ./dist
ENV NODE_ENV=production
EXPOSE 3001
CMD ["node", "dist/index.js"]
