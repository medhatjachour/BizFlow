#!/usr/bin/env bash
#
# Put the previous image back after a deploy that applied but failed
# verification. Runs ON THE VPS, with the script itself arriving on stdin:
#
#   ssh medhat@168.231.107.207 'bash -s' < scripts/rollback-deploy.sh
#
# Same reasoning as scripts/apply-deploy.sh: the body used to be an inline
# double-quoted ssh argument, where bash expands backticks and $(...) on the
# runner before ssh runs, and where every remote `$` and `"` had to be escaped.
# A file has neither problem.
#
# The database is deliberately untouched - it was backed up by the apply step
# and can be restored with scripts/restore-data.sh.
#
set -euo pipefail

APP_DIR="${APP_DIR:-/home/medhat/bizflow}"

PS4='+ ${BASH_SOURCE##*/}:${LINENO}: '
set -x

cd "$APP_DIR"

if ! docker image inspect bizflow-bizflow-app:previous >/dev/null 2>&1; then
  echo 'no previous image available; cannot roll back'
  exit 0
fi

docker tag bizflow-bizflow-app:previous bizflow-bizflow-app:latest
docker compose up -d --no-build --force-recreate bizflow-app

for i in $(seq 1 24); do
  s=$(docker inspect -f '{{.State.Health.Status}}' bizflow-app 2>/dev/null || echo starting)
  [ "$s" = 'healthy' ] && break
  sleep 5
done
docker inspect -f 'ROLLBACK_STATUS={{.State.Health.Status}}' bizflow-app
