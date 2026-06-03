#!/usr/bin/env bash
set -euo pipefail

# ─── Usage ──────────────────────────────────────────────────────
# bash infra/deploy.sh --env dev --region us-east-1 \
#   --vpc-id vpc-xxx --subnet-ids "subnet-a,subnet-b" \
#   --github-repo "https://github.com/you/cognito-rbac-mfa-starter" \
#   --github-token "ghp_xxx"

ENV="dev"
REGION="us-east-1"
VPC_ID=""
SUBNET_IDS=""
GITHUB_REPO=""
GITHUB_BRANCH="main"
GITHUB_TOKEN=""
MFA_MODE="OPTIONAL"
ENABLE_SMS="false"
TEMPLATES_BUCKET=""

while [[ $# -gt 0 ]]; do
  case $1 in
    --env)           ENV="$2";           shift 2 ;;
    --region)        REGION="$2";        shift 2 ;;
    --vpc-id)        VPC_ID="$2";        shift 2 ;;
    --subnet-ids)    SUBNET_IDS="$2";    shift 2 ;;
    --github-repo)   GITHUB_REPO="$2";   shift 2 ;;
    --github-branch) GITHUB_BRANCH="$2"; shift 2 ;;
    --github-token)  GITHUB_TOKEN="$2";  shift 2 ;;
    --mfa-mode)      MFA_MODE="$2";      shift 2 ;;
    --enable-sms)    ENABLE_SMS="$2";    shift 2 ;;
    --templates-bucket) TEMPLATES_BUCKET="$2"; shift 2 ;;
    *) echo "Unknown flag: $1"; exit 1 ;;
  esac
done

ACCOUNT_ID=$(aws sts get-caller-identity --query Account --output text)
ECR_URI="${ACCOUNT_ID}.dkr.ecr.${REGION}.amazonaws.com/${ENV}-api"
TEMPLATES_BUCKET="${TEMPLATES_BUCKET:-${ENV}-cfn-templates-${ACCOUNT_ID}}"
IMAGE_TAG="$(git rev-parse --short HEAD)"
IMAGE_URI="${ECR_URI}:${IMAGE_TAG}"

echo "==> Environment : ${ENV}"
echo "==> Region      : ${REGION}"
echo "==> Account     : ${ACCOUNT_ID}"
echo "==> Image       : ${IMAGE_URI}"
echo ""

# ─── Step 1: Upload nested templates to S3 ──────────────────────
echo "==> Uploading CloudFormation templates to s3://${TEMPLATES_BUCKET}/"
aws s3 mb "s3://${TEMPLATES_BUCKET}" --region "${REGION}" 2>/dev/null || true
aws s3 sync infra/cloudformation/ "s3://${TEMPLATES_BUCKET}/" \
  --region "${REGION}" \
  --exclude "main.yaml"

# ─── Step 2: Deploy IAM stack ───────────────────────────────────
echo "==> Deploying IAM stack..."
aws cloudformation deploy \
  --template-file infra/cloudformation/iam.yaml \
  --stack-name "${ENV}-iam" \
  --parameter-overrides EnvironmentName="${ENV}" EnableSMSMfa="${ENABLE_SMS}" \
  --capabilities CAPABILITY_NAMED_IAM \
  --region "${REGION}"

# ─── Step 3: Deploy ECR stack ───────────────────────────────────
echo "==> Deploying ECR stack..."
aws cloudformation deploy \
  --template-file infra/cloudformation/ecr.yaml \
  --stack-name "${ENV}-ecr" \
  --parameter-overrides EnvironmentName="${ENV}" \
  --region "${REGION}"

# ─── Step 4: Build and push Docker image ────────────────────────
echo "==> Authenticating with ECR..."
aws ecr get-login-password --region "${REGION}" | \
  docker login --username AWS --password-stdin "${ACCOUNT_ID}.dkr.ecr.${REGION}.amazonaws.com"

echo "==> Building Docker image..."
docker build -t "${IMAGE_URI}" -f apps/api/Dockerfile .
docker tag "${IMAGE_URI}" "${ECR_URI}:latest"

echo "==> Pushing image to ECR..."
docker push "${IMAGE_URI}"
docker push "${ECR_URI}:latest"

# ─── Step 5: Deploy Cognito stack ───────────────────────────────
echo "==> Deploying Cognito stack..."
aws cloudformation deploy \
  --template-file infra/cloudformation/cognito.yaml \
  --stack-name "${ENV}-cognito" \
  --parameter-overrides \
    EnvironmentName="${ENV}" \
    MfaConfiguration="${MFA_MODE}" \
    EnableSMSMfa="${ENABLE_SMS}" \
  --capabilities CAPABILITY_IAM \
  --region "${REGION}"

# ─── Step 6: Deploy ECS stack ───────────────────────────────────
echo "==> Deploying ECS stack..."
aws cloudformation deploy \
  --template-file infra/cloudformation/ecs.yaml \
  --stack-name "${ENV}-ecs" \
  --parameter-overrides \
    EnvironmentName="${ENV}" \
    ApiImageUri="${IMAGE_URI}" \
    VpcId="${VPC_ID}" \
    SubnetIds="${SUBNET_IDS}" \
  --capabilities CAPABILITY_IAM \
  --region "${REGION}"

# ─── Step 7: Force new ECS deployment ───────────────────────────
echo "==> Forcing new ECS deployment..."
aws ecs update-service \
  --cluster "${ENV}-cluster" \
  --service "${ENV}-api-service" \
  --force-new-deployment \
  --region "${REGION}" > /dev/null

# ─── Step 8: Deploy Amplify stack ───────────────────────────────
if [[ -n "${GITHUB_REPO}" && -n "${GITHUB_TOKEN}" ]]; then
  echo "==> Deploying Amplify stack..."
  aws cloudformation deploy \
    --template-file infra/cloudformation/amplify.yaml \
    --stack-name "${ENV}-amplify" \
    --parameter-overrides \
      EnvironmentName="${ENV}" \
      GitHubRepo="${GITHUB_REPO}" \
      GitHubBranch="${GITHUB_BRANCH}" \
      GitHubAccessToken="${GITHUB_TOKEN}" \
    --capabilities CAPABILITY_IAM \
    --region "${REGION}"
else
  echo "==> Skipping Amplify (--github-repo and --github-token not provided)"
fi

# ─── Done ────────────────────────────────────────────────────────
ALB_DNS=$(aws cloudformation describe-stacks \
  --stack-name "${ENV}-ecs" \
  --query "Stacks[0].Outputs[?OutputKey=='ALBDnsName'].OutputValue" \
  --output text \
  --region "${REGION}" 2>/dev/null || echo "N/A")

echo ""
echo "✓ Deployment complete"
echo "  API URL : http://${ALB_DNS}"
echo "  Swagger : http://${ALB_DNS}/api/docs"
