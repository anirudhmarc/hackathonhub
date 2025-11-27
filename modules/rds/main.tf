# ============================================================================
# RDS MySQL Module - Production-Ready Database
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
# Security Group for RDS
# ============================================================================

resource "aws_security_group" "rds" {
  name_prefix = "${var.project_name}-${var.environment}-rds-"
  description = "Security group for RDS MySQL database"
  vpc_id      = var.vpc_id

  ingress {
    description     = "MySQL from Lambda functions"
    from_port       = 3306
    to_port         = 3306
    protocol        = "tcp"
    security_groups = [var.lambda_sg_id]
  }

  egress {
    description = "Allow all outbound traffic"
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }

  tags = merge(
    var.common_tags,
    {
      Name        = "${var.project_name}-${var.environment}-rds-sg"
      Purpose     = "RDS"
      Environment = var.environment
    }
  )

  lifecycle {
    create_before_destroy = true
  }
}

# ============================================================================
# DB Parameter Group
# ============================================================================

resource "aws_db_parameter_group" "main" {
  name_prefix = "${var.project_name}-${var.environment}-mysql8-"
  family      = "mysql8.0"
  description = "Custom parameter group for MySQL 8.0"

  parameter {
    name  = "character_set_server"
    value = "utf8mb4"
  }

  parameter {
    name  = "collation_server"
    value = "utf8mb4_unicode_ci"
  }

  parameter {
    name  = "max_connections"
    value = "200"
  }

  parameter {
    name  = "slow_query_log"
    value = "1"
  }

  parameter {
    name  = "long_query_time"
    value = "2"
  }

  parameter {
    name  = "log_queries_not_using_indexes"
    value = "1"
  }

  tags = merge(
    var.common_tags,
    {
      Name        = "${var.project_name}-${var.environment}-mysql8-params"
      Environment = var.environment
    }
  )

  lifecycle {
    create_before_destroy = true
  }
}

# ============================================================================
# Secrets Manager for Database Credentials
# ============================================================================

resource "aws_secretsmanager_secret" "db_credentials" {
  name_prefix             = "${var.project_name}-${var.environment}-db-"
  description             = "RDS MySQL database credentials"
  recovery_window_in_days = 7

  tags = merge(
    var.common_tags,
    {
      Name        = "${var.project_name}-${var.environment}-db-credentials"
      Environment = var.environment
    }
  )
}

resource "aws_secretsmanager_secret_version" "db_credentials" {
  secret_id = aws_secretsmanager_secret.db_credentials.id
  secret_string = jsonencode({
    username = var.db_username
    password = var.db_password
    engine   = "mysql"
    host     = aws_db_instance.main.address
    port     = 3306
    dbname   = var.db_name
    endpoint = aws_db_instance.main.endpoint
  })

  lifecycle {
    ignore_changes = [secret_string]
  }
}

# ============================================================================
# IAM Role for RDS Enhanced Monitoring
# ============================================================================

resource "aws_iam_role" "rds_monitoring" {
  count       = var.enable_enhanced_monitoring ? 1 : 0
  name_prefix = "${var.project_name}-${var.environment}-rds-mon-"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Principal = {
          Service = "monitoring.rds.amazonaws.com"
        }
        Action = "sts:AssumeRole"
      }
    ]
  })

  tags = merge(
    var.common_tags,
    {
      Name        = "${var.project_name}-${var.environment}-rds-monitoring-role"
      Environment = var.environment
    }
  )
}

resource "aws_iam_role_policy_attachment" "rds_monitoring" {
  count      = var.enable_enhanced_monitoring ? 1 : 0
  role       = aws_iam_role.rds_monitoring[0].name
  policy_arn = "arn:aws:iam::aws:policy/service-role/AmazonRDSEnhancedMonitoringRole"
}

# ============================================================================
# RDS MySQL Instance
# ============================================================================

resource "aws_db_instance" "main" {
  identifier = "${var.project_name}-${var.environment}-db"

  # Engine Configuration
  engine             = "mysql"
  engine_version     = "8.0.39"
  instance_class     = var.instance_class
  ca_cert_identifier = "rds-ca-rsa2048-g1"

  # Storage Configuration
  allocated_storage     = var.allocated_storage
  max_allocated_storage = var.max_allocated_storage
  storage_type          = "gp3"
  storage_encrypted     = true
  kms_key_id            = var.kms_key_id

  # Database Configuration
  db_name  = var.db_name
  username = var.db_username
  password = var.db_password

  # Network Configuration
  db_subnet_group_name   = var.db_subnet_group_name
  vpc_security_group_ids = [aws_security_group.rds.id]
  publicly_accessible    = false
  port                   = 3306

  # High Availability
  multi_az          = var.multi_az
  availability_zone = var.multi_az ? null : var.availability_zone

  # Backup Configuration
  backup_retention_period   = var.backup_retention_period
  backup_window             = var.backup_window
  maintenance_window        = var.maintenance_window
  skip_final_snapshot       = var.skip_final_snapshot
  final_snapshot_identifier = var.skip_final_snapshot ? null : "${var.project_name}-${var.environment}-final-${formatdate("YYYY-MM-DD-hhmm", timestamp())}"
  copy_tags_to_snapshot     = true

  # Monitoring and Logging
  enabled_cloudwatch_logs_exports       = ["error", "general", "slowquery"]
  monitoring_interval                   = var.enable_enhanced_monitoring ? var.monitoring_interval : 0
  monitoring_role_arn                   = var.enable_enhanced_monitoring ? aws_iam_role.rds_monitoring[0].arn : null
  performance_insights_enabled          = var.enable_performance_insights
  performance_insights_retention_period = var.enable_performance_insights ? var.performance_insights_retention : null

  # Parameters and Options
  parameter_group_name = aws_db_parameter_group.main.name
  option_group_name    = var.option_group_name

  # Protection
  deletion_protection = var.deletion_protection
  apply_immediately   = var.apply_immediately

  # Auto Minor Version Upgrade
  auto_minor_version_upgrade = var.auto_minor_version_upgrade

  tags = merge(
    var.common_tags,
    {
      Name        = "${var.project_name}-${var.environment}-mysql"
      Environment = var.environment
      Engine      = "MySQL 8.0"
    }
  )

  lifecycle {
    ignore_changes = [
      final_snapshot_identifier,
      password
    ]
  }
}
