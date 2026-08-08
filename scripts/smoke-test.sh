#!/bin/sh
set -e
BASE="https://127.0.0.1"
pass=0; fail=0

check() {
  code=$(curl -k -sS -o /dev/null -w '%{http_code}' "$1")
  if [ "$code" = "200" ]; then
    printf "PASS  %-35s %s\n" "$2" "$code"
    pass=$((pass+1))
  else
    printf "FAIL  %-35s %s\n" "$2" "$code"
    fail=$((fail+1))
  fi
}

check "$BASE/bizflow"                        HOME
check "$BASE/bizflow/robots.txt"             ROBOTS
check "$BASE/bizflow/sitemap.xml"            SITEMAP
check "$BASE/bizflow/admin/login"            ADMIN_LOGIN
check "$BASE/bizflow/portal/login"           PORTAL_LOGIN
check "$BASE/bizflow/api/prices"             PRICES_API
check "$BASE/app/"                           APP_UI
check "http://127.0.0.1:8787/health"         BRIDGE_HEALTH

for id in commerce bakery restaurant coffee warehouse clinic vet pharmacy gym; do
  check "$BASE/bizflow/plugins/$id"  "PLUGIN_$id"
done

# Test admin login works with correct password (reads from /tmp/admin-login-body.json)
code=$(curl -k -sS -o /dev/null -w '%{http_code}' -X POST -H 'content-type: application/json' \
  --data-binary @/tmp/admin-login-body.json "$BASE/bizflow/api/admin/login")
if [ "$code" = "200" ]; then
  printf "PASS  %-35s %s\n" "ADMIN_AUTH" "$code"
  pass=$((pass+1))
else
  printf "FAIL  %-35s %s\n" "ADMIN_AUTH" "$code"
  fail=$((fail+1))
fi

echo ""
echo "Results: $pass passed, $fail failed"
[ $fail -eq 0 ]
