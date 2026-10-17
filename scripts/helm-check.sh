#!/usr/bin/env bash
# Lint the chart and render every values file.
set -euo pipefail

root="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
chart="${root}/deploy/helm/linkforge"

helm lint "${chart}"
helm lint "${chart}" -f "${chart}/values-dev.yaml"
helm lint "${chart}" -f "${chart}/values-prod.yaml"
helm lint "${chart}" -f "${chart}/values-kind.yaml"

render() {
  local name="$1"
  shift
  helm template "${name}" "${chart}" "$@" >/dev/null
}

render linkforge
render linkforge-dev -f "${chart}/values-dev.yaml"
render linkforge-prod -f "${chart}/values-prod.yaml"
render linkforge-kind -f "${chart}/values-kind.yaml"

prod="$(helm template linkforge-prod "${chart}" -f "${chart}/values-prod.yaml")"
for kind in Deployment Service Ingress HorizontalPodAutoscaler PodDisruptionBudget ConfigMap ServiceAccount NetworkPolicy; do
  if ! grep -q "kind: ${kind}$" <<<"${prod}"; then
    echo "prod render is missing ${kind}" >&2
    exit 1
  fi
done

kind_render="$(helm template linkforge-kind "${chart}" -f "${chart}/values-kind.yaml")"
if ! grep -q "nodePort: 30080" <<<"${kind_render}"; then
  echo "kind render is missing the NodePort" >&2
  exit 1
fi
if grep -q "kind: Ingress$" <<<"${kind_render}"; then
  echo "kind render should not include an Ingress" >&2
  exit 1
fi

echo "helm template rendered dev, prod, kind, and default values"
