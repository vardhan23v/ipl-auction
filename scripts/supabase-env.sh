#!/usr/bin/env bash
# Fill .env from the Supabase CLI: logs in, links the project, fetches the service-role key and pooler host,
# and asks (hidden) for the database password. Secrets go straight into .env — nothing is printed.
# Usage: bash scripts/supabase-env.sh <project-ref>
set -euo pipefail
REF="${1:?usage: bash scripts/supabase-env.sh <project-ref>}"
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
WORK="$(mktemp -d)"   # keep the CLI's link files out of the repo
command -v supabase >/dev/null || { echo "Install the Supabase CLI first: brew install supabase/tap/supabase"; exit 1; }
SB="supabase --workdir $WORK"
trap 'rm -rf "$WORK"' EXIT

if supabase projects list >/dev/null 2>&1; then echo "1/4  Already logged in to Supabase."; else
  echo "1/4  Supabase login (a browser window opens — approve it)…"; $SB login
fi

echo
PW=""
while [ -z "$PW" ]; do read -r -s -p "2/4  Database password for project $REF (input hidden; reset it in Dashboard → Database → Settings if you don't know it): " PW; echo
  [ -n "$PW" ] || echo "    Nothing was typed — type the password, then press Enter (it stays invisible)."
done

echo "3/4  Linking project…"
$SB init --force --with-vscode-settings=false --with-intellij-settings=false >/dev/null 2>&1 || true
$SB link --project-ref "$REF" --password "$PW" >/dev/null
POOLER="$(cat "$WORK/supabase/.temp/pooler-url" 2>/dev/null || true)"
[ -n "$POOLER" ] || { echo "Could not read the pooler URL from the CLI"; exit 1; }

echo "4/4  Fetching API keys and writing .env…"
KEYS="$($SB projects api-keys --project-ref "$REF" -o json)"

POOLER="$POOLER" PW="$PW" KEYS="$KEYS" REF="$REF" ENVFILE="$ROOT/.env" python3 - <<'PY'
import json, os, re, secrets, urllib.parse
pooler, pw, ref, path = os.environ["POOLER"].strip(), os.environ["PW"], os.environ["REF"], os.environ["ENVFILE"]
keys = json.loads(os.environ["KEYS"])
def key(*names):
    for k in keys:
        if k.get("name") in names or k.get("type") in names:
            return k.get("api_key")
service = key("service_role", "secret")
if not service: raise SystemExit("No service_role/secret key returned by the CLI")
# pooler-url looks like postgresql://postgres.<ref>@aws-0-<region>.pooler.supabase.com:6543/postgres
u = urllib.parse.urlsplit(pooler)
user, host = u.username, u.hostname
enc = urllib.parse.quote(pw, safe="")
pooled = f"postgresql://{user}:{enc}@{host}:6543/postgres?pgbouncer=true&connection_limit=1"
direct = f"postgresql://{user}:{enc}@{host}:5432/postgres"
env = open(path).read() if os.path.exists(path) else ""
def put(name, value):
    global env
    line = f'{name}="{value}"'
    env = re.sub(rf'^{name}=.*$', lambda _: line, env, flags=re.M) if re.search(rf'^{name}=', env, re.M) else env.rstrip("\n") + "\n" + line + "\n"
put("DATABASE_URL", pooled)
put("DIRECT_URL", direct)
put("NEXT_PUBLIC_SUPABASE_URL", f"https://{ref}.supabase.co")
put("SUPABASE_SERVICE_ROLE_KEY", service)
m = re.search(r'^SEED_PASSWORD="?([^"\n]*)"?', env, re.M)
if not m or len(m.group(1)) < 8 or m.group(1).startswith("PICK_"):
    put("SEED_PASSWORD", secrets.token_urlsafe(12))
open(path, "w").write(env)
os.chmod(path, 0o600)
print("Done: .env updated (DATABASE_URL, DIRECT_URL, SUPABASE_SERVICE_ROLE_KEY, SEED_PASSWORD).")
PY
