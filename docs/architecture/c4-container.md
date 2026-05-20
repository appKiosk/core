# C4 Container Diagram Narrative

## Containers Inside Core Platform

## 1) Host Shell UI

- Purpose: Entry web app for user navigation and shared UX.
- Responsibilities:
  - Resolve tenant context from URL path.
  - Render core UI components (top nav, footer, left nav).
  - Fetch licensed plugin catalog for menu rendering.
  - Route plugin launches via gateway URLs only.

## 2) API Gateway / Edge Router

- Purpose: Tenant-aware ingress and traffic policy boundary.
- Technology recommendation:
  - Use an existing gateway, not a custom proxy stack.
  - Preferred for this platform: Envoy Gateway on Kubernetes Gateway API, deployed alongside Knative workloads.
  - Keep custom logic in platform services (route/entitlement resolution and policy decisions), not in gateway-specific plugins when possible.
- Responsibilities:
  - Validate incoming user tokens.
  - Exchange/derive downstream identity token carrying user context and service identity.
  - Resolve plugin route mapping by `pluginSlug`.
  - Rewrite and proxy traffic to plugin web app endpoints.
  - Apply coarse authorization and rate limiting (per-tenant and per-plugin).
  - Emit trace context for downstream services.

## 3) Plugin Registry Service

- Purpose: Source of truth for plugin metadata and lifecycle.
- Responsibilities:
  - Accept registration/update requests from plugin admin clients.
  - Enforce plugin-bound scopes and signed payload verification.
  - Persist plugin metadata, ownership metadata, and lifecycle state.
  - Expose discovery APIs for host shell and operational tooling.

## 4) Validation Pipeline

- Purpose: Asynchronous activation and safety checks.
- Responsibilities:
  - Validate schema, URL reachability, auth handshake, and policy contract consistency.
  - Trigger health probes at registration/update and periodically.
  - Transition lifecycle states with reason codes.
  - Trigger signed webhook notifications on warning/suspension.

## 5) Policy Service

- Purpose: Policy artifact lifecycle and enforcement support.
- Responsibilities:
  - Store raw submitted DSL + compiled policy artifacts.
  - Maintain immutable policy versions with active pointer.
  - Provide retrieval and decision APIs.
  - Enforce deny-by-default for missing/unknown policies.

## 6) Entitlement Cache Service

- Purpose: Fast path for menu visibility and resilience.
- Responsibilities:
  - Consume license state from Licensing plugin APIs/events.
  - Maintain tenant-plugin entitlement cache with TTL.
  - Serve last-known-good view during temporary licensing outages.

## 7) Audit and Observability Pipeline

- Purpose: Cross-system accountability and diagnostics.
- Responsibilities:
  - Collect audit events for registration, lifecycle, policy, and gateway actions.
  - Collect logs, metrics, traces (OpenTelemetry).
  - Correlate user journey and cross-plugin calls end-to-end.

## External Containers (Out of Core Deployment)

- Keycloak User Realm
- Keycloak Service Realm
- Kubernetes/Knative control plane and runtime
- Independently Hosted Plugin Web App(s)
- Optional Plugin API Service(s)
- Plugin Team Webhook Receiver(s)

## Container Interaction Flow

1. Plugin admin client -> Plugin Registry Service (auth + signed manifest).
2. Plugin Registry Service -> Validation Pipeline (async validation job).
3. Validation Pipeline -> Policy Service (artifact creation/versioning).
4. Validation Pipeline -> Plugin Registry Service (lifecycle updates).
5. Host Shell UI -> Entitlement Cache Service + Plugin Registry Service (menu model).
6. Host Shell UI -> API Gateway (launch URL).
7. API Gateway -> Plugin Web App (proxy/rewrite with tenant context).
8. API Gateway and services -> Audit and Observability Pipeline.
