# ============================================================================
# API Gateway Routes Configuration
# ============================================================================
# This file defines all API Gateway resources, methods, and Lambda integrations
# Automatically generated from existing hackhub-prod-api configuration
# ============================================================================

# ============================================================================
# Hackathon Management Routes - /hackathons (platform CRUD, Host/Admin)
# ============================================================================

resource "aws_api_gateway_resource" "hackathons" {
  rest_api_id = aws_api_gateway_rest_api.main.id
  parent_id   = aws_api_gateway_rest_api.main.root_resource_id
  path_part   = "hackathons"
}

resource "aws_api_gateway_resource" "hackathons_id" {
  rest_api_id = aws_api_gateway_rest_api.main.id
  parent_id   = aws_api_gateway_resource.hackathons.id
  path_part   = "{hackathonId}"
}

resource "aws_api_gateway_resource" "hackathons_logo_url" {
  rest_api_id = aws_api_gateway_rest_api.main.id
  parent_id   = aws_api_gateway_resource.hackathons_id.id
  path_part   = "logo-url"
}

# ============================================================================
# Admin Routes - /admin
# ============================================================================

resource "aws_api_gateway_resource" "admin" {
  rest_api_id = aws_api_gateway_rest_api.main.id
  parent_id   = aws_api_gateway_resource.hackathons_id.id
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
  parent_id   = aws_api_gateway_resource.hackathons_id.id
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
  parent_id   = aws_api_gateway_resource.hackathons_id.id
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
    # Hackathon management (platform CRUD)
    "POST:/hackathons"                = "CreateHackathon"
    "GET:/hackathons"                 = "GetHackathons"
    "GET:/hackathons/{hackathonId}"   = "GetHackathon"
    "PUT:/hackathons/{hackathonId}"   = "UpdateHackathon"
    "POST:/hackathons/{hackathonId}/logo-url" = "GetHackathonLogoUploadUrl"

    # Admin - Participants
    "GET:/hackathons/{hackathonId}/admin/participants"               = "GetAdminParticipants"
    "POST:/hackathons/{hackathonId}/admin/participants"              = "PostAdminParticipants"
    "PUT:/hackathons/{hackathonId}/admin/participants/{id}"          = "PutAdminParticipants"
    "DELETE:/hackathons/{hackathonId}/admin/participants/{id}"       = "DeleteAdminParticipants"
    "POST:/hackathons/{hackathonId}/admin/participants/{id}/approve" = "ApproveParticipant"

    # Admin - Teams
    "GET:/hackathons/{hackathonId}/admin/teams"             = "GetAdminTeams"
    "POST:/hackathons/{hackathonId}/admin/teams"            = "PostAdminTeams"
    "PUT:/hackathons/{hackathonId}/admin/teams/{teamId}"    = "PutAdminTeams"
    "DELETE:/hackathons/{hackathonId}/admin/teams/{teamId}" = "DeleteAdminTeams"

    # Admin - Problems
    "GET:/hackathons/{hackathonId}/admin/problems"                = "GetAdminProblems"
    "POST:/hackathons/{hackathonId}/admin/problems"               = "PostAdminProblems"
    "PUT:/hackathons/{hackathonId}/admin/problems/{problemId}"    = "PutAdminProblems"
    "DELETE:/hackathons/{hackathonId}/admin/problems/{problemId}" = "DeleteAdminProblems"

    # Admin - Judges
    "GET:/hackathons/{hackathonId}/admin/judges"              = "GetAdminJudges"
    "POST:/hackathons/{hackathonId}/admin/judges"             = "PostAdminJudges"
    "PUT:/hackathons/{hackathonId}/admin/judges/{judgeId}"    = "PutAdminJudges"
    "DELETE:/hackathons/{hackathonId}/admin/judges/{judgeId}" = "DeleteAdminJudges"

    # Admin - Assignments
    "GET:/hackathons/{hackathonId}/admin/assignments"                   = "GetAdminAssignments"
    "POST:/hackathons/{hackathonId}/admin/assignments"                  = "PostAdminAssignments"
    "DELETE:/hackathons/{hackathonId}/admin/assignments/{assignmentId}" = "DeleteAdminAssignments"

    # Admin - Other
    "GET:/hackathons/{hackathonId}/admin/leaderboard"      = "AdminGetLeaderboardData"
    "POST:/hackathons/{hackathonId}/admin/broadcast-email" = "BroadcastEmailLambda"
    "GET:/hackathons/{hackathonId}/admin/judging-stages"   = "GetJudgieStages"

    # Judge
    "GET:/hackathons/{hackathonId}/judge/teams"                       = "GetJudgeTeams"
    "GET:/hackathons/{hackathonId}/judge/judges"                      = "GetJudgeJudges"
    "GET:/hackathons/{hackathonId}/judge/problems"                    = "GetJudgeProblems"
    "GET:/hackathons/{hackathonId}/judge/scores"                      = "GetJudgeScores"
    "POST:/hackathons/{hackathonId}/judge/scores"                     = "PostJudgeScores"
    "GET:/hackathons/{hackathonId}/judge/stages"                      = "GetJudgieStages"
    "GET:/hackathons/{hackathonId}/judge/assignments/{judgeId}/teams" = "GetAssignedTeams"

    # Participant
    "GET:/hackathons/{hackathonId}/participant/teams"            = "GetParticipantTeam"
    "POST:/hackathons/{hackathonId}/participant/teams"           = "PostParticipantTeam"
    "GET:/hackathons/{hackathonId}/participant/problems"         = "GetParticipantProblem"
    "POST:/hackathons/{hackathonId}/participant/problems"        = "PostParticipantProblem"
    "PUT:/hackathons/{hackathonId}/participant/problems"         = "PostParticipantProblem"
    "GET:/hackathons/{hackathonId}/participant/submissions"      = "GetParticipantSubmission"
    "PUT:/hackathons/{hackathonId}/participant/submissions"      = "UpdateSubmissionDetails"
    "POST:/hackathons/{hackathonId}/participant/submission-urls" = "GetSubmissionPresignedUrls"
    "GET:/hackathons/{hackathonId}/participant/feedback"         = "GetParticipantScore"
  }

  # Extract unique resource paths for method creation
  resource_map = {
    "/hackathons"                        = aws_api_gateway_resource.hackathons.id
    "/hackathons/{hackathonId}"          = aws_api_gateway_resource.hackathons_id.id
    "/hackathons/{hackathonId}/logo-url" = aws_api_gateway_resource.hackathons_logo_url.id
    "/hackathons/{hackathonId}/admin/participants"                = aws_api_gateway_resource.admin_participants.id
    "/hackathons/{hackathonId}/admin/participants/{id}"           = aws_api_gateway_resource.admin_participants_id.id
    "/hackathons/{hackathonId}/admin/participants/{id}/approve"   = aws_api_gateway_resource.admin_participants_approve.id
    "/hackathons/{hackathonId}/admin/teams"                       = aws_api_gateway_resource.admin_teams.id
    "/hackathons/{hackathonId}/admin/teams/{teamId}"              = aws_api_gateway_resource.admin_teams_id.id
    "/hackathons/{hackathonId}/admin/problems"                    = aws_api_gateway_resource.admin_problems.id
    "/hackathons/{hackathonId}/admin/problems/{problemId}"        = aws_api_gateway_resource.admin_problems_id.id
    "/hackathons/{hackathonId}/admin/judges"                      = aws_api_gateway_resource.admin_judges.id
    "/hackathons/{hackathonId}/admin/judges/{judgeId}"            = aws_api_gateway_resource.admin_judges_id.id
    "/hackathons/{hackathonId}/admin/assignments"                 = aws_api_gateway_resource.admin_assignments.id
    "/hackathons/{hackathonId}/admin/assignments/{assignmentId}"  = aws_api_gateway_resource.admin_assignments_id.id
    "/hackathons/{hackathonId}/admin/leaderboard"                 = aws_api_gateway_resource.admin_leaderboard.id
    "/hackathons/{hackathonId}/admin/broadcast-email"             = aws_api_gateway_resource.admin_broadcast_email.id
    "/hackathons/{hackathonId}/admin/judging-stages"              = aws_api_gateway_resource.admin_judging_stages.id
    "/hackathons/{hackathonId}/judge/teams"                       = aws_api_gateway_resource.judge_teams.id
    "/hackathons/{hackathonId}/judge/judges"                      = aws_api_gateway_resource.judge_judges.id
    "/hackathons/{hackathonId}/judge/problems"                    = aws_api_gateway_resource.judge_problems.id
    "/hackathons/{hackathonId}/judge/scores"                      = aws_api_gateway_resource.judge_scores.id
    "/hackathons/{hackathonId}/judge/stages"                      = aws_api_gateway_resource.judge_stages.id
    "/hackathons/{hackathonId}/judge/assignments/{judgeId}/teams" = aws_api_gateway_resource.judge_assignments_teams.id
    "/hackathons/{hackathonId}/participant/teams"                 = aws_api_gateway_resource.participant_teams.id
    "/hackathons/{hackathonId}/participant/problems"              = aws_api_gateway_resource.participant_problems.id
    "/hackathons/{hackathonId}/participant/submissions"           = aws_api_gateway_resource.participant_submissions.id
    "/hackathons/{hackathonId}/participant/submission-urls"       = aws_api_gateway_resource.participant_submission_urls.id
    "/hackathons/{hackathonId}/participant/feedback"              = aws_api_gateway_resource.participant_feedback.id
  }
}

# Note: Methods and integrations will be added in a separate file due to complexity
# This file establishes the resource structure
