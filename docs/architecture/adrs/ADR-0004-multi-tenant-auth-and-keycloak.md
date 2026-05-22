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
