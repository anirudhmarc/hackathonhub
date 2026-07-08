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

variable "cloudfront_distribution_id" {
  description = "CloudFront distribution ID, used to invalidate the cache after deploy."
  type        = string
  default     = ""
}

# ---------------------------------------------------------------------------
# App configuration (baked into the frontend build via VITE_* env)
# ---------------------------------------------------------------------------

variable "app_name" {
  description = "Display name shown in the frontends (VITE_APP_NAME)."
  type        = string
  default     = "AWS Hackathon"
}

variable "show_score" {
  description = "Whether judges' scores are shown in the UI (VITE_SHOW_SCORE)."
  type        = bool
  default     = false
}

variable "enable_scoring_datetime_control" {
  description = "Enable the judge scoring open/lock window (VITE_ENABLE_SCORING_DATETIME_CONTROL)."
  type        = bool
  default     = true
}

variable "scoring_start_date" {
  description = "Judge scoring window start (ISO-8601 with offset), VITE_SCORING_START_DATE."
  type        = string
  default     = ""
}

variable "scoring_end_date" {
  description = "Judge scoring window end (ISO-8601 with offset), VITE_SCORING_END_DATE."
  type        = string
  default     = ""
}

variable "scoring_lock_date" {
  description = "Judge scoring lock time (ISO-8601 with offset), VITE_SCORING_LOCK_DATE."
  type        = string
  default     = ""
}
