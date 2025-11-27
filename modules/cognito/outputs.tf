# ============================================================================
# Cognito Module Outputs
# ============================================================================

# User Pool Outputs
# ============================================================================

output "user_pool_id" {
  description = "ID of the Cognito User Pool"
  value       = aws_cognito_user_pool.main.id
}

output "user_pool_arn" {
  description = "ARN of the Cognito User Pool"
  value       = aws_cognito_user_pool.main.arn
}

output "user_pool_endpoint" {
  description = "Endpoint of the Cognito User Pool"
  value       = aws_cognito_user_pool.main.endpoint
}

output "user_pool_domain" {
  description = "Cognito hosted UI domain"
  value       = aws_cognito_user_pool_domain.main.domain
}

output "user_pool_domain_url" {
  description = "Full URL of Cognito hosted UI"
  value       = "https://${aws_cognito_user_pool_domain.main.domain}.auth.${data.aws_region.current.name}.amazoncognito.com"
}

# Client Outputs
# ============================================================================

output "client_id" {
  description = "App client ID (used by all portals)"
  value       = aws_cognito_user_pool_client.main.id
  sensitive   = true
}

# Group Outputs
# ============================================================================

output "admins_group_name" {
  description = "Name of the Admins group"
  value       = aws_cognito_user_group.admins.name
}

output "judges_group_name" {
  description = "Name of the Judges group"
  value       = aws_cognito_user_group.judges.name
}

output "participants_group_name" {
  description = "Name of the Participants group"
  value       = aws_cognito_user_group.participants.name
}

# Identity Pool Outputs
# ============================================================================

output "identity_pool_id" {
  description = "ID of the Cognito Identity Pool"
  value       = aws_cognito_identity_pool.main.id
}

output "identity_pool_arn" {
  description = "ARN of the Cognito Identity Pool"
  value       = aws_cognito_identity_pool.main.arn
}

# IAM Role Outputs
# ============================================================================

output "authenticated_role_arn" {
  description = "ARN of the authenticated IAM role"
  value       = aws_iam_role.authenticated.arn
}

output "authenticated_role_name" {
  description = "Name of the authenticated IAM role"
  value       = aws_iam_role.authenticated.name
}

# Summary Output
# ============================================================================

output "cognito_summary" {
  description = "Summary of Cognito configuration"
  value = {
    user_pool_id     = aws_cognito_user_pool.main.id
    user_pool_name   = aws_cognito_user_pool.main.name
    domain_url       = "https://${aws_cognito_user_pool_domain.main.domain}.auth.${data.aws_region.current.name}.amazoncognito.com"
    identity_pool_id = aws_cognito_identity_pool.main.id
    groups = [
      aws_cognito_user_group.admins.name,
      aws_cognito_user_group.judges.name,
      aws_cognito_user_group.participants.name
    ]
    mfa_enabled       = var.enable_mfa
    advanced_security = var.advanced_security_mode
  }
}
