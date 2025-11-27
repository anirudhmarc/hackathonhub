# ============================================================================
# Cognito Module Variables
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

# Callback URLs
# ============================================================================

variable "callback_urls" {
  description = "List of allowed callback URLs for all portals"
  type        = list(string)
  default     = ["http://localhost:3000"]
}

variable "logout_urls" {
  description = "List of allowed logout URLs for all portals"
  type        = list(string)
  default     = ["http://localhost:3000"]
}

# Security Configuration
# ============================================================================

variable "enable_mfa" {
  description = "Enable MFA for user pool"
  type        = bool
  default     = false
}

variable "advanced_security_mode" {
  description = "Advanced security mode (OFF, AUDIT, ENFORCED)"
  type        = string
  default     = "ENFORCED"
  validation {
    condition     = contains(["OFF", "AUDIT", "ENFORCED"], var.advanced_security_mode)
    error_message = "Advanced security mode must be OFF, AUDIT, or ENFORCED."
  }
}

variable "deletion_protection" {
  description = "Enable deletion protection for user pool"
  type        = bool
  default     = false
}

# Default User Creation
# ============================================================================

variable "create_default_users" {
  description = "Whether to create default users for each group"
  type        = bool
  default     = true
}
