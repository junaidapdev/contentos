#!/usr/bin/env bash
set -euo pipefail

# ContentEngine — Backend deploy script (Chunk 13).
#
# Pushes migrations to the linked Supabase project, then deploys the Edge Function.
# Asks for explicit y/N confirmation before each step. Migration push must succeed
# before the function deploys — the proxy depends on the `ai_request_log` table
# (Chunk 11), so a function-first deploy would 500 on every request.
#
# Run from anywhere; the script cd's into the backend root (one level up from
# the scripts dir) so `supabase` commands operate against ./supabase/.
#
# Usage:
#   bash backend/scripts/deploy.sh
#
# Pre-flight:
#   1. `supabase login`                       (one-time)
#   2. `cd backend && supabase link --project-ref <ref>`  (one-time)
#   3. Confirm secrets are set:
#      supabase secrets list   # should show ANTHROPIC_API_KEY

cd "$(dirname "$0")/.."

confirm() {
  local prompt="$1"
  read -r -p "$prompt [y/N] " response
  case "$response" in
    [yY][eE][sS]|[yY]) return 0 ;;
    *) return 1 ;;
  esac
}

echo "=== ContentEngine Backend Deploy ==="
echo "This will push migrations and deploy Edge Functions to the linked Supabase project."
echo ""
echo "Linked project:"
# `supabase status` against a linked-but-not-started local project is noisy; tolerate
# both shapes. The `|| true` keeps the script alive even if the command fails to find
# a linked project — the user gets to confirm before any destructive step.
supabase status 2>/dev/null | grep -iE 'project|api url' || echo "  (run 'supabase link --project-ref <ref>' if not linked)"
echo ""

if ! confirm "Continue with deploy?"; then
  echo "Aborted."
  exit 1
fi

echo ""
echo "=== Step 1: Push migrations (supabase db push) ==="
echo "Migrations are forward-only. Test locally with 'supabase db reset' before pushing."
if confirm "Run 'supabase db push'?"; then
  supabase db push
else
  echo "Skipping migration push."
fi

echo ""
echo "=== Step 2: Deploy Edge Function (anthropic-proxy) ==="
echo "The function depends on the ai_request_log table — migrations should be applied first."
if confirm "Run 'supabase functions deploy anthropic-proxy'?"; then
  supabase functions deploy anthropic-proxy
else
  echo "Skipping function deploy."
fi

echo ""
echo "=== Deploy complete ==="
echo "Run the smoke test next:"
echo "  bash scripts/smoke-test.sh <frontend-url> <supabase-url> <anon-key>"
