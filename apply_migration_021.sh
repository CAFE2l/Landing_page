#!/usr/bin/env bash
set -euo pipefail

# ============================================================
# Apply migration 021: Sync user profiles from auth metadata
# Usage: SERVICE_ROLE_KEY="sbpg_xxx" bash apply_migration_021.sh
# ============================================================

SUPABASE_URL="https://iuzvmlhowqghbbduhmzt.supabase.co"
MIGRATION_FILE="supabase/migrations/021_sync_user_profile.sql"
SERVICE_ROLE_KEY="${SERVICE_ROLE_KEY:-}"

if [[ -z "$SERVICE_ROLE_KEY" ]]; then
  echo "❌ SERVICE_ROLE_KEY is required."
  echo ""
  echo "To get your service_role key:"
  echo "  1. Go to https://supabase.com/dashboard/project/iuzvmlhowqghbbduhmzt/settings/api"
  echo "  2. Copy the 'service_role' key (starts with 'sbpg_')"
  echo "  3. Run: SERVICE_ROLE_KEY='sbpg_xxx' bash $0"
  exit 1
fi

echo "=== Migration 021: Sync User Profiles ==="
echo ""

# Read and split migration file
SQL=$(cat "$MIGRATION_FILE")

echo "📤 Sending migration to Supabase..."
echo ""

# Use exec_sql endpoint with service_role key
# If exec_sql RPC doesn't exist, try direct SQL API
RESPONSE=$(curl -s -w "\n%{http_code}" \
  -X POST "${SUPABASE_URL}/rest/v1/rpc/exec_sql" \
  -H "apikey: ${SERVICE_ROLE_KEY}" \
  -H "Authorization: Bearer ${SERVICE_ROLE_KEY}" \
  -H "Content-Type: application/json" \
  -d "{\"sql\": $(echo "$SQL" | jq -Rs .)}" 2>&1)

HTTP_CODE=$(echo "$RESPONSE" | tail -1)
BODY=$(echo "$RESPONSE" | sed '$d')

if [[ "$HTTP_CODE" == "200" || "$HTTP_CODE" == "201" ]]; then
  echo "✅ Migration applied successfully!"
  echo ""
  echo "Verifying:"
  curl -s "${SUPABASE_URL}/rest/v1/profiles?select=id,full_name,username,avatar_url" \
    -H "apikey: ${SERVICE_ROLE_KEY}" \
    -H "Authorization: Bearer ${SERVICE_ROLE_KEY}" | head -200
elif echo "$BODY" | grep -q "Could not find the function"; then
  echo "⚠️  exec_sql RPC not found."
  echo ""
  echo "Please run manually in Supabase SQL Editor:"
  echo "  1. Go to https://supabase.com/dashboard/project/iuzvmlhowqghbbduhmzt/sql/new"
  echo "  2. Copy and paste the contents of: $MIGRATION_FILE"
  echo "  3. Click 'Run'"
  echo ""
  echo "Or use the Supabase CLI:"
  echo "  supabase login && supabase db push --include-all"
else
  echo "❌ HTTP $HTTP_CODE: $BODY"
  exit 1
fi
