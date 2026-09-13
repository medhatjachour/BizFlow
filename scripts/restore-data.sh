#!/usr/bin/env bash
#
# Restores the BizFlow data volume from a backup produced by scripts/backup-data.sh.
#
#   cd /home/medhat/bizflow && RESTORE_CONFIRM=RESTORE-DATA sh scripts/restore-data.sh /home/medhat/bizflow-backups/20260913-190000
#
# The current volume is snapshotted first, so a restore that turns out to be the
# wrong choice can itself be undone.
#
set -euo pipefail

BACKUP_ROOT="${BIZFLOW_BACKUP_DIR:-/home/medhat/bizflow-backups}"
SNAPSHOT="${1:-}"

if [ -z "$SNAPSHOT" ] || [ ! -d "$SNAPSHOT" ]; then
  echo "Usage: sh scripts/restore-data.sh <snapshot-dir>" >&2
  echo >&2
  echo "Available snapshots:" >&2
  ls -1t "$BACKUP_ROOT" 2>/dev/null | head -10 | sed 's/^/  /' >&2 || echo "  (none)" >&2
  exit 1
fi

abs_snapshot="$(cd "$SNAPSHOT" && pwd)"

if [ "${RESTORE_CONFIRM:-}" != "RESTORE-DATA" ]; then
  cat >&2 <<EOF
Refusing to restore.

This REPLACES the live database with:
  $abs_snapshot
and any data written since that snapshot will be lost.

Run with:
  RESTORE_CONFIRM=RESTORE-DATA sh scripts/restore-data.sh "$abs_snapshot"
EOF
  exit 1
fi

# Ask the running container which volume it actually has mounted, so we never
# touch a stale same-named volume. See scripts/backup-data.sh for the rationale.
resolve_volume() {
  if [ -n "${BIZFLOW_VOLUME:-}" ]; then
    printf '%s' "$BIZFLOW_VOLUME"
    return 0
  fi

  local mounted=""
  mounted="$(docker inspect bizflow-app \
    --format '{{range .Mounts}}{{if eq .Destination "/data/bizflow"}}{{.Name}}{{end}}{{end}}' 2>/dev/null || true)"
  if [ -n "$mounted" ]; then
    printf '%s' "$mounted"
    return 0
  fi

  docker volume ls --format '{{.Name}}' | grep -E '_bizflow-data$' | head -n 1
}

VOLUME="$(resolve_volume)"
[ -n "$VOLUME" ] || { echo "could not determine the bizflow data volume" >&2; exit 1; }

# Lets the restore path be rehearsed against a scratch volume without touching
# the running production stack.
SKIP_COMPOSE="${BIZFLOW_SKIP_COMPOSE:-0}"

echo "[restore] snapshot:  $abs_snapshot"
echo "[restore] volume:    $VOLUME"
[ "$SKIP_COMPOSE" = "1" ] && echo "[restore] BIZFLOW_SKIP_COMPOSE=1 -> not touching containers"

# ── 1) Safety net: snapshot the CURRENT data first ────────────────────────────
pre="$BACKUP_ROOT/pre-restore-$(date +%Y%m%d-%H%M%S)"
mkdir -p "$pre"
echo "[restore] snapshotting current data to $pre (so this is reversible) ..."
docker run --rm -v "$VOLUME":/data:ro -v "$pre":/out alpine \
  sh -c "cp -a /data/. /out/ && ls -la /out" | sed 's/^/  /'

# ── 2) Stop the app so nothing writes mid-restore ─────────────────────────────
if [ "$SKIP_COMPOSE" != "1" ]; then
  echo "[restore] stopping bizflow-app ..."
  docker compose stop bizflow-app
else
  echo "[restore] (skipping stop)"
fi

# ── 3) Replace volume contents ────────────────────────────────────────────────
echo "[restore] replacing volume contents from the snapshot ..."
docker run --rm -v "$VOLUME":/data -v "$abs_snapshot":/in alpine sh -c '
  set -e
  # Drop stale SQLite sidecars, then swap the payload in.
  rm -rf /data/* /data/.[!.]* 2>/dev/null || true
  cp -a /in/. /data/
  # Remove any backup metadata that is not part of the runtime data set.
  rm -f /data/MANIFEST.txt
  chmod -R 777 /data
  ls -la /data
'

# ── 4) Verify the restored database ───────────────────────────────────────────
echo "[restore] verifying restored database ..."
docker run --rm -v "$VOLUME":/data:ro alpine sh -c '
  apk add --no-cache sqlite >/dev/null 2>&1
  echo "  integrity=$(sqlite3 /data/website.db "PRAGMA integrity_check;")"
  echo "  customers=$(sqlite3 /data/website.db "SELECT count(*) FROM Customer;" 2>/dev/null || echo n/a)"
  echo "  orders=$(sqlite3 /data/website.db "SELECT count(*) FROM [Order];" 2>/dev/null || echo n/a)"
  echo "  licenses=$(sqlite3 /data/website.db "SELECT count(*) FROM License;" 2>/dev/null || echo n/a)"
'

# ── 5) Restart ────────────────────────────────────────────────────────────────
if [ "$SKIP_COMPOSE" != "1" ]; then
  echo "[restore] starting bizflow-app ..."
  docker compose up -d bizflow-app nginx
else
  echo "[restore] (skipping start)"
fi

echo
echo "[restore] done."
echo "  If this was the wrong snapshot, roll back with:"
echo "  RESTORE_CONFIRM=RESTORE-DATA sh scripts/restore-data.sh \"$pre\""
