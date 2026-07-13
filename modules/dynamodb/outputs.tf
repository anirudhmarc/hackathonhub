# ============================================================================
# DynamoDB Module Outputs
# ============================================================================

# Participants Table Outputs
# ============================================================================

output "participants_table_id" {
  description = "ID of the participants table"
  value       = aws_dynamodb_table.participants.id
}

output "participants_table_arn" {
  description = "ARN of the participants table"
  value       = aws_dynamodb_table.participants.arn
}

output "participants_table_name" {
  description = "Name of the participants table"
  value       = aws_dynamodb_table.participants.name
}

output "participants_table_stream_arn" {
  description = "Stream ARN of the participants table"
  value       = var.enable_streams ? aws_dynamodb_table.participants.stream_arn : null
}

output "participants_table_stream_label" {
  description = "Stream label of the participants table"
  value       = var.enable_streams ? aws_dynamodb_table.participants.stream_label : null
}

# Sessions Table Outputs
# ============================================================================

output "sessions_table_id" {
  description = "ID of the sessions table"
  value       = var.enable_sessions_table ? aws_dynamodb_table.sessions[0].id : null
}

output "sessions_table_arn" {
  description = "ARN of the sessions table"
  value       = var.enable_sessions_table ? aws_dynamodb_table.sessions[0].arn : null
}

output "sessions_table_name" {
  description = "Name of the sessions table"
  value       = var.enable_sessions_table ? aws_dynamodb_table.sessions[0].name : null
}

output "sessions_table_stream_arn" {
  description = "Stream ARN of the sessions table"
  value       = var.enable_sessions_table && var.enable_streams ? aws_dynamodb_table.sessions[0].stream_arn : null
}

output "sessions_table_stream_label" {
  description = "Stream label of the sessions table"
  value       = var.enable_sessions_table && var.enable_streams ? aws_dynamodb_table.sessions[0].stream_label : null
}

# Summary Output
# ============================================================================

output "dynamodb_summary" {
  description = "Summary of DynamoDB configuration"
  value = {
    participants_table = {
      name         = aws_dynamodb_table.participants.name
      arn          = aws_dynamodb_table.participants.arn
      billing_mode = aws_dynamodb_table.participants.billing_mode
      hash_key     = aws_dynamodb_table.participants.hash_key
      gsi_count    = length(aws_dynamodb_table.participants.global_secondary_index)
    }
    sessions_table = var.enable_sessions_table ? {
      name         = aws_dynamodb_table.sessions[0].name
      arn          = aws_dynamodb_table.sessions[0].arn
      billing_mode = aws_dynamodb_table.sessions[0].billing_mode
      hash_key     = aws_dynamodb_table.sessions[0].hash_key
      gsi_count    = length(aws_dynamodb_table.sessions[0].global_secondary_index)
    } : null
    features = {
      point_in_time_recovery = var.enable_point_in_time_recovery
      ttl_enabled            = var.enable_ttl
      streams_enabled        = var.enable_streams
      encryption_enabled     = true
    }
  }
}


# Alias outputs for backward compatibility with Lambda module
# ============================================================================

output "registrations_table_arn" {
  description = "ARN of the registrations/participants table (alias)"
  value       = aws_dynamodb_table.participants.arn
}

output "registrations_table_name" {
  description = "Name of the registrations/participants table (alias)"
  value       = aws_dynamodb_table.participants.name
}
