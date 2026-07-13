# ============================================================================
# Lambda + API Gateway Module Outputs
# ============================================================================

# API Gateway Outputs
output "api_gateway_id" {
  description = "API Gateway REST API ID"
  value       = aws_api_gateway_rest_api.main.id
}

output "api_gateway_arn" {
  description = "API Gateway REST API ARN"
  value       = aws_api_gateway_rest_api.main.arn
}

output "api_gateway_url" {
  description = "API Gateway invoke URL"
  value       = "https://${aws_api_gateway_rest_api.main.id}.execute-api.${data.aws_region.current.name}.amazonaws.com/${aws_api_gateway_stage.prod.stage_name}"
}

output "api_gateway_stage_name" {
  description = "API Gateway stage name"
  value       = aws_api_gateway_stage.prod.stage_name
}

# Lambda Outputs
output "lambda_function_arns" {
  description = "Map of Lambda function ARNs"
  value       = { for k, v in aws_lambda_function.functions : k => v.arn }
}

output "lambda_function_names" {
  description = "Map of Lambda function names"
  value       = { for k, v in aws_lambda_function.functions : k => v.function_name }
}

output "lambda_execution_role_arns" {
  description = "Map of Lambda execution role ARNs by group"
  value       = { for group, role in aws_iam_role.lambda_execution_roles : group => role.arn }
}

# Authorizer Output
output "cognito_authorizer_id" {
  description = "Cognito authorizer ID"
  value       = aws_api_gateway_authorizer.cognito.id
}

# Summary Output
output "lambda_api_summary" {
  description = "Summary of Lambda and API Gateway resources"
  value = {
    api_url           = "https://${aws_api_gateway_rest_api.main.id}.execute-api.${data.aws_region.current.name}.amazonaws.com/${aws_api_gateway_stage.prod.stage_name}"
    lambda_count      = length(local.lambda_functions)
    functions_created = keys(aws_lambda_function.functions)
  }
}
