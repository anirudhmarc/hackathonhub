# ============================================================================
# DynamoDB Module - NoSQL Tables for Participant Registration
# ============================================================================

terraform {
  required_version = ">= 1.0"
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
  }
}

# ============================================================================
# DynamoDB Table - Participants Registration
# ============================================================================

resource "aws_dynamodb_table" "participants" {
  name         = "${var.project_name}-${var.environment}-participants"
  billing_mode = var.billing_mode
  hash_key     = "participant_id"

  # Provisioned capacity (only used if billing_mode = "PROVISIONED")
  read_capacity  = var.billing_mode == "PROVISIONED" ? var.read_capacity : null
  write_capacity = var.billing_mode == "PROVISIONED" ? var.write_capacity : null

  # Primary Key
  attribute {
    name = "participant_id"
    type = "S"
  }

  # GSI Attributes
  attribute {
    name = "email_address"
    type = "S"
  }

  attribute {
    name = "registration_status"
    type = "S"
  }

  # Global Secondary Index - Email Lookup
  global_secondary_index {
    name            = "EmailIndex"
    hash_key        = "email_address"
    projection_type = "ALL"
    read_capacity   = var.billing_mode == "PROVISIONED" ? var.gsi_read_capacity : null
    write_capacity  = var.billing_mode == "PROVISIONED" ? var.gsi_write_capacity : null
  }

  # Global Secondary Index - Status Filtering
  global_secondary_index {
    name            = "StatusIndex"
    hash_key        = "registration_status"
    projection_type = "ALL"
    read_capacity   = var.billing_mode == "PROVISIONED" ? var.gsi_read_capacity : null
    write_capacity  = var.billing_mode == "PROVISIONED" ? var.gsi_write_capacity : null
  }

  # Point-in-Time Recovery
  point_in_time_recovery {
    enabled = var.enable_point_in_time_recovery
  }

  # Server-Side Encryption
  server_side_encryption {
    enabled     = true
    kms_key_arn = var.kms_key_arn
  }

  # TTL for automatic data cleanup
  ttl {
    attribute_name = "expiration_time"
    enabled        = var.enable_ttl
  }

  # Stream for change data capture
  stream_enabled   = var.enable_streams
  stream_view_type = var.enable_streams ? var.stream_view_type : null

  tags = merge(
    var.common_tags,
    {
      Name        = "${var.project_name}-${var.environment}-participants"
      Purpose     = "Participant registration data"
      Environment = var.environment
    }
  )
}


# ============================================================================
# DynamoDB Table - Sessions (Optional)
# ============================================================================

resource "aws_dynamodb_table" "sessions" {
  count        = var.enable_sessions_table ? 1 : 0
  name         = "${var.project_name}-${var.environment}-sessions"
  billing_mode = var.billing_mode
  hash_key     = "session_id"

  # Provisioned capacity
  read_capacity  = var.billing_mode == "PROVISIONED" ? var.read_capacity : null
  write_capacity = var.billing_mode == "PROVISIONED" ? var.write_capacity : null

  # Primary Key
  attribute {
    name = "session_id"
    type = "S"
  }

  # GSI Attribute
  attribute {
    name = "user_id"
    type = "S"
  }

  # Global Secondary Index - User Lookup
  global_secondary_index {
    name            = "UserIndex"
    hash_key        = "user_id"
    projection_type = "ALL"
    read_capacity   = var.billing_mode == "PROVISIONED" ? var.gsi_read_capacity : null
    write_capacity  = var.billing_mode == "PROVISIONED" ? var.gsi_write_capacity : null
  }

  # Point-in-Time Recovery
  point_in_time_recovery {
    enabled = var.enable_point_in_time_recovery
  }

  # Server-Side Encryption
  server_side_encryption {
    enabled     = true
    kms_key_arn = var.kms_key_arn
  }

  # TTL for automatic session cleanup
  ttl {
    attribute_name = "expiration_time"
    enabled        = true
  }

  # Stream
  stream_enabled   = var.enable_streams
  stream_view_type = var.enable_streams ? var.stream_view_type : null

  tags = merge(
    var.common_tags,
    {
      Name        = "${var.project_name}-${var.environment}-sessions"
      Purpose     = "User session management"
      Environment = var.environment
    }
  )
}

# ============================================================================
# CloudWatch Alarms for Monitoring
# ============================================================================

# Participants Table - Read Capacity Alarm
resource "aws_cloudwatch_metric_alarm" "participants_read_throttle" {
  count               = var.enable_cloudwatch_alarms && var.billing_mode == "PROVISIONED" ? 1 : 0
  alarm_name          = "${var.project_name}-${var.environment}-participants-read-throttle"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = 2
  metric_name         = "ReadThrottleEvents"
  namespace           = "AWS/DynamoDB"
  period              = 300
  statistic           = "Sum"
  threshold           = 10
  alarm_description   = "Participants table read throttle events"
  treat_missing_data  = "notBreaching"

  dimensions = {
    TableName = aws_dynamodb_table.participants.name
  }

  tags = var.common_tags
}

# Participants Table - Write Capacity Alarm
resource "aws_cloudwatch_metric_alarm" "participants_write_throttle" {
  count               = var.enable_cloudwatch_alarms && var.billing_mode == "PROVISIONED" ? 1 : 0
  alarm_name          = "${var.project_name}-${var.environment}-participants-write-throttle"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = 2
  metric_name         = "WriteThrottleEvents"
  namespace           = "AWS/DynamoDB"
  period              = 300
  statistic           = "Sum"
  threshold           = 10
  alarm_description   = "Participants table write throttle events"
  treat_missing_data  = "notBreaching"

  dimensions = {
    TableName = aws_dynamodb_table.participants.name
  }

  tags = var.common_tags
}
