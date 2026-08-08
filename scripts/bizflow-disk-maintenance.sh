#!/usr/bin/env bash
set -euo pipefail

LOG="${HOME}/.config/bizflow/disk-maintenance.log"
mkdir -p "$(dirname "$LOG")"

{
  date '+%Y-%m-%d %H:%M:%S start'
  echo "before:"
  docker system df || true

  # Safe policy: clean ALL unused build cache each run.
  # This never removes running containers or active named volumes.
  docker builder prune -af || true

  # Remove dangling image layers only (not tagged images in use).
  docker image prune -f || true

  echo "after:"
  docker system df || true
  date '+%Y-%m-%d %H:%M:%S done'
  echo
} >> "$LOG" 2>&1
