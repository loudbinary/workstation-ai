#!/usr/bin/env bash
set -euo pipefail

TARGET_ENV="${TARGET_ENV:-dev}"
DRY_RUN="${DRY_RUN:-true}"

if [[ ! -d "infra/terraform" ]]; then
  echo "infra/terraform not found. Nothing to plan/deploy for environment: ${TARGET_ENV}."
  exit 0
fi

if [[ "$DRY_RUN" == "true" ]]; then
  echo "[kubernetes] build-plan dry-run for environment=${TARGET_ENV}"
  echo "[kubernetes] terraform fmt check target remains infra/terraform"
  exit 0
fi

echo "[kubernetes] deploy requested for environment=${TARGET_ENV}"
echo "[kubernetes] hook this script to helm/terraform apply when app and chart are created"
