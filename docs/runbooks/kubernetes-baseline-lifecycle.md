# Kubernetes Baseline Provisioning, Rollback, and Recovery

This runbook documents how to bootstrap and operate Kubernetes baseline resources introduced in issue #39.

## Scope

The baseline covers:

- Kubernetes namespaces (`core-system`, `core-services`)
- Gateway ingress and service boundaries
- Network policy boundaries for core-owned services
- Environment overlays for `dev`, `stage`, and `prod`

Plugin service namespaces and policies are owned by plugin repositories and are intentionally excluded from this core baseline.

All manifests are declared in-repo under `infra/kubernetes` and are applied through kustomize overlays.

## Prerequisites

- `kubectl` configured for the target cluster context.
- `kubeconform` installed for schema validation.
- Access to create/update namespaces, services, ingresses, and network policies.

## Bootstrap From Clean Checkout

```bash
git clone https://github.com/appKiosk/core.git
cd core
npm ci

# Optional local sanity check prior to cluster operations.
./infra/kubernetes/scripts/validate.sh

# Per environment (repeat for dev, stage, prod):
./infra/kubernetes/scripts/bootstrap.sh dev
./infra/kubernetes/scripts/plan.sh dev
./infra/kubernetes/scripts/apply.sh dev
```

Repeat the final three commands with `stage` and `prod` as needed.

## Idempotent Provisioning Model

- `kubectl apply -k` is declarative and idempotent for re-application.
- `kubectl diff -k` provides drift/plan output before apply.
- Environment-specific values are isolated in `infra/kubernetes/overlays/<env>`.

## Validation and Policy Checks

Use the repository script:

```bash
./infra/kubernetes/scripts/validate.sh
```

The script performs:

- `kubectl kustomize` render for each overlay
- strict `kubeconform` validation
- policy assertions that required ingress and default-deny policies exist

## Rollback and Destroy

To remove baseline resources from an environment:

```bash
./infra/kubernetes/scripts/destroy.sh dev
```

For rollback after an invalid change:

1. Revert the offending commit (or cherry-pick known-good baseline commit).
2. Re-run `./infra/kubernetes/scripts/validate.sh`.
3. Re-apply the known-good overlay with `./infra/kubernetes/scripts/apply.sh <env>`.
4. Confirm network policies and ingress state with `kubectl get` and `kubectl describe`.

## Operational Recovery

If apply fails part-way:

1. Run `./infra/kubernetes/scripts/plan.sh <env>` to inspect drift.
2. Resolve validation or permission errors.
3. Re-run `./infra/kubernetes/scripts/apply.sh <env>`.
4. Verify namespace and policy posture:

```bash
kubectl get ns core-system core-services
kubectl -n core-services get ingress,svc,networkpolicy
```

## Manual Exceptions

The following steps remain manual due to external ownership boundaries:

1. DNS records for environment hostnames (`dev.core.appkiosk.example`, `stage.core.appkiosk.example`, `core.appkiosk.example`).
   Rationale: DNS zones are managed in a separate shared-network account outside this repository's IaC boundary.
   Owner: Platform Networking team.

2. TLS certificate secret population (or cert-manager issuer configuration) for ingress secrets (`*-core-gateway-tls`).
   Rationale: certificate authority integration and secret issuance are managed by the cluster security platform.
   Owner: Platform Security team.

These exceptions are intentionally documented and are not performed through console-only drift-inducing edits to the Kubernetes baseline manifests.
