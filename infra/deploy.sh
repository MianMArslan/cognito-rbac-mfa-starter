#!/usr/bin/env bash
# deploy.sh — Deploy the Cognito CloudFormation stack
#
# Usage:
#   bash infra/deploy.sh
#   ENVIRONMENT=prod bash infra/deploy.sh
#
# AWS credentials are read from infra/.env or from environment variables.
# Required: AWS_ACCESS_KEY_ID, AWS_SECRET_ACCESS_KEY, REGION (or AWS_REGION / COGNITO_REGION)

set -euo pipefail

# ─────────────────────────────────────────────────────────────────────────────
# Load apps/api/.env if it exists
# ─────────────────────────────────────────────────────────────────────────────
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ENV_FILE="$SCRIPT_DIR/.env"

if [ -f "$ENV_FILE" ]; then
  set -a
  # shellcheck disable=SC1090
  source <(grep -v '^#' "$ENV_FILE" | grep -v '^[[:space:]]*$')
  set +a
fi

# ─────────────────────────────────────────────────────────────────────────────
# Config
# ─────────────────────────────────────────────────────────────────────────────
STACK_NAME="${STACK_NAME:-cognito-rbac-mfa-starter}"
REGION="${AWS_REGION:-${REGION:-${COGNITO_REGION:-us-east-1}}}"
ENVIRONMENT="${ENVIRONMENT:-dev}"
TEMPLATE="$SCRIPT_DIR/cognito.yaml"

# ─────────────────────────────────────────────────────────────────────────────
# Preflight checks
# ─────────────────────────────────────────────────────────────────────────────
if ! command -v aws &> /dev/null; then
  echo ""
  echo "  Error: AWS CLI is not installed."
  echo "  Install it from: https://docs.aws.amazon.com/cli/latest/userguide/install-cliv2.html"
  echo ""
  exit 1
fi

if [ -z "${AWS_ACCESS_KEY_ID:-}" ] || [ -z "${AWS_SECRET_ACCESS_KEY:-}" ]; then
  echo ""
  echo "  Error: AWS credentials not found."
  echo "  Add AWS_ACCESS_KEY_ID and AWS_SECRET_ACCESS_KEY to infra/.env"
  echo "  or export them as environment variables."
  echo ""
  exit 1
fi

# ─────────────────────────────────────────────────────────────────────────────
# Deploy
# ─────────────────────────────────────────────────────────────────────────────
echo ""
echo "  Deploying Cognito stack"
echo "  ─────────────────────────────────────"
echo "  Stack      : $STACK_NAME"
echo "  Region     : $REGION"
echo "  Environment: $ENVIRONMENT"
echo "  Template   : $TEMPLATE"
echo ""

aws cloudformation deploy \
  --template-file "$TEMPLATE" \
  --stack-name "$STACK_NAME" \
  --parameter-overrides "Environment=$ENVIRONMENT" \
  --region "$REGION" \
  --no-fail-on-empty-changeset

# ─────────────────────────────────────────────────────────────────────────────
# Fetch outputs
# ─────────────────────────────────────────────────────────────────────────────
echo ""
echo "  Fetching stack outputs…"

USER_POOL_ID=$(aws cloudformation describe-stacks \
  --stack-name "$STACK_NAME" \
  --region "$REGION" \
  --query "Stacks[0].Outputs[?OutputKey=='UserPoolId'].OutputValue | [0]" \
  --output text)

CLIENT_ID=$(aws cloudformation describe-stacks \
  --stack-name "$STACK_NAME" \
  --region "$REGION" \
  --query "Stacks[0].Outputs[?OutputKey=='UserPoolClientId'].OutputValue | [0]" \
  --output text)

CLIENT_SECRET=$(aws cloudformation describe-stacks \
  --stack-name "$STACK_NAME" \
  --region "$REGION" \
  --query "Stacks[0].Outputs[?OutputKey=='UserPoolClientSecret'].OutputValue | [0]" \
  --output text)

# ─────────────────────────────────────────────────────────────────────────────
# Print .env block
# ─────────────────────────────────────────────────────────────────────────────
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "  Copy the following into apps/api/.env"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "COGNITO_REGION=$REGION"
echo "COGNITO_USER_POOL_ID=$USER_POOL_ID"
echo "COGNITO_CLIENT_ID=$CLIENT_ID"
echo "COGNITO_CLIENT_SECRET=$CLIENT_SECRET"
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "  Done. Run 'pnpm seed:admin' to create your first admin user."
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
