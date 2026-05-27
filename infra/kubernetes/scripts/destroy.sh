#!/usr/bin/env bash
set -euo pipefail

ENVIRONMENT="${1:-dev}"
OVERLAY_DIR="infra/kubernetes/overlays/${ENVIRONMENT}"

if [[ ! -d "${OVERLAY_DIR}" ]]; then
  echo "Unknown environment '${ENVIRONMENT}'. Expected one of: dev, stage, prod" >&2
  exit 1
fi

kubectl delete -k "${OVERLAY_DIR}" --ignore-not-found=true
