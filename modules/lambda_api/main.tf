# ============================================================================
# Lambda + API Gateway Module - Scalable Framework for 46 Functions
# ============================================================================

terraform {
  required_version = ">= 1.0"
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
    random = {
      source  = "hashicorp/random"
      version = "~> 3.0"
    }
  }
}

data "aws_region" "current" {}
data "aws_caller_identity" "current" {}

# ============================================================================
# IAM Roles and Policies for Lambda Execution
# ============================================================================

locals {
  lambda_groups = toset([for f in local.lambda_functions : f.group])
}

resource "aws_iam_role" "lambda_execution_roles" {
  for_each = local.lambda_groups

  name_prefix = "${var.project_name}-${var.environment}-${each.key}-"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Principal = {
          Service = "lambda.amazonaws.com"
        }
        Action = "sts:AssumeRole"
      }
    ]
  })

  tags = merge(
    var.common_tags,
    {
      Name        = "${var.project_name}-${var.environment}-lambda-${each.key}-role"
      Environment = var.environment
      Group       = each.key
    }
  )
}

resource "aws_iam_role_policy_attachment" "lambda_basic" {
  for_each = local.lambda_groups

  role       = aws_iam_role.lambda_execution_roles[each.key].name
  policy_arn = "arn:aws:iam::aws:policy/service-role/AWSLambdaBasicExecutionRole"
}

resource "aws_iam_role_policy_attachment" "lambda_vpc" {
  for_each = local.lambda_groups

  role       = aws_iam_role.lambda_execution_roles[each.key].name
  policy_arn = "arn:aws:iam::aws:policy/service-role/AWSLambdaVPCAccessExecutionRole"
}

resource "aws_iam_role_policy" "lambda_custom_policies" {
  for_each = local.lambda_groups

  name_prefix = "${var.project_name}-${var.environment}-lambda-${each.key}-"
  role        = aws_iam_role.lambda_execution_roles[each.key].id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = distinct(flatten([
      for f in local.lambda_functions : [
        for p in f.permissions : {
          Effect   = "Allow"
          Action   = local.permission_map[p].actions
          Resource = local.permission_map[p].resources
        } if f.group == each.key
      ]
    ]))
  })
}

locals {
  permission_map = {
    "dynamodb" = {
      actions = [
        "dynamodb:GetItem",
        "dynamodb:PutItem",
        "dynamodb:UpdateItem",
        "dynamodb:DeleteItem",
        "dynamodb:Query",
        "dynamodb:Scan"
      ]
      resources = [
        var.dynamodb_table_arn,
        "${var.dynamodb_table_arn}/index/*"
      ]
    }
    "s3" = {
      actions = [
        "s3:GetObject",
        "s3:PutObject",
        "s3:DeleteObject",
        "s3:ListBucket"
      ]
      resources = [
        var.submissions_bucket_arn,
        "${var.submissions_bucket_arn}/*"
      ]
    }
    "secretsmanager" = {
      actions = [
        "secretsmanager:GetSecretValue"
      ]
      resources = [var.rds_secret_arn]
    }
    "ses" = {
      actions = [
        "ses:SendEmail",
        "ses:SendRawEmail"
      ]
      resources = ["*"]
    }
    "cognito-idp" = {
      actions = [
        "cognito-idp:AdminGetUser",
        "cognito-idp:AdminCreateUser",
        "cognito-idp:AdminDeleteUser",
        "cognito-idp:AdminUpdateUserAttributes",
        "cognito-idp:AdminAddUserToGroup",
        "cognito-idp:ListUsers"
      ]
      resources = [var.cognito_user_pool_arn]
    }
  }
}


# ============================================================================
# Lambda Functions (Dynamic Creation from Map)
# ============================================================================

resource "aws_lambda_function" "functions" {
  for_each = local.lambda_functions

  function_name = "${var.project_name}-${var.environment}-${each.key}"
  role          = aws_iam_role.lambda_execution_roles[each.value.group].arn
  handler       = each.value.handler
  runtime       = each.value.runtime
  timeout       = each.value.timeout
  memory_size   = each.value.memory_size

  filename         = "${path.root}/${var.lambda_code_path}/${each.value.filename}"
  source_code_hash = filebase64sha256("${path.root}/${var.lambda_code_path}/${each.value.filename}")

  # VPC Configuration (if enabled)
  dynamic "vpc_config" {
    for_each = each.value.vpc_enabled ? [1] : []
    content {
      subnet_ids         = var.private_subnet_ids
      security_group_ids = [var.lambda_security_group_id]
    }
  }

  # Environment Variables
  environment {
    variables = merge(
      local.common_lambda_env,
      each.value.environment_vars
    )
  }

  tags = merge(
    var.common_tags,
    {
      Name        = "${var.project_name}-${var.environment}-${each.key}"
      Environment = var.environment
      Function    = each.key
    }
  )
}

# Lambda CloudWatch Log Groups
resource "aws_cloudwatch_log_group" "lambda_logs" {
  for_each = local.lambda_functions

  name              = "/aws/lambda/${aws_lambda_function.functions[each.key].function_name}"
  retention_in_days = var.log_retention_days

  tags = var.common_tags
}


# ============================================================================
# API Gateway REST API
# ============================================================================

resource "aws_api_gateway_rest_api" "main" {
  name        = "${var.project_name}-${var.environment}-api"
  description = "HackHub API Gateway"

  endpoint_configuration {
    types = ["REGIONAL"]
  }

  tags = merge(
    var.common_tags,
    {
      Name        = "${var.project_name}-${var.environment}-api"
      Environment = var.environment
    }
  )
}

# Cognito Authorizer
resource "aws_api_gateway_authorizer" "cognito" {
  name            = "${var.project_name}-${var.environment}-cognito-auth"
  rest_api_id     = aws_api_gateway_rest_api.main.id
  type            = "COGNITO_USER_POOLS"
  provider_arns   = [var.cognito_user_pool_arn]
  identity_source = "method.request.header.Authorization"
}

# API Gateway Deployment
resource "aws_api_gateway_deployment" "main" {
  rest_api_id = aws_api_gateway_rest_api.main.id

  triggers = {
    redeployment = sha1(jsonencode([
      aws_api_gateway_rest_api.main.body,
      aws_api_gateway_rest_api.main.root_resource_id,
    ]))
  }

  lifecycle {
    create_before_destroy = true
  }

  depends_on = [
    aws_api_gateway_integration.lambda_integrations,
    aws_api_gateway_integration.options,
  ]
}

# API Gateway Stage
resource "aws_api_gateway_stage" "prod" {
  deployment_id = aws_api_gateway_deployment.main.id
  rest_api_id   = aws_api_gateway_rest_api.main.id
  stage_name    = "prod"

  xray_tracing_enabled = var.enable_xray_tracing

  access_log_settings {
    destination_arn = aws_cloudwatch_log_group.api_gateway.arn
    format = jsonencode({
      requestId      = "$context.requestId"
      ip             = "$context.identity.sourceIp"
      caller         = "$context.identity.caller"
      user           = "$context.identity.user"
      requestTime    = "$context.requestTime"
      httpMethod     = "$context.httpMethod"
      resourcePath   = "$context.resourcePath"
      status         = "$context.status"
      protocol       = "$context.protocol"
      responseLength = "$context.responseLength"
    })
  }

  tags = merge(
    var.common_tags,
    {
      Name        = "${var.project_name}-${var.environment}-api-stage"
      Environment = var.environment
    }
  )
}

# CloudWatch Log Group for API Gateway
resource "aws_cloudwatch_log_group" "api_gateway" {
  name              = "/aws/apigateway/${var.project_name}-${var.environment}"
  retention_in_days = var.log_retention_days

  tags = var.common_tags
}

# API Gateway Account (for CloudWatch logging)
resource "aws_api_gateway_account" "main" {
  cloudwatch_role_arn = aws_iam_role.api_gateway_cloudwatch.arn
}

resource "aws_iam_role" "api_gateway_cloudwatch" {
  name_prefix = "${var.project_name}-${var.environment}-apigw-cw-"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Principal = {
          Service = "apigateway.amazonaws.com"
        }
        Action = "sts:AssumeRole"
      }
    ]
  })

  tags = var.common_tags
}

resource "aws_iam_role_policy_attachment" "api_gateway_cloudwatch" {
  role       = aws_iam_role.api_gateway_cloudwatch.name
  policy_arn = "arn:aws:iam::aws:policy/service-role/AmazonAPIGatewayPushToCloudWatchLogs"
}
