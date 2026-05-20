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
