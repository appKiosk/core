#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(cd "${SCRIPT_DIR}/../../.." && pwd)"

if ! command -v kubectl >/dev/null 2>&1; then
  echo "kubectl is required. Install kubectl and rerun." >&2
  exit 1
fi

if ! command -v kubeconform >/dev/null 2>&1; then
  echo "kubeconform is required. Install kubeconform and rerun." >&2
  exit 1
fi

tmp_dir="$(mktemp -d)"
trap 'rm -rf "${tmp_dir}"' EXIT

for env in dev stage prod; do
  overlay="${ROOT_DIR}/infra/kubernetes/overlays/${env}"
  rendered="${tmp_dir}/${env}.yaml"

  kubectl kustomize "${overlay}" >"${rendered}"

  kubeconform \
    -strict \
    -summary \
    -ignore-missing-schemas \
    "${rendered}"

  if ! grep -q "name: default-deny" "${rendered}" || ! grep -q "namespace: core-services" "${rendered}"; then
    echo "Policy check failed (${env}): missing core-services default-deny NetworkPolicy." >&2
    exit 1
  fi

  if ! grep -q "kind: Ingress" "${rendered}" || ! grep -q "name: core-gateway" "${rendered}"; then
    echo "Policy check failed (${env}): missing core-gateway Ingress resource." >&2
    exit 1
  fi

done

echo "Kubernetes manifest validation passed for dev/stage/prod."
