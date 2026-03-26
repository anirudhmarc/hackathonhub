# ============================================================================
# S3 + CloudFront Module - Static Website Hosting
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
      version = "~> 3.5"
    }
  }
}

# Random suffix for unique bucket names
resource "random_string" "suffix" {
  length  = 8
  special = false
  upper   = false
}

# ============================================================================
# S3 Buckets for Static Websites
# ============================================================================

# Admin Portal Bucket
resource "aws_s3_bucket" "admin_portal" {
  bucket = "${var.project_name}-${var.environment}-admin-${random_string.suffix.result}"

  tags = merge(
    var.common_tags,
    {
      Name        = "${var.project_name}-${var.environment}-admin-portal"
      Purpose     = "Admin portal static website"
      Environment = var.environment
    }
  )
}

# Judge Portal Bucket
resource "aws_s3_bucket" "judge_portal" {
  bucket = "${var.project_name}-${var.environment}-judge-${random_string.suffix.result}"

  tags = merge(
    var.common_tags,
    {
      Name        = "${var.project_name}-${var.environment}-judge-portal"
      Purpose     = "Judge portal static website"
      Environment = var.environment
    }
  )
}

# Participant Portal Bucket
resource "aws_s3_bucket" "participant_portal" {
  bucket = "${var.project_name}-${var.environment}-participant-${random_string.suffix.result}"

  tags = merge(
    var.common_tags,
    {
      Name        = "${var.project_name}-${var.environment}-participant-portal"
      Purpose     = "Participant portal static website"
      Environment = var.environment
    }
  )
}

# Submissions Bucket
resource "aws_s3_bucket" "submissions" {
  bucket = "${var.project_name}-${var.environment}-submissions-${random_string.suffix.result}"

  tags = merge(
    var.common_tags,
    {
      Name        = "${var.project_name}-${var.environment}-submissions"
      Purpose     = "Team submission files"
      Environment = var.environment
    }
  )
}


# ============================================================================
# S3 Bucket Configurations - Versioning
# ============================================================================

resource "aws_s3_bucket_versioning" "admin_portal" {
  bucket = aws_s3_bucket.admin_portal.id
  versioning_configuration {
    status = "Enabled"
  }
}

resource "aws_s3_bucket_versioning" "judge_portal" {
  bucket = aws_s3_bucket.judge_portal.id
  versioning_configuration {
    status = "Enabled"
  }
}

resource "aws_s3_bucket_versioning" "participant_portal" {
  bucket = aws_s3_bucket.participant_portal.id
  versioning_configuration {
    status = "Enabled"
  }
}

resource "aws_s3_bucket_versioning" "submissions" {
  bucket = aws_s3_bucket.submissions.id
  versioning_configuration {
    status = "Enabled"
  }
}

# ============================================================================
# S3 Bucket Configurations - Encryption
# ============================================================================

resource "aws_s3_bucket_server_side_encryption_configuration" "admin_portal" {
  bucket = aws_s3_bucket.admin_portal.id
  rule {
    apply_server_side_encryption_by_default {
      sse_algorithm = "AES256"
    }
  }
}

resource "aws_s3_bucket_server_side_encryption_configuration" "judge_portal" {
  bucket = aws_s3_bucket.judge_portal.id
  rule {
    apply_server_side_encryption_by_default {
      sse_algorithm = "AES256"
    }
  }
}

resource "aws_s3_bucket_server_side_encryption_configuration" "participant_portal" {
  bucket = aws_s3_bucket.participant_portal.id
  rule {
    apply_server_side_encryption_by_default {
      sse_algorithm = "AES256"
    }
  }
}

resource "aws_s3_bucket_server_side_encryption_configuration" "submissions" {
  bucket = aws_s3_bucket.submissions.id
  rule {
    apply_server_side_encryption_by_default {
      sse_algorithm = "AES256"
    }
  }
}

# ============================================================================
# S3 Bucket Configurations - Public Access Block
# ============================================================================

resource "aws_s3_bucket_public_access_block" "admin_portal" {
  bucket                  = aws_s3_bucket.admin_portal.id
  block_public_acls       = true
  block_public_policy     = true
  ignore_public_acls      = true
  restrict_public_buckets = true
}

resource "aws_s3_bucket_public_access_block" "judge_portal" {
  bucket                  = aws_s3_bucket.judge_portal.id
  block_public_acls       = true
  block_public_policy     = true
  ignore_public_acls      = true
  restrict_public_buckets = true
}

resource "aws_s3_bucket_public_access_block" "participant_portal" {
  bucket                  = aws_s3_bucket.participant_portal.id
  block_public_acls       = true
  block_public_policy     = true
  ignore_public_acls      = true
  restrict_public_buckets = true
}

resource "aws_s3_bucket_public_access_block" "submissions" {
  bucket                  = aws_s3_bucket.submissions.id
  block_public_acls       = true
  block_public_policy     = true
  ignore_public_acls      = true
  restrict_public_buckets = true
}


# ============================================================================
# S3 Bucket Configurations - Website & CORS
# ============================================================================

# Website configurations for portals
resource "aws_s3_bucket_website_configuration" "admin_portal" {
  bucket = aws_s3_bucket.admin_portal.id
  index_document {
    suffix = "index.html"
  }
  error_document {
    key = "index.html"
  }
}

resource "aws_s3_bucket_website_configuration" "judge_portal" {
  bucket = aws_s3_bucket.judge_portal.id
  index_document {
    suffix = "index.html"
  }
  error_document {
    key = "index.html"
  }
}

resource "aws_s3_bucket_website_configuration" "participant_portal" {
  bucket = aws_s3_bucket.participant_portal.id
  index_document {
    suffix = "index.html"
  }
  error_document {
    key = "index.html"
  }
}

# CORS for submissions bucket
resource "aws_s3_bucket_cors_configuration" "submissions" {
  bucket = aws_s3_bucket.submissions.id

  cors_rule {
    allowed_headers = ["*"]
    allowed_methods = ["GET", "PUT", "POST", "DELETE", "HEAD"]
    allowed_origins = var.cors_allowed_origins
    expose_headers  = ["ETag"]
    max_age_seconds = 3000
  }
}

# ============================================================================
# CloudFront Origin Access Control
# ============================================================================

resource "aws_cloudfront_origin_access_control" "portals" {
  name                              = "${var.project_name}-${var.environment}-oac"
  description                       = "OAC for portal S3 buckets"
  origin_access_control_origin_type = "s3"
  signing_behavior                  = "always"
  signing_protocol                  = "sigv4"
}


# ============================================================================
# CloudFront Response Headers Policy (Security)
# ============================================================================

resource "aws_cloudfront_response_headers_policy" "security_headers" {
  name    = "${var.project_name}-${var.environment}-security-headers"
  comment = "Security headers for all portal distributions"

  security_headers_config {
    content_type_options {
      override = true
    }
    frame_options {
      frame_option = "DENY"
      override     = true
    }
    referrer_policy {
      referrer_policy = "strict-origin-when-cross-origin"
      override        = true
    }
    strict_transport_security {
      access_control_max_age_sec = 31536000
      include_subdomains         = true
      override                   = true
    }
    xss_protection {
      mode_block = true
      protection = true
      override   = true
    }
  }
}

# ============================================================================
# CloudFront Distributions
# ============================================================================

# Admin Portal CloudFront
resource "aws_cloudfront_distribution" "admin_portal" {
  enabled             = true
  is_ipv6_enabled     = true
  comment             = "${var.project_name} ${var.environment} Admin Portal"
  default_root_object = "index.html"
  price_class         = var.cloudfront_price_class

  origin {
    domain_name              = aws_s3_bucket.admin_portal.bucket_regional_domain_name
    origin_id                = "S3-${aws_s3_bucket.admin_portal.id}"
    origin_access_control_id = aws_cloudfront_origin_access_control.portals.id
  }

  default_cache_behavior {
    allowed_methods        = ["GET", "HEAD", "OPTIONS"]
    cached_methods         = ["GET", "HEAD", "OPTIONS"]
    target_origin_id           = "S3-${aws_s3_bucket.admin_portal.id}"
    viewer_protocol_policy     = "redirect-to-https"
    response_headers_policy_id = aws_cloudfront_response_headers_policy.security_headers.id
    compress                   = true
    min_ttl                = 0
    default_ttl            = 3600
    max_ttl                = 86400

    forwarded_values {
      query_string = false
      cookies {
        forward = "none"
      }
    }
  }

  custom_error_response {
    error_code         = 403
    response_code      = 200
    response_page_path = "/index.html"
  }

  custom_error_response {
    error_code         = 404
    response_code      = 200
    response_page_path = "/index.html"
  }

  restrictions {
    geo_restriction {
      restriction_type = "none"
    }
  }

  viewer_certificate {
    cloudfront_default_certificate = true
    minimum_protocol_version       = "TLSv1.2_2021"
  }

  tags = merge(
    var.common_tags,
    {
      Name        = "${var.project_name}-${var.environment}-admin-cdn"
      Environment = var.environment
    }
  )
}

# Judge Portal CloudFront
resource "aws_cloudfront_distribution" "judge_portal" {
  enabled             = true
  is_ipv6_enabled     = true
  comment             = "${var.project_name} ${var.environment} Judge Portal"
  default_root_object = "index.html"
  price_class         = var.cloudfront_price_class

  origin {
    domain_name              = aws_s3_bucket.judge_portal.bucket_regional_domain_name
    origin_id                = "S3-${aws_s3_bucket.judge_portal.id}"
    origin_access_control_id = aws_cloudfront_origin_access_control.portals.id
  }

  default_cache_behavior {
    allowed_methods        = ["GET", "HEAD", "OPTIONS"]
    cached_methods         = ["GET", "HEAD", "OPTIONS"]
    target_origin_id           = "S3-${aws_s3_bucket.judge_portal.id}"
    viewer_protocol_policy     = "redirect-to-https"
    response_headers_policy_id = aws_cloudfront_response_headers_policy.security_headers.id
    compress                   = true
    min_ttl                = 0
    default_ttl            = 3600
    max_ttl                = 86400

    forwarded_values {
      query_string = false
      cookies {
        forward = "none"
      }
    }
  }

  custom_error_response {
    error_code         = 403
    response_code      = 200
    response_page_path = "/index.html"
  }

  custom_error_response {
    error_code         = 404
    response_code      = 200
    response_page_path = "/index.html"
  }

  restrictions {
    geo_restriction {
      restriction_type = "none"
    }
  }

  viewer_certificate {
    cloudfront_default_certificate = true
    minimum_protocol_version       = "TLSv1.2_2021"
  }

  tags = merge(
    var.common_tags,
    {
      Name        = "${var.project_name}-${var.environment}-judge-cdn"
      Environment = var.environment
    }
  )
}

# Participant Portal CloudFront
resource "aws_cloudfront_distribution" "participant_portal" {
  enabled             = true
  is_ipv6_enabled     = true
  comment             = "${var.project_name} ${var.environment} Participant Portal"
  default_root_object = "index.html"
  price_class         = var.cloudfront_price_class

  origin {
    domain_name              = aws_s3_bucket.participant_portal.bucket_regional_domain_name
    origin_id                = "S3-${aws_s3_bucket.participant_portal.id}"
    origin_access_control_id = aws_cloudfront_origin_access_control.portals.id
  }

  default_cache_behavior {
    allowed_methods        = ["GET", "HEAD", "OPTIONS"]
    cached_methods         = ["GET", "HEAD", "OPTIONS"]
    target_origin_id           = "S3-${aws_s3_bucket.participant_portal.id}"
    viewer_protocol_policy     = "redirect-to-https"
    response_headers_policy_id = aws_cloudfront_response_headers_policy.security_headers.id
    compress                   = true
    min_ttl                = 0
    default_ttl            = 3600
    max_ttl                = 86400

    forwarded_values {
      query_string = false
      cookies {
        forward = "none"
      }
    }
  }

  custom_error_response {
    error_code         = 403
    response_code      = 200
    response_page_path = "/index.html"
  }

  custom_error_response {
    error_code         = 404
    response_code      = 200
    response_page_path = "/index.html"
  }

  restrictions {
    geo_restriction {
      restriction_type = "none"
    }
  }

  viewer_certificate {
    cloudfront_default_certificate = true
    minimum_protocol_version       = "TLSv1.2_2021"
  }

  tags = merge(
    var.common_tags,
    {
      Name        = "${var.project_name}-${var.environment}-participant-cdn"
      Environment = var.environment
    }
  )
}


# ============================================================================
# S3 Bucket Policies for CloudFront Access
# ============================================================================

resource "aws_s3_bucket_policy" "admin_portal" {
  bucket = aws_s3_bucket.admin_portal.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Sid    = "AllowCloudFrontServicePrincipal"
        Effect = "Allow"
        Principal = {
          Service = "cloudfront.amazonaws.com"
        }
        Action   = "s3:GetObject"
        Resource = "${aws_s3_bucket.admin_portal.arn}/*"
        Condition = {
          StringEquals = {
            "AWS:SourceArn" = aws_cloudfront_distribution.admin_portal.arn
          }
        }
      }
    ]
  })

  depends_on = [aws_s3_bucket_public_access_block.admin_portal]
}

resource "aws_s3_bucket_policy" "judge_portal" {
  bucket = aws_s3_bucket.judge_portal.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Sid    = "AllowCloudFrontServicePrincipal"
        Effect = "Allow"
        Principal = {
          Service = "cloudfront.amazonaws.com"
        }
        Action   = "s3:GetObject"
        Resource = "${aws_s3_bucket.judge_portal.arn}/*"
        Condition = {
          StringEquals = {
            "AWS:SourceArn" = aws_cloudfront_distribution.judge_portal.arn
          }
        }
      }
    ]
  })

  depends_on = [aws_s3_bucket_public_access_block.judge_portal]
}

resource "aws_s3_bucket_policy" "participant_portal" {
  bucket = aws_s3_bucket.participant_portal.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Sid    = "AllowCloudFrontServicePrincipal"
        Effect = "Allow"
        Principal = {
          Service = "cloudfront.amazonaws.com"
        }
        Action   = "s3:GetObject"
        Resource = "${aws_s3_bucket.participant_portal.arn}/*"
        Condition = {
          StringEquals = {
            "AWS:SourceArn" = aws_cloudfront_distribution.participant_portal.arn
          }
        }
      }
    ]
  })

  depends_on = [aws_s3_bucket_public_access_block.participant_portal]
}
