# ============================================================================
# Cognito Module - User Authentication and Authorization
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

data "aws_region" "current" {}

# ============================================================================
# Cognito User Pool
# ============================================================================

resource "aws_cognito_user_pool" "main" {
  name = "${var.project_name}-${var.environment}-users"

  # Username Configuration
  username_attributes      = ["email"]
  auto_verified_attributes = ["email"]

  # Password Policy
  password_policy {
    minimum_length                   = 8
    require_lowercase                = true
    require_uppercase                = true
    require_numbers                  = true
    require_symbols                  = true
    temporary_password_validity_days = 7
  }

  # Account Recovery
  account_recovery_setting {
    recovery_mechanism {
      name     = "verified_email"
      priority = 1
    }
  }

  # Email Configuration
  email_configuration {
    email_sending_account = "COGNITO_DEFAULT"
  }

  # User Attributes Schema
  schema {
    name                = "email"
    attribute_data_type = "String"
    required            = true
    mutable             = true

    string_attribute_constraints {
      min_length = 1
      max_length = 256
    }
  }

  schema {
    name                = "name"
    attribute_data_type = "String"
    required            = false
    mutable             = true

    string_attribute_constraints {
      min_length = 1
      max_length = 256
    }
  }

  # MFA Configuration
  mfa_configuration = var.enable_mfa ? "OPTIONAL" : "OFF"

  dynamic "software_token_mfa_configuration" {
    for_each = var.enable_mfa ? [1] : []
    content {
      enabled = true
    }
  }

  # Admin Create User Config
  admin_create_user_config {
    allow_admin_create_user_only = false

    invite_message_template {
      email_subject = "Your ${var.project_name} Account"
      email_message = "Welcome! Your username is {username} and temporary password is {####}"
      sms_message   = "Your username is {username} and temporary password is {####}"
    }
  }

  # Advanced Security
  user_pool_add_ons {
    advanced_security_mode = var.advanced_security_mode
  }

  # Deletion Protection
  deletion_protection = var.deletion_protection ? "ACTIVE" : "INACTIVE"

  # User Attribute Update Settings
  user_attribute_update_settings {
    attributes_require_verification_before_update = ["email"]
  }

  tags = merge(
    var.common_tags,
    {
      Name        = "${var.project_name}-${var.environment}-user-pool"
      Environment = var.environment
    }
  )

  lifecycle {
    ignore_changes = [schema]
  }
}

# ============================================================================
# Cognito User Pool Domain
# ============================================================================

resource "random_string" "domain_suffix" {
  length  = 8
  special = false
  upper   = false
}

resource "aws_cognito_user_pool_domain" "main" {
  domain       = "${var.project_name}-${var.environment}-${random_string.domain_suffix.result}"
  user_pool_id = aws_cognito_user_pool.main.id
}

# ============================================================================
# Cognito User Pool Client (Single client for all portals)
# ============================================================================

resource "aws_cognito_user_pool_client" "main" {
  name         = "${var.project_name}-${var.environment}-client"
  user_pool_id = aws_cognito_user_pool.main.id

  generate_secret = false

  # OAuth Configuration
  allowed_oauth_flows_user_pool_client = true
  allowed_oauth_flows                  = ["code", "implicit"]
  allowed_oauth_scopes                 = ["openid", "email", "profile", "aws.cognito.signin.user.admin"]

  callback_urls                = var.callback_urls
  logout_urls                  = var.logout_urls
  supported_identity_providers = ["COGNITO"]

  # Token Validity
  id_token_validity      = 60
  access_token_validity  = 60
  refresh_token_validity = 30

  token_validity_units {
    id_token      = "minutes"
    access_token  = "minutes"
    refresh_token = "days"
  }

  # Security
  prevent_user_existence_errors = "ENABLED"
  enable_token_revocation       = true

  # Auth Flows
  explicit_auth_flows = [
    "ALLOW_USER_SRP_AUTH",
    "ALLOW_REFRESH_TOKEN_AUTH",
    "ALLOW_USER_PASSWORD_AUTH"
  ]

  # Attributes
  read_attributes = [
    "email",
    "email_verified",
    "name",
  ]

  write_attributes = [
    "email",
    "name",
  ]
}

# ============================================================================
# Cognito User Groups
# ============================================================================

resource "aws_cognito_user_group" "admins" {
  name         = "Admins"
  user_pool_id = aws_cognito_user_pool.main.id
  description  = "Administrator users with full system access"
  precedence   = 1
}

resource "aws_cognito_user_group" "judges" {
  name         = "Judges"
  user_pool_id = aws_cognito_user_pool.main.id
  description  = "Judge users with scoring and evaluation access"
  precedence   = 2
}

resource "aws_cognito_user_group" "participants" {
  name         = "Participants"
  user_pool_id = aws_cognito_user_pool.main.id
  description  = "Participant users with submission access"
  precedence   = 3
}

# ============================================================================
# Default Users
# ============================================================================

resource "aws_cognito_user" "default_users" {
  count = var.create_default_users ? 3 : 0

  user_pool_id = aws_cognito_user_pool.main.id
  username     = element(["admin@hackhub.com", "judge@hackhub.com", "participant@hackhub.com"], count.index)
  
  attributes = {
    email          = element(["admin@hackhub.com", "judge@hackhub.com", "participant@hackhub.com"], count.index)
    email_verified = true
  }

  temporary_password = "hackathonsystem@1A"
}

resource "aws_cognito_user_in_group" "default_users_in_group" {
  count = var.create_default_users ? 3 : 0

  user_pool_id = aws_cognito_user_pool.main.id
  group_name   = element([aws_cognito_user_group.admins.name, aws_cognito_user_group.judges.name, aws_cognito_user_group.participants.name], count.index)
  username     = aws_cognito_user.default_users[count.index].username
}

# ============================================================================
# Cognito Identity Pool (for AWS resource access)
# ============================================================================

resource "aws_cognito_identity_pool" "main" {
  identity_pool_name               = "${var.project_name}_${var.environment}_identity_pool"
  allow_unauthenticated_identities = false
  allow_classic_flow               = false

  cognito_identity_providers {
    client_id               = aws_cognito_user_pool_client.main.id
    provider_name           = aws_cognito_user_pool.main.endpoint
    server_side_token_check = true
  }

  tags = merge(
    var.common_tags,
    {
      Name        = "${var.project_name}-${var.environment}-identity-pool"
      Environment = var.environment
    }
  )
}

# ============================================================================
# IAM Roles for Identity Pool
# ============================================================================

# Authenticated Role
resource "aws_iam_role" "authenticated" {
  name = "${var.project_name}-${var.environment}-cognito-authenticated"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Principal = {
          Federated = "cognito-identity.amazonaws.com"
        }
        Action = "sts:AssumeRoleWithWebIdentity"
        Condition = {
          StringEquals = {
            "cognito-identity.amazonaws.com:aud" = aws_cognito_identity_pool.main.id
          }
          "ForAnyValue:StringLike" = {
            "cognito-identity.amazonaws.com:amr" = "authenticated"
          }
        }
      }
    ]
  })

  tags = merge(
    var.common_tags,
    {
      Name        = "${var.project_name}-${var.environment}-cognito-authenticated-role"
      Environment = var.environment
    }
  )
}

# Authenticated Role Policy
resource "aws_iam_role_policy" "authenticated" {
  name = "${var.project_name}-${var.environment}-cognito-authenticated-policy"
  role = aws_iam_role.authenticated.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Action = [
          "mobileanalytics:PutEvents",
          "cognito-sync:*",
          "cognito-identity:*"
        ]
        Resource = "*"
      }
    ]
  })
}

# Attach Identity Pool Roles
resource "aws_cognito_identity_pool_roles_attachment" "main" {
  identity_pool_id = aws_cognito_identity_pool.main.id

  roles = {
    authenticated = aws_iam_role.authenticated.arn
  }
}
