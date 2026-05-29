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

# kubectl diff exits with code 1 when changes are found, which is expected for a plan view.
set +e
kubectl diff -k "${OVERLAY_DIR}"
exit_code=$?
set -e

if [[ ${exit_code} -eq 0 ]]; then
  echo "No drift detected for ${ENVIRONMENT}."
  exit 0
fi

if [[ ${exit_code} -eq 1 ]]; then
  echo "Drift detected for ${ENVIRONMENT}; review diff above before apply."
  exit 0
fi

echo "kubectl diff failed with exit code ${exit_code}." >&2
exit ${exit_code}
