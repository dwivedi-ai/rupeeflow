#!/bin/bash
# Starts Postgres (if needed), the NLP API, the core API and nginx in one container.
set -euo pipefail

PORT="${PORT:-80}"
PUBLIC_URL="${PUBLIC_URL:-http://localhost:${PORT}}"
PUBLIC_URL="${PUBLIC_URL%/}"

# ---- Database ----
if [ -z "${DB_SOURCE:-}" ]; then
  echo "[rupeeflow] DB_SOURCE not set, starting bundled Postgres"
  mkdir -p "$PGDATA" /run/postgresql
  chown -R postgres:postgres "$PGDATA" /run/postgresql
  PGBIN="$(ls -d /usr/lib/postgresql/*/bin | head -n1)"
  if [ ! -s "$PGDATA/PG_VERSION" ]; then
    su postgres -c "$PGBIN/initdb -D $PGDATA --auth=trust --username=postgres" >/dev/null
  fi
  su postgres -c "$PGBIN/pg_ctl -D $PGDATA -o '-c listen_addresses=127.0.0.1' -w start" >/dev/null
  if ! su postgres -c "psql -tAc \"SELECT 1 FROM pg_database WHERE datname='rupeeflow'\"" | grep -q 1; then
    su postgres -c "createdb rupeeflow"
  fi
  export DB_SOURCE="postgresql://postgres@127.0.0.1:5432/rupeeflow?sslmode=disable"
fi

# Schema is idempotent, so applying it on every start is safe.
echo "[rupeeflow] applying schema"
psql "$DB_SOURCE" -v ON_ERROR_STOP=1 -q -f /app/schema.sql

# ---- Core API config (defaults so the app boots without extra setup) ----
export SERVER_PORT=8080
export NLP_SERVICE_URL="http://127.0.0.1:8000"
export FRONTEND_URL="${FRONTEND_URL:-$PUBLIC_URL}"
export GOOGLE_REDIRECT_URL="${GOOGLE_REDIRECT_URL:-$PUBLIC_URL/api/auth/google/callback}"
export GOOGLE_CLIENT_ID="${GOOGLE_CLIENT_ID:-not-configured}"
export GOOGLE_CLIENT_SECRET="${GOOGLE_CLIENT_SECRET:-not-configured}"
if [ -z "${JWT_SECRET_KEY:-}" ]; then
  echo "[rupeeflow] WARNING: JWT_SECRET_KEY not set, generating one; logins reset on restart"
  export JWT_SECRET_KEY="$(openssl rand -hex 32)"
fi

# ---- Start services ----
cd /app/nlp
uvicorn app.main:app --host 127.0.0.1 --port 8000 &

cd /app
/app/core-api &

sed "s/__PORT__/${PORT}/" /etc/nginx/rupeeflow.conf.template > /etc/nginx/conf.d/rupeeflow.conf
nginx -g 'daemon off;' &

echo "[rupeeflow] up on port ${PORT} (${PUBLIC_URL})"

# If any process dies, exit so the platform restarts the container.
wait -n
echo "[rupeeflow] a service exited, shutting down"
exit 1
