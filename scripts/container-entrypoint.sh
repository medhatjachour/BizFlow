#!/bin/sh
set -e

cd /app/apps/Bizflow
node web/.dist/server.cjs &

node /app/apps/Bizflow/web/serve-dist-web.cjs &

cd /app/apps/website
npx prisma db push --schema prisma/schema.prisma --skip-generate
exec node standalone/apps/website/server.js
