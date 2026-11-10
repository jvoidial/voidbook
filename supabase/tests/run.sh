#!/usr/bin/env bash
# Runs the SQL test suite against a throwaway Postgres with the Supabase surface
# stubbed (supabase/tests/00_harness.sql), then drives the real supabase-js
# client through a real PostgREST at the same database.
#
#   ./supabase/tests/run.sh
#
# Requires Docker. Creates and destroys a container named sqawk-pg-test.
set -euo pipefail

cd "$(dirname "$0")/../.."

CONTAINER=sqawk-pg-test
PGRST=sqawk-pgrst-test
NET=sqawk-test-net
JWT_SECRET=test-secret-at-least-32-characters-long

DOCKER="docker"
if ! docker info >/dev/null 2>&1; then DOCKER="sudo docker"; fi

cleanup() {
  $DOCKER rm -f "$PGRST" "$CONTAINER" >/dev/null 2>&1 || true
  $DOCKER network rm "$NET" >/dev/null 2>&1 || true
}
trap cleanup EXIT
cleanup
$DOCKER network create "$NET" >/dev/null

$DOCKER run -d --name "$CONTAINER" --network "$NET" \
  -e POSTGRES_PASSWORD=postgres -e POSTGRES_DB=sqawk postgres:16-alpine >/dev/null

echo "waiting for postgres…"
# The official image accepts a connection, then restarts once during initdb, so
# a single successful probe is not enough — require two consecutive successes.
ready=0
for _ in $(seq 1 60); do
  if $DOCKER exec "$CONTAINER" psql -U postgres -d sqawk -c 'select 1' >/dev/null 2>&1; then
    ready=$((ready + 1))
    [ "$ready" -ge 2 ] && break
  else
    ready=0
  fi
  sleep 1
done
[ "$ready" -ge 2 ] || { echo "postgres did not become ready"; exit 1; }

run_sql() { $DOCKER exec -i "$CONTAINER" psql -U postgres -d sqawk -q -v ON_ERROR_STOP=1; }

echo "applying harness…"
run_sql < supabase/tests/00_harness.sql >/dev/null

echo "applying migrations…"
for f in supabase/migrations/*.sql; do
  out=$(run_sql < "$f" 2>&1) || { echo "MIGRATION FAILED: $f"; echo "$out"; exit 1; }
  echo "  ok  $f"
done

echo "applying fixtures…"
run_sql < supabase/tests/05_fixtures.sql >/dev/null

echo "applying grants…"
run_sql < supabase/tests/06_grants.sql >/dev/null

echo "running SQL tests…"
status=0
for t in supabase/tests/[0-9][0-9]_*.sql; do
  case "$(basename "$t")" in 00_harness.sql|05_fixtures.sql|06_grants.sql) continue;; esac
  if out=$(run_sql < "$t" 2>&1); then
    echo "  PASS $(basename "$t")"
    echo "$out" | grep -E "TESTS PASSED" || true
  else
    echo "  FAIL $(basename "$t")"; echo "$out"; status=1
  fi
done

# ── PostgREST + supabase-js end-to-end ────────────────────────
echo "starting postgrest…"
$DOCKER run -d --name "$PGRST" --network "$NET" -p 3000:3000 \
  -e PGRST_DB_URI="postgres://authenticator:postgres@$CONTAINER:5432/sqawk" \
  -e PGRST_DB_SCHEMAS=public \
  -e PGRST_DB_ANON_ROLE=anon \
  -e PGRST_JWT_SECRET="$JWT_SECRET" \
  postgrest/postgrest:v12.2.0 >/dev/null

for _ in $(seq 1 30); do
  curl -sf http://localhost:3000/ >/dev/null 2>&1 && break
  sleep 1
done

echo "running e2e (supabase-js -> postgrest -> postgres)…"
if (PGRST_JWT_SECRET="$JWT_SECRET" node supabase/tests/messaging.e2e.mjs); then
  :
else
  status=1
fi

exit $status
