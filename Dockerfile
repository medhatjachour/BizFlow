# ── Stage 1: Builder ──────────────────────────────────────────────────────────
FROM node:20-alpine AS builder
RUN apk add --no-cache openssl
WORKDIR /app

ARG NEXT_PUBLIC_BASE_PATH
ARG NEXT_PUBLIC_SITE_URL
ARG ADMIN_PASSWORD=build-validation-only
ARG LICENSE_SECRET=build-validation-only

ENV ADMIN_PASSWORD=${ADMIN_PASSWORD} \
    LICENSE_SECRET=${LICENSE_SECRET}

COPY package*.json ./
COPY apps/Bizflow/package*.json ./apps/Bizflow/
COPY apps/website/package*.json ./apps/website/
COPY scripts/container-entrypoint.sh ./scripts/container-entrypoint.sh

# The repo root is deliberately NOT an npm workspace: the two apps pin incompatible
# majors and each keeps its own lock file (see the "//workspaces" note in package.json).
# Every manifest set therefore has to be installed on its own, from its own lock file.
# `npm install` (not `ci`) because the lock files were generated on Windows, so Linux-only
# platform packages have to be resolved. `--ignore-scripts` skips the Electron postinstall
# hook, which cannot run in the container.
RUN npm install --legacy-peer-deps --ignore-scripts \
 && npm --prefix apps/Bizflow install --legacy-peer-deps --ignore-scripts \
 && npm --prefix apps/website install --legacy-peer-deps --ignore-scripts

COPY apps/Bizflow ./apps/Bizflow
COPY apps/website ./apps/website

# The Prisma CLI is invoked through the app's own node_modules. `npx prisma` would look
# for a CLI at the repo root, find none, and download the latest major - Prisma 7 rejects
# the `url = env(...)` datasource these schemas still use, so the build used to fail here.
RUN cd apps/Bizflow && \
    node scripts/merge-schemas.js --all && \
    node node_modules/prisma/build/index.js generate --schema=prisma/merged.prisma && \
    DATABASE_URL=file:./dev.db node node_modules/prisma/build/index.js db push \
      --schema=prisma/merged.prisma --accept-data-loss --skip-generate

RUN cd apps/website && \
    node node_modules/prisma/build/index.js generate --schema=prisma/schema.prisma

# esbuild compiles server.ts → web/.dist/server.cjs, then spawns it; timeout kills the server
RUN cd apps/Bizflow && timeout 60 node web/build-server.mjs || true
RUN test -f apps/Bizflow/web/.dist/server.cjs
RUN cd apps/Bizflow && node node_modules/vite/bin/vite.js build --config web/vite.web.config.ts
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
COPY scripts/container-entrypoint.sh ./scripts/container-entrypoint.sh

# Production deps only — no devDeps, no esbuild, no build tools.
# The repo root has no runtime dependencies at all (only `concurrently`, a devDependency),
# so each app installs its own production dependencies instead of relying on hoisting.
# --ignore-scripts skips postinstall (electron-builder install-app-deps), which only matters for Electron
RUN npm --prefix apps/Bizflow install --omit=dev --legacy-peer-deps --ignore-scripts \
 && npm --prefix apps/website install --omit=dev --legacy-peer-deps --ignore-scripts \
 && npm cache clean --force

# Fail the build - not the container - if a runtime dependency went missing.
# These are the bridge's real runtime externals (see web/build-server.mjs): they are
# declared production dependencies of apps/Bizflow, so a production install must keep
# them app-local. (The bridge resolves them from apps/Bizflow/node_modules, not from
# the repo root.) The entrypoint runs the website's Prisma CLI by path.
RUN set -e; \
    for m in @prisma/client xlsx jspdf jspdf-autotable node-thermal-printer nodemailer node-cron; do \
      test -d "apps/Bizflow/node_modules/$m"; \
    done; \
    test -f apps/Bizflow/node_modules/prisma/build/index.js; \
    test -f apps/website/node_modules/prisma/build/index.js

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
COPY --from=builder /app/apps/website/prisma             ./apps/website/prisma

# Some bridge code still resolves Electron-style unpacked paths; alias them in the container.
RUN mkdir -p /app/apps/app.asar.unpacked/src/generated && \
    ln -s /app/apps/Bizflow/src/generated/prisma /app/apps/app.asar.unpacked/src/generated/prisma && \
    ln -s /app/apps/Bizflow/prisma /app/apps/app.asar.unpacked/prisma

RUN mkdir -p /data/bizflow && chmod 777 /data/bizflow
RUN chmod +x /app/scripts/container-entrypoint.sh

EXPOSE 3000 8787

ENV NODE_ENV=production \
    DATABASE_URL=file:/data/bizflow/database.db \
    WEBSITE_DATABASE_URL=file:/data/bizflow/website.db \
    BRIDGE_PORT=8787 \
    NEXTAUTH_URL=http://localhost:3000 \
    NEXT_PUBLIC_BASE_PATH=${NEXT_PUBLIC_BASE_PATH} \
    NEXT_PUBLIC_SITE_URL=${NEXT_PUBLIC_SITE_URL} \
    HOSTNAME=0.0.0.0 \
    PORT=3000

ENTRYPOINT ["dumb-init", "--", "/app/scripts/container-entrypoint.sh"]
