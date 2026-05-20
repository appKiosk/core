# C4 Context Diagram Narrative

## System Under Design

appKiosk Core Platform coordinates plugin onboarding, discovery, tenant-aware access, and cross-plugin governance for independently hosted plugin applications.

## Primary Actors

- End User: Uses host shell and plugin applications.
- Tenant Admin: Manages tenant role assignments and plugin enablement within licensed catalog.
- Plugin Team: Builds plugin app, defines permissions/policies, and registers plugin metadata.
- Platform Operator: Operates core services, gateway, and reliability controls.

## External Systems

- Keycloak (User Realm): Issues user-auth tokens.
- Keycloak (Service Realm): Issues service credentials and supports gateway exchange patterns.
- Plugin Web Apps: Independently hosted frontends owned by plugin teams.
- Plugin Backend APIs: Optional plugin-owned services consumed by their frontend or other services.
- Notification Endpoints: Plugin/team webhooks for lifecycle warning/suspension events.

## Core Platform Responsibilities

- Registration API for plugin metadata and policy contracts.
- Validation pipeline and lifecycle state transitions.
- Plugin registry for runtime discovery.
- Tenant-aware gateway routing and proxy behavior.
- Policy artifact creation and enforcement integration points.
- Entitlement-aware plugin visibility (license-gated menu).
- Observability and audit trail across plugin interactions.

## Context-Level Flow

1. Plugin team registers plugin using OAuth client credentials and signed payload.
2. Core validates contract, health, and ownership metadata asynchronously.
3. Registry marks plugin Active and publishes metadata to discovery.
4. End user enters host shell URL with tenant path.
5. Host shell requests licensed plugin catalog and renders menu entries.
6. User selects plugin, navigation flows through gateway route.
7. Gateway applies tenant context and routes to external plugin app URL.
8. Plugin enforces in-app permissions/policies while core enforces cross-cutting controls.
