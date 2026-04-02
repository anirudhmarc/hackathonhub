# ============================================================================
# API Gateway Routes Configuration
# ============================================================================
# This file defines all API Gateway resources, methods, and Lambda integrations
# Automatically generated from existing hackhub-prod-api configuration
# ============================================================================

# ============================================================================
# Admin Routes - /admin
# ============================================================================

resource "aws_api_gateway_resource" "admin" {
  rest_api_id = aws_api_gateway_rest_api.main.id
  parent_id   = aws_api_gateway_rest_api.main.root_resource_id
  path_part   = "admin"
}

# Admin - Participants
resource "aws_api_gateway_resource" "admin_participants" {
  rest_api_id = aws_api_gateway_rest_api.main.id
  parent_id   = aws_api_gateway_resource.admin.id
  path_part   = "participants"
}

resource "aws_api_gateway_resource" "admin_participants_id" {
  rest_api_id = aws_api_gateway_rest_api.main.id
  parent_id   = aws_api_gateway_resource.admin_participants.id
  path_part   = "{id}"
}

resource "aws_api_gateway_resource" "admin_participants_approve" {
  rest_api_id = aws_api_gateway_rest_api.main.id
  parent_id   = aws_api_gateway_resource.admin_participants_id.id
  path_part   = "approve"
}

# Admin - Teams
resource "aws_api_gateway_resource" "admin_teams" {
  rest_api_id = aws_api_gateway_rest_api.main.id
  parent_id   = aws_api_gateway_resource.admin.id
  path_part   = "teams"
}

resource "aws_api_gateway_resource" "admin_teams_id" {
  rest_api_id = aws_api_gateway_rest_api.main.id
  parent_id   = aws_api_gateway_resource.admin_teams.id
  path_part   = "{teamId}"
}

# Admin - Problems
resource "aws_api_gateway_resource" "admin_problems" {
  rest_api_id = aws_api_gateway_rest_api.main.id
  parent_id   = aws_api_gateway_resource.admin.id
  path_part   = "problems"
}

resource "aws_api_gateway_resource" "admin_problems_id" {
  rest_api_id = aws_api_gateway_rest_api.main.id
  parent_id   = aws_api_gateway_resource.admin_problems.id
  path_part   = "{problemId}"
}

# Admin - Judges
resource "aws_api_gateway_resource" "admin_judges" {
  rest_api_id = aws_api_gateway_rest_api.main.id
  parent_id   = aws_api_gateway_resource.admin.id
  path_part   = "judges"
}

resource "aws_api_gateway_resource" "admin_judges_id" {
  rest_api_id = aws_api_gateway_rest_api.main.id
  parent_id   = aws_api_gateway_resource.admin_judges.id
  path_part   = "{judgeId}"
}

# Admin - Assignments
resource "aws_api_gateway_resource" "admin_assignments" {
  rest_api_id = aws_api_gateway_rest_api.main.id
  parent_id   = aws_api_gateway_resource.admin.id
  path_part   = "assignments"
}

resource "aws_api_gateway_resource" "admin_assignments_id" {
  rest_api_id = aws_api_gateway_rest_api.main.id
  parent_id   = aws_api_gateway_resource.admin_assignments.id
  path_part   = "{assignmentId}"
}

# Admin - Other endpoints
resource "aws_api_gateway_resource" "admin_leaderboard" {
  rest_api_id = aws_api_gateway_rest_api.main.id
  parent_id   = aws_api_gateway_resource.admin.id
  path_part   = "leaderboard"
}

resource "aws_api_gateway_resource" "admin_broadcast_email" {
  rest_api_id = aws_api_gateway_rest_api.main.id
  parent_id   = aws_api_gateway_resource.admin.id
  path_part   = "broadcast-email"
}

resource "aws_api_gateway_resource" "admin_judging_stages" {
  rest_api_id = aws_api_gateway_rest_api.main.id
  parent_id   = aws_api_gateway_resource.admin.id
  path_part   = "judging-stages"
}

# ============================================================================
# Judge Routes - /judge
# ============================================================================

resource "aws_api_gateway_resource" "judge" {
  rest_api_id = aws_api_gateway_rest_api.main.id
  parent_id   = aws_api_gateway_rest_api.main.root_resource_id
  path_part   = "judge"
}

resource "aws_api_gateway_resource" "judge_teams" {
  rest_api_id = aws_api_gateway_rest_api.main.id
  parent_id   = aws_api_gateway_resource.judge.id
  path_part   = "teams"
}

resource "aws_api_gateway_resource" "judge_judges" {
  rest_api_id = aws_api_gateway_rest_api.main.id
  parent_id   = aws_api_gateway_resource.judge.id
  path_part   = "judges"
}

resource "aws_api_gateway_resource" "judge_problems" {
  rest_api_id = aws_api_gateway_rest_api.main.id
  parent_id   = aws_api_gateway_resource.judge.id
  path_part   = "problems"
}

resource "aws_api_gateway_resource" "judge_scores" {
  rest_api_id = aws_api_gateway_rest_api.main.id
  parent_id   = aws_api_gateway_resource.judge.id
  path_part   = "scores"
}

resource "aws_api_gateway_resource" "judge_stages" {
  rest_api_id = aws_api_gateway_rest_api.main.id
  parent_id   = aws_api_gateway_resource.judge.id
  path_part   = "stages"
}

resource "aws_api_gateway_resource" "judge_assignments" {
  rest_api_id = aws_api_gateway_rest_api.main.id
  parent_id   = aws_api_gateway_resource.judge.id
  path_part   = "assignments"
}

resource "aws_api_gateway_resource" "judge_assignments_id" {
  rest_api_id = aws_api_gateway_rest_api.main.id
  parent_id   = aws_api_gateway_resource.judge_assignments.id
  path_part   = "{judgeId}"
}

resource "aws_api_gateway_resource" "judge_assignments_teams" {
  rest_api_id = aws_api_gateway_rest_api.main.id
  parent_id   = aws_api_gateway_resource.judge_assignments_id.id
  path_part   = "teams"
}

# ============================================================================
# Participant Routes - /participant
# ============================================================================

resource "aws_api_gateway_resource" "participant" {
  rest_api_id = aws_api_gateway_rest_api.main.id
  parent_id   = aws_api_gateway_rest_api.main.root_resource_id
  path_part   = "participant"
}

resource "aws_api_gateway_resource" "participant_teams" {
  rest_api_id = aws_api_gateway_rest_api.main.id
  parent_id   = aws_api_gateway_resource.participant.id
  path_part   = "teams"
}

resource "aws_api_gateway_resource" "participant_problems" {
  rest_api_id = aws_api_gateway_rest_api.main.id
  parent_id   = aws_api_gateway_resource.participant.id
  path_part   = "problems"
}

resource "aws_api_gateway_resource" "participant_submissions" {
  rest_api_id = aws_api_gateway_rest_api.main.id
  parent_id   = aws_api_gateway_resource.participant.id
  path_part   = "submissions"
}

resource "aws_api_gateway_resource" "participant_submission_urls" {
  rest_api_id = aws_api_gateway_rest_api.main.id
  parent_id   = aws_api_gateway_resource.participant.id
  path_part   = "submission-urls"
}

resource "aws_api_gateway_resource" "participant_feedback" {
  rest_api_id = aws_api_gateway_rest_api.main.id
  parent_id   = aws_api_gateway_resource.participant.id
  path_part   = "feedback"
}

# ============================================================================
# Lambda Integration Module
# ============================================================================
# This creates methods and integrations for all endpoints
# Using a local variable to define the route-to-lambda mapping
# ============================================================================

locals {
  # Map of API routes to Lambda functions
  api_routes = {
    # Admin - Participants
    "GET:/admin/participants"               = "GetAdminParticipants"
    "POST:/admin/participants"              = "PostAdminParticipants"
    "PUT:/admin/participants/{id}"          = "PutAdminParticipants"
    "DELETE:/admin/participants/{id}"       = "DeleteAdminParticipants"
    "POST:/admin/participants/{id}/approve" = "ApproveParticipant"

    # Admin - Teams
    "GET:/admin/teams"             = "GetAdminTeams"
    "POST:/admin/teams"            = "PostAdminTeams"
    "PUT:/admin/teams/{teamId}"    = "PutAdminTeams"
    "DELETE:/admin/teams/{teamId}" = "DeleteAdminTeams"

    # Admin - Problems
    "GET:/admin/problems"                = "GetAdminProblems"
    "POST:/admin/problems"               = "PostAdminProblems"
    "PUT:/admin/problems/{problemId}"    = "PutAdminProblems"
    "DELETE:/admin/problems/{problemId}" = "DeleteAdminProblems"

    # Admin - Judges
    "GET:/admin/judges"              = "GetAdminJudges"
    "POST:/admin/judges"             = "PostAdminJudges"
    "PUT:/admin/judges/{judgeId}"    = "PutAdminJudges"
    "DELETE:/admin/judges/{judgeId}" = "DeleteAdminJudges"

    # Admin - Assignments
    "GET:/admin/assignments"                   = "GetAdminAssignments"
    "POST:/admin/assignments"                  = "PostAdminAssignments"
    "DELETE:/admin/assignments/{assignmentId}" = "DeleteAdminAssignments"

    # Admin - Other
    "GET:/admin/leaderboard"      = "AdminGetLeaderboardData"
    "POST:/admin/broadcast-email" = "BroadcastEmailLambda"
    "GET:/admin/judging-stages"   = "GetJudgieStages"

    # Judge
    "GET:/judge/teams"                       = "GetJudgeTeams"
    "GET:/judge/judges"                      = "GetJudgeJudges"
    "GET:/judge/problems"                    = "GetJudgeProblems"
    "GET:/judge/scores"                      = "GetJudgeScores"
    "POST:/judge/scores"                     = "PostJudgeScores"
    "GET:/judge/stages"                      = "GetJudgieStages"
    "GET:/judge/assignments/{judgeId}/teams" = "GetAssignedTeams"

    # Participant
    "GET:/participant/teams"            = "GetStudentTeam"
    "POST:/participant/teams"           = "PostStudentTeam"
    "GET:/participant/problems"         = "GetStudentProblem"
    "POST:/participant/problems"        = "PostStudentProblem"
    "PUT:/participant/problems"         = "PostStudentProblem"
    "GET:/participant/submissions"      = "GetStudentSubmission"
    "PUT:/participant/submissions"      = "UpdateSubmissionDetails"
    "POST:/participant/submission-urls" = "GetSubmissionPresignedUrls"
    "GET:/participant/feedback"         = "GetStudentScore"
  }

  # Extract unique resource paths for method creation
  resource_map = {
    "/admin/participants"                = aws_api_gateway_resource.admin_participants.id
    "/admin/participants/{id}"           = aws_api_gateway_resource.admin_participants_id.id
    "/admin/participants/{id}/approve"   = aws_api_gateway_resource.admin_participants_approve.id
    "/admin/teams"                       = aws_api_gateway_resource.admin_teams.id
    "/admin/teams/{teamId}"              = aws_api_gateway_resource.admin_teams_id.id
    "/admin/problems"                    = aws_api_gateway_resource.admin_problems.id
    "/admin/problems/{problemId}"        = aws_api_gateway_resource.admin_problems_id.id
    "/admin/judges"                      = aws_api_gateway_resource.admin_judges.id
    "/admin/judges/{judgeId}"            = aws_api_gateway_resource.admin_judges_id.id
    "/admin/assignments"                 = aws_api_gateway_resource.admin_assignments.id
    "/admin/assignments/{assignmentId}"  = aws_api_gateway_resource.admin_assignments_id.id
    "/admin/leaderboard"                 = aws_api_gateway_resource.admin_leaderboard.id
    "/admin/broadcast-email"             = aws_api_gateway_resource.admin_broadcast_email.id
    "/admin/judging-stages"              = aws_api_gateway_resource.admin_judging_stages.id
    "/judge/teams"                       = aws_api_gateway_resource.judge_teams.id
    "/judge/judges"                      = aws_api_gateway_resource.judge_judges.id
    "/judge/problems"                    = aws_api_gateway_resource.judge_problems.id
    "/judge/scores"                      = aws_api_gateway_resource.judge_scores.id
    "/judge/stages"                      = aws_api_gateway_resource.judge_stages.id
    "/judge/assignments/{judgeId}/teams" = aws_api_gateway_resource.judge_assignments_teams.id
    "/participant/teams"                 = aws_api_gateway_resource.participant_teams.id
    "/participant/problems"              = aws_api_gateway_resource.participant_problems.id
    "/participant/submissions"           = aws_api_gateway_resource.participant_submissions.id
    "/participant/submission-urls"       = aws_api_gateway_resource.participant_submission_urls.id
    "/participant/feedback"              = aws_api_gateway_resource.participant_feedback.id
  }
}

# Note: Methods and integrations will be added in a separate file due to complexity
# This file establishes the resource structure
