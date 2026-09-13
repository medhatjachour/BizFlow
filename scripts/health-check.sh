#!/usr/bin/env bash
#
# Uptime check for the public BizFlow / TransHub endpoints.
#
#   bash scripts/health-check.sh
#
# Alerts by email (via the SMTP credentials already in .env) when a check starts
# failing, sends ONE recovery email when everything is healthy again, and
# re-nags every BIZFLOW_ALERT_REPEAT_MINUTES while still down. The state file
# keeps cron from emailing you every 5 minutes.
#
# Install (every 5 minutes):
#   */5 * * * * cd /home/medhat/bizflow && /usr/bin/bash scripts/health-check.sh >> /home/medhat/.config/bizflow/health.log 2>&1
#
set -uo pipefail

cd "$(dirname "$0")/.." || exit 1

ENV_FILE="${BIZFLOW_ENV_FILE:-./.env}"
STATE_DIR="${HOME}/.config/bizflow"
STATE_FILE="${STATE_DIR}/health-state"
LOG_PREFIX="[health]"
ALERT_TO="${BIZFLOW_ALERT_EMAIL:-}"
REPEAT_MINUTES="${BIZFLOW_ALERT_REPEAT_MINUTES:-360}"

mkdir -p "$STATE_DIR"

log() { printf '%s %s\n' "$LOG_PREFIX" "$*"; }

env_val() {
  [ -f "$ENV_FILE" ] || return 0
  grep -E "^$1=" "$ENV_FILE" | head -1 | cut -d= -f2- | tr -d '\r'
}

# ── What to check ─────────────────────────────────────────────────────────────
# Format: "URL|expected_status|description"
CHECKS=(
  "https://medhatjachour.tech/|200|Portfolio (root domain)"
  "https://www.bizflow.medhatjachour.tech/|200|BizFlow website"
  "https://www.bizflow.medhatjachour.tech/health|200|BizFlow bridge health"
  "https://www.bizflow.medhatjachour.tech/api/prices|200|BizFlow prices API"
  "https://www.bizflow.medhatjachour.tech/admin/login|200|Admin login page"
  "https://www.transhub.medhatjachour.tech/|200|TransHub"
)

failures=()

for entry in "${CHECKS[@]}"; do
  url="${entry%%|*}"
  rest="${entry#*|}"
  expected="${rest%%|*}"
  label="${rest#*|}"

  code="$(curl -s -o /dev/null -w '%{http_code}' --max-time 20 \
    --retry 2 --retry-delay 3 --retry-all-errors "$url" 2>/dev/null || echo 000)"

  if [ "$code" != "$expected" ]; then
    failures+=("$label: got HTTP $code, expected $expected ($url)")
  elif [ "${BIZFLOW_HEALTH_VERBOSE:-0}" = "1" ]; then
    log "OK   $code $label"
  fi
done

# ── Local checks ──────────────────────────────────────────────────────────────
# These catch the failures that will not show up as a non-200 until it is too
# late: a full disk, an expiring certificate, or backups that quietly stopped.

DISK_MAX_PERCENT="${BIZFLOW_DISK_MAX_PERCENT:-85}"
used_pct="$(df -P / | awk 'NR==2 {gsub(/%/,"",$5); print $5}')"
if [ -n "$used_pct" ] && [ "$used_pct" -ge "$DISK_MAX_PERCENT" ] 2>/dev/null; then
  failures+=("Disk usage on / is ${used_pct}% (threshold ${DISK_MAX_PERCENT}%)")
elif [ "${BIZFLOW_HEALTH_VERBOSE:-0}" = "1" ]; then
  log "OK   disk / at ${used_pct}%"
fi

# Docker keeps its own copy of everything it has ever built, and that was
# invisible to the check above until the filesystem itself filled up: a build
# cache that grows on every deploy took this host from 12% to 22% in one
# afternoon. Watch Docker's own footprint separately so it is caught while there
# is still room to do something about it.
if command -v docker >/dev/null 2>&1; then
  # Docker reports sizes as "1.324GB" / "414.2MB"; turn one into bytes.
  bytes_of() {
    awk -v v="$1" 'BEGIN{
      n = v; sub(/[A-Za-z].*/, "", n)
      u = v; sub(/^[0-9.]+/, "", u)
      m = 1
      if      (u == "kB") m = 1000
      else if (u == "MB") m = 1000000
      else if (u == "GB") m = 1000000000
      else if (u == "TB") m = 1000000000000
      printf "%.0f", n * m
    }'
  }

  docker_total=0
  docker_reclaim=0
  while IFS='|' read -r size reclaim; do
    [ -n "$size" ] || continue
    b="$(bytes_of "$size")"
    r="$(bytes_of "${reclaim%% *}")"
    docker_total=$(( docker_total + ${b:-0} ))
    docker_reclaim=$(( docker_reclaim + ${r:-0} ))
  done <<EOF
$(docker system df --format '{{.Size}}|{{.Reclaimable}}' 2>/dev/null)
EOF

  DOCKER_MAX_GB="${BIZFLOW_DOCKER_MAX_GB:-30}"
  docker_total_gb=$(( docker_total / 1000000000 ))
  docker_reclaim_gb=$(( docker_reclaim / 1000000000 ))

  if [ "$docker_total" -gt 0 ] && [ "$docker_total_gb" -ge "$DOCKER_MAX_GB" ]; then
    failures+=("Docker is holding ${docker_total_gb}GB on disk (threshold ${DOCKER_MAX_GB}GB, ${docker_reclaim_gb}GB reclaimable) -- run: docker builder prune -af && docker image prune -f")
  elif [ "${BIZFLOW_HEALTH_VERBOSE:-0}" = "1" ]; then
    log "OK   docker footprint ${docker_total_gb}GB (${docker_reclaim_gb}GB reclaimable)"
  fi
fi

CERT_WARN_DAYS="${BIZFLOW_CERT_WARN_DAYS:-21}"
SSL_DIR="${BIZFLOW_SSL_DIR:-./ssl}"
for cert in "$SSL_DIR"/*-cert.pem "$SSL_DIR"/cert.pem; do
  [ -f "$cert" ] || continue
  name="$(basename "$cert")"
  end="$(openssl x509 -in "$cert" -noout -enddate 2>/dev/null | cut -d= -f2)"
  if [ -z "$end" ]; then
    failures+=("Certificate $name could not be parsed")
    continue
  fi
  end_epoch="$(date -d "$end" +%s 2>/dev/null || echo 0)"
  days_left=$(( (end_epoch - $(date +%s)) / 86400 ))
  if [ "$days_left" -lt "$CERT_WARN_DAYS" ]; then
    failures+=("Certificate $name expires in ${days_left} days (${end}) -- renew and copy into ./ssl, then reload nginx")
  elif [ "${BIZFLOW_HEALTH_VERBOSE:-0}" = "1" ]; then
    log "OK   $name valid for ${days_left}d"
  fi
done

# A backup that silently stopped is worse than no backup: alert on staleness.
BACKUP_ROOT="${BIZFLOW_BACKUP_DIR:-/home/medhat/bizflow-backups}"
BACKUP_MAX_AGE_H="${BIZFLOW_BACKUP_MAX_AGE_HOURS:-36}"
if [ -d "$BACKUP_ROOT" ]; then
  newest="$(find "$BACKUP_ROOT" -maxdepth 1 -mindepth 1 -type d -name '20*' -printf '%T@ %f\n' 2>/dev/null | sort -rn | head -1 | cut -d' ' -f1)"
  if [ -z "$newest" ]; then
    failures+=("No database backups found in $BACKUP_ROOT")
  else
    age_h=$(( ( $(date +%s) - ${newest%.*} ) / 3600 ))
    if [ "$age_h" -gt "$BACKUP_MAX_AGE_H" ]; then
      failures+=("Newest database backup is ${age_h}h old (threshold ${BACKUP_MAX_AGE_H}h) -- check scripts/backup-data.sh")
    elif [ "${BIZFLOW_HEALTH_VERBOSE:-0}" = "1" ]; then
      log "OK   newest backup is ${age_h}h old"
    fi
  fi
else
  failures+=("Backup directory $BACKUP_ROOT does not exist")
fi

# ── Email ─────────────────────────────────────────────────────────────────────
send_mail() {
  local subject="$1"
  local body="$2"

  local host user pass port from secure url
  local -a tls_args=()
  host="$(env_val SMTP_HOST)"
  port="$(env_val SMTP_PORT)"
  user="$(env_val SMTP_USER)"
  pass="$(env_val SMTP_PASS)"
  secure="$(env_val SMTP_SECURE)"
  from="$(env_val REQUEST_MAIL_FROM)"
  [ -n "$from" ] || from="$user"
  [ -n "$host" ] || host="smtp.gmail.com"
  [ -n "$port" ] || port="587"

  # Mirror the app's nodemailer config: SMTP_SECURE=true means implicit TLS
  # (normally port 465), otherwise connect plainly and upgrade via STARTTLS.
  # Getting this wrong yields a confusing "SSL connect error" (curl rc=35).
  if [ "$(printf '%s' "$secure" | tr '[:upper:]' '[:lower:]')" = "true" ] || [ "$port" = "465" ]; then
    url="smtps://${host}:${port}"
  else
    url="smtp://${host}:${port}"
    tls_args=(--ssl-reqd)
  fi

  if [ -z "$user" ] || [ -z "$pass" ]; then
    log "WARNING: SMTP not configured; cannot send alert"
    return 1
  fi

  local to="$ALERT_TO"
  [ -n "$to" ] || to="$(env_val REQUEST_MAIL_TO)"
  if [ -z "$to" ]; then
    log "WARNING: no alert recipient; cannot send alert"
    return 1
  fi

  {
    printf 'From: BizFlow Monitor <%s>\r\n' "$from"
    printf 'To: %s\r\n' "$to"
    printf 'Subject: %s\r\n' "$subject"
    printf 'Content-Type: text/plain; charset=UTF-8\r\n'
    printf '\r\n'
    printf '%s\r\n' "$body"
  } | curl -sS --max-time 30 --url "$url" ${tls_args[@]+"${tls_args[@]}"} \
        --user "${user}:${pass}" \
        --mail-from "$from" --mail-rcpt "$to" \
        --upload-file - >/dev/null 2>"/tmp/health-mail.err"

  local rc=$?
  if [ $rc -eq 0 ]; then
    log "alert email sent to $to"
    return 0
  fi
  log "WARNING: failed to send alert email (curl rc=$rc): $(tail -1 /tmp/health-mail.err 2>/dev/null)"
  return 1
}

# ── State transitions ─────────────────────────────────────────────────────────
prev_state="ok"
prev_epoch=0
if [ -f "$STATE_FILE" ]; then
  prev_state="$(cut -d' ' -f1 "$STATE_FILE" 2>/dev/null || echo ok)"
  prev_epoch="$(cut -d' ' -f2 "$STATE_FILE" 2>/dev/null || echo 0)"
  case "$prev_state" in ok|down) ;; *) prev_state="ok" ;; esac
  case "$prev_epoch" in ''|*[!0-9]*) prev_epoch=0 ;; esac
fi

now="$(date +%s)"
hostname="$(hostname)"
stamp="$(date -u '+%Y-%m-%d %H:%M:%SZ')"

if [ "${#failures[@]}" -eq 0 ]; then
  if [ "$prev_state" = "down" ]; then
    log "recovered - all checks passing again"
    send_mail "[BizFlow] RECOVERED - all checks passing" \
"All monitored endpoints are healthy again as of ${stamp} (UTC) on ${hostname}.

Previously failing:
$(cat "${STATE_DIR}/health-last-failure" 2>/dev/null || echo '  (details unavailable)')"
  fi
  # Intentionally silent while healthy: logging 6 lines every 5 minutes would
  # bloat health.log for no benefit. Set BIZFLOW_HEALTH_VERBOSE=1 to see detail.
  printf 'ok %s\n' "$now" > "$STATE_FILE"
  exit 0
fi

# Something is down.
detail="$(printf '  - %s\n' "${failures[@]}")"
printf '%s\n' "$detail" > "${STATE_DIR}/health-last-failure"

log "FAILURES DETECTED:"
printf '%s\n' "$detail" | while IFS= read -r line; do log "$line"; done

elapsed_min=$(( (now - prev_epoch) / 60 ))

if [ "$prev_state" != "down" ]; then
  send_mail "[BizFlow] DOWN - ${#failures[@]} check(s) failing" \
"Health check failed at ${stamp} (UTC) on ${hostname}.

Failing checks:
${detail}

Next step: ssh medhat@168.231.107.207 and run 'cd ~/bizflow && docker compose ps'."
  printf 'down %s\n' "$now" > "$STATE_FILE"
elif [ "$elapsed_min" -ge "$REPEAT_MINUTES" ]; then
  send_mail "[BizFlow] STILL DOWN (${elapsed_min}m)" \
"Still failing after ${elapsed_min} minutes as of ${stamp} (UTC).

Failing checks:
${detail}"
  printf 'down %s\n' "$now" > "$STATE_FILE"
else
  log "still down (${elapsed_min}m since last alert); not re-alerting yet"
fi

exit 1
