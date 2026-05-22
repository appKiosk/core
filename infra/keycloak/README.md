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

The migration runner resolves secrets from environment variables using this order:

1. `KEYCLOAK_CLIENT_SECRET_<CLIENT_ID_SUFFIX>` for exact client IDs
2. `CORE_KEYCLOAK_CLIENT_SECRET` for the fallback `CORE_KEYCLOAK_CLIENT_ID`

Example: `core-local-plugin-admin-iam` maps to `KEYCLOAK_CLIENT_SECRET_CORE_LOCAL_PLUGIN_ADMIN_IAM`.

For no-downtime rotation windows, you can also set:

- `KEYCLOAK_CLIENT_SECRET_NEXT_<CLIENT_ID_SUFFIX>`

When both active and next values are provided, the migration runner configures a rotated secret in Keycloak so old and new credentials can overlap during rollout. If no `NEXT` value is provided, any stale rotated secret is cleared.

## Secret Storage and Rotation Process

Service credentials are stored only in environment variables and applied at migration time.

1. Keep the current credential in `KEYCLOAK_CLIENT_SECRET_<CLIENT_ID_SUFFIX>`.
2. Stage the replacement credential in `KEYCLOAK_CLIENT_SECRET_NEXT_<CLIENT_ID_SUFFIX>`.
3. Run `npm run dev:keycloak:migrate` to apply both values and start overlap.
4. Roll all client consumers to the replacement credential.
5. Promote by moving the replacement value to `KEYCLOAK_CLIENT_SECRET_<CLIENT_ID_SUFFIX>` and clearing `..._NEXT_...`.
6. Run `npm run dev:keycloak:migrate` again to remove overlap.

## Client Provisioning Model

This repository defines client IDs by environment and use case.

Pattern:

- User realm UI client: `core-<environment>-host-shell`
- Core service clients: `core-<environment>-<service>`
- Plugin admin clients: `core-<environment>-plugin-admin-<pluginId>`

Local migrations currently provision:

- User realm (`core-users`):
  - `core-local-host-shell`
- Service realm (`core-services`):
  - `core-local-gateway`
  - `core-local-registry`
  - `core-local-policy`
  - `core-local-plugin-admin-iam`
  - `core-local-plugin-admin-licensing`
  - `core-local-plugin-admin-account-management`

## Running Locally

Use the root npm scripts:

- `npm run dev:keycloak:up`
- `npm run dev:keycloak:logs`
- `npm run dev:keycloak:down`

Keycloak admin URL: `http://localhost:8081` (unless `CORE_KEYCLOAK_PORT` is overridden).

Before running the stack, set these values in `.env`:

- `KEYCLOAK_ADMIN_PASSWORD` (required)
- `CORE_KEYCLOAK_CLIENT_ID` and `CORE_KEYCLOAK_CLIENT_SECRET` (recommended fallback)
- Any per-client active/next secret variables for additional confidential clients (recommended)
