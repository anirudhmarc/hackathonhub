# ============================================================================
# RDS Module Outputs
# ============================================================================

# Database Instance Outputs
# ============================================================================

output "db_instance_id" {
  description = "ID of the RDS instance"
  value       = aws_db_instance.main.id
}

output "db_instance_arn" {
  description = "ARN of the RDS instance"
  value       = aws_db_instance.main.arn
}

output "db_instance_endpoint" {
  description = "Connection endpoint (host:port)"
  value       = aws_db_instance.main.endpoint
}

output "db_instance_address" {
  description = "Hostname of the RDS instance"
  value       = aws_db_instance.main.address
}

output "db_instance_port" {
  description = "Port of the RDS instance"
  value       = aws_db_instance.main.port
}

output "db_instance_name" {
  description = "Database name"
  value       = aws_db_instance.main.db_name
}

output "db_instance_username" {
  description = "Master username"
  value       = aws_db_instance.main.username
  sensitive   = true
}

output "db_instance_resource_id" {
  description = "Resource ID of the RDS instance"
  value       = aws_db_instance.main.resource_id
}

# Security Outputs
# ============================================================================

output "db_security_group_id" {
  description = "ID of the RDS security group"
  value       = aws_security_group.rds.id
}

output "db_security_group_arn" {
  description = "ARN of the RDS security group"
  value       = aws_security_group.rds.arn
}

# Secrets Manager Outputs
# ============================================================================

output "db_credentials_secret_arn" {
  description = "ARN of the Secrets Manager secret"
  value       = aws_secretsmanager_secret.db_credentials.arn
}

output "db_credentials_secret_name" {
  description = "Name of the Secrets Manager secret"
  value       = aws_secretsmanager_secret.db_credentials.name
}

# Parameter Group Outputs
# ============================================================================

output "db_parameter_group_id" {
  description = "ID of the DB parameter group"
  value       = aws_db_parameter_group.main.id
}

output "db_parameter_group_name" {
  description = "Name of the DB parameter group"
  value       = aws_db_parameter_group.main.name
}

output "db_parameter_group_arn" {
  description = "ARN of the DB parameter group"
  value       = aws_db_parameter_group.main.arn
}

# Connection String Output
# ============================================================================

output "db_connection_string" {
  description = "MySQL connection string for Lambda"
  value       = "mysql://${aws_db_instance.main.username}:****@${aws_db_instance.main.endpoint}/${aws_db_instance.main.db_name}"
  sensitive   = false
}

# Summary Output
# ============================================================================

output "rds_summary" {
  description = "Summary of RDS configuration"
  value = {
    instance_id       = aws_db_instance.main.id
    endpoint          = aws_db_instance.main.endpoint
    database_name     = aws_db_instance.main.db_name
    engine            = aws_db_instance.main.engine
    engine_version    = aws_db_instance.main.engine_version
    instance_class    = aws_db_instance.main.instance_class
    allocated_storage = aws_db_instance.main.allocated_storage
    multi_az          = aws_db_instance.main.multi_az
    encrypted         = aws_db_instance.main.storage_encrypted
  }
}
