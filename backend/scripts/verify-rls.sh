#!/usr/bin/env bash
# Verify Row-Level Security: User B must never see (or forge) User A's rows in any user-owned table.
# Assumes the local stack is already running (`supabase start`). Run from anywhere; reads creds from
# `supabase status`. Dev convenience — NOT run in CI in this chunk. Leaves two test users + a small
# graph behind; run `supabase db reset` afterwards to restore the clean demo seed.
set -euo pipefail

eval "$(supabase status -o env | grep -E '^(API_URL|ANON_KEY)=')"
API="${API_URL:?could not read API_URL from supabase status — is the stack running?}"
KEY="${ANON_KEY:?could not read ANON_KEY from supabase status}"

pass() { echo "  [ok] $*"; }
fail() { echo "  [FAIL] RLS: $*" >&2; exit 1; }

TS="$(date +%s)${RANDOM}"
signup() {
  curl -s -X POST "$API/auth/v1/signup" -H "apikey: $KEY" -H "Content-Type: application/json" \
    -d "{\"email\":\"$1\",\"password\":\"password123\"}"
}

RA="$(signup "rls_a_${TS}@ce.test")"; AID="$(jq -r .user.id <<<"$RA")"; ATOK="$(jq -r .access_token <<<"$RA")"
RB="$(signup "rls_b_${TS}@ce.test")"; BID="$(jq -r .user.id <<<"$RB")"; BTOK="$(jq -r .access_token <<<"$RB")"
{ [ "$AID" != null ] && [ -n "$AID" ]; } || fail "sign up A failed: $RA"
{ [ "$BID" != null ] && [ -n "$BID" ]; } || fail "sign up B failed: $RB"
echo "User A = $AID"
echo "User B = $BID"

ins() {
  curl -s -X POST "$API/rest/v1/$1" -H "apikey: $KEY" -H "Authorization: Bearer $ATOK" \
    -H "Content-Type: application/json" -H "Prefer: return=representation" -d "$2" | jq -r '.[0].id'
}
cnt() {
  curl -s "$API/rest/v1/$2?select=id" -H "apikey: $KEY" -H "Authorization: Bearer $1" | jq 'length'
}

echo "Seeding a connected graph as User A..."
PID="$(ins platforms "{\"user_id\":\"$AID\",\"slug\":\"youtube\",\"display_name\":\"YT\"}")"
PILLAR="$(ins content_pillars "{\"user_id\":\"$AID\",\"name\":\"Edu\"}")"
ins cadence_targets "{\"user_id\":\"$AID\",\"platform_id\":\"$PID\",\"weekly_target\":3}" >/dev/null
IDEA="$(ins ideas "{\"user_id\":\"$AID\",\"title\":\"Idea\",\"pillar_id\":\"$PILLAR\"}")"
CI1="$(ins content_items "{\"user_id\":\"$AID\",\"idea_id\":\"$IDEA\",\"platform_id\":\"$PID\",\"pillar_id\":\"$PILLAR\",\"title\":\"One\",\"format\":\"post\",\"status\":\"idea\"}")"
CI2="$(ins content_items "{\"user_id\":\"$AID\",\"title\":\"Two\",\"format\":\"reel\",\"status\":\"idea\"}")"
ins content_relationships "{\"user_id\":\"$AID\",\"parent_id\":\"$CI1\",\"child_id\":\"$CI2\",\"relationship_type\":\"sibling\"}" >/dev/null
ins brand_context_files "{\"user_id\":\"$AID\",\"kind\":\"voice\",\"title\":\"V\",\"body\":\"hi\"}" >/dev/null

echo "Checking isolation on every user-owned table:"
for t in platforms content_pillars cadence_targets ideas content_items content_relationships brand_context_files; do
  a="$(cnt "$ATOK" "$t")"; b="$(cnt "$BTOK" "$t")"
  [ "$a" -ge 1 ] || fail "$t: User A cannot see its own rows (saw $a)"
  [ "$b" = 0 ] || fail "$t: User B sees $b of A's rows (expected 0)"
  pass "$t: A sees $a, B sees 0"
done

# profiles: each user has their own auto-created profile row; B must not see A's.
bsees_a="$(curl -s "$API/rest/v1/profiles?select=id&id=eq.$AID" -H "apikey: $KEY" -H "Authorization: Bearer $BTOK" | jq 'length')"
[ "$bsees_a" = 0 ] || fail "profiles: User B can see User A's profile"
pass "profiles: B cannot see A's profile row"

# WITH CHECK: B cannot insert a row owned by A.
code="$(curl -s -o /dev/null -w '%{http_code}' -X POST "$API/rest/v1/platforms" -H "apikey: $KEY" \
  -H "Authorization: Bearer $BTOK" -H "Content-Type: application/json" \
  -d "{\"user_id\":\"$AID\",\"slug\":\"x\",\"display_name\":\"forge\"}")"
[ "$code" = 403 ] || fail "WITH CHECK: B forging a row owned by A returned $code (expected 403)"
pass "WITH CHECK: B cannot insert a row owned by A (HTTP 403)"

echo "ALL RLS ISOLATION CHECKS PASSED"
