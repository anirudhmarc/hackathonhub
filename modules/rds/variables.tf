# ============================================================================
# RDS Module Variables
# ============================================================================

# Required Variables
# ============================================================================

variable "engine_version" {
  description = "MySQL engine version (check availability in your target region)"
  type        = string
  default     = "8.0.44"
}

variable "project_name" {
  description = "Project name"
  type        = string
}

variable "environment" {
  description = "Environment name"
  type        = string
}

variable "vpc_id" {
  description = "VPC ID where RDS will be deployed"
  type        = string
}

variable "database_subnet_ids" {
  description = "List of subnet IDs for RDS"
  type        = list(string)
}

variable "db_subnet_group_name" {
  description = "Name of the DB subnet group (created by VPC module)"
  type        = string
}

variable "lambda_sg_id" {
  description = "Security group ID of Lambda functions"
  type        = string
}

variable "common_tags" {
  description = "Common tags for all resources"
  type        = map(string)
  default     = {}
}

# Database Configuration
# ============================================================================

variable "db_name" {
  description = "Name of the database to create"
  type        = string
  default     = "hackhub"
}

variable "db_username" {
  description = "Master username for the database"
  type        = string
  default     = "admin"
  sensitive   = true
}

variable "db_password" {
  description = "Master password for the database"
  type        = string
  sensitive   = true
}

# Instance Configuration
# ============================================================================

variable "instance_class" {
  description = "RDS instance class"
  type        = string
  default     = "db.t3.small"
}

variable "allocated_storage" {
  description = "Allocated storage in GB"
  type        = number
  default     = 20
}

variable "max_allocated_storage" {
  description = "Maximum storage for autoscaling in GB"
  type        = number
  default     = 100
}

variable "kms_key_id" {
  description = "KMS key ID for encryption (optional)"
  type        = string
  default     = null
}

# High Availability
# ============================================================================

variable "multi_az" {
  description = "Enable Multi-AZ deployment"
  type        = bool
  default     = false
}

variable "availability_zone" {
  description = "AZ for single-AZ deployment"
  type        = string
  default     = null
}

# Backup Configuration
# ============================================================================

variable "backup_retention_period" {
  description = "Backup retention period in days"
  type        = number
  default     = 7
}

variable "backup_window" {
  description = "Backup window (UTC)"
  type        = string
  default     = "03:00-04:00"
}

variable "maintenance_window" {
  description = "Maintenance window (UTC)"
  type        = string
  default     = "sun:04:00-sun:05:00"
}

variable "skip_final_snapshot" {
  description = "Skip final snapshot on deletion"
  type        = bool
  default     = false
}

# Monitoring
# ============================================================================

variable "enable_enhanced_monitoring" {
  description = "Enable enhanced monitoring"
  type        = bool
  default     = true
}

variable "monitoring_interval" {
  description = "Enhanced monitoring interval (0, 1, 5, 10, 15, 30, 60)"
  type        = number
  default     = 60
}

variable "enable_performance_insights" {
  description = "Enable Performance Insights"
  type        = bool
  default     = false
}

variable "performance_insights_retention" {
  description = "Performance Insights retention in days"
  type        = number
  default     = 7
}

# Security
# ============================================================================

variable "deletion_protection" {
  description = "Enable deletion protection"
  type        = bool
  default     = false
}

# Maintenance
# ============================================================================

variable "apply_immediately" {
  description = "Apply changes immediately"
  type        = bool
  default     = false
}

variable "auto_minor_version_upgrade" {
  description = "Enable auto minor version upgrade"
  type        = bool
  default     = true
}

variable "option_group_name" {
  description = "Option group name"
  type        = string
  default     = null
}
