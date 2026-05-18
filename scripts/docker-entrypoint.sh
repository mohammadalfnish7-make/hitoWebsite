#!/bin/sh
set -e

# Apply SQL migrations on startup (Coolify does not mount ./migrations into the db container).
# Migrations are copied into the image at /app/migrations.

if [ -n "$DATABASE_URL" ] && [ -d /app/migrations ]; then
  echo "[migrate] Waiting for PostgreSQL..."

  # Wait until DB accepts connections (hostname "db" from docker-compose)
  until psql "$DATABASE_URL" -c "SELECT 1" >/dev/null 2>&1; do
    sleep 2
  done

  echo "[migrate] Checking schema..."

  if psql "$DATABASE_URL" -tAc "SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'services'" | grep -q 1; then
    echo "[migrate] Schema already applied, skipping."
  else
    echo "[migrate] Applying migrations..."
    for f in /app/migrations/*.sql; do
      [ -f "$f" ] || continue
      echo "[migrate] Running $(basename "$f")"
      psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -f "$f"
    done
    echo "[migrate] Done."
  fi
fi

exec node server.js
