module "hackhub_public" {
  source = "./modules/frontend"

  # repository_url is optional - uses local directory if it exists
  repository_url             = ""
  repo_path                  = "frontends/hackerhub-hackhub-public"
  s3_bucket_name             = module.s3_cloudfront.s3_cloudfront_summary.buckets.participant
  cognito_user_pool_id       = module.cognito.user_pool_id
  cognito_client_id          = module.cognito.client_id
  cognito_auth_domain        = module.cognito.user_pool_domain_url
  api_gateway_url            = module.lambda_api.api_gateway_url
  aws_region                 = data.aws_region.current.name
  cloudfront_url             = module.s3_cloudfront.s3_cloudfront_summary.cloudfront_urls.participant
  cloudfront_distribution_id = module.s3_cloudfront.participant_cloudfront_id

  # App configuration
  app_name                        = var.app_name
  show_score                      = var.show_score
  enable_scoring_datetime_control = var.enable_scoring_datetime_control
  scoring_start_date              = var.scoring_start_date
  scoring_end_date                = var.scoring_end_date
  scoring_lock_date               = var.scoring_lock_date
}

module "judge_public" {
  source = "./modules/frontend"

  # repository_url is optional - uses local directory if it exists
  repository_url             = ""
  repo_path                  = "frontends/hackerhub-judge-public"
  s3_bucket_name             = module.s3_cloudfront.s3_cloudfront_summary.buckets.judge
  cognito_user_pool_id       = module.cognito.user_pool_id
  cognito_client_id          = module.cognito.client_id
  cognito_auth_domain        = module.cognito.user_pool_domain_url
  api_gateway_url            = module.lambda_api.api_gateway_url
  aws_region                 = data.aws_region.current.name
  cloudfront_url             = module.s3_cloudfront.s3_cloudfront_summary.cloudfront_urls.judge
  cloudfront_distribution_id = module.s3_cloudfront.judge_cloudfront_id

  # App configuration
  app_name                        = var.app_name
  show_score                      = var.show_score
  enable_scoring_datetime_control = var.enable_scoring_datetime_control
  scoring_start_date              = var.scoring_start_date
  scoring_end_date                = var.scoring_end_date
  scoring_lock_date               = var.scoring_lock_date
}

module "admin_public" {
  source = "./modules/frontend"

  # repository_url is optional - uses local directory if it exists
  repository_url             = ""
  repo_path                  = "frontends/hackerhub-admin-public"
  s3_bucket_name             = module.s3_cloudfront.s3_cloudfront_summary.buckets.admin
  cognito_user_pool_id       = module.cognito.user_pool_id
  cognito_client_id          = module.cognito.client_id
  cognito_auth_domain        = module.cognito.user_pool_domain_url
  api_gateway_url            = module.lambda_api.api_gateway_url
  aws_region                 = data.aws_region.current.name
  cloudfront_url             = module.s3_cloudfront.s3_cloudfront_summary.cloudfront_urls.admin
  cloudfront_distribution_id = module.s3_cloudfront.admin_cloudfront_id

  # App configuration
  app_name                        = var.app_name
  show_score                      = var.show_score
  enable_scoring_datetime_control = var.enable_scoring_datetime_control
  scoring_start_date              = var.scoring_start_date
  scoring_end_date                = var.scoring_end_date
  scoring_lock_date               = var.scoring_lock_date
}
