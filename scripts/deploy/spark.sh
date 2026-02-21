#!/usr/bin/env bash
set -euo pipefail

TARGET_ENV="${TARGET_ENV:-dev}"

if [[ -n "${SPARK_DEPLOY_COMMAND:-}" ]]; then
  echo "[spark] running configured deploy command for environment=${TARGET_ENV}"
  eval "$SPARK_DEPLOY_COMMAND"
  exit 0
fi

echo "[spark] no SPARK_DEPLOY_COMMAND configured for environment=${TARGET_ENV}"
echo "[spark] set SPARK_DEPLOY_COMMAND to enable real deployment"
