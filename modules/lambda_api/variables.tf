# ============================================================================
# Lambda + API Gateway Module Variables
# ============================================================================

# Required Variables
variable "project_name" {
  description = "Project name"
  type        = string
}

variable "environment" {
  description = "Environment name"
  type        = string
}

variable "common_tags" {
  description = "Common tags for all resources"
  type        = map(string)
  default     = {}
}

# VPC Configuration
variable "private_subnet_ids" {
  description = "Private subnet IDs for Lambda VPC config"
  type        = list(string)
}

variable "lambda_security_group_id" {
  description = "Security group ID for Lambda functions"
  type        = string
}

# Resource ARNs
variable "dynamodb_table_arn" {
  description = "DynamoDB table ARN"
  type        = string
}

variable "dynamodb_table_name" {
  description = "DynamoDB table name"
  type        = string
}

variable "submissions_bucket_arn" {
  description = "S3 submissions bucket ARN"
  type        = string
}

variable "submissions_bucket_name" {
  description = "S3 submissions bucket name"
  type        = string
}

variable "rds_secret_arn" {
  description = "RDS credentials secret ARN"
  type        = string
}

variable "cognito_user_pool_arn" {
  description = "Cognito User Pool ARN"
  type        = string
}

variable "cognito_user_pool_id" {
  description = "Cognito User Pool ID"
  type        = string
}

# Database Configuration
variable "db_host" {
  description = "RDS database host endpoint"
  type        = string
}

variable "db_port" {
  description = "RDS database port"
  type        = string
  default     = "3306"
}

variable "db_name" {
  description = "RDS database name"
  type        = string
}

# API Configuration
variable "allowed_origin" {
  description = "Allowed CORS origin"
  type        = string
  default     = "*"
}

# Lambda Code Path
variable "lambda_code_path" {
  description = "Path to Lambda function code zip files"
  type        = string
  default     = "lambda-code"
}

# Configuration
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
