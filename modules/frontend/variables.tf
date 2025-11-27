variable "repository_url" {
  description = "The URL of the frontend repository (optional - only used if repo_path doesn't exist)."
  type        = string
  default     = ""
}

variable "repo_path" {
  description = "The path to the cloned repository."
  type        = string
}

variable "s3_bucket_name" {
  description = "The name of the S3 bucket to deploy the frontend to."
  type        = string
}

variable "cognito_user_pool_id" {
  description = "The ID of the Cognito user pool."
  type        = string
}

variable "cognito_client_id" {
  description = "The ID of the Cognito client."
  type        = string
}

variable "cognito_auth_domain" {
  description = "The domain of the Cognito user pool."
  type        = string
}

variable "api_gateway_url" {
  description = "The URL of the API Gateway."
  type        = string
}

variable "aws_region" {
  description = "The AWS region."
  type        = string
}

variable "cloudfront_url" {
  description = "The URL of the CloudFront distribution."
  type        = string
}
