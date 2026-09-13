#!/usr/bin/env sh
#
# ⚠️  DESTRUCTIVE — deletes the entire `bizflow-data` Docker volume, which holds
#     website.db (customers, orders, licences, support tickets) plus
#     requests.json and prices.json.
#
# This exists for LOCAL DEMOS ONLY and must never be scheduled on a production
# host. A crontab entry that ran it every 6 hours previously sat on the
# production server; it only ever failed because this file is stored
# non-executable (git mode 100644). Do not `chmod +x` it and never add it to cron.
#
# Usage (local demo machines only):
#   DEMO_RESET_CONFIRM=DELETE-DEMO-DATA sh scripts/reset-demo-data.sh
#
set -eu

CONFIRM_TOKEN="DELETE-DEMO-DATA"
BACKUP_DIR="${BIZFLOW_BACKUP_DIR:-./backups}"

if [ "${DEMO_RESET_CONFIRM:-}" != "$CONFIRM_TOKEN" ]; then
  cat >&2 <<EOF
Refusing to delete data.

This wipes the bizflow-data volume, including website.db, which holds real
customers, orders and licence keys.

If you genuinely mean it, run:
  DEMO_RESET_CONFIRM=$CONFIRM_TOKEN sh scripts/reset-demo-data.sh
EOF
  exit 1
fi

# ── Guard 1: never on a production host ───────────────────────────────────────
if [ -f "./.production" ] || [ -f "/etc/bizflow-production" ]; then
  echo "Refusing to run: this host is marked as production (found .production)." >&2
  exit 1
fi

if [ "${BIZFLOW_ENVIRONMENT:-}" = "production" ]; then
  echo "Refusing to run with BIZFLOW_ENVIRONMENT=production." >&2
  exit 1
fi

# ── Guard 2: never unattended ────────────────────────────────────────────────
# Cron and CI both run with no TTY. This is the structural guard against the
# exact failure mode that put a data-destroying command into a crontab.
if [ ! -t 0 ] && [ "${BIZFLOW_ALLOW_NON_TTY:-}" != "1" ]; then
  echo "Refusing to run without an interactive terminal." >&2
  echo "This looks like a scheduled or piped invocation." >&2
  echo "Set BIZFLOW_ALLOW_NON_TTY=1 only for a deliberate, supervised script." >&2
  exit 1
fi

# Ask the running container which volume it actually has mounted. Matching the
# name pattern alone is unsafe: this host also carries a stale, unused
# `bizflow-data` volume, so the old pattern could destroy the wrong data set.
volume_name="$(docker inspect bizflow-app \
  --format '{{range .Mounts}}{{if eq .Destination "/data/bizflow"}}{{.Name}}{{end}}{{end}}' 2>/dev/null || true)"
if [ -z "$volume_name" ]; then
  volume_name="$(docker volume ls --format '{{.Name}}' | grep -E '_bizflow-data$' | head -n 1 || true)"
fi
if [ -z "$volume_name" ]; then
  echo "Expected bizflow-data volume was not found; refusing to continue." >&2
  exit 1
fi

echo "About to DESTROY volume: $volume_name"
echo "  (contains website.db: customers, orders, licences)"

# ── Snapshot first so the reset is recoverable ────────────────────────────────
stamp="$(date +%Y%m%d-%H%M%S)"
snapshot_dir="$BACKUP_DIR/pre-demo-reset-$stamp"
mkdir -p "$snapshot_dir"
abs_snapshot="$(cd "$snapshot_dir" && pwd)"

echo "Backing up to $abs_snapshot ..."
docker run --rm -v "$volume_name":/data:ro -v "$abs_snapshot":/out alpine \
  sh -c "cp -a /data/. /out/ && ls -la /out"

echo "Stopping and removing bizflow-app ..."
docker compose stop bizflow-app
docker compose rm -f bizflow-app

echo "Removing volume $volume_name ..."
docker volume rm "$volume_name"

docker compose up -d bizflow-app nginx

echo
echo "Demo data reset. A snapshot was kept at: $abs_snapshot"
echo "Restore it with: sh scripts/restore-data.sh \"$abs_snapshot\""
