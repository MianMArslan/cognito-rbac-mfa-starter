#!/usr/bin/env bash
# remove.sh — Delete the Cognito CloudFormation stack
#
# Usage:
#   bash infra/remove.sh
#   ENVIRONMENT=prod bash infra/remove.sh
#
# AWS credentials are read from infra/.env or from environment variables.
# Required: AWS_ACCESS_KEY_ID, AWS_SECRET_ACCESS_KEY, REGION (or AWS_REGION / COGNITO_REGION)
#
# WARNING: This permanently deletes the Cognito User Pool and all users in it.

set -euo pipefail

# ─────────────────────────────────────────────────────────────────────────────
# Load infra/.env if it exists
# ─────────────────────────────────────────────────────────────────────────────
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ENV_FILE="$SCRIPT_DIR/.env"

if [ -f "$ENV_FILE" ]; then
  set -a
  # shellcheck disable=SC1090
  source "$ENV_FILE"
  set +a
fi

# ─────────────────────────────────────────────────────────────────────────────
# Config
# ─────────────────────────────────────────────────────────────────────────────
STACK_NAME="${STACK_NAME:-cognito-rbac-mfa-starter}"
REGION="${AWS_REGION:-${REGION:-${COGNITO_REGION:-us-east-1}}}"

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
# Confirm before deleting
# ─────────────────────────────────────────────────────────────────────────────
echo ""
echo "  ⚠  This will permanently delete the CloudFormation stack and"
echo "     all Cognito users within it. This cannot be undone."
echo ""
echo "  Stack  : $STACK_NAME"
echo "  Region : $REGION"
echo ""
read -r -p "  Type the stack name to confirm deletion: " CONFIRM

if [ "$CONFIRM" != "$STACK_NAME" ]; then
  echo ""
  echo "  Aborted — stack name did not match."
  echo ""
  exit 1
fi

# ─────────────────────────────────────────────────────────────────────────────
# Delete
# ─────────────────────────────────────────────────────────────────────────────
echo ""
echo "  Deleting stack: $STACK_NAME"
echo ""

aws cloudformation delete-stack \
  --stack-name "$STACK_NAME" \
  --region "$REGION"

echo "  Waiting for deletion to complete…"

aws cloudformation wait stack-delete-complete \
  --stack-name "$STACK_NAME" \
  --region "$REGION"

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "  Stack deleted successfully."
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
