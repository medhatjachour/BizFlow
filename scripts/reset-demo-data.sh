#!/usr/bin/env sh
set -eu

if [ "${DEMO_RESET_CONFIRM:-}" != "1" ]; then
  echo "Refusing to delete demo data. Set DEMO_RESET_CONFIRM=1 to continue." >&2
  exit 1
fi

docker compose stop bizflow-app
docker compose rm -f bizflow-app
volume_name="$(docker volume ls --format '{{.Name}}' | grep -E '(^|_)bizflow-data$' | head -n 1 || true)"
if [ -z "$volume_name" ]; then
  echo "Expected bizflow-data volume was not found; refusing to continue." >&2
  exit 1
fi
docker volume rm "$volume_name"
docker compose up -d bizflow-app nginx
echo "Demo data reset and containers restarted."