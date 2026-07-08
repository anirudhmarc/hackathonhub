resource "null_resource" "deploy" {
  triggers = {
    repo_path = var.repo_path
    # Rebuild whenever the app source changes. A hash over the tracked source files
    # (src/ + public/ + index.html, excluding node_modules / dist) means
    # `terraform apply` re-runs build + sync on edits. fileset() does not support
    # brace expansion, so the source globs are unioned explicitly.
    src_hash = sha1(join("", [
      for f in sort(setunion(
        fileset(var.repo_path, "src/**"),
        fileset(var.repo_path, "public/**"),
        fileset(var.repo_path, "index.html"),
      )) : filesha1("${var.repo_path}/${f}")
    ]))
    config_hash = sha1(join(",", [
      var.api_gateway_url, var.cognito_user_pool_id, var.cognito_client_id,
      var.cognito_auth_domain, var.cloudfront_url, var.aws_region,
      var.app_name, tostring(var.show_score), tostring(var.enable_scoring_datetime_control),
      var.scoring_start_date, var.scoring_end_date, var.scoring_lock_date
    ]))
  }

  provisioner "local-exec" {
    command = <<-EOT
      cd ${var.repo_path}

      cat > .env << 'EOF'
VITE_APP_NAME=${var.app_name}
VITE_API_URL=${var.api_gateway_url}
VITE_ADMIN_COGNITO_AUTHORITY=https://cognito-idp.${var.aws_region}.amazonaws.com/${var.cognito_user_pool_id}
VITE_ADMIN_COGNITO_CLIENT_ID=${var.cognito_client_id}
VITE_ADMIN_COGNITO_REDIRECT_URI=${var.cloudfront_url}/callback
VITE_ADMIN_COGNITO_LOGOUT_URI=${var.cloudfront_url}
VITE_ADMIN_COGNITO_AUTH_DOMAIN=${var.cognito_auth_domain}
VITE_COGNITO_AUTHORITY=https://cognito-idp.${var.aws_region}.amazonaws.com/${var.cognito_user_pool_id}
VITE_COGNITO_CLIENT_ID=${var.cognito_client_id}
VITE_COGNITO_DOMAIN=${var.cognito_auth_domain}
VITE_S3_BUCKET_NAME=${var.s3_bucket_name}
VITE_AWS_REGION=${var.aws_region}
VITE_SHOW_SCORE=${var.show_score ? 1 : 0}
# Judge scoring window controls. Participant/problem/submission dates are now
# per-hackathon data served by the API, so those VITE_*_DATE vars were removed.
VITE_ENABLE_SCORING_DATETIME_CONTROL=${var.enable_scoring_datetime_control ? 1 : 0}
VITE_SCORING_START_DATE="${var.scoring_start_date}"
VITE_SCORING_END_DATE="${var.scoring_end_date}"
VITE_SCORING_LOCK_DATE="${var.scoring_lock_date}"
EOF

      npm install
      npm run build
      aws s3 sync dist/ "s3://${var.s3_bucket_name}/" --delete
      ${var.cloudfront_distribution_id != "" ? "aws cloudfront create-invalidation --distribution-id ${var.cloudfront_distribution_id} --paths \"/*\"" : "echo 'No CloudFront distribution id provided; skipping invalidation'"}
    EOT
  }
}
