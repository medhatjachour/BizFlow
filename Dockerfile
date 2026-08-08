# ── Stage 1: Builder ──────────────────────────────────────────────────────────
FROM node:20-alpine AS builder
RUN apk add --no-cache openssl
WORKDIR /app

ARG NEXT_PUBLIC_BASE_PATH
ARG NEXT_PUBLIC_SITE_URL
ARG ADMIN_PASSWORD=build-validation-only

ENV ADMIN_PASSWORD=${ADMIN_PASSWORD}

COPY package*.json ./
COPY apps/Bizflow/package*.json ./apps/Bizflow/
COPY apps/website/package*.json ./apps/website/

# lock file was generated on Windows; use install to resolve Linux-specific platform packages
# Skip scripts so the Electron postinstall hook does not fail in the container build
RUN npm install --legacy-peer-deps --ignore-scripts

COPY apps/Bizflow ./apps/Bizflow
COPY apps/website ./apps/website

RUN cd apps/Bizflow && \
    node scripts/merge-schemas.js --all && \
    npx prisma generate --schema=prisma/merged.prisma && \
    DATABASE_URL=file:./dev.db npx prisma db push --schema=prisma/merged.prisma --accept-data-loss --skip-generate

# esbuild compiles server.ts → web/.dist/server.cjs, then spawns it; timeout kills the server
RUN cd apps/Bizflow && timeout 60 node web/build-server.mjs || true
RUN test -f apps/Bizflow/web/.dist/server.cjs
RUN cd apps/Bizflow && npx vite build --config web/vite.web.config.ts
RUN test -f apps/Bizflow/web/.dist-web/index.html

RUN npm run build:site

# ── Stage 2: Runner — minimal production image ─────────────────────────────────
FROM node:20-alpine AS runner
RUN apk add --no-cache dumb-init openssl
WORKDIR /app

ARG NEXT_PUBLIC_BASE_PATH
ARG NEXT_PUBLIC_SITE_URL

COPY package*.json ./
COPY apps/Bizflow/package*.json ./apps/Bizflow/
COPY apps/website/package*.json ./apps/website/

# Production deps only — no devDeps, no esbuild, no build tools
# --ignore-scripts skips postinstall (electron-builder install-app-deps) which only matters for Electron
RUN npm install --omit=dev --legacy-peer-deps --ignore-scripts && npm cache clean --force

# Prisma generated client + query engine binaries
COPY --from=builder /app/apps/Bizflow/src/generated/prisma   ./apps/Bizflow/src/generated/prisma

# Pre-compiled bridge + schema files
COPY --from=builder /app/apps/Bizflow/web/.dist   ./apps/Bizflow/web/.dist
COPY --from=builder /app/apps/Bizflow/web/.dist-web   ./apps/Bizflow/web/.dist-web
COPY --from=builder /app/apps/Bizflow/web/serve-dist-web.cjs   ./apps/Bizflow/web/serve-dist-web.cjs
COPY --from=builder /app/apps/Bizflow/prisma      ./apps/Bizflow/prisma

# Next.js standalone — self-contained server, no node_modules needed
COPY --from=builder /app/apps/website/.next/standalone   ./apps/website/standalone
COPY --from=builder /app/apps/website/.next/static       ./apps/website/standalone/apps/website/.next/static
COPY --from=builder /app/apps/website/public             ./apps/website/standalone/apps/website/public

# Some bridge code still resolves Electron-style unpacked paths; alias them in the container.
RUN mkdir -p /app/apps/app.asar.unpacked/src/generated && \
    ln -s /app/apps/Bizflow/src/generated/prisma /app/apps/app.asar.unpacked/src/generated/prisma && \
    ln -s /app/apps/Bizflow/prisma /app/apps/app.asar.unpacked/prisma

RUN mkdir -p /data/bizflow && chmod 777 /data/bizflow

EXPOSE 3000 8787

ENV NODE_ENV=production \
    DATABASE_URL=file:/data/bizflow/database.db \
    BRIDGE_PORT=8787 \
    NEXTAUTH_URL=http://localhost:3000 \
    NEXT_PUBLIC_BASE_PATH=${NEXT_PUBLIC_BASE_PATH} \
    NEXT_PUBLIC_SITE_URL=${NEXT_PUBLIC_SITE_URL} \
    HOSTNAME=0.0.0.0 \
    PORT=3000

HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
    CMD node -e "require('http').get('http://localhost:8787/health', (r) => process.exit(r.statusCode === 200 ? 0 : 1)).on('error', () => process.exit(1))"

ENTRYPOINT ["dumb-init", "--"]

# Bridge + web UI + Next.js standalone
CMD ["sh", "-c", "(cd /app/apps/Bizflow && node web/.dist/server.cjs) & node /app/apps/Bizflow/web/serve-dist-web.cjs & node /app/apps/website/standalone/apps/website/server.js"]
