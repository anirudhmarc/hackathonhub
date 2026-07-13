# ============================================================================
# Data Sources - Query AWS for existing resources and information
# ============================================================================

# Get current AWS account ID
data "aws_caller_identity" "current" {}

# Get current AWS region
data "aws_region" "current" {}

# Get available availability zones
data "aws_availability_zones" "available" {
  state = "available"
  filter {
    name   = "opt-in-status"
    values = ["opt-in-not-required"]
  }
}

# Get AWS partition (aws, aws-cn, aws-us-gov)
data "aws_partition" "current" {}

# ============================================================================
# Outputs from Data Sources (for reference)
# ============================================================================

output "aws_account_id" {
  description = "AWS Account ID"
  value       = data.aws_caller_identity.current.account_id
}

output "aws_region" {
  description = "AWS Region"
  value       = data.aws_region.current.name
}

output "available_azs" {
  description = "Available Availability Zones"
  value       = data.aws_availability_zones.available.names
}
