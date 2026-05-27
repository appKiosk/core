# Helm and Knative Migration Plan (POC to Production)

This document defines the migration path from the current Kubernetes baseline (Kustomize overlays) to a production-ready deployment model using Helm and Knative.

## Goals

- Keep the current POC delivery path simple with Kustomize.
- Introduce Helm chart packaging for repeatable releases and versioned deployment contracts.
- Introduce Knative Serving for revision-based rollout, traffic splitting, and safer canary delivery.
- Preserve existing security and namespace boundary controls while moving to production workflows.

## Current State

- Baseline cluster resources are managed in this repository under `infra/kubernetes`.
- Environment differentiation is handled through Kustomize overlays (`dev`, `stage`, `prod`).
- Validation is performed by rendering manifests and running schema/policy checks.

## Target State

### Deployment Packaging

- Core services are packaged as Helm charts with semantic chart versions.
- Environment configuration is expressed through values files.
- Releases are managed through chart version + values combination per environment.

### Runtime and Traffic Management

- Core gateway and eligible stateless services run as Knative Services.
- Revisions are created per deployment and tracked as immutable rollout units.
- Canary rollouts use Knative traffic splitting between stable and candidate revisions.

### Platform Expectations

- Ingress and networking model supports Knative (Kourier or Istio-based path).
- Autoscaling behavior is controlled via Knative annotations and policy defaults.
- Observability includes revision-level request/error/latency signals.

## Migration Principles

- No big-bang cutover.
- Migrate one service at a time.
- Keep rollback simple (traffic revert first, artifact rollback second).
- Preserve namespace ownership boundaries between core and plugins.

## Phased Plan

## Phase 0: Prerequisites and Design

Outcome: Production target architecture and controls are agreed.

1. Select Knative networking layer (Kourier or Istio) and document rationale.
2. Define supported traffic policies for canary (for example 95/5, 90/10, 50/50).
3. Define Helm chart structure:
   - One chart per core service, or
   - One umbrella chart with subcharts.
4. Define environment value strategy:
   - `values-dev.yaml`
   - `values-stage.yaml`
   - `values-prod.yaml`
5. Define production SLO/SLA and rollout gates (error budget, latency threshold, success rate).

## Phase 1: Helm Packaging Without Runtime Change

Outcome: Same runtime behavior, but released through Helm.

1. Create Helm chart(s) for current core resources.
2. Render current Kustomize output and Helm output side-by-side for parity checks.
3. Add CI checks:
   - `helm lint`
   - `helm template` per environment values
   - policy checks on rendered manifests
4. Keep Kustomize as the active deploy path until parity is proven.

Exit criteria:

- Helm-rendered manifests are functionally equivalent for baseline resources.
- CI enforces Helm quality gates for all environments.

## Phase 2: Introduce Knative for One Core Service

Outcome: First service runs as Knative Service with revision support.

1. Select pilot service (recommended: core gateway if request profile is compatible).
2. Add Knative Service definitions in Helm templates.
3. Configure autoscaling parameters and concurrency limits.
4. Deploy stable revision with 100 percent traffic.
5. Validate observability dashboards and alerting per revision.

Exit criteria:

- Service is stable on Knative for one full release cycle.
- Rollback and revision inspection procedures are documented and tested.

## Phase 3: Canary Release Workflow

Outcome: Controlled progressive delivery using Knative traffic splits.

1. Update deployment workflow to create candidate revision without full cutover.
2. Automate traffic progression gates, for example:
   - 5 percent for 15 minutes
   - 25 percent for 30 minutes
   - 50 percent for 30 minutes
   - 100 percent after gate pass
3. Add automatic rollback trigger when SLO breach occurs.
4. Record rollout events and outcomes for auditability.

Exit criteria:

- Canary promotion and rollback runbooks are validated in stage.
- Production canary releases are operator-ready.

## Phase 4: Scale Out and Decommission Legacy Path

Outcome: Helm + Knative is the standard production path.

1. Migrate remaining eligible stateless core services.
2. Keep non-Knative resources in Helm charts as standard Kubernetes resources.
3. Freeze direct Kustomize-based production deploy path.
4. Retain Kustomize only for local dev or transitional compatibility if needed.

Exit criteria:

- Production deployment standard documented as Helm + Knative.
- Legacy deploy path decommissioned with rollback contingency retained.

## CI/CD Evolution Plan

Add production-track CI jobs in stages:

1. Helm quality:
   - `helm lint` on charts
   - `helm template` for each environment values file
2. Policy and schema checks on rendered Helm output.
3. Knative-specific validation checks (resource schema and policy conformance).
4. Progressive delivery pipeline steps:
   - deploy candidate revision
   - evaluate health gates
   - promote or rollback traffic split

## Operational Runbook Additions Required

Before production adoption, add dedicated runbooks for:

1. Knative revision inspection and rollback.
2. Canary promotion and abort procedures.
3. Helm release rollback and chart pinning.
4. Incident triage for mixed stable/canary traffic scenarios.

## Risks and Mitigations

1. Risk: Added platform complexity.
   Mitigation: Stage-gated rollout, one-service pilot, explicit exit criteria.

2. Risk: Traffic policy misconfiguration.
   Mitigation: Policy tests in CI and conservative default progression.

3. Risk: Cost spikes from cold starts and scaling behavior.
   Mitigation: Tune min scale/concurrency and monitor revision-level utilization.

4. Risk: Ownership confusion between core and plugin boundaries.
   Mitigation: Maintain explicit boundary contract that plugin runtime policies remain plugin-owned.

## Suggested Timeline (Adjustable)

1. Sprint 1: Phase 0 and chart design.
2. Sprint 2: Phase 1 Helm parity.
3. Sprint 3: Phase 2 pilot on Knative.
4. Sprint 4: Phase 3 canary workflow.
5. Sprint 5+: Phase 4 service-by-service adoption.

## Decision Checkpoint

Use this migration plan as the production readiness path while keeping the current POC Kustomize baseline intact until Phase 1 parity and Phase 2 pilot criteria are complete.
