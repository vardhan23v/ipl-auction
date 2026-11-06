#!/usr/bin/env bash
# Deploy to Vercel from the CLI: log in (once), link/create the project, copy the Supabase env vars from .env
# into Vercel (production + preview) without printing them, then deploy to production and print the URL.
# Usage: bash scripts/vercel-deploy.sh [project-name]
set -euo pipefail
NAME="${1:-ipl-auction}"
cd "$(dirname "$0")/.."
command -v vercel >/dev/null || { echo "Install the Vercel CLI first: npm i -g vercel"; exit 1; }

if vercel whoami >/dev/null 2>&1; then echo "1/4  Already logged in to Vercel."; else echo "1/4  Vercel login (follow the prompt / browser)…"; vercel login; fi

echo "2/4  Linking project \"$NAME\"…"
vercel link --yes --project "$NAME" >/dev/null

echo "3/4  Copying env vars from .env to Vercel (values not shown)…"
for VAR in DATABASE_URL DIRECT_URL NEXT_PUBLIC_SUPABASE_URL NEXT_PUBLIC_SUPABASE_ANON_KEY SUPABASE_SERVICE_ROLE_KEY; do
  VAL="$(grep -E "^$VAR=" .env | head -1 | cut -d= -f2- | sed -E 's/^"(.*)"$/\1/')"
  [ -n "$VAL" ] || { echo "   $VAR missing in .env"; exit 1; }
  for ENV in production preview; do
    vercel env rm "$VAR" "$ENV" --yes >/dev/null 2>&1 || true
    printf '%s' "$VAL" | vercel env add "$VAR" "$ENV" >/dev/null 2>&1
  done
  echo "   $VAR ✓"
done

echo "4/4  Deploying to production (build runs migrations; takes a few minutes)…"
URL="$(vercel deploy --prod --yes 2>/dev/null | tail -1)"
echo
echo "Deployed: $URL"
echo "$URL" > .vercel/last-deploy-url
