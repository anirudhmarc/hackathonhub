#!/usr/bin/env bash
#
# Bootstrap the Terraform state backend in YOUR AWS account.
#
# The S3 state bucket and DynamoDB lock table are a manual, one-time
# prerequisite per account — they are deliberately NOT managed by this
# Terraform (Terraform cannot create the backend it stores its own state in).
#
# This script is idempotent and non-destructive: it creates what is missing,
# leaves what already exists alone, and never deletes or reconfigures state.
#
# Usage:
#   ./bootstrap-backend.sh dev            # bootstrap + write env/dev/backend.config
#   ./bootstrap-backend.sh prod
#   ./bootstrap-backend.sh dev --force    # overwrite an existing backend.config
#
# Env overrides:
#   PROJECT_NAME  (default: hackhub)   state bucket/table name prefix
#   REGION        (default: us-east-1) must match `region` in the backend config
#
set -euo pipefail

ENVIRONMENT="${1:-}"
FORCE="${2:-}"
PROJECT_NAME="${PROJECT_NAME:-hackhub}"
REGION="${REGION:-us-east-1}"

if [[ "$ENVIRONMENT" != "dev" && "$ENVIRONMENT" != "prod" ]]; then
  echo "Usage: $0 <dev|prod> [--force]" >&2
  exit 1
fi

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
TEMPLATE="$SCRIPT_DIR/env/$ENVIRONMENT/backend.config.example"
TARGET="$SCRIPT_DIR/env/$ENVIRONMENT/backend.config"

[[ -f "$TEMPLATE" ]] || { echo "ERROR: missing template $TEMPLATE" >&2; exit 1; }

# ---------------------------------------------------------------------------
# 1. Identify the target account from the CALLER's own credentials.
#    This is what makes the backend account-independent: nothing is hardcoded.
# ---------------------------------------------------------------------------
if ! CALLER="$(aws sts get-caller-identity --output json 2>&1)"; then
  echo "ERROR: could not resolve AWS credentials. Configure them first:" >&2
  echo "       aws configure          (or export AWS_PROFILE=<profile>)" >&2
  echo "$CALLER" >&2
  exit 1
fi
ACCOUNT_ID="$(printf '%s' "$CALLER" | sed -n 's/.*"Account": *"\([0-9]*\)".*/\1/p')"
CALLER_ARN="$(printf '%s' "$CALLER" | sed -n 's/.*"Arn": *"\([^"]*\)".*/\1/p')"
[[ -n "$ACCOUNT_ID" ]] || { echo "ERROR: could not parse account ID from STS response" >&2; exit 1; }

BUCKET="${PROJECT_NAME}-tfstate-${ACCOUNT_ID}"
TABLE="${PROJECT_NAME}-tflock"

echo "Account : $ACCOUNT_ID"
echo "Identity: $CALLER_ARN"
echo "Region  : $REGION"
echo "Bucket  : $BUCKET"
echo "Table   : $TABLE"
echo

if [[ "$ENVIRONMENT" == "prod" ]]; then
  echo "You are bootstrapping the PRODUCTION backend in account $ACCOUNT_ID."
  read -r -p "Continue? [y/N] " reply
  [[ "$reply" == "y" || "$reply" == "Y" ]] || { echo "Aborted."; exit 1; }
  echo
fi

# ---------------------------------------------------------------------------
# 2. State bucket — create only if absent.
# ---------------------------------------------------------------------------
head_rc=0
head_out="$(aws s3api head-bucket --bucket "$BUCKET" 2>&1)" || head_rc=$?

if [[ $head_rc -eq 0 ]]; then
  echo "✓ Bucket $BUCKET already exists and is accessible — leaving it as is."
elif grep -q '403\|Forbidden' <<<"$head_out"; then
  cat >&2 <<EOF
ERROR: bucket name "$BUCKET" exists but is owned by a DIFFERENT AWS account.

S3 bucket names are globally unique. This usually means your credentials are
not for the account you think they are — you are authenticated as:
  $CALLER_ARN  (account $ACCOUNT_ID)

Fix your credentials (or set PROJECT_NAME=<something-unique>) and re-run.
EOF
  exit 1
else
  echo "Creating bucket $BUCKET ..."
  if [[ "$REGION" == "us-east-1" ]]; then
    aws s3api create-bucket --bucket "$BUCKET" --region "$REGION" >/dev/null
  else
    aws s3api create-bucket --bucket "$BUCKET" --region "$REGION" \
      --create-bucket-configuration "LocationConstraint=$REGION" >/dev/null
  fi

  # Versioning: lets you recover a clobbered or corrupted state file.
  aws s3api put-bucket-versioning --bucket "$BUCKET" \
    --versioning-configuration Status=Enabled

  # Encryption at rest: state files contain resource metadata and can contain secrets.
  aws s3api put-bucket-encryption --bucket "$BUCKET" \
    --server-side-encryption-configuration \
    '{"Rules":[{"ApplyServerSideEncryptionByDefault":{"SSEAlgorithm":"AES256"}}]}'

  # State must never be public.
  aws s3api put-public-access-block --bucket "$BUCKET" \
    --public-access-block-configuration \
    'BlockPublicAcls=true,IgnorePublicAcls=true,BlockPublicPolicy=true,RestrictPublicBuckets=true'

  echo "✓ Bucket $BUCKET created (versioned, AES256, public access blocked)."
fi

# ---------------------------------------------------------------------------
# 3. Lock table — create only if absent.
# ---------------------------------------------------------------------------
if aws dynamodb describe-table --table-name "$TABLE" --region "$REGION" >/dev/null 2>&1; then
  echo "✓ Lock table $TABLE already exists — leaving it as is."
else
  echo "Creating lock table $TABLE ..."
  aws dynamodb create-table --table-name "$TABLE" --region "$REGION" \
    --attribute-definitions AttributeName=LockID,AttributeType=S \
    --key-schema AttributeName=LockID,KeyType=HASH \
    --billing-mode PAY_PER_REQUEST >/dev/null
  aws dynamodb wait table-exists --table-name "$TABLE" --region "$REGION"
  echo "✓ Lock table $TABLE created."
fi

# ---------------------------------------------------------------------------
# 4. Render env/<env>/backend.config from the template.
# ---------------------------------------------------------------------------
if [[ -f "$TARGET" && "$FORCE" != "--force" ]]; then
  echo
  echo "! $TARGET already exists — not overwriting (pass --force to replace)."
else
  sed "s/<ACCOUNT_ID>/$ACCOUNT_ID/g" "$TEMPLATE" > "$TARGET"
  echo "✓ Wrote $TARGET"
fi

cat <<EOF

Backend ready. Next:

  terraform init -reconfigure -backend-config=env/$ENVIRONMENT/backend.config
  terraform apply -var-file=env/$ENVIRONMENT/$ENVIRONMENT.tfvars

Note: env/$ENVIRONMENT/$ENVIRONMENT.tfvars is gitignored — create it locally.
EOF
