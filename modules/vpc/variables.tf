# ============================================================================
# VPC Module Variables
# ============================================================================

# Required Variables
# ============================================================================

variable "project_name" {
  description = "Project name used for resource naming"
  type        = string
  validation {
    condition     = length(var.project_name) > 0 && length(var.project_name) <= 32
    error_message = "Project name must be between 1 and 32 characters."
  }
}

variable "environment" {
  description = "Environment name (e.g., prod, test, dev)"
  type        = string
  validation {
    condition     = contains(["prod", "test", "dev", "staging"], var.environment)
    error_message = "Environment must be one of: prod, test, dev, staging."
  }
}

variable "vpc_cidr" {
  description = "CIDR block for VPC (must be /16 for proper subnet allocation)"
  type        = string
  default     = "10.2.0.0/16"
  validation {
    condition     = can(cidrhost(var.vpc_cidr, 0))
    error_message = "VPC CIDR must be a valid IPv4 CIDR block."
  }
}

variable "common_tags" {
  description = "Common tags to apply to all resources"
  type        = map(string)
  default     = {}
}

# Network Configuration
# ============================================================================

variable "az_count" {
  description = "Number of availability zones to use (2 for HA, 3 for maximum resilience)"
  type        = number
  default     = 2
  validation {
    condition     = var.az_count >= 2 && var.az_count <= 3
    error_message = "AZ count must be 2 or 3 for high availability."
  }
}

# NAT Gateway Configuration
# ============================================================================

variable "enable_nat_gateway" {
  description = "Enable NAT Gateway for private subnet internet access (costs ~$32/month per AZ)"
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
  description = "Enable SES (email) VPC endpoint (~$7/month)"
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
  description = "Create security group for bastion host (for database access)"
  type        = bool
  default     = false
}

variable "bastion_allowed_cidrs" {
  description = "CIDR blocks allowed to SSH to bastion host"
  type        = list(string)
  default     = []
  validation {
    condition = alltrue([
      for cidr in var.bastion_allowed_cidrs : can(cidrhost(cidr, 0))
    ])
    error_message = "All bastion_allowed_cidrs must be valid CIDR blocks."
  }
}

# Monitoring Configuration
# ============================================================================

variable "enable_flow_logs" {
  description = "Enable VPC Flow Logs for network monitoring"
  type        = bool
  default     = true
}

variable "flow_logs_traffic_type" {
  description = "Type of traffic to log (ACCEPT, REJECT, or ALL)"
  type        = string
  default     = "ALL"
  validation {
    condition     = contains(["ACCEPT", "REJECT", "ALL"], var.flow_logs_traffic_type)
    error_message = "Flow logs traffic type must be ACCEPT, REJECT, or ALL."
  }
}

variable "flow_logs_retention_days" {
  description = "Number of days to retain VPC flow logs"
  type        = number
  default     = 7
  validation {
    condition = contains([
      1, 3, 5, 7, 14, 30, 60, 90, 120, 150, 180, 365, 400, 545, 731, 1827, 3653
    ], var.flow_logs_retention_days)
    error_message = "Flow logs retention must be a valid CloudWatch Logs retention period."
  }
}

# Network ACLs Configuration
# ============================================================================

variable "enable_network_acls" {
  description = "Enable custom Network ACLs for additional security layer"
  type        = bool
  default     = false
}
