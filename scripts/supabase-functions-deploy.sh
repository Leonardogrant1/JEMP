#!/bin/bash
# Deploy edge functions to a specific environment (explicit --project-ref, link state irrelevant).
# Usage: ./scripts/supabase-functions-deploy.sh <staging|prod> [function name] [extra flags]
set -euo pipefail

ENV="${1:-}"
shift || true

case "$ENV" in
  staging) PROJECT_REF="thagwhvfqybuoghpriyb" ;;
  prod)    PROJECT_REF="laciueqbsljlmzqcdtpr" ;;
  *)
    echo "Usage: $0 <staging|prod> [function name] [extra flags]"
    exit 1
    ;;
esac

if [[ "$ENV" == "prod" ]]; then
  read -r -p "You are about to deploy edge functions to PRODUCTION ($PROJECT_REF). Type 'prod' to continue: " CONFIRM
  if [[ "$CONFIRM" != "prod" ]]; then
    echo "Aborted."
    exit 1
  fi
fi

SCRIPT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
cd "$SCRIPT_DIR"

echo "Deploying edge functions to $ENV ($PROJECT_REF)..."
supabase functions deploy --project-ref "$PROJECT_REF" "$@"
