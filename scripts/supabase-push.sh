#!/bin/bash
# Push supabase migrations to a specific environment.
# Usage: ./scripts/supabase-push.sh <staging|prod> [extra db push flags, e.g. --dry-run]
set -euo pipefail

ENV="${1:-}"
shift || true

case "$ENV" in
  staging) PROJECT_REF="thagwhvfqybuoghpriyb" ;;
  prod)    PROJECT_REF="laciueqbsljlmzqcdtpr" ;;
  *)
    echo "Usage: $0 <staging|prod> [extra flags]"
    exit 1
    ;;
esac

if [[ "$ENV" == "prod" ]]; then
  read -r -p "You are about to push migrations to PRODUCTION ($PROJECT_REF). Type 'prod' to continue: " CONFIRM
  if [[ "$CONFIRM" != "prod" ]]; then
    echo "Aborted."
    exit 1
  fi
fi

SCRIPT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
cd "$SCRIPT_DIR"

echo "Linking to $ENV ($PROJECT_REF)..."
supabase link --project-ref "$PROJECT_REF"

echo "Pushing migrations to $ENV..."
supabase db push "$@"
