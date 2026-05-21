# Keycloak Local Provisioning

This directory contains local Keycloak bootstrap assets used by issue #31.

## Migration Model

Realm configuration is defined as ordered migration files in `infra/keycloak/migrations`:

- `001-core-users.realm.json`
- `002-core-services.realm.json`

Each file is applied in lexical order by `apply-migrations.sh`.

- If the realm does not exist, the migration creates it.
- If the realm already exists, the migration updates it.

This allows deterministic local bootstrap and easy iterative changes by adding a new prefixed migration file.

Client secrets are intentionally not committed in migration JSON files.
Set `CORE_KEYCLOAK_CLIENT_SECRET` in `.env` to have the migration runner apply the secret after realm creation/update.

## Running Locally

Use the root npm scripts:

- `npm run dev:keycloak:up`
- `npm run dev:keycloak:logs`
- `npm run dev:keycloak:down`

Keycloak admin URL: `http://localhost:8081` (unless `CORE_KEYCLOAK_PORT` is overridden).

Before running the stack, set these values in `.env`:

- `KEYCLOAK_ADMIN_PASSWORD` (required)
- `CORE_KEYCLOAK_CLIENT_SECRET` (recommended)
