# ============================================================================
# Root Module Variables
# ============================================================================

# Project Configuration
# ============================================================================

variable "project_name" {
  description = "Project name used for resource naming"
  type        = string
  default     = "hackhub"
}

variable "environment" {
  description = "Environment name (prod, test, dev)"
  type        = string
  default     = "prod"
  validation {
    condition     = contains(["prod", "test", "dev", "staging"], var.environment)
    error_message = "Environment must be one of: prod, test, dev, staging."
  }
}

variable "aws_region" {
  description = "AWS region for resources"
  type        = string
  default     = "ap-southeast-1"
}

variable "owner" {
  description = "Owner of the infrastructure"
  type        = string
  default     = "Platform Team"
}

variable "cost_center" {
  description = "Cost center for billing"
  type        = string
  default     = "Engineering"
}

# VPC Configuration
# ============================================================================

variable "vpc_cidr" {
  description = "CIDR block for VPC"
  type        = string
  default     = "10.5.0.0/16"
}

variable "az_count" {
  description = "Number of availability zones (2 or 3)"
  type        = number
  default     = 2
  validation {
    condition     = var.az_count >= 2 && var.az_count <= 3
    error_message = "AZ count must be 2 or 3."
  }
}

# NAT Gateway Configuration
# ============================================================================

variable "enable_nat_gateway" {
  description = "Enable NAT Gateway (costs ~$32/month per AZ)"
  type        = bool
  default     = false
}

# VPC Endpoints Configuration
# ============================================================================

variable "enable_secretsmanager_endpoint" {
  description = "Enable Secrets Manager VPC endpoint (~$7/month)"
  type        = bool
  default     = true
}

variable "enable_ses_endpoint" {
  description = "Enable SES VPC endpoint (~$7/month)"
  type        = bool
  default     = true
}

variable "enable_lambda_endpoint" {
  description = "Enable Lambda VPC endpoint (~$7/month)"
  type        = bool
  default     = false
}

# Security Configuration
# ============================================================================

variable "enable_bastion_sg" {
  description = "Create security group for bastion host"
  type        = bool
  default     = false
}

variable "bastion_allowed_cidrs" {
  description = "CIDR blocks allowed to SSH to bastion"
  type        = list(string)
  default     = []
}

# Monitoring Configuration
# ============================================================================

variable "enable_flow_logs" {
  description = "Enable VPC Flow Logs"
  type        = bool
  default     = true
}

variable "flow_logs_traffic_type" {
  description = "Type of traffic to log (ACCEPT, REJECT, ALL)"
  type        = string
  default     = "ALL"
}

variable "flow_logs_retention_days" {
  description = "Flow logs retention in days"
  type        = number
  default     = 7
}

# Network ACLs Configuration
# ============================================================================

variable "enable_network_acls" {
  description = "Enable custom Network ACLs"
  type        = bool
  default     = false
}


# ============================================================================
# RDS Configuration
# ============================================================================

variable "db_name" {
  description = "Database name"
  type        = string
  default     = "hackhub"
}

variable "db_username" {
  description = "Database master username"
  type        = string
  default     = "admin"
  sensitive   = true
}

variable "db_password" {
  description = "Database master password"
  type        = string
  sensitive   = true
}

variable "db_instance_class" {
  description = "RDS instance class"
  type        = string
  default     = "db.t3.small"
}

variable "db_allocated_storage" {
  description = "Allocated storage in GB"
  type        = number
  default     = 20
}

variable "db_multi_az" {
  description = "Enable Multi-AZ deployment"
  type        = bool
  default     = false
}

variable "db_backup_retention_days" {
  description = "Backup retention period in days"
  type        = number
  default     = 7
}

variable "db_deletion_protection" {
  description = "Enable deletion protection"
  type        = bool
  default     = false
}

variable "db_skip_final_snapshot" {
  description = "Skip final snapshot on deletion"
  type        = bool
  default     = false
}

variable "db_enable_enhanced_monitoring" {
  description = "Enable enhanced monitoring"
  type        = bool
  default     = true
}

variable "db_monitoring_interval" {
  description = "Enhanced monitoring interval in seconds"
  type        = number
  default     = 60
}


# ============================================================================
# Cognito Configuration
# ============================================================================

variable "admin_email" {
  description = "Email address for the default admin user"
  type        = string
  default     = "admin@example.com"
}

variable "cognito_callback_urls" {
  description = "Cognito callback URLs for all portals"
  type        = list(string)
  default     = ["http://localhost:3000"]
}

variable "cognito_logout_urls" {
  description = "Cognito logout URLs for all portals"
  type        = list(string)
  default     = ["http://localhost:3000"]
}

variable "cognito_enable_mfa" {
  description = "Enable MFA for Cognito"
  type        = bool
  default     = false
}

variable "cognito_advanced_security_mode" {
  description = "Cognito advanced security mode"
  type        = string
  default     = "ENFORCED"
}

variable "cognito_deletion_protection" {
  description = "Enable deletion protection for Cognito"
  type        = bool
  default     = false
}


# ============================================================================
# DynamoDB Configuration
# ============================================================================

variable "dynamodb_billing_mode" {
  description = "DynamoDB billing mode"
  type        = string
  default     = "PAY_PER_REQUEST"
}

variable "dynamodb_enable_sessions_table" {
  description = "Enable sessions table"
  type        = bool
  default     = true
}

variable "dynamodb_enable_pitr" {
  description = "Enable point-in-time recovery"
  type        = bool
  default     = true
}

variable "dynamodb_enable_ttl" {
  description = "Enable TTL"
  type        = bool
  default     = true
}

variable "dynamodb_enable_streams" {
  description = "Enable DynamoDB Streams"
  type        = bool
  default     = false
}

variable "dynamodb_stream_view_type" {
  description = "Stream view type"
  type        = string
  default     = "NEW_AND_OLD_IMAGES"
}

variable "dynamodb_enable_alarms" {
  description = "Enable CloudWatch alarms"
  type        = bool
  default     = false
}


# ============================================================================
# S3 + CloudFront Configuration
# ============================================================================

variable "cloudfront_price_class" {
  description = "CloudFront price class"
  type        = string
  default     = "PriceClass_100"
}

variable "cors_allowed_origins" {
  description = "CORS allowed origins for submissions bucket"
  type        = list(string)
  default     = ["*"]
}

# ============================================================================
# Lambda + API Gateway Configuration
# ============================================================================

variable "lambda_code_path" {
  description = "Path to Lambda function code zip files"
  type        = string
  default     = "lambda-code"
}

variable "allowed_origin" {
  description = "Allowed CORS origin for API Gateway"
  type        = string
  default     = "*"
}

variable "log_retention_days" {
  description = "CloudWatch log retention in days"
  type        = number
  default     = 14
}

variable "enable_xray_tracing" {
  description = "Enable X-Ray tracing for API Gateway"
  type        = bool
  default     = false
}
