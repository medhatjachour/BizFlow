#!/bin/sh
set -e

cd /app/apps/Bizflow
node web/.dist/server.cjs &

node /app/apps/Bizflow/web/serve-dist-web.cjs &

cd /app/apps/website
# Run the app's own Prisma CLI by path. `npx prisma` would fall back to downloading the
# latest major if the local install were ever missing, and Prisma 7 rejects this schema's
# `url = env(...)` datasource - a failure that would crash the container on boot.
node node_modules/prisma/build/index.js db push --schema prisma/schema.prisma --skip-generate
exec node standalone/apps/website/server.js
