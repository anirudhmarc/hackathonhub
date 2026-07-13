# ============================================================================
# Root Module Outputs
# ============================================================================

# VPC Outputs
# ============================================================================

output "vpc_id" {
  description = "ID of the VPC"
  value       = module.vpc.vpc_id
}

output "vpc_cidr" {
  description = "CIDR block of the VPC"
  value       = module.vpc.vpc_cidr
}

output "vpc_arn" {
  description = "ARN of the VPC"
  value       = module.vpc.vpc_arn
}

# Subnet Outputs
# ============================================================================

output "public_subnet_ids" {
  description = "List of public subnet IDs"
  value       = module.vpc.public_subnet_ids
}

output "private_subnet_ids" {
  description = "List of private subnet IDs (for Lambda)"
  value       = module.vpc.private_subnet_ids
}

output "database_subnet_ids" {
  description = "List of database subnet IDs (for RDS)"
  value       = module.vpc.database_subnet_ids
}

output "db_subnet_group_name" {
  description = "Name of the DB subnet group"
  value       = module.vpc.db_subnet_group_name
}

# Security Group Outputs
# ============================================================================

output "lambda_security_group_id" {
  description = "ID of the Lambda security group"
  value       = module.vpc.lambda_security_group_id
}

output "rds_security_group_id" {
  description = "ID of the RDS security group"
  value       = module.vpc.rds_security_group_id
}

output "vpc_endpoints_security_group_id" {
  description = "ID of the VPC endpoints security group"
  value       = module.vpc.vpc_endpoints_security_group_id
}

# VPC Endpoint Outputs
# ============================================================================

output "s3_endpoint_id" {
  description = "ID of the S3 VPC endpoint"
  value       = module.vpc.s3_endpoint_id
}

output "dynamodb_endpoint_id" {
  description = "ID of the DynamoDB VPC endpoint"
  value       = module.vpc.dynamodb_endpoint_id
}

# Network Summary
# ============================================================================

output "network_summary" {
  description = "Summary of network configuration"
  value       = module.vpc.network_summary
}

output "availability_zones" {
  description = "List of availability zones used"
  value       = module.vpc.availability_zones
}

# Connection Information
# ============================================================================

output "connection_info" {
  description = "Connection information for other modules"
  value = {
    vpc_id                   = module.vpc.vpc_id
    private_subnet_ids       = module.vpc.private_subnet_ids
    database_subnet_ids      = module.vpc.database_subnet_ids
    db_subnet_group_name     = module.vpc.db_subnet_group_name
    lambda_security_group_id = module.vpc.lambda_security_group_id
    rds_security_group_id    = module.vpc.rds_security_group_id
  }
  sensitive = false
}


# ============================================================================
# RDS Outputs
# ============================================================================

output "rds_endpoint" {
  description = "RDS instance endpoint"
  value       = module.rds.db_instance_endpoint
}

output "rds_address" {
  description = "RDS instance address"
  value       = module.rds.db_instance_address
}

output "rds_port" {
  description = "RDS instance port"
  value       = module.rds.db_instance_port
}

output "rds_database_name" {
  description = "RDS database name"
  value       = module.rds.db_instance_name
}

output "rds_secret_arn" {
  description = "ARN of Secrets Manager secret containing DB credentials"
  value       = module.rds.db_credentials_secret_arn
}

output "rds_db_security_group_id" {
  description = "ID of RDS database security group"
  value       = module.rds.db_security_group_id
}

output "rds_summary" {
  description = "Summary of RDS configuration"
  value       = module.rds.rds_summary
}


# ============================================================================
# Cognito Outputs
# ============================================================================

output "cognito_user_pool_id" {
  description = "Cognito User Pool ID"
  value       = module.cognito.user_pool_id
}

output "cognito_user_pool_arn" {
  description = "Cognito User Pool ARN"
  value       = module.cognito.user_pool_arn
}

output "cognito_domain_url" {
  description = "Cognito hosted UI domain URL"
  value       = module.cognito.user_pool_domain_url
}

output "cognito_client_id" {
  description = "Cognito app client ID (used by all portals)"
  value       = module.cognito.client_id
  sensitive   = true
}

output "cognito_identity_pool_id" {
  description = "Cognito Identity Pool ID"
  value       = module.cognito.identity_pool_id
}

output "cognito_summary" {
  description = "Summary of Cognito configuration"
  value       = module.cognito.cognito_summary
}


# ============================================================================
# DynamoDB Outputs
# ============================================================================

output "dynamodb_participants_table_name" {
  description = "Name of participants DynamoDB table"
  value       = module.dynamodb.participants_table_name
}

output "dynamodb_participants_table_arn" {
  description = "ARN of participants DynamoDB table"
  value       = module.dynamodb.participants_table_arn
}

output "dynamodb_sessions_table_name" {
  description = "Name of sessions DynamoDB table"
  value       = module.dynamodb.sessions_table_name
}

output "dynamodb_sessions_table_arn" {
  description = "ARN of sessions DynamoDB table"
  value       = module.dynamodb.sessions_table_arn
}

output "dynamodb_summary" {
  description = "Summary of DynamoDB configuration"
  value       = module.dynamodb.dynamodb_summary
}


# ============================================================================
# S3 + CloudFront Outputs
# ============================================================================

output "admin_portal_url" {
  description = "Admin portal CloudFront URL"
  value       = module.s3_cloudfront.admin_cloudfront_url
}

output "judge_portal_url" {
  description = "Judge portal CloudFront URL"
  value       = module.s3_cloudfront.judge_cloudfront_url
}

output "participant_portal_url" {
  description = "Participant portal CloudFront URL"
  value       = module.s3_cloudfront.participant_cloudfront_url
}

output "submissions_bucket_name" {
  description = "Submissions S3 bucket name"
  value       = module.s3_cloudfront.submissions_bucket_id
}

output "s3_cloudfront_summary" {
  description = "Summary of S3 and CloudFront resources"
  value       = module.s3_cloudfront.s3_cloudfront_summary
}

# ============================================================================
# Lambda + API Gateway Outputs
# ============================================================================

output "api_gateway_url" {
  description = "API Gateway invoke URL"
  value       = module.lambda_api.api_gateway_url
}

output "api_gateway_id" {
  description = "API Gateway REST API ID"
  value       = module.lambda_api.api_gateway_id
}

output "lambda_function_count" {
  description = "Number of Lambda functions deployed"
  value       = length(module.lambda_api.lambda_function_names)
}

output "lambda_functions" {
  description = "List of deployed Lambda function names"
  value       = values(module.lambda_api.lambda_function_names)
}

output "lambda_execution_role_arns" {
  description = "Map of Lambda execution role ARNs by group"
  value       = module.lambda_api.lambda_execution_role_arns
}
