# ============================================================================
# Lambda Functions Configuration
# ============================================================================
# This file defines all Lambda function configurations
# Each function specifies: runtime, handler, timeout, memory, VPC, and env vars

locals {
  # Common environment variables for all Lambda functions
  common_lambda_env = {
    ENVIRONMENT          = var.environment
    REGION               = data.aws_region.current.name
    DB_HOST              = var.db_host
    DB_PORT              = var.db_port
    DB_DATABASE          = var.db_name
    DB_SECRET_ARN        = var.rds_secret_arn
    DYNAMODB_TABLE_NAME  = var.dynamodb_table_name
    S3_BUCKET_NAME       = var.submissions_bucket_name
    COGNITO_USER_POOL_ID = var.cognito_user_pool_id
    ALLOWED_ORIGIN       = var.allowed_origin
  }

  # Lambda functions configuration map
  lambda_functions = {
    # ========================================================================
    # Admin API Functions - Participants Management
    # ========================================================================
    GetAdminParticipants = {
      group            = "admin"
      permissions      = ["dynamodb", "cognito-idp", "secretsmanager"]
      handler          = "index.handler"
      runtime          = "nodejs22.x"
      timeout          = 870
      memory_size      = 2048
      filename         = "GetAdminParticipants_code.zip"
      vpc_enabled      = false
      environment_vars = {}
    }

    PostAdminParticipants = {
      group            = "admin"
      permissions      = ["dynamodb", "cognito-idp", "secretsmanager"]
      handler          = "index.handler"
      runtime          = "nodejs22.x"
      timeout          = 30
      memory_size      = 128
      filename         = "PostAdminParticipants_code.zip"
      vpc_enabled      = true
      environment_vars = {}
    }

    PutAdminParticipants = {
      group            = "admin"
      permissions      = ["dynamodb", "cognito-idp", "secretsmanager"]
      handler          = "index.handler"
      runtime          = "nodejs22.x"
      timeout          = 30
      memory_size      = 128
      filename         = "PutAdminParticipants_code.zip"
      vpc_enabled      = true
      environment_vars = {}
    }

    DeleteAdminParticipants = {
      group            = "admin"
      permissions      = ["dynamodb", "cognito-idp", "secretsmanager"]
      handler          = "index.handler"
      runtime          = "nodejs22.x"
      timeout          = 30
      memory_size      = 128
      filename         = "DeleteAdminParticipants_code.zip"
      vpc_enabled      = true
      environment_vars = {}
    }

    # ========================================================================
    # Admin API Functions - Teams Management
    # ========================================================================
    GetAdminTeams = {
      group            = "admin"
      permissions      = ["dynamodb", "secretsmanager"]
      handler          = "index.handler"
      runtime          = "nodejs22.x"
      timeout          = 30
      memory_size      = 128
      filename         = "GetAdminTeams_code.zip"
      vpc_enabled      = true
      environment_vars = {}
    }

    PostAdminTeams = {
      group            = "admin"
      permissions      = ["dynamodb", "secretsmanager"]
      handler          = "index.handler"
      runtime          = "nodejs22.x"
      timeout          = 30
      memory_size      = 128
      filename         = "PostAdminTeams_code.zip"
      vpc_enabled      = true
      environment_vars = {}
    }

    PutAdminTeams = {
      group            = "admin"
      permissions      = ["dynamodb", "secretsmanager"]
      handler          = "index.handler"
      runtime          = "nodejs22.x"
      timeout          = 30
      memory_size      = 128
      filename         = "PutAdminTeams_code.zip"
      vpc_enabled      = true
      environment_vars = {}
    }

    DeleteAdminTeams = {
      group            = "admin"
      permissions      = ["dynamodb", "secretsmanager"]
      handler          = "index.handler"
      runtime          = "nodejs22.x"
      timeout          = 30
      memory_size      = 128
      filename         = "DeleteAdminTeams_code.zip"
      vpc_enabled      = true
      environment_vars = {}
    }

    # ========================================================================
    # Admin API Functions - Problems Management
    # ========================================================================
    GetAdminProblems = {
      group            = "admin"
      permissions      = ["dynamodb", "secretsmanager"]
      handler          = "index.handler"
      runtime          = "nodejs22.x"
      timeout          = 30
      memory_size      = 128
      filename         = "GetAdminProblems_code.zip"
      vpc_enabled      = true
      environment_vars = {}
    }

    PostAdminProblems = {
      group            = "admin"
      permissions      = ["dynamodb", "secretsmanager"]
      handler          = "index.handler"
      runtime          = "nodejs22.x"
      timeout          = 30
      memory_size      = 128
      filename         = "PostAdminProblems_code.zip"
      vpc_enabled      = true
      environment_vars = {}
    }

    PutAdminProblems = {
      group            = "admin"
      permissions      = ["dynamodb", "secretsmanager"]
      handler          = "index.handler"
      runtime          = "nodejs22.x"
      timeout          = 30
      memory_size      = 128
      filename         = "PutAdminProblems_code.zip"
      vpc_enabled      = true
      environment_vars = {}
    }

    DeleteAdminProblems = {
      group            = "admin"
      permissions      = ["dynamodb", "secretsmanager"]
      handler          = "index.handler"
      runtime          = "nodejs22.x"
      timeout          = 30
      memory_size      = 128
      filename         = "DeleteAdminProblems_code.zip"
      vpc_enabled      = true
      environment_vars = {}
    }

    # ========================================================================
    # Admin API Functions - Judges Management
    # ========================================================================
    GetAdminJudges = {
      group            = "admin"
      permissions      = ["cognito-idp"]
      handler          = "index.handler"
      runtime          = "nodejs22.x"
      timeout          = 30
      memory_size      = 128
      filename         = "GetAdminJudges_code.zip"
      vpc_enabled      = true
      environment_vars = {}
    }

    PostAdminJudges = {
      group            = "admin"
      permissions      = ["cognito-idp"]
      handler          = "index.handler"
      runtime          = "nodejs22.x"
      timeout          = 30
      memory_size      = 128
      filename         = "PostAdminJudges_code.zip"
      vpc_enabled      = true
      environment_vars = {}
    }

    PutAdminJudges = {
      group            = "admin"
      permissions      = ["cognito-idp"]
      handler          = "index.handler"
      runtime          = "nodejs22.x"
      timeout          = 30
      memory_size      = 128
      filename         = "PutAdminJudges_code.zip"
      vpc_enabled      = true
      environment_vars = {}
    }

    DeleteAdminJudges = {
      group            = "admin"
      permissions      = ["cognito-idp"]
      handler          = "index.handler"
      runtime          = "nodejs22.x"
      timeout          = 30
      memory_size      = 128
      filename         = "DeleteAdminJudges_code.zip"
      vpc_enabled      = true
      environment_vars = {}
    }

    # ========================================================================
    # Admin API Functions - Assignments Management
    # ========================================================================
    GetAdminAssignments = {
      group            = "admin"
      permissions      = ["dynamodb", "secretsmanager"]
      handler          = "index.handler"
      runtime          = "nodejs22.x"
      timeout          = 30
      memory_size      = 128
      filename         = "GetAdminAssignments_code.zip"
      vpc_enabled      = true
      environment_vars = {}
    }

    PostAdminAssignments = {
      group            = "admin"
      permissions      = ["dynamodb", "secretsmanager"]
      handler          = "index.handler"
      runtime          = "nodejs22.x"
      timeout          = 30
      memory_size      = 128
      filename         = "PostAdminAssignments_code.zip"
      vpc_enabled      = true
      environment_vars = {}
    }

    DeleteAdminAssignments = {
      group            = "admin"
      permissions      = ["dynamodb", "secretsmanager"]
      handler          = "index.handler"
      runtime          = "nodejs22.x"
      timeout          = 30
      memory_size      = 128
      filename         = "DeleteAdminAssignments_code.zip"
      vpc_enabled      = true
      environment_vars = {}
    }

    # ========================================================================
    # Admin API Functions - Leaderboard & Reports
    # ========================================================================
    AdminGetLeaderboardData = {
      group            = "admin"
      permissions      = ["dynamodb", "secretsmanager"]
      handler          = "index.handler"
      runtime          = "nodejs22.x"
      timeout          = 30
      memory_size      = 128
      filename         = "AdminGetLeaderboardData_code.zip"
      vpc_enabled      = true
      environment_vars = {}
    }

    ExportApprovedStudentsToCSV = {
      group            = "admin"
      permissions      = ["dynamodb", "s3"]
      handler          = "index.handler"
      runtime          = "nodejs22.x"
      timeout          = 60
      memory_size      = 256
      filename         = "ExportApprovedStudentsToCSV_code.zip"
      vpc_enabled      = false
      environment_vars = {}
    }

    # ========================================================================
    # Student/Participant API Functions
    # ========================================================================
    GetStudentTeam = {
      group            = "participant"
      permissions      = ["dynamodb", "secretsmanager"]
      handler          = "index.handler"
      runtime          = "nodejs22.x"
      timeout          = 870
      memory_size      = 3008
      filename         = "GetStudentTeam_code.zip"
      vpc_enabled      = true
      environment_vars = {}
    }

    PostStudentTeam = {
      group            = "participant"
      permissions      = ["dynamodb", "secretsmanager"]
      handler          = "index.handler"
      runtime          = "nodejs22.x"
      timeout          = 30
      memory_size      = 128
      filename         = "PostStudentTeam_code.zip"
      vpc_enabled      = true
      environment_vars = {}
    }

    GetStudentProblem = {
      group            = "participant"
      permissions      = ["dynamodb", "secretsmanager"]
      handler          = "index.handler"
      runtime          = "nodejs22.x"
      timeout          = 30
      memory_size      = 128
      filename         = "GetStudentProblem_code.zip"
      vpc_enabled      = true
      environment_vars = {}
    }

    PostStudentProblem = {
      group            = "participant"
      permissions      = ["dynamodb", "s3", "secretsmanager"]
      handler          = "index.handler"
      runtime          = "nodejs22.x"
      timeout          = 30
      memory_size      = 128
      filename         = "PostStudentProblem_code.zip"
      vpc_enabled      = true
      environment_vars = {}
    }

    GetStudentSubmission = {
      group            = "participant"
      permissions      = ["dynamodb", "s3", "secretsmanager"]
      handler          = "index.handler"
      runtime          = "nodejs22.x"
      timeout          = 30
      memory_size      = 128
      filename         = "GetStudentSubmission_code.zip"
      vpc_enabled      = true
      environment_vars = {}
    }

    GetStudentScore = {
      group            = "participant"
      permissions      = ["dynamodb", "secretsmanager"]
      handler          = "index.handler"
      runtime          = "nodejs22.x"
      timeout          = 30
      memory_size      = 128
      filename         = "GetStudentScore_code.zip"
      vpc_enabled      = true
      environment_vars = {}
    }

    GetSubmissionPresignedUrls = {
      group            = "participant"
      permissions      = ["s3"]
      handler          = "index.handler"
      runtime          = "nodejs22.x"
      timeout          = 30
      memory_size      = 128
      filename         = "GetSubmissionPresignedUrls_code.zip"
      vpc_enabled      = false
      environment_vars = {}
    }

    UpdateSubmissionDetails = {
      group            = "participant"
      permissions      = ["dynamodb", "s3"]
      handler          = "index.handler"
      runtime          = "nodejs22.x"
      timeout          = 30
      memory_size      = 128
      filename         = "UpdateSubmissionDetails_code.zip"
      vpc_enabled      = true
      environment_vars = {}
    }

    # ========================================================================
    # Judge API Functions
    # ========================================================================
    GetJudgeTeams = {
      group            = "judge"
      permissions      = ["dynamodb", "s3", "secretsmanager"]
      handler          = "index.handler"
      runtime          = "nodejs22.x"
      timeout          = 30
      memory_size      = 128
      filename         = "GetJudgeTeams_code.zip"
      vpc_enabled      = true
      environment_vars = {}
    }

    GetJudgeJudges = {
      group            = "judge"
      permissions      = ["cognito-idp"]
      handler          = "index.handler"
      runtime          = "nodejs22.x"
      timeout          = 30
      memory_size      = 128
      filename         = "GetJudgeJudges_code.zip"
      vpc_enabled      = true
      environment_vars = {}
    }

    GetJudgeProblems = {
      group            = "judge"
      permissions      = ["dynamodb", "secretsmanager"]
      handler          = "index.handler"
      runtime          = "nodejs22.x"
      timeout          = 30
      memory_size      = 128
      filename         = "GetJudgeProblems_code.zip"
      vpc_enabled      = true
      environment_vars = {}
    }

    GetJudgeScores = {
      group            = "judge"
      permissions      = ["dynamodb", "secretsmanager"]
      handler          = "index.handler"
      runtime          = "nodejs22.x"
      timeout          = 30
      memory_size      = 128
      filename         = "GetJudgeScores_code.zip"
      vpc_enabled      = true
      environment_vars = {}
    }

    PostJudgeScores = {
      group            = "judge"
      permissions      = ["dynamodb", "secretsmanager"]
      handler          = "index.handler"
      runtime          = "nodejs22.x"
      timeout          = 30
      memory_size      = 128
      filename         = "PostJudgeScores_code.zip"
      vpc_enabled      = true
      environment_vars = {}
    }

    GetJudgieStages = {
      group            = "judge"
      permissions      = ["dynamodb", "secretsmanager"]
      handler          = "index.handler"
      runtime          = "nodejs22.x"
      timeout          = 30
      memory_size      = 128
      filename         = "GetJudgieStages_code.zip"
      vpc_enabled      = true
      environment_vars = {}
    }

    GetAssignedTeams = {
      group            = "judge"
      permissions      = ["dynamodb", "s3", "secretsmanager"]
      handler          = "index.handler"
      runtime          = "nodejs22.x"
      timeout          = 30
      memory_size      = 128
      filename         = "GetAssignedTeams_code.zip"
      vpc_enabled      = true
      environment_vars = {}
    }

    FetchJudgeTriggerCreate = {
      group            = "judge"
      permissions      = ["dynamodb", "cognito-idp", "secretsmanager"]
      handler          = "index.handler"
      runtime          = "nodejs22.x"
      timeout          = 30
      memory_size      = 128
      filename         = "FetchJudgeTriggerCreate_code.zip"
      vpc_enabled      = true
      environment_vars = {}
    }

    # ========================================================================
    # User Management & Authentication Functions
    # ========================================================================
    ApproveParticipant = {
      group            = "utility"
      permissions      = ["cognito-idp", "ses"]
      handler          = "index.handler"
      runtime          = "nodejs22.x"
      timeout          = 90
      memory_size      = 128
      filename         = "ApproveParticipant_code.zip"
      vpc_enabled      = true
      environment_vars = {}
    }

    ApproveParticipantNew = {
      group            = "utility"
      permissions      = ["cognito-idp", "ses"]
      handler          = "index.handler"
      runtime          = "nodejs22.x"
      timeout          = 90
      memory_size      = 128
      filename         = "ApproveParticipantNew_code.zip"
      vpc_enabled      = true
      environment_vars = {}
    }

    CognitoUserManager = {
      group            = "utility"
      permissions      = ["cognito-idp"]
      handler          = "index.handler"
      runtime          = "nodejs22.x"
      timeout          = 60
      memory_size      = 256
      filename         = "CognitoUserManager_code.zip"
      vpc_enabled      = false
      environment_vars = {}
    }

    CreateJudgesCognito = {
      group            = "utility"
      permissions      = ["cognito-idp"]
      handler          = "index.handler"
      runtime          = "nodejs22.x"
      timeout          = 60
      memory_size      = 256
      filename         = "CreateJudgesCognito_code.zip"
      vpc_enabled      = true
      environment_vars = {}
    }

    # ========================================================================
    # Utility & Background Functions
    # ========================================================================
    BroadcastEmailLambda = {
      group       = "utility"
      permissions = ["ses"]
      handler     = "index.handler"
      runtime     = "nodejs22.x"
      timeout     = 300
      memory_size = 512
      filename    = "BroadcastEmailLambda_code.zip"
      vpc_enabled = false
      environment_vars = {
        SES_REGION = data.aws_region.current.name
      }
    }

    CertificateSenderDedicatedFunction = {
      group       = "utility"
      permissions = ["ses", "s3"]
      handler     = "index.handler"
      runtime     = "nodejs22.x"
      timeout     = 300
      memory_size = 512
      filename    = "CertificateSenderDedicatedFunction_code.zip"
      vpc_enabled = false
      environment_vars = {
        SES_REGION = data.aws_region.current.name
      }
    }

    HackhubDbInitializer = {
      group            = "utility"
      permissions      = ["secretsmanager"]
      handler          = "index.handler"
      runtime          = "nodejs22.x"
      timeout          = 300
      memory_size      = 512
      filename         = "HackhubDbInitializer_code.zip"
      vpc_enabled      = true
      environment_vars = {}
    }

    SqlEditorLambda = {
      group            = "utility"
      permissions      = ["secretsmanager"]
      handler          = "index.handler"
      runtime          = "nodejs22.x"
      timeout          = 300
      memory_size      = 512
      filename         = "SqlEditorLambda_code.zip"
      vpc_enabled      = true
      environment_vars = {}
    }

    SubmitHackathonRegistration = {
      group            = "utility"
      permissions      = ["dynamodb", "secretsmanager"]
      handler          = "index.handler"
      runtime          = "nodejs22.x"
      timeout          = 30
      memory_size      = 128
      filename         = "SubmitHackathonRegistration_code.zip"
      vpc_enabled      = false
      environment_vars = {}
    }
  }
}
