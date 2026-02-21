#!/usr/bin/env bash
set -euo pipefail

TARGET_ENV="${TARGET_ENV:-dev}"

mkdir -p .devcontainer

if [[ ! -f ".devcontainer/devcontainer.json" ]]; then
  cat > .devcontainer/devcontainer.json <<'JSON'
{
  "name": "workstation-ai",
  "image": "mcr.microsoft.com/devcontainers/base:ubuntu"
}
JSON
fi

echo "[codespaces] target prepared for environment=${TARGET_ENV}"
echo "[codespaces] .devcontainer/devcontainer.json is present"
