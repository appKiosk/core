#!/usr/bin/env bash
set -euo pipefail

ENVIRONMENT="${1:-dev}"
OVERLAY_DIR="infra/kubernetes/overlays/${ENVIRONMENT}"

if [[ ! -d "${OVERLAY_DIR}" ]]; then
  echo "Unknown environment '${ENVIRONMENT}'. Expected one of: dev, stage, prod" >&2
  exit 1
fi

if ! command -v kubectl >/dev/null 2>&1; then
  echo "kubectl is required. Install kubectl and rerun." >&2
  exit 1
fi

if ! kubectl config current-context >/dev/null 2>&1; then
  echo "kubectl context is not configured. Run 'kubectl config use-context <context>' and rerun." >&2
  exit 1
fi

echo "Environment: ${ENVIRONMENT}"
echo "Overlay: ${OVERLAY_DIR}"
echo "Cluster context: $(kubectl config current-context)"
echo "Bootstrap checks passed."

echo "Next steps:"
echo "  1) ./infra/kubernetes/scripts/plan.sh ${ENVIRONMENT}"
echo "  2) ./infra/kubernetes/scripts/apply.sh ${ENVIRONMENT}"
