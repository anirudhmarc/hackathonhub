# ============================================================================
# S3 + CloudFront Module Outputs
# ============================================================================

# S3 Bucket Outputs
output "admin_bucket_id" {
  description = "Admin portal S3 bucket ID"
  value       = aws_s3_bucket.admin_portal.id
}

output "admin_bucket_arn" {
  description = "Admin portal S3 bucket ARN"
  value       = aws_s3_bucket.admin_portal.arn
}

output "judge_bucket_id" {
  description = "Judge portal S3 bucket ID"
  value       = aws_s3_bucket.judge_portal.id
}

output "judge_bucket_arn" {
  description = "Judge portal S3 bucket ARN"
  value       = aws_s3_bucket.judge_portal.arn
}

output "participant_bucket_id" {
  description = "Participant portal S3 bucket ID"
  value       = aws_s3_bucket.participant_portal.id
}

output "participant_bucket_arn" {
  description = "Participant portal S3 bucket ARN"
  value       = aws_s3_bucket.participant_portal.arn
}

output "submissions_bucket_id" {
  description = "Submissions S3 bucket ID"
  value       = aws_s3_bucket.submissions.id
}

output "submissions_bucket_arn" {
  description = "Submissions S3 bucket ARN"
  value       = aws_s3_bucket.submissions.arn
}

# CloudFront Outputs
output "admin_cloudfront_id" {
  description = "Admin portal CloudFront distribution ID"
  value       = aws_cloudfront_distribution.admin_portal.id
}

output "admin_cloudfront_domain" {
  description = "Admin portal CloudFront domain name"
  value       = aws_cloudfront_distribution.admin_portal.domain_name
}

output "admin_cloudfront_url" {
  description = "Admin portal CloudFront URL"
  value       = "https://${aws_cloudfront_distribution.admin_portal.domain_name}"
}

output "judge_cloudfront_id" {
  description = "Judge portal CloudFront distribution ID"
  value       = aws_cloudfront_distribution.judge_portal.id
}

output "judge_cloudfront_domain" {
  description = "Judge portal CloudFront domain name"
  value       = aws_cloudfront_distribution.judge_portal.domain_name
}

output "judge_cloudfront_url" {
  description = "Judge portal CloudFront URL"
  value       = "https://${aws_cloudfront_distribution.judge_portal.domain_name}"
}

output "participant_cloudfront_id" {
  description = "Participant portal CloudFront distribution ID"
  value       = aws_cloudfront_distribution.participant_portal.id
}

output "participant_cloudfront_domain" {
  description = "Participant portal CloudFront domain name"
  value       = aws_cloudfront_distribution.participant_portal.domain_name
}

output "participant_cloudfront_url" {
  description = "Participant portal CloudFront URL"
  value       = "https://${aws_cloudfront_distribution.participant_portal.domain_name}"
}

# Summary Output
output "s3_cloudfront_summary" {
  description = "Summary of S3 and CloudFront configuration"
  value = {
    buckets = {
      admin       = aws_s3_bucket.admin_portal.id
      judge       = aws_s3_bucket.judge_portal.id
      participant = aws_s3_bucket.participant_portal.id
      submissions = aws_s3_bucket.submissions.id
    }
    cloudfront_urls = {
      admin       = "https://${aws_cloudfront_distribution.admin_portal.domain_name}"
      judge       = "https://${aws_cloudfront_distribution.judge_portal.domain_name}"
      participant = "https://${aws_cloudfront_distribution.participant_portal.domain_name}"
    }
  }
}


# Additional outputs for Lambda module
# ============================================================================

output "submissions_bucket_name" {
  description = "Submissions S3 bucket name"
  value       = aws_s3_bucket.submissions.id
}
