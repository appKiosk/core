# Kubernetes Baseline IaC

Issue #39 introduced the initial Kubernetes baseline for namespace boundaries, ingress, and network policy controls.
Issue #40 extends that baseline with declarative gateway control-plane and runtime data-plane configuration.

## Structure

- `base/`: shared namespace, ingress, service, and network policy manifests.
- `base/gateway-api`: Gateway API control plane resources (`GatewayClass`, `Gateway`, `HTTPRoute`).
- `base/config`: baseline control-plane/runtime `ConfigMap` resources for gateway behavior.
- `overlays/dev`: development environment hostnames/labels.
- `overlays/stage`: stage environment hostnames/labels.
- `overlays/prod`: production environment hostnames/labels.
- `scripts/`: bootstrap, plan, apply, destroy, and validation automation.

## Service Boundaries Declared

- Namespaces:
  - `core-system`
  - `core-services`
- Ingress and Gateway API routing:
  - `core-gateway` ingress routed to `core-services/core-gateway` service.
  - `core-envoy-gateway` `GatewayClass` with `core-gateway` `Gateway` listeners.
  - `HTTPRoute` resources for control-plane and plugin runtime paths.
- Network policies:
  - default deny for `core-services`
  - gateway ingress allowed from `ingress-nginx` namespace only
- Gateway configuration:
  - control-plane config map in `core-system`
  - runtime data-plane config map in `core-services`

Plugin namespace policies are intentionally managed in plugin repositories, not in this core baseline.

## Commands

Render manifests for an environment:

```bash
kubectl kustomize infra/kubernetes/overlays/dev
```

Validate all environments:

```bash
./infra/kubernetes/scripts/validate.sh
```

The validation script enforces presence of baseline policies and required gateway control/data-plane resources in each overlay.

Plan/apply/destroy for one environment:

```bash
./infra/kubernetes/scripts/plan.sh dev
./infra/kubernetes/scripts/apply.sh dev
./infra/kubernetes/scripts/destroy.sh dev
```
