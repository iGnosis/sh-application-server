#!/usr/bin/env sh
mkdir -p src/scripts/temp/

curl --location --request POST "https://api.dev.pointmotioncontrol.com/v1alpha1/pg_dump" \
--header "x-hasura-admin-secret: $HASURA_ADMIN_SECRET" \
--header 'Content-Type: application/json' \
--data-raw '{
    "opts": ["-O", "-x", "--data-only", "--column-inserts", "--table", "patient", "--schema", "public"],
    "clean_output": true,
    "source": "default"
}' > src/scripts/temp/sql_data.sql

PGPASSWORD=postgrespassword psql -h localhost -U postgres -d postgres -a -f src/scripts/temp/sql_data.sql
