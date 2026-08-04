#!/usr/bin/env bash
set -euo pipefail

DOMAIN='medhatjachour.tech'
WWW='www.medhatjachour.tech'
EMAIL='admin@medhatjachour.tech'

run_sudo() {
  if [ -n "${SUDO_PASS:-}" ]; then
    printf '%s\n' "$SUDO_PASS" | sudo -S "$@"
  else
    sudo "$@"
  fi
}

echo '[1/6] Checking DNS resolution...'
RESOLVED_IP="$(getent ahostsv4 "$DOMAIN" | awk '{print $1; exit}')"
if [ "$RESOLVED_IP" != '168.231.107.207' ]; then
  echo "DNS not ready: $DOMAIN resolves to $RESOLVED_IP (expected 168.231.107.207)"
  exit 1
fi

echo '[2/6] Stopping nginx container if running...'
docker compose stop nginx >/dev/null 2>&1 || true

echo "[3/6] Issuing Let's Encrypt certificate..."
run_sudo certbot certonly --standalone --non-interactive --agree-tos --email "$EMAIL" -d "$DOMAIN" -d "$WWW"

echo '[4/6] Copying certs to compose ssl mount...'
mkdir -p ssl
run_sudo cp "/etc/letsencrypt/live/$DOMAIN/fullchain.pem" ssl/cert.pem
run_sudo cp "/etc/letsencrypt/live/$DOMAIN/privkey.pem" ssl/key.pem
run_sudo chown "$USER":"$USER" ssl/cert.pem ssl/key.pem
chmod 600 ssl/key.pem
chmod 644 ssl/cert.pem

echo '[5/6] Starting full stack (app + nginx)...'
docker compose up -d --build bizflow-app nginx

echo '[6/6] Done. Current status:'
docker compose ps
