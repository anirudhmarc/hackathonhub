# ============================================================================
# API Gateway Methods and Lambda Integrations
# ============================================================================
# This file creates methods and Lambda integrations for all API routes
# ============================================================================

# Create a map for method/integration pairs
locals {
  # Parse route definitions into structured data
  parsed_routes = {
    for route_key, lambda_name in local.api_routes : route_key => {
      method      = split(":", route_key)[0]
      path        = split(":", route_key)[1]
      lambda      = lambda_name
      resource_id = local.resource_map[split(":", route_key)[1]]
    }
  }
}

# API Gateway Method
resource "aws_api_gateway_method" "methods" {
  for_each = local.parsed_routes

  rest_api_id   = aws_api_gateway_rest_api.main.id
  resource_id   = each.value.resource_id
  http_method   = each.value.method
  authorization = "COGNITO_USER_POOLS"
  authorizer_id = aws_api_gateway_authorizer.cognito.id

  request_parameters = {
    "method.request.header.Authorization" = true
  }
}

# Lambda Integration
resource "aws_api_gateway_integration" "lambda_integrations" {
  for_each = local.parsed_routes

  rest_api_id = aws_api_gateway_rest_api.main.id
  resource_id = each.value.resource_id
  http_method = aws_api_gateway_method.methods[each.key].http_method

  integration_http_method = "POST"
  type                    = "AWS_PROXY"
  uri                     = aws_lambda_function.functions[each.value.lambda].invoke_arn
}

resource "random_id" "lambda_permission" {
  for_each = local.parsed_routes

  byte_length = 8
}

# Lambda Permission for API Gateway
resource "aws_lambda_permission" "api_gateway" {
  for_each = local.parsed_routes

  statement_id  = "AllowAPIGatewayInvoke-${each.value.lambda}-${each.value.method}-${random_id.lambda_permission[each.key].hex}"
  action        = "lambda:InvokeFunction"
  function_name = aws_lambda_function.functions[each.value.lambda].function_name
  principal     = "apigateway.amazonaws.com"
  source_arn    = "${aws_api_gateway_rest_api.main.execution_arn}/*/*"
}

# CORS OPTIONS methods
resource "aws_api_gateway_method" "options" {
  for_each = local.resource_map

  rest_api_id   = aws_api_gateway_rest_api.main.id
  resource_id   = each.value
  http_method   = "OPTIONS"
  authorization = "NONE"
}

resource "aws_api_gateway_integration" "options" {
  for_each = local.resource_map

  rest_api_id = aws_api_gateway_rest_api.main.id
  resource_id = each.value
  http_method = aws_api_gateway_method.options[each.key].http_method
  type        = "MOCK"

  request_templates = {
    "application/json" = "{\"statusCode\": 200}"
  }
}

resource "aws_api_gateway_method_response" "options" {
  for_each = local.resource_map

  rest_api_id = aws_api_gateway_rest_api.main.id
  resource_id = each.value
  http_method = aws_api_gateway_method.options[each.key].http_method
  status_code = "200"

  response_parameters = {
    "method.response.header.Access-Control-Allow-Headers" = true
    "method.response.header.Access-Control-Allow-Methods" = true
    "method.response.header.Access-Control-Allow-Origin"  = true
  }

  response_models = {
    "application/json" = "Empty"
  }
}

resource "aws_api_gateway_integration_response" "options" {
  for_each = local.resource_map

  rest_api_id = aws_api_gateway_rest_api.main.id
  resource_id = each.value
  http_method = aws_api_gateway_method.options[each.key].http_method
  status_code = aws_api_gateway_method_response.options[each.key].status_code

  response_parameters = {
    "method.response.header.Access-Control-Allow-Headers" = "'Content-Type,X-Amz-Date,Authorization,X-Api-Key,X-Amz-Security-Token'"
    "method.response.header.Access-Control-Allow-Methods" = "'GET,POST,PUT,DELETE,OPTIONS'"
    "method.response.header.Access-Control-Allow-Origin"  = "'*'"
  }

  depends_on = [aws_api_gateway_integration.options]
}
