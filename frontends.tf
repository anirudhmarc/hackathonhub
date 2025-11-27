module "hackhub_public" {
  source = "./modules/frontend"

  # repository_url is optional - uses local directory if it exists
  repository_url       = ""
  repo_path            = "frontends/greataihackaton-hackhub-public"
  s3_bucket_name       = module.s3_cloudfront.s3_cloudfront_summary.buckets.participant
  cognito_user_pool_id = module.cognito.user_pool_id
  cognito_client_id    = module.cognito.client_id
  cognito_auth_domain  = module.cognito.user_pool_domain_url
  api_gateway_url      = module.lambda_api.api_gateway_url
  aws_region           = data.aws_region.current.name
  cloudfront_url       = module.s3_cloudfront.s3_cloudfront_summary.cloudfront_urls.participant
}

module "judge_public" {
  source = "./modules/frontend"

  # repository_url is optional - uses local directory if it exists
  repository_url       = ""
  repo_path            = "frontends/greataihackaton-judge-public"
  s3_bucket_name       = module.s3_cloudfront.s3_cloudfront_summary.buckets.judge
  cognito_user_pool_id = module.cognito.user_pool_id
  cognito_client_id    = module.cognito.client_id
  cognito_auth_domain  = module.cognito.user_pool_domain_url
  api_gateway_url      = module.lambda_api.api_gateway_url
  aws_region           = data.aws_region.current.name
  cloudfront_url       = module.s3_cloudfront.s3_cloudfront_summary.cloudfront_urls.judge
}

module "admin_public" {
  source = "./modules/frontend"

  # repository_url is optional - uses local directory if it exists
  repository_url       = ""
  repo_path            = "frontends/greataihackaton-admin-public"
  s3_bucket_name       = module.s3_cloudfront.s3_cloudfront_summary.buckets.admin
  cognito_user_pool_id = module.cognito.user_pool_id
  cognito_client_id    = module.cognito.client_id
  cognito_auth_domain  = module.cognito.user_pool_domain_url
  api_gateway_url      = module.lambda_api.api_gateway_url
  aws_region           = data.aws_region.current.name
  cloudfront_url       = module.s3_cloudfront.s3_cloudfront_summary.cloudfront_urls.admin
}
