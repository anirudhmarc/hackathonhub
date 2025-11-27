# ============================================================================
# Production Environment Configuration
# ============================================================================

# Project Configuration
project_name = "hackhub"
environment  = "prod"
aws_region   = "ap-southeast-1"
owner        = "Platform Team"
cost_center  = "Engineering"

# VPC Configuration
vpc_cidr = "10.2.0.0/16"
az_count = 2

# NAT Gateway (disabled for cost savings)
enable_nat_gateway = false

# VPC Endpoints
enable_secretsmanager_endpoint = true
enable_ses_endpoint            = true
enable_lambda_endpoint         = false

# Security
enable_bastion_sg     = false
bastion_allowed_cidrs = []

# Monitoring
enable_flow_logs         = true
flow_logs_traffic_type   = "ALL"
flow_logs_retention_days = 7

# Network ACLs
enable_network_acls = false

# RDS Configuration
db_name              = "hackhub"
db_username          = "admin"
db_password          = "CHANGE_ME_STRONG_PASSWORD" # Use AWS Secrets Manager or env var
db_instance_class    = "db.t3.small"
db_allocated_storage = 20
db_multi_az          = false # Set true for HA

# RDS Backup & Protection
db_backup_retention_days = 7
db_deletion_protection   = true  # IMPORTANT: Prevents accidental deletion
db_skip_final_snapshot   = false # Creates snapshot before deletion

# RDS Monitoring
db_enable_enhanced_monitoring = true
db_monitoring_interval        = 60


# Cognito Configuration
# Update these URLs with actual CloudFront URLs after deployment
admin_callback_urls = ["https://d2iqvvkzc5ixqo.cloudfront.net", "http://localhost:3001"]
cognito_callback_urls = [
  "https://d2iqvvkzc5ixqo.cloudfront.net",
  "https://d1iqvvkzc5ixqo.cloudfront.net",
  "https://d3iqvvkzc5ixqo.cloudfront.net",
  "http://localhost:3000"
]
cognito_logout_urls = [
  "https://d2iqvvkzc5ixqo.cloudfront.net",
  "https://d1iqvvkzc5ixqo.cloudfront.net",
  "https://d3iqvvkzc5ixqo.cloudfront.net",
  "http://localhost:3000"
]

# Security
cognito_enable_mfa             = false
cognito_advanced_security_mode = "ENFORCED"
cognito_deletion_protection    = true # Protect production user pool


# DynamoDB Configuration
dynamodb_billing_mode          = "PAY_PER_REQUEST"
dynamodb_enable_sessions_table = false # Only participants table needed
dynamodb_enable_pitr           = true
dynamodb_enable_ttl            = true
dynamodb_enable_streams        = false
dynamodb_stream_view_type      = "NEW_AND_OLD_IMAGES"
dynamodb_enable_alarms         = true # Enable for production


# S3 + CloudFront Configuration
cloudfront_price_class = "PriceClass_100"
cors_allowed_origins   = ["https://d2iqvvkzc5ixqo.cloudfront.net", "https://d1iqvvkzc5ixqo.cloudfront.net", "https://d3iqvvkzc5ixqo.cloudfront.net"]
