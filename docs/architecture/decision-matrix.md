# Core Platform Architecture Decision Matrix (POC)

## Scope

This matrix captures the finalized platform decisions for the appKiosk core POC.

## Decision Summary

| Area | Decision |
|---|---|
| Platform shape | Host shell + independently hosted plugin web apps |
| Initial plugins | IAM, Licensing, Account Management (first-party) |
| Discovery model | Runtime discovery from core registry |
| Registration model | Push registration from plugin-owned lifecycle |
| Registration processing | Asynchronous validation pipeline with status token |
| Plugin identity | Immutable `pluginId` + immutable `pluginSlug` in POC |
| Registry tenancy model | Plugin release is platform-level, not per-tenant |
| Tenant routing | URL path tenancy (`/:tenantId/...`) |
| Plugin launch routing | Core menu links route through gateway-only URLs |
| Gateway behavior | Tenant-aware proxy + path rewrite to plugin base URL |
| Gateway implementation | Existing gateway (buy), not custom proxy (build) |
| Gateway product recommendation | Envoy Gateway using Kubernetes Gateway API, aligned with Knative deployments |
| Gateway extensibility model | Custom logic in core services/ext-auth integration, minimize gateway vendor lock-in |
| Auth provider | Keycloak |
| Realm strategy | Two realms: user tokens realm + service tokens realm |
| Plugin admin auth | OAuth client credentials, one client per plugin per environment |
| Credential scope model | Granular API scopes and plugin-bound credentials |
| Credential rotation | Supported with overlap window (no downtime) |
| Registration payload integrity | Signed payloads in addition to OAuth auth |
| Plugin metadata caching | Cached by core for reliability and control |
| Health model | Registration checks + periodic checks |
| Health lifecycle | PendingValidation, Active, Warning, Suspended, Deprecated, Disabled |
| Health notifications | Signed webhook with retry + dead-letter + replay |
| Menu visibility | License-gated visibility only |
| In-plugin authorization | Permission and policy checks enforced inside plugin/API |
| Permission model | Namespaced permissions (`pluginId.permission`) |
| Policy model | JSON DSL, deny-by-default, plugin-namespaced names |
| Policy storage | Raw JSON + normalized/compiled artifact |
| Policy artifacts | Immutable versions with active pointer |
| Policy/permission deletion | Soft delete + dependency impact analysis |
| Role model | Hybrid (global templates + tenant-defined roles) |
| Gateway authorization | Coarse checks at gateway and domain checks in service/plugin |
| Cross-service auth context | Gateway token exchange to include user context + service identity |
| Rate limiting | Per-tenant and per-plugin |
| Entitlement source | Licensing plugin (source of truth) |
| Entitlement resiliency | Core entitlement cache + last-known-good fallback with TTL |
| Dependency graph model | Manifest-declared dependencies + telemetry-based drift detection |
| IDs in data layer | GUID primary keys + unique business keys |
| Observability | OpenTelemetry baseline with end-to-end trace propagation |
| Documentation outputs | C4 Context + C4 Container + ADR starter set |
| POC governance | Fast iteration, formal signoff deferred |

## Open Questions Deferred Beyond POC

- Marketplace and billing workflows
- Untrusted third-party plugin onboarding
- Runtime executable policy language beyond JSON DSL
- Dynamic module loading/runtime plugin code execution
- Full production compliance evidence automation
