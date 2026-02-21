#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
APPS_DIR="${APPS_DIR:-${ROOT_DIR}/apps}"
BUILD_PLAN="${BUILD_PLAN:-kubernetes}"
TARGET_ENV="${TARGET_ENV:-dev}"
REQUIRE_APP_WORKFLOW="${REQUIRE_APP_WORKFLOW:-false}"

case "$BUILD_PLAN" in
  kubernetes)
    TASK_NAME="ci:act:plan:kubernetes"
    EVENT_FILE="${ROOT_DIR}/.github/events/workflow_dispatch-kubernetes.json"
    ;;
  github-platform)
    TASK_NAME="ci:act:plan:github-platform"
    EVENT_FILE="${ROOT_DIR}/.github/events/workflow_dispatch-github-platform.json"
    ;;
  *)
    echo "Unsupported BUILD_PLAN: ${BUILD_PLAN}. Use kubernetes or github-platform."
    exit 1
    ;;
esac

for command in direnv task act; do
  if ! command -v "$command" >/dev/null 2>&1; then
    echo "Missing required command: ${command}"
    if [[ "$command" == "act" ]]; then
      echo "Install with: brew install act"
    fi
    exit 1
  fi
done

ROOT_WORKFLOW="${ROOT_DIR}/.github/workflows/ci.yml"
if [[ ! -f "$ROOT_WORKFLOW" ]]; then
  echo "Missing required workflow: ${ROOT_WORKFLOW}"
  exit 1
fi

if [[ ! -f "$EVENT_FILE" ]]; then
  echo "Missing required workflow dispatch event file: ${EVENT_FILE}"
  exit 1
fi

if [[ ! -d "$APPS_DIR" ]]; then
  echo "Apps directory not found: ${APPS_DIR}"
  exit 1
fi

mapfile -t APP_DIRS < <(find "$APPS_DIR" -mindepth 1 -maxdepth 1 -type d | sort)

if [[ ${#APP_DIRS[@]} -eq 0 ]]; then
  echo "No app directories found under ${APPS_DIR}."
  exit 0
fi

failures=0

for app_dir in "${APP_DIRS[@]}"; do
  app_name="$(basename "$app_dir")"
  echo "=== app: ${app_name} ==="

  if [[ ! -f "${app_dir}/.envrc" ]]; then
    echo "[FAIL] Missing .envrc in ${app_dir}"
    failures=$((failures + 1))
    continue
  fi

  if [[ "$REQUIRE_APP_WORKFLOW" == "true" ]]; then
    app_workflow_file="$(find "${app_dir}/.github/workflows" -maxdepth 1 -type f \( -name '*.yml' -o -name '*.yaml' \) -print -quit 2>/dev/null || true)"
    if [[ -z "$app_workflow_file" ]]; then
      echo "[FAIL] Missing app workflow under ${app_dir}/.github/workflows"
      failures=$((failures + 1))
      continue
    fi
  fi

  echo "[INFO] direnv variables for ${app_name}:"
  if ! direnv exec "$app_dir" bash -lc 'env | sort'; then
    echo "[FAIL] Unable to read direnv environment for ${app_name}"
    failures=$((failures + 1))
    continue
  fi

  if ! direnv exec "$app_dir" bash -lc "cd '$ROOT_DIR' && APP_NAME='$app_name' APP_DIR='$app_dir' BUILD_PLAN='$BUILD_PLAN' TARGET_ENV='$TARGET_ENV' task $TASK_NAME"; then
    echo "[FAIL] Workflow execution failed for ${app_name}"
    failures=$((failures + 1))
    continue
  fi

  echo "[OK] ${app_name}"
  echo

done

if [[ $failures -gt 0 ]]; then
  echo "Completed with ${failures} failing app(s)."
  exit 1
fi

echo "Completed successfully for ${#APP_DIRS[@]} app(s)."
