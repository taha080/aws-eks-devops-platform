#!/usr/bin/env bash
# Build the image, load it into a local kind cluster, and install the chart.
set -euo pipefail

root="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cluster="linkforge"

if ! kind get clusters | grep -qx "${cluster}"; then
  kind create cluster --name "${cluster}" --config "${root}/deploy/kind/cluster.yaml"
fi

docker build -t linkforge:local "${root}/app"
kind load docker-image linkforge:local --name "${cluster}"

helm upgrade --install linkforge "${root}/deploy/helm/linkforge" \
  --namespace linkforge \
  --create-namespace \
  -f "${root}/deploy/helm/linkforge/values-kind.yaml"

kubectl --namespace linkforge rollout status deployment/linkforge --timeout=180s
kubectl --namespace linkforge get pods,svc
echo "Open http://127.0.0.1:8080/healthz"
