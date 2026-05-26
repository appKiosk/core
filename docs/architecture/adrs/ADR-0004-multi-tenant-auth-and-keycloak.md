# ADR-0004: Multi-Tenant Auth and Keycloak Strategy

## Status

Accepted

## Context

The platform requires tenant-aware routing, user authentication, and service-to-service isolation.

## Decision

- Tenant context is carried in URL path (`/:tenantId/...`).
- Keycloak uses two realms:
  - User realm for interactive user tokens.
  - Service realm for service credentials/tokens.
- Gateway validates incoming user token and performs exchange/derivation for downstream calls.
- Downstream services trust gateway-issued downstream identity envelope/token.
- Gateway token validation/exchange is implemented at the Kubernetes edge gateway layer used by Knative-facing traffic.

## Consequences

- Clear separation between user and service identity concerns.
- Consistent token handling across plugins and services.
- Simplified downstream trust model anchored at gateway boundary.

## Implementation Notes

- Local development provisioning uses `docker-compose.yml`.
- User and service realms are bootstrapped via ordered migration files in `infra/keycloak/migrations`.
- Migration execution is idempotent for local environments through `apply-migrations.sh`, enabling repeatable bootstrap.

## Client Provisioning Model

- Provision clients per environment (`local`, `dev`, `staging`, `prod`) and per use case.
- Naming conventions:
  - User realm interactive UI clients: `core-<environment>-host-shell`
  - Core service clients (client credentials): `core-<environment>-<service>`
  - Plugin administration clients (client credentials): `core-<environment>-plugin-admin-<pluginId>`
- Plugin admin clients are confidential clients in the service realm and are unique per plugin per environment.
- Secrets are injected at bootstrap from environment variables, never committed in realm JSON.

## Token Validation Policy Baseline

- Gateway and downstream identity validation enforce issuer, audience, and expiry requirements.
- Issuer (`iss`) must exactly match the realm issuer URL configured for the trust boundary.
- Audience (`aud`) must include at least one expected audience for the receiving service.
- Expiry (`exp`) is mandatory for accepted tokens; tokens without `exp` are rejected.
- Expiry checks allow bounded clock skew (default 60 seconds, maximum 300 seconds) to avoid false negatives during clock drift.
- Tokens with `exp + clockSkew < now` are treated as expired and rejected.

## Service Credential Secret Storage and Rotation

- Service credential secrets are environment-sourced and mapped by client ID:
  - Active secret: `KEYCLOAK_CLIENT_SECRET_<CLIENT_ID_SUFFIX>`
  - Staged rotation secret: `KEYCLOAK_CLIENT_SECRET_NEXT_<CLIENT_ID_SUFFIX>`
- The migration runner applies active secrets and configures overlap rotation in Keycloak when a staged `NEXT` secret exists and differs from active.
- Rotation process:
  1. Keep the current secret in `KEYCLOAK_CLIENT_SECRET_<...>`.
  2. Stage the replacement in `KEYCLOAK_CLIENT_SECRET_NEXT_<...>`.
  3. Apply migrations to begin overlap window.
  4. Roll consumers to replacement credential.
  5. Promote replacement to active and clear `NEXT`.
  6. Re-apply migrations to end overlap.
