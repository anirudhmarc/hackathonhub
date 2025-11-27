# ============================================================================
# Terraform Variables - Production Configuration
# ============================================================================
# This file contains the actual values for your production environment.
# Customize these values based on your requirements.
# ============================================================================

# Project Configuration
# ============================================================================
project_name = "hackhub-test-13"
environment  = "prod"
aws_region   = "ap-southeast-2"
owner        = "Platform Team"
cost_center  = "Engineering"

# VPC Configuration
# ============================================================================
# Using 10.2.0.0/16 to match existing production VPC
vpc_cidr = "10.13.0.0/16"
az_count = 2

# NAT Gateway Configuration
# ============================================================================
# Disabled to save ~$64/month (2 AZs × $32/month)
# Enable only if Lambda needs direct internet access
enable_nat_gateway = false

# VPC Endpoints Configuration
# ============================================================================
# Gateway endpoints (S3, DynamoDB) are always enabled and FREE
# Interface endpoints cost ~$7/month each

enable_secretsmanager_endpoint = true  # For RDS credentials
enable_ses_endpoint            = true  # For email sending
enable_lambda_endpoint         = false # Only if Lambda invokes Lambda

# Security Configuration
# ============================================================================
# Bastion host for database access (optional)
enable_bastion_sg     = false
bastion_allowed_cidrs = []
# Example: bastion_allowed_cidrs = ["1.2.3.4/32", "5.6.7.8/32"]

# Monitoring Configuration
# ============================================================================
enable_flow_logs         = true
flow_logs_traffic_type   = "ALL" # Options: ALL, ACCEPT, REJECT
flow_logs_retention_days = 7     # Options: 1, 3, 5, 7, 14, 30, 60, 90, etc.

# Network ACLs Configuration
# ============================================================================
# Additional security layer (optional)
enable_network_acls = false


# ============================================================================
# RDS Configuration
# ============================================================================
db_name              = "hackhub"
db_username          = "admin"
db_password          = "AWSuser#1"
db_instance_class    = "db.t3.small"
db_allocated_storage = 20

# High Availability
db_multi_az = false # Set to true for production HA (~2x cost)

# Backup
db_backup_retention_days = 7

# Protection
db_deletion_protection = false # Set to true for production
db_skip_final_snapshot = false # Creates snapshot before deletion

# Monitoring
db_enable_enhanced_monitoring = true
db_monitoring_interval        = 60 # seconds


# ============================================================================
# Cognito Configuration
# ============================================================================
# Callback and logout URLs are now automatically configured from CloudFront outputs.
admin_email = "tp078851@mail.apu.edu.my"

# Security
cognito_enable_mfa             = false # Set true for production MFA
cognito_advanced_security_mode = "ENFORCED"
cognito_deletion_protection    = false # Set true for production


# ============================================================================
# DynamoDB Configuration
# ============================================================================
dynamodb_billing_mode          = "PAY_PER_REQUEST" # On-demand pricing
dynamodb_enable_sessions_table = false             # Only participants table needed
dynamodb_enable_pitr           = true              # Point-in-time recovery
dynamodb_enable_ttl            = true              # Auto cleanup old data
dynamodb_enable_streams        = false             # Enable if needed for Lambda triggers
dynamodb_stream_view_type      = "NEW_AND_OLD_IMAGES"
dynamodb_enable_alarms         = false # Enable for production monitoring


# ============================================================================
# S3 + CloudFront Configuration
# ============================================================================
cloudfront_price_class = "PriceClass_100" # North America & Europe only
cors_allowed_origins   = ["*"]            # Restrict in production
