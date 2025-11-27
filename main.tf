# ============================================================================
# Main Terraform Configuration - HackHub Infrastructure
# ============================================================================
# This file orchestrates all infrastructure modules
# ============================================================================

# ============================================================================
# Local Variables
# ============================================================================

locals {
  common_tags = {
    Project     = var.project_name
    Environment = var.environment
    ManagedBy   = "Terraform"
    Owner       = var.owner
    CostCenter  = var.cost_center
    CreatedAt   = timestamp()
  }

  name_prefix = "${var.project_name}-${var.environment}"
}

# ============================================================================
# VPC Module
# ============================================================================

module "vpc" {
  source = "./modules/vpc"

  project_name = var.project_name
  environment  = var.environment
  vpc_cidr     = var.vpc_cidr
  az_count     = var.az_count
  common_tags  = local.common_tags

  # NAT Gateway (disabled by default to save costs)
  enable_nat_gateway = var.enable_nat_gateway

  # VPC Endpoints
  enable_secretsmanager_endpoint = var.enable_secretsmanager_endpoint
  enable_ses_endpoint            = var.enable_ses_endpoint
  enable_lambda_endpoint         = var.enable_lambda_endpoint

  # Security
  enable_bastion_sg     = var.enable_bastion_sg
  bastion_allowed_cidrs = var.bastion_allowed_cidrs

  # Monitoring
  enable_flow_logs         = var.enable_flow_logs
  flow_logs_traffic_type   = var.flow_logs_traffic_type
  flow_logs_retention_days = var.flow_logs_retention_days

  # Network ACLs
  enable_network_acls = var.enable_network_acls
}

# ============================================================================
# RDS Module
# ============================================================================

module "rds" {
  source = "./modules/rds"

  project_name          = var.project_name
  environment           = var.environment
  vpc_id                = module.vpc.vpc_id
  database_subnet_ids   = module.vpc.database_subnet_ids
  db_subnet_group_name  = module.vpc.db_subnet_group_name
  lambda_sg_id          = module.vpc.lambda_security_group_id
  common_tags           = local.common_tags

  # Database Configuration
  db_name           = var.db_name
  db_username       = var.db_username
  db_password       = var.db_password
  instance_class    = var.db_instance_class
  allocated_storage = var.db_allocated_storage

  # High Availability
  multi_az                = var.db_multi_az
  backup_retention_period = var.db_backup_retention_days

  # Security
  deletion_protection = var.db_deletion_protection
  skip_final_snapshot = var.db_skip_final_snapshot

  # Monitoring
  enable_enhanced_monitoring = var.db_enable_enhanced_monitoring
  monitoring_interval        = var.db_monitoring_interval
}

# ============================================================================
# Cognito Module
# ============================================================================

module "cognito" {
  source = "./modules/cognito"

  project_name = var.project_name
  environment  = var.environment
  common_tags  = local.common_tags

  # Callback URLs are now automatically populated from CloudFront outputs
  callback_urls = [
    "${module.s3_cloudfront.admin_cloudfront_url}/callback",
    "${module.s3_cloudfront.judge_cloudfront_url}/callback",
    "${module.s3_cloudfront.participant_cloudfront_url}/callback",
    "http://localhost:3000/callback"
  ]
  logout_urls = [
    module.s3_cloudfront.admin_cloudfront_url,
    module.s3_cloudfront.judge_cloudfront_url,
    module.s3_cloudfront.participant_cloudfront_url,
    "http://localhost:3000"
  ]

  # Security
  enable_mfa             = var.cognito_enable_mfa
  advanced_security_mode = var.cognito_advanced_security_mode
  deletion_protection    = var.cognito_deletion_protection
}

# ============================================================================
# DynamoDB Module
# ============================================================================

module "dynamodb" {
  source = "./modules/dynamodb"

  project_name = var.project_name
  environment  = var.environment
  common_tags  = local.common_tags

  # Billing
  billing_mode = var.dynamodb_billing_mode

  # Features
  enable_sessions_table         = var.dynamodb_enable_sessions_table
  enable_point_in_time_recovery = var.dynamodb_enable_pitr
  enable_ttl                    = var.dynamodb_enable_ttl
  enable_streams                = var.dynamodb_enable_streams
  stream_view_type              = var.dynamodb_stream_view_type
  enable_cloudwatch_alarms      = var.dynamodb_enable_alarms
}

# ============================================================================
# S3 + CloudFront Module
# ============================================================================

module "s3_cloudfront" {
  source = "./modules/s3_cloudfront"

  project_name = var.project_name
  environment  = var.environment
  common_tags  = local.common_tags

  cloudfront_price_class = var.cloudfront_price_class
  cors_allowed_origins   = var.cors_allowed_origins
}

# ============================================================================
# Lambda + API Gateway Module
# ============================================================================

module "lambda_api" {
  source = "./modules/lambda_api"

  project_name             = var.project_name
  environment              = var.environment
  private_subnet_ids       = module.vpc.private_subnet_ids
  lambda_security_group_id = module.vpc.lambda_security_group_id
  common_tags              = local.common_tags

  # Resource ARNs and Names
  dynamodb_table_arn      = module.dynamodb.registrations_table_arn
  dynamodb_table_name     = module.dynamodb.registrations_table_name
  submissions_bucket_arn  = module.s3_cloudfront.submissions_bucket_arn
  submissions_bucket_name = module.s3_cloudfront.submissions_bucket_name
  rds_secret_arn          = module.rds.db_credentials_secret_arn
  cognito_user_pool_arn   = module.cognito.user_pool_arn
  cognito_user_pool_id    = module.cognito.user_pool_id

  # Database Configuration
  db_host = module.rds.db_instance_address
  db_port = "3306"
  db_name = var.db_name

  # API Configuration
  allowed_origin = var.allowed_origin

  # Lambda Code Path
  lambda_code_path = var.lambda_code_path

  # Logging
  log_retention_days  = var.log_retention_days
  enable_xray_tracing = var.enable_xray_tracing
}
