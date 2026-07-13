#!/bin/bash
# ============================================================================
# Terraform Validation Script
# ============================================================================
# This script validates all Terraform code without applying changes
# ============================================================================

set -e

echo "🔍 Terraform Code Validation"
echo "=============================="
echo ""

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Track validation status
VALIDATION_PASSED=true

# Function to print status
print_status() {
    if [ $1 -eq 0 ]; then
        echo -e "${GREEN}✅ $2${NC}"
    else
        echo -e "${RED}❌ $2${NC}"
        VALIDATION_PASSED=false
    fi
}

# Function to print warning
print_warning() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

echo "Step 1: Checking Terraform installation"
echo "----------------------------------------"
if command -v terraform &> /dev/null; then
    TERRAFORM_VERSION=$(terraform version -json | grep -o '"terraform_version":"[^"]*' | cut -d'"' -f4)
    print_status 0 "Terraform installed: v$TERRAFORM_VERSION"
else
    print_status 1 "Terraform not found. Please install Terraform >= 1.0"
    exit 1
fi
echo ""

echo "Step 2: Formatting check"
echo "------------------------"
terraform fmt -check -recursive . > /dev/null 2>&1
if [ $? -eq 0 ]; then
    print_status 0 "All files are properly formatted"
else
    print_warning "Some files need formatting. Running terraform fmt..."
    terraform fmt -recursive .
    print_status 0 "Files formatted successfully"
fi
echo ""

echo "Step 3: Checking required files"
echo "--------------------------------"
REQUIRED_FILES=(
    "main.tf"
    "variables.tf"
    "outputs.tf"
    "provider.tf"
    "data.tf"
    "terraform.tfvars"
)

for file in "${REQUIRED_FILES[@]}"; do
    if [ -f "$file" ]; then
        print_status 0 "Found: $file"
    else
        print_status 1 "Missing: $file"
    fi
done
echo ""

echo "Step 4: Checking module structure"
echo "----------------------------------"
MODULES=(
    "modules/vpc"
    "modules/rds"
    "modules/cognito"
    "modules/dynamodb"
    "modules/s3_cloudfront"
    "modules/lambda_api"
)

for module in "${MODULES[@]}"; do
    if [ -d "$module" ]; then
        # Check for required module files
        if [ -f "$module/main.tf" ] && [ -f "$module/variables.tf" ] && [ -f "$module/outputs.tf" ]; then
            print_status 0 "Module: $module (complete)"
        else
            print_status 1 "Module: $module (missing files)"
        fi
    else
        print_status 1 "Module: $module (not found)"
    fi
done
echo ""

echo "Step 5: Checking Lambda code directory"
echo "---------------------------------------"
if [ -d "lambda-code" ]; then
    ZIP_COUNT=$(ls -1 lambda-code/*.zip 2>/dev/null | wc -l | tr -d ' ')
    if [ "$ZIP_COUNT" -eq 48 ]; then
        print_status 0 "Lambda code: All 48 zip files present"
    elif [ "$ZIP_COUNT" -gt 0 ]; then
        print_warning "Lambda code: Found $ZIP_COUNT zip files (expected 48)"
        echo "   Run ./copy-lambda-code.sh to copy all Lambda functions"
    else
        print_warning "Lambda code: No zip files found"
        echo "   Run ./copy-lambda-code.sh to copy Lambda functions"
    fi
else
    print_warning "Lambda code directory not found"
    echo "   Run ./copy-lambda-code.sh to create and populate it"
fi
echo ""

echo "Step 6: Validating Terraform syntax"
echo "------------------------------------"
# Initialize without backend (for validation only)
terraform init -backend=false > /dev/null 2>&1
if [ $? -eq 0 ]; then
    print_status 0 "Terraform initialization successful"
else
    print_status 1 "Terraform initialization failed"
    echo "   Run: terraform init"
    exit 1
fi

# Validate configuration
terraform validate > /dev/null 2>&1
if [ $? -eq 0 ]; then
    print_status 0 "Terraform configuration is valid"
else
    print_status 1 "Terraform validation failed"
    echo ""
    echo "Validation errors:"
    terraform validate
    exit 1
fi
echo ""

echo "Step 7: Security checks"
echo "-----------------------"

# Check for hardcoded secrets
echo "Checking for potential hardcoded secrets..."
SECRETS_FOUND=false

# Check for common secret patterns
if grep -r -i "password.*=.*\"" --include="*.tf" --exclude="*.tfvars" . 2>/dev/null | grep -v "variable\|description\|default.*null\|default.*\"\""; then
    print_warning "Potential hardcoded passwords found"
    SECRETS_FOUND=true
fi

if grep -r -i "secret.*=.*\"" --include="*.tf" --exclude="*.tfvars" . 2>/dev/null | grep -v "variable\|description\|secret_arn\|secret_name\|default.*null\|default.*\"\""; then
    print_warning "Potential hardcoded secrets found"
    SECRETS_FOUND=true
fi

if [ "$SECRETS_FOUND" = false ]; then
    print_status 0 "No hardcoded secrets detected"
fi
echo ""

echo "Step 8: Best practices check"
echo "-----------------------------"

# Check for tags
if grep -q "common_tags" main.tf; then
    print_status 0 "Using common tags for resources"
else
    print_warning "Consider using common tags for all resources"
fi

# Check for encryption
if grep -q "encryption" modules/*/main.tf; then
    print_status 0 "Encryption configured for resources"
else
    print_warning "Consider enabling encryption for sensitive resources"
fi

# Check for backup configuration
if grep -q "backup_retention" modules/rds/main.tf; then
    print_status 0 "Backup retention configured for RDS"
else
    print_warning "Consider configuring backup retention for RDS"
fi

# Check for monitoring
if grep -q "cloudwatch" modules/*/main.tf; then
    print_status 0 "CloudWatch monitoring configured"
else
    print_warning "Consider adding CloudWatch monitoring"
fi
echo ""

echo "Step 9: Cost optimization checks"
echo "---------------------------------"

# Check NAT Gateway configuration
if grep -q "enable_nat_gateway.*=.*false" terraform.tfvars; then
    print_status 0 "NAT Gateway disabled (cost optimized)"
else
    print_warning "NAT Gateway enabled (~\$32/month). Consider using VPC endpoints instead"
fi

# Check RDS instance class
if grep -q "db_instance_class.*=.*\"db.t3.micro\"" terraform.tfvars; then
    print_status 0 "Using cost-effective RDS instance (db.t3.micro)"
elif grep -q "db_instance_class.*=.*\"db.t3.small\"" terraform.tfvars; then
    print_warning "Using db.t3.small (~\$25/month). Consider db.t3.micro for dev/test"
fi

# Check DynamoDB billing mode
if grep -q "dynamodb_billing_mode.*=.*\"PAY_PER_REQUEST\"" terraform.tfvars; then
    print_status 0 "Using on-demand billing for DynamoDB (cost optimized)"
fi
echo ""

echo "Step 10: Module dependency check"
echo "---------------------------------"

# Check if modules reference each other correctly
if grep -q "module.vpc" main.tf && \
   grep -q "module.rds" main.tf && \
   grep -q "module.cognito" main.tf && \
   grep -q "module.dynamodb" main.tf && \
   grep -q "module.s3_cloudfront" main.tf && \
   grep -q "module.lambda_api" main.tf; then
    print_status 0 "All modules properly referenced in main.tf"
else
    print_status 1 "Some modules missing from main.tf"
fi

# Check module outputs are used correctly
if grep -q "module.vpc.vpc_id" main.tf && \
   grep -q "module.rds.db_endpoint" main.tf && \
   grep -q "module.cognito.user_pool_arn" main.tf; then
    print_status 0 "Module outputs properly referenced"
else
    print_warning "Some module outputs may not be properly referenced"
fi
echo ""

echo "=============================="
echo "Validation Summary"
echo "=============================="
echo ""

if [ "$VALIDATION_PASSED" = true ]; then
    echo -e "${GREEN}✅ All validation checks passed!${NC}"
    echo ""
    echo "Your Terraform code is ready for deployment."
    echo ""
    echo "Next steps:"
    echo "1. Review terraform.tfvars for your environment"
    echo "2. Run: terraform plan"
    echo "3. Run: terraform apply"
    echo ""
    exit 0
else
    echo -e "${RED}❌ Some validation checks failed${NC}"
    echo ""
    echo "Please fix the issues above before deploying."
    echo ""
    exit 1
fi
