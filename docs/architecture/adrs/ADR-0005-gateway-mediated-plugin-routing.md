# ADR-0005: Gateway-Mediated Plugin Routing

## Status

Accepted

## Context

Plugins are independently hosted web applications, but platform governance requires consistent tenant-aware ingress behavior.

## Decision

- Use an existing gateway implementation; do not build a custom gateway proxy for POC.
- Preferred gateway choice for this platform: Envoy Gateway on Kubernetes Gateway API, deployed with Knative workloads.
- Host shell menu links always target gateway URLs.
- Gateway resolves `pluginSlug` to plugin base URL and rewrites/proxies requests.
- Core does not own plugin internal routes.
- `pluginSlug` is immutable for POC once activated.
- Place custom logic in core services (route resolution, entitlement checks, policy decision services) and integrate via standard gateway extension points.

## Consequences

- Centralized control for auth, policy, observability, and failover behavior.
- Plugins remain deployment-independent and route-independent internally.
- Lower implementation risk and faster delivery for POC.
- Better portability by avoiding gateway-vendor-specific business logic.
