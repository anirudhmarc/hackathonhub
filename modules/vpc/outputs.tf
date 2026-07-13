# ============================================================================
# VPC Module Outputs
# ============================================================================

# VPC Outputs
# ============================================================================

output "vpc_id" {
  description = "ID of the VPC"
  value       = aws_vpc.main.id
}

output "vpc_cidr" {
  description = "CIDR block of the VPC"
  value       = aws_vpc.main.cidr_block
}

output "vpc_arn" {
  description = "ARN of the VPC"
  value       = aws_vpc.main.arn
}

# Internet Gateway Outputs
# ============================================================================

output "internet_gateway_id" {
  description = "ID of the Internet Gateway"
  value       = aws_internet_gateway.main.id
}

# Subnet Outputs
# ============================================================================

output "public_subnet_ids" {
  description = "List of public subnet IDs"
  value       = aws_subnet.public[*].id
}

output "public_subnet_cidrs" {
  description = "List of public subnet CIDR blocks"
  value       = aws_subnet.public[*].cidr_block
}

output "public_subnet_azs" {
  description = "List of availability zones for public subnets"
  value       = aws_subnet.public[*].availability_zone
}

output "private_subnet_ids" {
  description = "List of private subnet IDs (for Lambda)"
  value       = aws_subnet.private[*].id
}

output "private_subnet_cidrs" {
  description = "List of private subnet CIDR blocks"
  value       = aws_subnet.private[*].cidr_block
}

output "private_subnet_azs" {
  description = "List of availability zones for private subnets"
  value       = aws_subnet.private[*].availability_zone
}

output "database_subnet_ids" {
  description = "List of database subnet IDs (for RDS)"
  value       = aws_subnet.database[*].id
}

output "database_subnet_cidrs" {
  description = "List of database subnet CIDR blocks"
  value       = aws_subnet.database[*].cidr_block
}

output "database_subnet_azs" {
  description = "List of availability zones for database subnets"
  value       = aws_subnet.database[*].availability_zone
}

output "db_subnet_group_name" {
  description = "Name of the DB subnet group"
  value       = aws_db_subnet_group.main.name
}

output "db_subnet_group_id" {
  description = "ID of the DB subnet group"
  value       = aws_db_subnet_group.main.id
}

# Route Table Outputs
# ============================================================================

output "public_route_table_id" {
  description = "ID of the public route table"
  value       = aws_route_table.public.id
}

output "private_route_table_ids" {
  description = "List of private route table IDs"
  value       = aws_route_table.private[*].id
}

output "database_route_table_id" {
  description = "ID of the database route table"
  value       = aws_route_table.database.id
}

# NAT Gateway Outputs
# ============================================================================

# output "nat_gateway_ids" {
#   description = "List of NAT Gateway IDs"
#   value       = var.enable_nat_gateway ? aws_nat_gateway.main[*].id : []
# }

# output "nat_gateway_public_ips" {
#   description = "List of NAT Gateway public IPs"
#   value       = var.enable_nat_gateway ? aws_eip.nat[*].public_ip : []
# }

# VPC Endpoint Outputs
# ============================================================================

output "s3_endpoint_id" {
  description = "ID of the S3 VPC endpoint"
  value       = aws_vpc_endpoint.s3.id
}

output "dynamodb_endpoint_id" {
  description = "ID of the DynamoDB VPC endpoint"
  value       = aws_vpc_endpoint.dynamodb.id
}

output "secretsmanager_endpoint_id" {
  description = "ID of the Secrets Manager VPC endpoint"
  value       = var.enable_secretsmanager_endpoint ? aws_vpc_endpoint.secretsmanager[0].id : null
}

output "ses_endpoint_id" {
  description = "ID of the SES VPC endpoint"
  value       = var.enable_ses_endpoint ? aws_vpc_endpoint.ses[0].id : null
}

output "lambda_endpoint_id" {
  description = "ID of the Lambda VPC endpoint"
  value       = var.enable_lambda_endpoint ? aws_vpc_endpoint.lambda[0].id : null
}

# Security Group Outputs
# ============================================================================

output "lambda_security_group_id" {
  description = "ID of the Lambda security group"
  value       = aws_security_group.lambda.id
}

output "lambda_security_group_arn" {
  description = "ARN of the Lambda security group"
  value       = aws_security_group.lambda.arn
}

output "rds_security_group_id" {
  description = "ID of the RDS security group"
  value       = aws_security_group.rds.id
}

output "rds_security_group_arn" {
  description = "ARN of the RDS security group"
  value       = aws_security_group.rds.arn
}

output "vpc_endpoints_security_group_id" {
  description = "ID of the VPC endpoints security group"
  value       = aws_security_group.vpc_endpoints.id
}

output "bastion_security_group_id" {
  description = "ID of the bastion security group (if enabled)"
  value       = var.enable_bastion_sg ? aws_security_group.bastion[0].id : null
}

# Flow Logs Outputs
# ============================================================================

output "flow_logs_id" {
  description = "ID of the VPC flow log"
  value       = var.enable_flow_logs ? aws_flow_log.main[0].id : null
}

output "flow_logs_log_group_name" {
  description = "Name of the CloudWatch log group for flow logs"
  value       = var.enable_flow_logs ? aws_cloudwatch_log_group.flow_logs[0].name : null
}

output "flow_logs_log_group_arn" {
  description = "ARN of the CloudWatch log group for flow logs"
  value       = var.enable_flow_logs ? aws_cloudwatch_log_group.flow_logs[0].arn : null
}

# Availability Zone Outputs
# ============================================================================

output "availability_zones" {
  description = "List of availability zones used"
  value       = slice(data.aws_availability_zones.available.names, 0, var.az_count)
}

output "az_count" {
  description = "Number of availability zones used"
  value       = var.az_count
}

# Network Configuration Summary
# ============================================================================

output "network_summary" {
  description = "Summary of network configuration"
  value = {
    vpc_id              = aws_vpc.main.id
    vpc_cidr            = aws_vpc.main.cidr_block
    availability_zones  = slice(data.aws_availability_zones.available.names, 0, var.az_count)
    public_subnets      = length(aws_subnet.public)
    private_subnets     = length(aws_subnet.private)
    database_subnets    = length(aws_subnet.database)
    nat_gateway_enabled = var.enable_nat_gateway
    flow_logs_enabled   = var.enable_flow_logs
    vpc_endpoints_enabled = {
      s3             = true
      dynamodb       = true
      secretsmanager = var.enable_secretsmanager_endpoint
      ses            = var.enable_ses_endpoint
      lambda         = var.enable_lambda_endpoint
    }
  }
}
