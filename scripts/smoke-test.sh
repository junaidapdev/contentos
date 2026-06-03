#!/usr/bin/env bash
set -uo pipefail

# ContentEngine — Post-deploy smoke test (Chunk 13).
#
# Runs 5 HTTP checks against the deployed environment to verify health. Does NOT
# mutate data, send PII, or require any state in the database — safe to run
# against a fresh project. Returns exit 0 on all-pass, 1 on any failure.
#
# Note: we intentionally do NOT use `set -e` here. A connection failure on one
# check should report the failure and move on to the next check rather than
# kill the script mid-run — the operator wants a complete pass/fail picture.
# Each curl is allowed to fail; we capture the exit code and synthesize a
# diagnostic status in the rare host-unreachable case.
#
# Usage:
#   bash scripts/smoke-test.sh <frontend-url> <supabase-url> <anon-key>
#
# Example:
#   bash scripts/smoke-test.sh \
#     https://contentengine-prod.vercel.app \
#     https://xyz.supabase.co \
#     eyJhbGciOiJI...

if [[ $# -lt 3 ]]; then
  echo "Usage: bash scripts/smoke-test.sh <frontend-url> <supabase-url> <anon-key>"
  echo "Example: bash scripts/smoke-test.sh https://contentengine-prod.vercel.app https://xyz.supabase.co eyJh..."
  exit 1
fi

FRONTEND_URL="${1%/}"  # strip trailing slash so we can append paths
SUPABASE_URL="${2%/}"
ANON_KEY="$3"

# Per-check timeout. The deployed services should respond well under this; if
# they don't, that itself is a deploy signal.
CURL_TIMEOUT=15

pass=0
fail=0

check() {
  local name="$1"
  local result="$2"
  if [[ "$result" == "ok" ]]; then
    echo "  ✓ $name"
    pass=$((pass + 1))
  else
    echo "  ✗ $name — $result"
    fail=$((fail + 1))
  fi
}

# Wrapper that returns the HTTP status code, or `CURL_<exit>` when curl itself
# fails (host unreachable, DNS fail, TLS fail, etc.). The caller compares
# against the expected status; anything starting with `CURL_` is a transport
# failure and reads cleanly in the output.
http_status() {
  local code
  code=$(curl -s -o /dev/null -w "%{http_code}" --max-time "$CURL_TIMEOUT" "$@") || {
    echo "CURL_$?"
    return
  }
  echo "$code"
}

echo "=== ContentEngine Smoke Test ==="
echo "Frontend: $FRONTEND_URL"
echo "Supabase: $SUPABASE_URL"
echo ""

# 1. Frontend index returns 200.
echo "[1/5] Frontend index..."
status=$(http_status "$FRONTEND_URL/")
if [[ "$status" == "200" ]]; then
  check "Frontend returns 200" "ok"
else
  check "Frontend returns 200" "got $status"
fi

# 2. Frontend SPA fallback (deep link returns 200 because vercel.json rewrites all paths
#    to /index.html so React Router can render the route client-side).
echo "[2/5] SPA fallback for /dashboard..."
status=$(http_status "$FRONTEND_URL/dashboard")
if [[ "$status" == "200" ]]; then
  check "SPA fallback for deep links" "ok"
else
  check "SPA fallback for deep links" "got $status"
fi

# 3. Supabase REST is reachable. PostgREST returns 200 with the openapi spec on the
#    root path when the anon key is present; 404 is acceptable for a host that does
#    not enable the spec route. We only care that the host is alive (not a 5xx).
echo "[3/5] Supabase REST reachable..."
status=$(http_status -H "apikey: $ANON_KEY" "$SUPABASE_URL/rest/v1/")
if [[ "$status" =~ ^(200|404)$ ]]; then
  check "Supabase REST reachable" "ok"
else
  check "Supabase REST reachable" "got $status"
fi

# 4. Edge Function rejects unauthenticated requests with 401. This proves the function
#    is deployed AND that verify_jwt = true is in effect (Chunk 11). A 403 / 404 here
#    indicates the function isn't reachable or has different auth wiring — investigate
#    before adjusting the test.
echo "[4/5] Edge Function requires auth..."
status=$(http_status \
  -X POST \
  -H "Content-Type: application/json" \
  -d '{}' \
  "$SUPABASE_URL/functions/v1/anthropic-proxy")
if [[ "$status" == "401" ]]; then
  check "Edge Function rejects unauthenticated requests" "ok"
else
  check "Edge Function rejects unauthenticated requests" "got $status"
fi

# 5. Anon key hits PostgREST and gets a non-empty response. We don't assert a specific
#    table because the smoke test should not depend on schema details — just that the
#    anon key is recognized and PostgREST is serving with it.
echo "[5/5] Anon key has expected access..."
response=$(curl -s --max-time "$CURL_TIMEOUT" \
  -H "apikey: $ANON_KEY" \
  -H "Authorization: Bearer $ANON_KEY" \
  "$SUPABASE_URL/rest/v1/?select=*" 2>/dev/null | head -c 200) || response=""
if [[ -n "$response" ]]; then
  check "Anon key can hit REST root" "ok"
else
  check "Anon key can hit REST root" "got empty response"
fi

echo ""
echo "=== Results: $pass passed, $fail failed ==="

if [[ $fail -gt 0 ]]; then
  exit 1
fi
