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

require_rendered_match() {
  local rendered_file="$1"
  local check_pattern="$2"
  local error_message="$3"

  if ! grep -Eq "${check_pattern}" "${rendered_file}"; then
    echo "${error_message}" >&2
    exit 1
  fi
}

for env in dev stage prod; do
  overlay="${ROOT_DIR}/infra/kubernetes/overlays/${env}"
  rendered="${tmp_dir}/${env}.yaml"

  kubectl kustomize "${overlay}" >"${rendered}"

  kubeconform \
    -strict \
    -summary \
    -ignore-missing-schemas \
    "${rendered}"

  require_rendered_match "${rendered}" "^[[:space:]]*name:[[:space:]]*default-deny$" "Policy check failed (${env}): missing core-services default-deny NetworkPolicy."
  require_rendered_match "${rendered}" "^[[:space:]]*name:[[:space:]]*core-envoy-gateway$" "Policy check failed (${env}): missing GatewayClass core-envoy-gateway."
  require_rendered_match "${rendered}" "^[[:space:]]*name:[[:space:]]*core-gateway-control-plane$" "Policy check failed (${env}): missing control-plane HTTPRoute."
  require_rendered_match "${rendered}" "^[[:space:]]*name:[[:space:]]*core-plugin-runtime$" "Policy check failed (${env}): missing runtime HTTPRoute."
  require_rendered_match "${rendered}" "^[[:space:]]*name:[[:space:]]*core-gateway-control-plane-config$" "Policy check failed (${env}): missing control-plane ConfigMap."
  require_rendered_match "${rendered}" "^[[:space:]]*name:[[:space:]]*core-gateway-runtime-config$" "Policy check failed (${env}): missing runtime ConfigMap."

  if ! grep -q "kind: Ingress" "${rendered}" || ! grep -q "name: core-gateway" "${rendered}"; then
    echo "Policy check failed (${env}): missing core-gateway Ingress resource." >&2
    exit 1
  fi

done

echo "Kubernetes manifest validation passed for dev/stage/prod."
