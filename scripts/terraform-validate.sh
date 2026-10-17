#!/usr/bin/env bash
# Format-check and validate every root module without a remote backend or AWS credentials.
set -euo pipefail

root="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

terraform fmt -check -recursive "${root}/infra"

for dir in "${root}/infra/bootstrap" "${root}/infra/envs/dev" "${root}/infra/envs/prod"; do
  echo "validate ${dir#"${root}/"}"
  terraform -chdir="${dir}" init -backend=false -input=false
  terraform -chdir="${dir}" validate
done
