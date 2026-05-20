# ADR-0006: Role and Entitlement Model

## Status

Accepted

## Context

The platform needs both reusable role defaults and tenant-level flexibility.

## Decision

- Role model is hybrid:
  - Global default role templates.
  - Tenant-defined custom roles.
- Menu visibility is controlled by licensing/entitlements, not user permissions.
- In-plugin action access is controlled by permission/policy checks in plugin/app APIs.
- Entitlement source of truth is Licensing plugin.
- Core maintains entitlement cache with TTL and last-known-good fallback.

## Consequences

- Fast and predictable menu rendering.
- Tenant autonomy without sacrificing platform defaults.
- Graceful behavior during temporary licensing service outages.
