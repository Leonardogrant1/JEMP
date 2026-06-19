#!/bin/bash

# Ensure PATH includes all common flyctl install locations
# ~/.fly/bin: curl installer (fly.io/install.sh)
# /opt/homebrew/bin: brew install flyctl
# /usr/local/bin: fallback
export PATH="$HOME/.fly/bin:/opt/homebrew/bin:/usr/local/bin:$PATH"

# Find flyctl dynamically
FLYCTL=$(which flyctl 2>/dev/null)
if [ -z "$FLYCTL" ]; then
  echo "Error: flyctl not found. Please install it via: brew install flyctl"
  exit 1
fi

# Get the environment as an argument
if [ $# -eq 1 ]; then
  # Only project given – no env
  ENV=""
  PROJECT=$1
else
  ENV=$1
  PROJECT=$2
fi

echo "Deploying $PROJECT to Fly.io in $ENV environment"


# Set APPNAME based on environment
if [[ $ENV == "prod" ]]; then
  APPNAME="$PROJECT-prod"
elif [[ $ENV == "dev" ]]; then
  APPNAME="$PROJECT-dev"
else
  # No env specified → use app name as-is (no suffix)
  APPNAME="$PROJECT"
fi


SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
PATH_TO_PROJECT="$SCRIPT_DIR/externals/$PROJECT"
echo $PATH_TO_PROJECT

# Read env vars from env.<ENV>.yaml in the project directory (or env.yaml if no env)
# Format: KEY: "VALUE"  or  KEY: VALUE
if [[ $ENV == "prod" || $ENV == "dev" ]]; then
  YAML_FILE="$PATH_TO_PROJECT/env.$ENV.yaml"
else
  YAML_FILE="$PATH_TO_PROJECT/env.yaml"
fi

if [ -f "$YAML_FILE" ]; then
  echo "Reading environment variables from $YAML_FILE..."

  env_vars=()
  while IFS= read -r line; do
    # Skip empty lines and comments
    [[ -z "$line" || "$line" =~ ^# ]] && continue

    # Parse "KEY: "VALUE"" or "KEY: VALUE"
    key=$(echo "$line" | awk -F': ' '{print $1}' | xargs)
    value=$(echo "$line" | awk -F': ' '{$1=""; print $0}' | xargs | sed 's/^"//;s/"$//')

    [[ -z "$key" || -z "$value" ]] && continue

    env_vars+=("${key}=${value}")
  done < "$YAML_FILE"

else
  echo "Warning: $YAML_FILE not found. No env vars will be set."
fi


DOCKERFILE_PATH=$PATH_TO_PROJECT/Dockerfile

if [ -f $DOCKERFILE_PATH ]; then
  echo "Dockerfile found at $DOCKERFILE_PATH"
else
  echo "Dockerfile not found at $DOCKERFILE_PATH"
  exit 1
fi


# ------- Deployment to fly.io -------

# Check if jq is installed (needed for app existence check)
if ! command -v jq &> /dev/null; then
  echo "Installing jq..."
  if [[ "$OSTYPE" == "darwin"* ]]; then
    brew install jq
  elif [[ "$OSTYPE" == "linux-gnu" ]]; then
    sudo apt-get install -y jq
  else
    echo "Please install jq manually."
    exit 1
  fi
fi

# Check if the app already exists
echo "Checking if app '$APPNAME' exists on Fly.io..."
if $FLYCTL apps list --json | jq -e ".[] | select(.Name == \"$APPNAME\")" > /dev/null; then
  echo "App '$APPNAME' already exists. Proceeding to deployment..."
else
  echo "App '$APPNAME' does not exist. Creating a new app on Fly.io..."
  $FLYCTL apps create --name $APPNAME -o memolib
fi

# Stage secrets from yaml
for env_var in "${env_vars[@]}"; do
  $FLYCTL secrets set --stage $env_var --app $APPNAME
done

# Use env-specific fly config (fly.dev.toml / fly.prod.toml) or fly.toml if no env
if [[ $ENV == "prod" || $ENV == "dev" ]]; then
  CONFIG_PATH="$PATH_TO_PROJECT/fly.$ENV.toml"
else
  CONFIG_PATH="$PATH_TO_PROJECT/fly.toml"
fi

if [ ! -f "$CONFIG_PATH" ]; then
  echo "Error: $CONFIG_PATH not found."
  exit 1
fi

# Deploy the application
echo "Deploying '$APPNAME'..."
echo "Current directory: $(pwd)"

$FLYCTL deploy --config $CONFIG_PATH --dockerfile $DOCKERFILE_PATH --build-arg PROJECT="$PROJECT" -a $APPNAME

if [ $? -eq 0 ]; then
  echo "Deployment successful"
  exit 0
else
  echo "Deployment failed"
  exit 1
fi