# Architecture Decision Records

## Purpose

This folder captures key architectural decisions for the core platform POC and early production trajectory.

## Linking and Traceability Rules

- Every architecture-impacting issue and PR must link the affected ADR(s), or explicitly state `No ADR impact`.
- When adding a new ADR, update this index in the same PR.
- When an ADR replaces a prior decision, include explicit `Supersedes:` and/or `Superseded by:` references in both ADR documents.
- If decision coverage shifts, update `docs/architecture/decision-matrix.md` in the same change set.

## ADR Index

- [ADR-0001](ADR-0001-plugin-registration-model.md): Plugin registration model (push + async validation)
- [ADR-0002](ADR-0002-plugin-lifecycle-and-health.md): Plugin lifecycle states, health checks, and notifications
- [ADR-0003](ADR-0003-policy-model-and-enforcement.md): Policy DSL, versioning, and enforcement model
- [ADR-0004](ADR-0004-multi-tenant-auth-and-keycloak.md): Multi-tenant auth strategy with Keycloak and gateway exchange
- [ADR-0005](ADR-0005-gateway-mediated-plugin-routing.md): Gateway-mediated plugin launch/routing model
- [ADR-0006](ADR-0006-role-and-entitlement-model.md): Hybrid role model and license-driven visibility
- [ADR-0007](ADR-0007-observability-and-audit-baseline.md): OpenTelemetry and audit baseline
- [ADR-0008](ADR-0008-plugin-metadata-integrity-and-identity.md): Plugin identity, slugs, signatures, and metadata caching
- [ADR-0009](ADR-0009-poc-out-of-scope.md): Explicit POC out-of-scope boundaries
