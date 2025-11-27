resource "null_resource" "deploy" {
  triggers = {
    repo_path = var.repo_path
  }

  provisioner "local-exec" {
    command = <<-EOT
      cd ${var.repo_path}
      
      cat > .env << 'EOF'
VITE_API_URL=${var.api_gateway_url}
VITE_ADMIN_COGNITO_AUTHORITY=https://cognito-idp.${var.aws_region}.amazonaws.com/${var.cognito_user_pool_id}
VITE_ADMIN_COGNITO_CLIENT_ID=${var.cognito_client_id}
VITE_ADMIN_COGNITO_REDIRECT_URI=${var.cloudfront_url}/callback
VITE_ADMIN_COGNITO_LOGOUT_URI=${var.cloudfront_url}
VITE_ADMIN_COGNITO_AUTH_DOMAIN=${var.cognito_auth_domain}
VITE_S3_BUCKET_NAME=${var.s3_bucket_name}
VITE_AWS_REGION=${var.aws_region}
VITE_PROBLEMS_START_DATE="2025-09-15T09:00:00+08:00"
VITE_PROBLEMS_SELECTION_DATE="2025-09-15T15:00:00+08:00"
VITE_PROBLEMS_SELECTION_END_DATE="2025-09-20T23:59:00+08:00"
VITE_HACKATHON_START_DATE="2025-09-20T09:00:00+08:00"
VITE_SUBMISSION_START_DATE="2025-09-20T09:00:00+08:00"
VITE_SUBMISSION_END_DATE="2026-12-31T23:59:00+08:00"
VITE_FEEDBACK_RELEASE_DATE="2025-09-26T21:00:00+08:00"
VITE_FINALISTS_ANNOUNCEMENT_DATE="2025-09-26T21:00:00+08:00"
VITE_WINNERS_ANNOUNCEMENT_DATE="2025-10-12T00:00:00+08:00"
VITE_SHOW_SCORE=0
VITE_FINAL_SUBMISSION_START_DATE="2025-10-07T09:00:00+08:00"
VITE_FINAL_SUBMISSION_END_DATE="2026-12-31T23:59:00+08:00"
EOF
      
      npm install
      npm run build
      aws s3 sync dist/ "s3://${var.s3_bucket_name}/" --delete
    EOT
  }
}

