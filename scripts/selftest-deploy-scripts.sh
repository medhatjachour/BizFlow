#!/usr/bin/env bash
# Self-test for scripts/apply-deploy.sh and scripts/rollback-deploy.sh.
#
# Both scripts are run on the VPS as `ssh host "bash -s -- <sha>" < scripts/x.sh`,
# so the only way to know they still work is to feed them through that same
# stdin transport against a scratch APP_DIR with docker stubbed out. Run 86
# failed in two seconds with `BASH_SOURCE: unbound variable` precisely because
# the scripts were verified as files and never through stdin, so this harness
# exercises stdin for every case and file mode as well.
#
# Usage:  bash scripts/selftest-deploy-scripts.sh [repo-root]
#
# Safe to run anywhere: PATH is narrowed to the stub directory for every call,
# so the real docker CLI (present on the Git-Bash PATH on Windows) can never be
# reached and no container, image or volume is touched.

set -uo pipefail

SCRIPT_PATH="${BASH_SOURCE[0]:-$0}"
REPO="${1:-$(cd "$(dirname "$SCRIPT_PATH")/.." && pwd)}"
APPLY="$REPO/scripts/apply-deploy.sh"
ROLLBACK="$REPO/scripts/rollback-deploy.sh"

for f in "$APPLY" "$ROLLBACK"; do
  if [ ! -f "$f" ]; then echo "missing script: $f" >&2; exit 2; fi
done

WORK="$(mktemp -d)"
trap 'rm -rf "$WORK"' EXIT
mkdir -p "$WORK/bin" "$WORK/app/apps/website/src" "$WORK/app/apps/website/tests" "$WORK/app/scripts"
mkdir -p "$WORK/payload/apps/website/src" "$WORK/payload/apps/website/tests"
echo old > "$WORK/app/apps/website/src/old.ts"
echo old > "$WORK/app/apps/website/tests/old.test.ts"
echo keep > "$WORK/app/apps/website/README.md"
printf '#!/usr/bin/env bash\necho "[stub] backup-data.sh ran"\n' > "$WORK/app/scripts/backup-data.sh"
echo new > "$WORK/payload/apps/website/src/new.ts"
echo new > "$WORK/payload/apps/website/tests/new.test.ts"

# Quiet stubs: they must not echo anything the script then compares against a
# health status, or every retry in the health loop prints and the loop runs out.
cat > "$WORK/bin/docker" <<'EOF'
#!/usr/bin/env bash
if [ "${1:-}" = "inspect" ] && [ "${2:-}" != "image" ]; then
  echo healthy
  exit 0
fi
printf 'docker %s [BUILD_COMMIT=%s]\n' "$*" "${BUILD_COMMIT:-<unset>}"
if [ "${1:-}" = "image" ]; then exit "${STUB_HAVE_PREVIOUS:-0}"; fi
exit 0
EOF
cat > "$WORK/bin/curl" <<'EOF'
#!/usr/bin/env bash
echo '{"ok":true,"service":"bizflow-website","commit":"LOCAL-HARNESS"}'
EOF
chmod +x "$WORK/bin/docker" "$WORK/bin/curl"
RUNPATH="$WORK/bin:/usr/bin:/bin"

fail=0
ok()   { echo "  PASS $1"; }
bad()  { echo "  FAIL $1"; fail=1; }
want() { if grep -qF -- "$2" "$3"; then ok "$1"; else bad "$1 (missing: $2)"; fi }
nope() { if grep -qF -- "$2" "$3"; then bad "$1 (unexpected: $2)"; else ok "$1"; fi }

echo "=== A: a missing payload must not clear the source trees (stdin) ==="
PATH="$RUNPATH" PAYLOAD_DIR="$WORK/absent" APP_DIR="$WORK/app" \
  timeout 30 bash -s -- deadbeef < "$APPLY" > "$WORK/a.log" 2>&1
echo "  exit=$?"
[ -f "$WORK/app/apps/website/src/old.ts" ] && ok "old source survived" || bad "old source was wiped with no payload"
want "explains why it refused" "run the sync step first" "$WORK/a.log"
nope "never reached the build" "docker compose up" "$WORK/a.log"
if grep -q "BASH_SOURCE" "$WORK/a.log"; then bad "BASH_SOURCE is still unbound under bash -s"; else ok "no BASH_SOURCE failure under bash -s"; fi

echo
echo "=== B: a real run over stdin applies, backs up, tags and stamps the commit ==="
SHA=1f0c9a7c0ffee1234567890abcdefabcdef12345
PATH="$RUNPATH" PAYLOAD_DIR="$WORK/payload" APP_DIR="$WORK/app" \
  timeout 60 bash -s -- "$SHA" < "$APPLY" > "$WORK/b.log" 2>&1
echo "  exit=$?"
[ -f "$WORK/app/apps/website/src/new.ts" ] && ok "payload source arrived" || bad "payload source missing"
[ ! -e "$WORK/app/apps/website/src/old.ts" ] && ok "stale source deleted" || bad "stale source survived"
[ ! -e "$WORK/app/apps/website/tests/old.test.ts" ] && ok "stale test deleted" || bad "stale test survived"
[ -f "$WORK/app/apps/website/README.md" ] && ok "untouched sibling file kept" || bad "sibling file lost"
want "backup ran" "backup-data.sh ran" "$WORK/b.log"
want "current image tagged for rollback" "tag bizflow-bizflow-app:latest bizflow-bizflow-app:previous" "$WORK/b.log"
want "compose config checked" "compose config --quiet" "$WORK/b.log"
want "commit reached compose" "compose up -d --build [BUILD_COMMIT=$SHA]" "$WORK/b.log"
want "health read" "STATUS={{.State.Health.Status}}" "$WORK/b.log"
want "runtime stamp echoed" 'RUNTIME_VERSION={"ok":true' "$WORK/b.log"
nope "no stray loop retries" "sleep 5" "$WORK/b.log"
if grep -q "+ apply-deploy.sh:[0-9]*:" "$WORK/b.log"; then ok "traces name apply-deploy.sh with a line number"; else bad "trace prefix is not apply-deploy.sh:LINE"; fi
b=$(grep -n "backup-data.sh ran" "$WORK/b.log" | head -1 | cut -d: -f1)
u=$(grep -n "compose up -d --build" "$WORK/b.log" | head -1 | cut -d: -f1)
if [ "$b" -lt "$u" ]; then ok "backup precedes the build"; else bad "backup ran after the build"; fi

echo
echo "=== C: BUILD_COMMIT in the environment is used when no argument is given ==="
PATH="$RUNPATH" PAYLOAD_DIR="$WORK/payload" APP_DIR="$WORK/app" BUILD_COMMIT=env-fed-sha \
  timeout 60 bash -s < "$APPLY" > "$WORK/c.log" 2>&1
echo "  exit=$?"
want "env commit reached compose" "compose up -d --build [BUILD_COMMIT=env-fed-sha]" "$WORK/c.log"

echo
echo "=== D: rollback over stdin ==="
PATH="$RUNPATH" APP_DIR="$WORK/app" STUB_HAVE_PREVIOUS=0 \
  timeout 60 bash -s < "$ROLLBACK" > "$WORK/d1.log" 2>&1
echo "  exit=$?"
want "previous image retagged as latest" "tag bizflow-bizflow-app:previous bizflow-bizflow-app:latest" "$WORK/d1.log"
want "container recreated from it" "compose up -d --no-build --force-recreate bizflow-app" "$WORK/d1.log"
want "rollback health reported" "ROLLBACK_STATUS={{.State.Health.Status}}" "$WORK/d1.log"
if grep -q "+ rollback-deploy.sh:[0-9]*:" "$WORK/d1.log"; then ok "traces name rollback-deploy.sh with a line number"; else bad "rollback trace prefix missing"; fi
PATH="$RUNPATH" APP_DIR="$WORK/app" STUB_HAVE_PREVIOUS=1 \
  timeout 60 bash -s < "$ROLLBACK" > "$WORK/d2.log" 2>&1
echo "  exit=$?"
want "no-previous case explains itself" "no previous image available; cannot roll back" "$WORK/d2.log"
nope "did not touch the running container" "force-recreate" "$WORK/d2.log"

echo
echo "=== E: file mode still works, for when the scripts are run directly ==="
PATH="$RUNPATH" PAYLOAD_DIR="$WORK/payload" APP_DIR="$WORK/app" \
  timeout 60 bash "$APPLY" filesha > "$WORK/e.log" 2>&1
echo "  exit=$?"
if grep -q "+ apply-deploy.sh:[0-9]*:" "$WORK/e.log"; then ok "file mode traces the same way"; else bad "file mode trace prefix missing"; fi
want "file mode still stamps the commit" "compose up -d --build [BUILD_COMMIT=filesha]" "$WORK/e.log"

echo
if [ "$fail" -eq 0 ]; then echo "HARNESS: ALL CHECKS PASSED"; else echo "HARNESS: FAILURES PRESENT"; fi
exit "$fail"
