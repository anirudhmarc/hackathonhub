# ============================================================================
# Terraform and Provider Version Constraints
# ============================================================================

terraform {
  required_version = ">= 1.5.0"

  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
    random = {
      source  = "hashicorp/random"
      version = "~> 3.5"
    }
  }

  # Backend configuration for remote state
  # Uncomment and configure after creating S3 bucket and DynamoDB table
  # backend "s3" {
  #   # Configuration loaded from backend.config file
  #   # Run: terraform init -backend-config=env/prod/backend.config
  # }
}
