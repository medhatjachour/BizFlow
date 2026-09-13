#!/usr/bin/env bash
#
# Backs up the BizFlow production data volume.
#
#   website.db  — customers, orders, licences, support tickets (SQLite)
#   *.json      — requests / prices / legacy order stores
#
# Uses SQLite's own backup API (`.backup`) rather than `cp`, because copying a
# live SQLite file can capture a torn page or miss WAL contents. Then it VERIFIES
# the snapshot with `PRAGMA integrity_check` and reports row counts, so a corrupt
# backup is detected at backup time instead of at restore time.
#
# Run from the compose directory (the repo root on the VPS):
#   cd /home/medhat/bizflow && sh scripts/backup-data.sh
#
# Env overrides:
#   BIZFLOW_BACKUP_DIR        destination root (default: /home/medhat/bizflow-backups)
#   BIZFLOW_BACKUP_KEEP_DAYS  retention in days (default: 30)
#   BIZFLOW_VOLUME            volume name (auto-detected if unset)
#   BIZFLOW_BACKUP_REMOTE     optional rsync target for an off-box copy
#
set -euo pipefail

BACKUP_ROOT="${BIZFLOW_BACKUP_DIR:-/home/medhat/bizflow-backups}"
KEEP_DAYS="${BIZFLOW_BACKUP_KEEP_DAYS:-30}"
REMOTE="${BIZFLOW_BACKUP_REMOTE:-}"

log() { printf '[backup] %s\n' "$*"; }
fail() { printf '[backup] ERROR: %s\n' "$*" >&2; exit 1; }

# ── Locate the data volume ────────────────────────────────────────────────────
# Ask the running container which volume it actually has mounted. Matching on
# the name pattern alone is unsafe: this host also carries a stale, unused
# `bizflow-data` volume, and picking that one would silently "back up" nothing.
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

  # Fallback: only the compose-project-prefixed name, never the bare legacy one.
  docker volume ls --format '{{.Name}}' | grep -E '_bizflow-data$' | head -n 1
}

VOLUME="$(resolve_volume)"
[ -n "$VOLUME" ] || fail "could not determine the bizflow data volume"
log "volume: $VOLUME"

stamp="$(date +%Y%m%d-%H%M%S)"
dest="$BACKUP_ROOT/$stamp"
mkdir -p "$dest"

# ── 1) Snapshot ───────────────────────────────────────────────────────────────
# The volume is mounted read-write because SQLite's backup API needs to take a
# read lock and may need the WAL sidecar files. It does not modify the source.
log "snapshotting to $dest ..."
docker run --rm \
  -v "$VOLUME":/data \
  -v "$dest":/out \
  alpine sh -c '
    set -e
    apk add --no-cache sqlite >/dev/null 2>&1

    if [ -f /data/website.db ]; then
      sqlite3 /data/website.db ".backup /out/website.db"
      echo "  website.db snapshotted"
    else
      echo "  WARNING: /data/website.db not found"
    fi

    # JSON stores (requests.json, prices.json, orders.json ...)
    for f in /data/*.json; do
      [ -e "$f" ] || continue
      cp -a "$f" /out/
      echo "  $(basename "$f") copied"
    done
  '

# ── 2) Verify ─────────────────────────────────────────────────────────────────
log "verifying snapshot ..."
verify_output="$(docker run --rm -v "$dest":/out alpine sh -c '
  set -e
  apk add --no-cache sqlite >/dev/null 2>&1
  [ -f /out/website.db ] || { echo "MISSING_DB"; exit 0; }
  integrity="$(sqlite3 /out/website.db "PRAGMA integrity_check;")"
  echo "integrity=$integrity"
  echo "customers=$(sqlite3 /out/website.db "SELECT count(*) FROM Customer;" 2>/dev/null || echo n/a)"
  echo "orders=$(sqlite3 /out/website.db "SELECT count(*) FROM [Order];" 2>/dev/null || echo n/a)"
  echo "licenses=$(sqlite3 /out/website.db "SELECT count(*) FROM License;" 2>/dev/null || echo n/a)"
  echo "customers_json=$(test -f /out/requests.json && echo present || echo absent)"
')"
echo "$verify_output" | sed 's/^/  /'

if ! echo "$verify_output" | grep -q 'integrity=ok'; then
  rm -rf "$dest"
  fail "backup failed verification and was discarded:
$verify_output"
fi

# ── 3) Manifest ───────────────────────────────────────────────────────────────
{
  echo "created=$(date -u +%Y-%m-%dT%H:%M:%SZ)"
  echo "volume=$VOLUME"
  echo "host=$(hostname)"
  echo "$verify_output"
} > "$dest/MANIFEST.txt"

du -sh "$dest" | sed 's/^/[backup] size: /'

# ── 4) Optional off-box copy ──────────────────────────────────────────────────
if [ -n "$REMOTE" ]; then
  log "syncing off-box to $REMOTE ..."
  if command -v rsync >/dev/null 2>&1; then
    rsync -az --delete "$BACKUP_ROOT/" "$REMOTE/" && log "off-box copy complete"
  else
    log "WARNING: BIZFLOW_BACKUP_REMOTE is set but rsync is not installed"
  fi
else
  log "NOTE: no BIZFLOW_BACKUP_REMOTE set - this backup is on the same disk as the data"
fi

# ── 5) Rotation ───────────────────────────────────────────────────────────────
log "rotating backups older than ${KEEP_DAYS} days ..."
find "$BACKUP_ROOT" -maxdepth 1 -mindepth 1 -type d -mtime "+$KEEP_DAYS" -print -exec rm -rf {} + || true

log "done. kept:"
ls -1 "$BACKUP_ROOT" | tail -5 | sed 's/^/  /'
