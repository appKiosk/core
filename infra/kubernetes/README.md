# Kubernetes Baseline IaC

Issue #39 introduces a versioned Kubernetes baseline for namespace boundaries, ingress, and network policy controls.

## Structure

- `base/`: shared namespace, ingress, service, and network policy manifests.
- `overlays/dev`: development environment hostnames/labels.
- `overlays/stage`: stage environment hostnames/labels.
- `overlays/prod`: production environment hostnames/labels.
- `scripts/`: bootstrap, plan, apply, destroy, and validation automation.

## Service Boundaries Declared

- Namespaces:
  - `core-system`
  - `core-services`
- Ingress:
  - `core-gateway` ingress routed to `core-services/core-gateway` service.
- Network policies:
  - default deny for `core-services`
  - gateway ingress allowed from `ingress-nginx` namespace only

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

Plan/apply/destroy for one environment:

```bash
./infra/kubernetes/scripts/plan.sh dev
./infra/kubernetes/scripts/apply.sh dev
./infra/kubernetes/scripts/destroy.sh dev
```
