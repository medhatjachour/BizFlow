#!/usr/bin/env bash
#
# Deploy (or tear down) the staging stack.
#
#   cd /home/medhat/bizflow
#   bash scripts/deploy-staging.sh          # build + start + verify
#   bash scripts/deploy-staging.sh --down   # stop and delete the staging volume
#   bash scripts/deploy-staging.sh --smoke  # just re-run the checks
#
# Staging runs the SAME compose file under a different project name, so it gets
# its own containers, image tag and data volume. That makes it the place to find
# out whether a change breaks a fresh database, the seed scripts, or a migration
# - without risking production data.
#
# It is reached only over loopback (see docker-compose.staging.yml), so use an
# SSH tunnel from your machine:
#   ssh -L 3100:127.0.0.1:3100 medhat@168.231.107.207
#   then open http://localhost:3100
#
set -euo pipefail

PROJECT="bizflow-staging"
BASE_COMPOSE="docker-compose.yml"
STAGING_COMPOSE="docker-compose.staging.yml"
BASE_URL="http://127.0.0.1:3100"
BRIDGE_URL="http://127.0.0.1:8888"

cd "$(dirname "$0")/.."

COMPOSE=(docker compose -p "$PROJECT" -f "$BASE_COMPOSE" -f "$STAGING_COMPOSE")
ACTION="${1:-up}"

smoke() {
  echo
  echo "=== smoke test: $BASE_URL ==="
  local failed=0
  local paths=("/" "/api/status" "/api/prices" "/admin/login" "/portal/login" "/robots.txt")
  for p in "${paths[@]}"; do
    code="$(curl -s -o /dev/null -w '%{http_code}' --max-time 20 --retry 2 --retry-delay 2 "$BASE_URL$p" || echo 000)"
    if [ "$code" = "200" ]; then
      printf '  OK   %s %s\n' "$code" "$p"
    else
      printf '  FAIL %s %s\n' "$code" "$p"
      failed=1
    fi
  done

  # The bridge is what the web UI calls; /health is its own probe.
  code="$(curl -s -o /dev/null -w '%{http_code}' --max-time 20 "$BRIDGE_URL/health" || echo 000)"
  if [ "$code" = "200" ]; then
    printf '  OK   %s bridge /health\n' "$code"
  else
    printf '  FAIL %s bridge /health\n' "$code"
    failed=1
  fi

  return "$failed"
}

if [ "$ACTION" = "--down" ]; then
  echo "Tearing down staging (including its data volume) ..."
  "${COMPOSE[@]}" down -v --remove-orphans
  echo "Staging removed. Production was not touched."
  exit 0
fi

if [ "$ACTION" = "--smoke" ]; then
  smoke || { echo 'STAGING SMOKE FAILED'; exit 1; }
  echo 'staging smoke passed'
  exit 0
fi

echo "=== [1] syntax-check the compose overlay ==="
"${COMPOSE[@]}" config --quiet
echo "  compose config OK"

echo
echo "=== [2] building the staging image (tag: ${PROJECT}-bizflow-app) ==="
"${COMPOSE[@]}" build bizflow-app

echo
echo "=== [3] starting staging (fresh volume seeds a new database on first run) ==="
"${COMPOSE[@]}" up -d --force-recreate bizflow-app

echo
echo "=== [4] waiting for health ==="
status="starting"
for i in $(seq 1 36); do
  status="$(docker inspect -f '{{.State.Health.Status}}' bizflow-app-staging 2>/dev/null || echo starting)"
  printf '  attempt %s: %s\n' "$i" "$status"
  [ "$status" = "healthy" ] && break
  sleep 5
done

echo
echo "=== [5] verify ==="
smoke || true

echo
echo "=== [6] containers ==="
docker ps --filter "label=com.docker.compose.project=$PROJECT" \
  --format '{{.Names}}|{{.Status}}|{{.Ports}}' || true

echo
echo "=== [7] production untouched? ==="
docker ps --format '{{.Names}}|{{.Status}}' | grep -E '^bizflow-app\||^bizflow-nginx\|' || true

echo
echo "=== summary ==="
if [ "$status" = "healthy" ]; then
  echo "staging is healthy at $BASE_URL (loopback only)"
  echo "tunnel in with: ssh -L 3100:127.0.0.1:3100 medhat@168.231.107.207"
else
  echo "staging did NOT become healthy (status=$status)"
  echo "logs: docker logs --tail=200 bizflow-app-staging"
  exit 1
fi
