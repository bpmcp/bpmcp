#!/usr/bin/env bash
set -euo pipefail

: "${DATABASE_URL?DATABASE_URL environment variable is required}" 

PSQL="psql --no-psqlrc --echo-errors --single-transaction"

cat <<SQL | $PSQL "$DATABASE_URL"
CREATE EXTENSION IF NOT EXISTS "pgcrypto";
SQL

$PSQL "$DATABASE_URL" -f "$(dirname "$0")/../schemas/sql/schema.sql"
