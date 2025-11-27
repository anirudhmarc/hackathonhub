# ============================================================================
# VPC Module - Production-Ready Network Infrastructure
# ============================================================================
# This module creates a highly available, secure VPC with:
# - Multi-AZ deployment across 2 availability zones
# - Public and private subnets for proper network segmentation
# - VPC endpoints for cost-effective AWS service access (no NAT Gateway)
# - Comprehensive security groups for Lambda and RDS
# - Flow logs for network monitoring and troubleshooting
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
# Data Sources
# ============================================================================

data "aws_region" "current" {}

data "aws_availability_zones" "available" {
  state = "available"
  filter {
    name   = "opt-in-status"
    values = ["opt-in-not-required"]
  }
}

# ============================================================================
# VPC
# ============================================================================

resource "aws_vpc" "main" {
  cidr_block           = var.vpc_cidr
  enable_dns_hostnames = true
  enable_dns_support   = true

  # Enable VPC flow logs for security monitoring
  tags = merge(
    var.common_tags,
    {
      Name        = "${var.project_name}-${var.environment}-vpc"
      Environment = var.environment
      ManagedBy   = "Terraform"
    }
  )
}

# ============================================================================
# Internet Gateway
# ============================================================================

resource "aws_internet_gateway" "main" {
  vpc_id = aws_vpc.main.id

  tags = merge(
    var.common_tags,
    {
      Name        = "${var.project_name}-${var.environment}-igw"
      Environment = var.environment
    }
  )
}

# ============================================================================
# Public Subnets (for future use - ALB, Bastion, etc.)
# ============================================================================

resource "aws_subnet" "public" {
  count                   = var.az_count
  vpc_id                  = aws_vpc.main.id
  cidr_block              = cidrsubnet(var.vpc_cidr, 8, count.index)
  availability_zone       = data.aws_availability_zones.available.names[count.index]
  map_public_ip_on_launch = true

  tags = merge(
    var.common_tags,
    {
      Name        = "${var.project_name}-${var.environment}-public-${count.index + 1}"
      Type        = "Public"
      Tier        = "Public"
      AZ          = data.aws_availability_zones.available.names[count.index]
      Environment = var.environment
    }
  )
}

# ============================================================================
# Private Subnets (for Lambda and RDS)
# ============================================================================

resource "aws_subnet" "private" {
  count             = var.az_count
  vpc_id            = aws_vpc.main.id
  cidr_block        = cidrsubnet(var.vpc_cidr, 8, count.index + 10)
  availability_zone = data.aws_availability_zones.available.names[count.index]

  tags = merge(
    var.common_tags,
    {
      Name        = "${var.project_name}-${var.environment}-private-${count.index + 1}"
      Type        = "Private"
      Tier        = "Application"
      AZ          = data.aws_availability_zones.available.names[count.index]
      Environment = var.environment
    }
  )
}

# ============================================================================
# Database Subnets (isolated tier for RDS)
# ============================================================================

resource "aws_subnet" "database" {
  count             = var.az_count
  vpc_id            = aws_vpc.main.id
  cidr_block        = cidrsubnet(var.vpc_cidr, 8, count.index + 20)
  availability_zone = data.aws_availability_zones.available.names[count.index]

  tags = merge(
    var.common_tags,
    {
      Name        = "${var.project_name}-${var.environment}-database-${count.index + 1}"
      Type        = "Private"
      Tier        = "Database"
      AZ          = data.aws_availability_zones.available.names[count.index]
      Environment = var.environment
    }
  )
}

# ============================================================================
# DB Subnet Group (required for RDS)
# ============================================================================

resource "aws_db_subnet_group" "main" {
  name       = "${var.project_name}-${var.environment}-db-subnet-group"
  subnet_ids = aws_subnet.database[*].id

  tags = merge(
    var.common_tags,
    {
      Name        = "${var.project_name}-${var.environment}-db-subnet-group"
      Environment = var.environment
    }
  )
}

# ============================================================================
# Elastic IP for NAT Gateway (Optional - commented out for cost savings)
# ============================================================================

# resource "aws_eip" "nat" {
#   count  = var.enable_nat_gateway ? var.az_count : 0
#   domain = "vpc"
#   
#   tags = merge(
#     var.common_tags,
#     {
#       Name        = "${var.project_name}-${var.environment}-nat-eip-${count.index + 1}"
#       Environment = var.environment
#     }
#   )
#   
#   depends_on = [aws_internet_gateway.main]
# }

# ============================================================================
# NAT Gateway (Optional - costs ~$32/month per AZ)
# ============================================================================

# resource "aws_nat_gateway" "main" {
#   count         = var.enable_nat_gateway ? var.az_count : 0
#   allocation_id = aws_eip.nat[count.index].id
#   subnet_id     = aws_subnet.public[count.index].id
#   
#   tags = merge(
#     var.common_tags,
#     {
#       Name        = "${var.project_name}-${var.environment}-nat-${count.index + 1}"
#       Environment = var.environment
#     }
#   )
#   
#   depends_on = [aws_internet_gateway.main]
# }

# ============================================================================
# Route Tables
# ============================================================================

# Public Route Table
resource "aws_route_table" "public" {
  vpc_id = aws_vpc.main.id

  tags = merge(
    var.common_tags,
    {
      Name        = "${var.project_name}-${var.environment}-public-rt"
      Type        = "Public"
      Environment = var.environment
    }
  )
}

# Public Route to Internet Gateway
resource "aws_route" "public_internet" {
  route_table_id         = aws_route_table.public.id
  destination_cidr_block = "0.0.0.0/0"
  gateway_id             = aws_internet_gateway.main.id
}

# Private Route Tables (one per AZ for high availability)
resource "aws_route_table" "private" {
  count  = var.az_count
  vpc_id = aws_vpc.main.id

  tags = merge(
    var.common_tags,
    {
      Name        = "${var.project_name}-${var.environment}-private-rt-${count.index + 1}"
      Type        = "Private"
      AZ          = data.aws_availability_zones.available.names[count.index]
      Environment = var.environment
    }
  )
}

# Private Route to NAT Gateway (if enabled)
# resource "aws_route" "private_nat" {
#   count                  = var.enable_nat_gateway ? var.az_count : 0
#   route_table_id         = aws_route_table.private[count.index].id
#   destination_cidr_block = "0.0.0.0/0"
#   nat_gateway_id         = aws_nat_gateway.main[count.index].id
# }

# Database Route Table
resource "aws_route_table" "database" {
  vpc_id = aws_vpc.main.id

  tags = merge(
    var.common_tags,
    {
      Name        = "${var.project_name}-${var.environment}-database-rt"
      Type        = "Database"
      Environment = var.environment
    }
  )
}

# ============================================================================
# Route Table Associations
# ============================================================================

resource "aws_route_table_association" "public" {
  count          = var.az_count
  subnet_id      = aws_subnet.public[count.index].id
  route_table_id = aws_route_table.public.id
}

resource "aws_route_table_association" "private" {
  count          = var.az_count
  subnet_id      = aws_subnet.private[count.index].id
  route_table_id = aws_route_table.private[count.index].id
}

resource "aws_route_table_association" "database" {
  count          = var.az_count
  subnet_id      = aws_subnet.database[count.index].id
  route_table_id = aws_route_table.database.id
}

# ============================================================================
# VPC Endpoints - Cost-Effective Alternative to NAT Gateway
# ============================================================================

# Security Group for VPC Endpoints
resource "aws_security_group" "vpc_endpoints" {
  name_prefix = "${var.project_name}-${var.environment}-vpce-"
  description = "Security group for VPC interface endpoints"
  vpc_id      = aws_vpc.main.id

  ingress {
    description = "HTTPS from VPC"
    from_port   = 443
    to_port     = 443
    protocol    = "tcp"
    cidr_blocks = [var.vpc_cidr]
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
      Name        = "${var.project_name}-${var.environment}-vpce-sg"
      Environment = var.environment
    }
  )

  lifecycle {
    create_before_destroy = true
  }
}

# S3 Gateway Endpoint (FREE - no hourly charges)
resource "aws_vpc_endpoint" "s3" {
  vpc_id            = aws_vpc.main.id
  service_name      = "com.amazonaws.${data.aws_region.current.name}.s3"
  vpc_endpoint_type = "Gateway"
  route_table_ids = concat(
    [aws_route_table.public.id],
    aws_route_table.private[*].id,
    [aws_route_table.database.id]
  )

  tags = merge(
    var.common_tags,
    {
      Name        = "${var.project_name}-${var.environment}-s3-endpoint"
      Type        = "Gateway"
      Service     = "S3"
      Environment = var.environment
    }
  )
}

# DynamoDB Gateway Endpoint (FREE - no hourly charges)
resource "aws_vpc_endpoint" "dynamodb" {
  vpc_id            = aws_vpc.main.id
  service_name      = "com.amazonaws.${data.aws_region.current.name}.dynamodb"
  vpc_endpoint_type = "Gateway"
  route_table_ids = concat(
    [aws_route_table.public.id],
    aws_route_table.private[*].id,
    [aws_route_table.database.id]
  )

  tags = merge(
    var.common_tags,
    {
      Name        = "${var.project_name}-${var.environment}-dynamodb-endpoint"
      Type        = "Gateway"
      Service     = "DynamoDB"
      Environment = var.environment
    }
  )
}

# Secrets Manager Interface Endpoint (~$7/month)
resource "aws_vpc_endpoint" "secretsmanager" {
  count               = var.enable_secretsmanager_endpoint ? 1 : 0
  vpc_id              = aws_vpc.main.id
  service_name        = "com.amazonaws.${data.aws_region.current.name}.secretsmanager"
  vpc_endpoint_type   = "Interface"
  subnet_ids          = aws_subnet.private[*].id
  security_group_ids  = [aws_security_group.vpc_endpoints.id]
  private_dns_enabled = true

  tags = merge(
    var.common_tags,
    {
      Name        = "${var.project_name}-${var.environment}-secretsmanager-endpoint"
      Type        = "Interface"
      Service     = "SecretsManager"
      Environment = var.environment
    }
  )
}

# SES (Email) Interface Endpoint (~$7/month)
resource "aws_vpc_endpoint" "ses" {
  count               = var.enable_ses_endpoint ? 1 : 0
  vpc_id              = aws_vpc.main.id
  service_name        = "com.amazonaws.${data.aws_region.current.name}.email-smtp"
  vpc_endpoint_type   = "Interface"
  subnet_ids          = aws_subnet.private[*].id
  security_group_ids  = [aws_security_group.vpc_endpoints.id]
  private_dns_enabled = true

  tags = merge(
    var.common_tags,
    {
      Name        = "${var.project_name}-${var.environment}-ses-endpoint"
      Type        = "Interface"
      Service     = "SES"
      Environment = var.environment
    }
  )
}

# Lambda Interface Endpoint (~$7/month)
resource "aws_vpc_endpoint" "lambda" {
  count               = var.enable_lambda_endpoint ? 1 : 0
  vpc_id              = aws_vpc.main.id
  service_name        = "com.amazonaws.${data.aws_region.current.name}.lambda"
  vpc_endpoint_type   = "Interface"
  subnet_ids          = aws_subnet.private[*].id
  security_group_ids  = [aws_security_group.vpc_endpoints.id]
  private_dns_enabled = true

  tags = merge(
    var.common_tags,
    {
      Name        = "${var.project_name}-${var.environment}-lambda-endpoint"
      Type        = "Interface"
      Service     = "Lambda"
      Environment = var.environment
    }
  )
}

# ============================================================================
# Security Groups
# ============================================================================

# Lambda Security Group
resource "aws_security_group" "lambda" {
  name_prefix = "${var.project_name}-${var.environment}-lambda-"
  description = "Security group for Lambda functions"
  vpc_id      = aws_vpc.main.id

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
      Name        = "${var.project_name}-${var.environment}-lambda-sg"
      Purpose     = "Lambda"
      Environment = var.environment
    }
  )

  lifecycle {
    create_before_destroy = true
  }
}

# RDS Security Group
resource "aws_security_group" "rds" {
  name_prefix = "${var.project_name}-${var.environment}-rds-"
  description = "Security group for RDS MySQL database"
  vpc_id      = aws_vpc.main.id

  ingress {
    description     = "MySQL from Lambda"
    from_port       = 3306
    to_port         = 3306
    protocol        = "tcp"
    security_groups = [aws_security_group.lambda.id]
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

# Optional: Bastion Host Security Group (for database access)
resource "aws_security_group" "bastion" {
  count       = var.enable_bastion_sg ? 1 : 0
  name_prefix = "${var.project_name}-${var.environment}-bastion-"
  description = "Security group for bastion host"
  vpc_id      = aws_vpc.main.id

  ingress {
    description = "SSH from allowed IPs"
    from_port   = 22
    to_port     = 22
    protocol    = "tcp"
    cidr_blocks = var.bastion_allowed_cidrs
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
      Name        = "${var.project_name}-${var.environment}-bastion-sg"
      Purpose     = "Bastion"
      Environment = var.environment
    }
  )

  lifecycle {
    create_before_destroy = true
  }
}

# Allow Bastion to access RDS (if enabled)
resource "aws_security_group_rule" "rds_from_bastion" {
  count                    = var.enable_bastion_sg ? 1 : 0
  type                     = "ingress"
  from_port                = 3306
  to_port                  = 3306
  protocol                 = "tcp"
  source_security_group_id = aws_security_group.bastion[0].id
  security_group_id        = aws_security_group.rds.id
  description              = "MySQL from Bastion"
}

# ============================================================================
# VPC Flow Logs (for security monitoring and troubleshooting)
# ============================================================================

resource "aws_flow_log" "main" {
  count                    = var.enable_flow_logs ? 1 : 0
  iam_role_arn             = aws_iam_role.flow_logs[0].arn
  log_destination          = aws_cloudwatch_log_group.flow_logs[0].arn
  traffic_type             = var.flow_logs_traffic_type
  vpc_id                   = aws_vpc.main.id
  max_aggregation_interval = var.flow_logs_retention_days > 7 ? 600 : 60

  tags = merge(
    var.common_tags,
    {
      Name        = "${var.project_name}-${var.environment}-flow-logs"
      Environment = var.environment
    }
  )
}

resource "aws_cloudwatch_log_group" "flow_logs" {
  count             = var.enable_flow_logs ? 1 : 0
  name              = "/aws/vpc/${var.project_name}-${var.environment}-flow-logs"
  retention_in_days = var.flow_logs_retention_days

  tags = merge(
    var.common_tags,
    {
      Name        = "${var.project_name}-${var.environment}-flow-logs"
      Environment = var.environment
    }
  )
}

resource "aws_iam_role" "flow_logs" {
  count       = var.enable_flow_logs ? 1 : 0
  name_prefix = "${var.project_name}-${var.environment}-flow-logs-"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Principal = {
          Service = "vpc-flow-logs.amazonaws.com"
        }
        Action = "sts:AssumeRole"
      }
    ]
  })

  tags = merge(
    var.common_tags,
    {
      Name        = "${var.project_name}-${var.environment}-flow-logs-role"
      Environment = var.environment
    }
  )
}

resource "aws_iam_role_policy" "flow_logs" {
  count       = var.enable_flow_logs ? 1 : 0
  name_prefix = "${var.project_name}-${var.environment}-flow-logs-"
  role        = aws_iam_role.flow_logs[0].id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Action = [
          "logs:CreateLogGroup",
          "logs:CreateLogStream",
          "logs:PutLogEvents",
          "logs:DescribeLogGroups",
          "logs:DescribeLogStreams"
        ]
        Resource = "*"
      }
    ]
  })
}

# ============================================================================
# Network ACLs (Additional security layer)
# ============================================================================

# Public Subnet NACL
resource "aws_network_acl" "public" {
  count      = var.enable_network_acls ? 1 : 0
  vpc_id     = aws_vpc.main.id
  subnet_ids = aws_subnet.public[*].id

  # Allow inbound HTTP
  ingress {
    protocol   = "tcp"
    rule_no    = 100
    action     = "allow"
    cidr_block = "0.0.0.0/0"
    from_port  = 80
    to_port    = 80
  }

  # Allow inbound HTTPS
  ingress {
    protocol   = "tcp"
    rule_no    = 110
    action     = "allow"
    cidr_block = "0.0.0.0/0"
    from_port  = 443
    to_port    = 443
  }

  # Allow inbound ephemeral ports
  ingress {
    protocol   = "tcp"
    rule_no    = 120
    action     = "allow"
    cidr_block = "0.0.0.0/0"
    from_port  = 1024
    to_port    = 65535
  }

  # Allow all outbound
  egress {
    protocol   = "-1"
    rule_no    = 100
    action     = "allow"
    cidr_block = "0.0.0.0/0"
    from_port  = 0
    to_port    = 0
  }

  tags = merge(
    var.common_tags,
    {
      Name        = "${var.project_name}-${var.environment}-public-nacl"
      Environment = var.environment
    }
  )
}

# Private Subnet NACL
resource "aws_network_acl" "private" {
  count      = var.enable_network_acls ? 1 : 0
  vpc_id     = aws_vpc.main.id
  subnet_ids = aws_subnet.private[*].id

  # Allow inbound from VPC
  ingress {
    protocol   = "-1"
    rule_no    = 100
    action     = "allow"
    cidr_block = var.vpc_cidr
    from_port  = 0
    to_port    = 0
  }

  # Allow inbound ephemeral ports
  ingress {
    protocol   = "tcp"
    rule_no    = 110
    action     = "allow"
    cidr_block = "0.0.0.0/0"
    from_port  = 1024
    to_port    = 65535
  }

  # Allow all outbound
  egress {
    protocol   = "-1"
    rule_no    = 100
    action     = "allow"
    cidr_block = "0.0.0.0/0"
    from_port  = 0
    to_port    = 0
  }

  tags = merge(
    var.common_tags,
    {
      Name        = "${var.project_name}-${var.environment}-private-nacl"
      Environment = var.environment
    }
  )
}
