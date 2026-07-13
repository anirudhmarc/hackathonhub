# ============================================================================
# DynamoDB Module Variables
# ============================================================================

# Required Variables
# ============================================================================

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

# Billing Configuration
# ============================================================================

variable "billing_mode" {
  description = "Billing mode (PROVISIONED or PAY_PER_REQUEST)"
  type        = string
  default     = "PAY_PER_REQUEST"
  validation {
    condition     = contains(["PROVISIONED", "PAY_PER_REQUEST"], var.billing_mode)
    error_message = "Billing mode must be PROVISIONED or PAY_PER_REQUEST."
  }
}

variable "read_capacity" {
  description = "Read capacity units (only for PROVISIONED mode)"
  type        = number
  default     = 5
}

variable "write_capacity" {
  description = "Write capacity units (only for PROVISIONED mode)"
  type        = number
  default     = 5
}

variable "gsi_read_capacity" {
  description = "GSI read capacity units (only for PROVISIONED mode)"
  type        = number
  default     = 5
}

variable "gsi_write_capacity" {
  description = "GSI write capacity units (only for PROVISIONED mode)"
  type        = number
  default     = 5
}

# Feature Flags
# ============================================================================

variable "enable_sessions_table" {
  description = "Enable sessions table creation"
  type        = bool
  default     = true
}

variable "enable_point_in_time_recovery" {
  description = "Enable point-in-time recovery"
  type        = bool
  default     = true
}

variable "enable_ttl" {
  description = "Enable TTL for automatic data cleanup"
  type        = bool
  default     = true
}

variable "enable_streams" {
  description = "Enable DynamoDB Streams"
  type        = bool
  default     = false
}

variable "stream_view_type" {
  description = "Stream view type (KEYS_ONLY, NEW_IMAGE, OLD_IMAGE, NEW_AND_OLD_IMAGES)"
  type        = string
  default     = "NEW_AND_OLD_IMAGES"
  validation {
    condition = contains([
      "KEYS_ONLY",
      "NEW_IMAGE",
      "OLD_IMAGE",
      "NEW_AND_OLD_IMAGES"
    ], var.stream_view_type)
    error_message = "Invalid stream view type."
  }
}

variable "enable_cloudwatch_alarms" {
  description = "Enable CloudWatch alarms for monitoring"
  type        = bool
  default     = false
}

# Encryption
# ============================================================================

variable "kms_key_arn" {
  description = "KMS key ARN for encryption (optional, uses AWS managed key if not specified)"
  type        = string
  default     = null
}
