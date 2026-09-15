#!/usr/bin/env bash
#
# Apply a synced payload and rebuild production. Runs ON THE VPS, with the script
# itself arriving on stdin:
#
#   ssh medhat@168.231.107.207 "bash -s -- <commit-sha>" < scripts/apply-deploy.sh
#
# Why a file instead of an inline `ssh "..."` body
# -----------------------------------------------
# This body used to live in .github/workflows/deploy.yml as one huge
# double-quoted ssh argument, and that quoting was a live bug: bash expands
# backticks inside double quotes on the machine that runs the workflow, so two
# backticks in that body's comments were executed on the *runner* before ssh
# ever saw the string. The first printed `cp: missing file operand`; the second
# was the word env, which spliced the runner's entire environment - secrets
# included - into the remote script, where the lines are no longer inside a
# comment. The run then died with `bash: line 25: ...: command not found`, exit
# 127, before the backup or the image tag, and the deploy was reported as a
# failure with no filename to point at.
#
# Shipping the body as a tracked file deletes the whole failure class: the
# runner pipes bytes and never parses this text, so nothing here can be expanded
# by anything other than the shell running it on the VPS. Escaping tricks
# (\$VAR, \"...\") for the remote shell are gone for the same reason.
#
# Arguments / environment
# -----------------------
#   $1              commit being deployed; falls back to $BUILD_COMMIT, then
#                   to "unknown" (which the smoke test rejects - the image must
#                   be able to name the commit it was built from)
#   APP_DIR         production checkout        (default /home/medhat/bizflow)
#   PAYLOAD_DIR     the synced payload         (default /tmp/bizflow-ci-deploy)
#
# APP_DIR and PAYLOAD_DIR exist so this can be exercised off the VPS in a
# scratch directory with the docker calls stubbed out.
#
set -euo pipefail

commit="${1:-${BUILD_COMMIT:-unknown}}"
APP_DIR="${APP_DIR:-/home/medhat/bizflow}"
PAYLOAD_DIR="${PAYLOAD_DIR:-/tmp/bizflow-ci-deploy}"

# The body no longer appears in the CI log the way an inline command did, so
# every command prints itself - prefixed with the file and line that issued it,
# which is what the inline form could not give (it reported "bash: line 25").
#
# BASH_SOURCE is unset when bash reads the script from stdin - which is exactly
# how the workflow runs it - and `set -u` turns that reference into a fatal
# error, so the name has a fallback.
SCRIPT_NAME="${BASH_SOURCE[0]:-apply-deploy.sh}"
PS4='+ ${SCRIPT_NAME##*/}:${LINENO}: '
set -x

if [ ! -d "$PAYLOAD_DIR" ]; then
  # Checked before the source trees are cleared below: applying a wiped tree and
  # then failing would leave the checkout unusable until the next sync.
  echo "payload $PAYLOAD_DIR does not exist - run the sync step first" >&2
  exit 1
fi

cd "$APP_DIR"

# cp -a overlays; it never deletes. A route file deleted from the repo would
# otherwise keep being served by every later build, so the website source trees
# are cleared and restored wholesale from the payload. Everything under them is
# tracked - runtime data lives in the bizflow-data volume, secrets in .env and
# TLS in ./ssl, none of which the payload touches.
rm -rf apps/website/src apps/website/tests
cp -a "$PAYLOAD_DIR/." .

# Baked into the image at build time (Docker build arg -> next.config env), so
# the smoke test can prove the container answering requests was built from this
# commit rather than from stale sources. compose interpolates the variable from
# this shell's environment, which is why it is exported here rather than passed
# to a single command.
export BUILD_COMMIT="$commit"

echo '--- pre-deploy data backup ---'
# Fail-safe: refuse to deploy without a restore point. If this breaks, fix
# backups rather than shipping without one.
bash scripts/backup-data.sh

echo '--- tag the current image so we can roll back ---'
if docker image inspect bizflow-bizflow-app:latest >/dev/null 2>&1; then
  docker tag bizflow-bizflow-app:latest bizflow-bizflow-app:previous
  echo 'tagged bizflow-bizflow-app:previous'
else
  echo 'no existing image to tag (first deploy?)'
fi

docker compose config --quiet
docker compose up -d --build
echo 'Waiting for healthy...'
for i in $(seq 1 24); do
  s=$(docker inspect -f '{{.State.Health.Status}}' bizflow-app 2>/dev/null || echo starting)
  [ "$s" = 'healthy' ] && break
  sleep 5
done
docker inspect -f 'STATUS={{.State.Health.Status}}' bizflow-app

# Record what the running container says it was built from. The smoke test
# asserts this, so a mismatch fails the run and rolls back.
echo "RUNTIME_VERSION=$(curl -s http://127.0.0.1:3000/api/version || true)"
