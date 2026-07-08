# ============================================================================
# Database Seed Data — Deepgram x Pipecat x AWS Voice AI Hackathon
# ============================================================================
# Notes on the data model (the Lambda .zip code is fixed and cannot change):
#  - Team registration (PostStudentTeam) hardcodes a default track_id of
#    72101be3-6921-11f0-b168-0efd9d2909e1 and the schema enforces
#    FK Leader.track_id -> Track(track_id). So a Track row with THAT exact id
#    MUST exist or every registration fails. We seed exactly one track.
#  - Submission (UpdateSubmissionDetails) requires a non-null problem_id that
#    already exists on the team row. We seed one hidden "system" problem
#    (prob-system, tag __SYSTEM__) which the frontend auto-assigns to each team;
#    the real problem statement is captured as free text in the submission.
#  - The remaining Problem_Statement rows are the editable event AGENDA, shown
#    read-only to participants (/participant/problems) and editable by admins
#    (Manage Agenda). The __SYSTEM__ row is filtered out of both views.
# ============================================================================

locals {
  # The default/only track id is hardcoded inside the PostStudentTeam Lambda.
  default_track_id = "72101be3-6921-11f0-b168-0efd9d2909e1"
}

resource "null_resource" "db_seed" {
  triggers = {
    db_init_id = null_resource.db_init_trigger.id
    # Re-seed when this file's intended content changes.
    seed_version = "deepgram-pipecat-aws-v1"
  }

  provisioner "local-exec" {
    command = <<-EOT
      # Insert the single default Track (id must match the PostStudentTeam Lambda)
      aws lambda invoke --function-name ${module.lambda_api.lambda_function_names["SqlEditorLambda"]} \
        --region ${var.aws_region} --cli-binary-format raw-in-base64-out \
        --payload '{"sql":"INSERT INTO Track (track_id, track_title) VALUES (\"${local.default_track_id}\", \"Hackathon\")"}' \
        /tmp/seed1.json

      # Insert the hidden system problem (satisfies the non-null problem_id submission contract)
      aws lambda invoke --function-name ${module.lambda_api.lambda_function_names["SqlEditorLambda"]} \
        --region ${var.aws_region} --cli-binary-format raw-in-base64-out \
        --payload '{"sql":"INSERT INTO Problem_Statement (problem_id, problem_title, problem_description, problem_tag, problem_max_slots, track_id) VALUES (\"prob-system\", \"General Submission\", \"System placeholder. Teams enter their own problem statement on the submission form.\", \"__SYSTEM__\", 99999, \"${local.default_track_id}\")"}' \
        /tmp/seed2.json

      # Insert the editable event AGENDA (Problem_Statement rows on the default track)
      aws lambda invoke --function-name ${module.lambda_api.lambda_function_names["SqlEditorLambda"]} \
        --region ${var.aws_region} --cli-binary-format raw-in-base64-out \
        --payload '{"sql":"INSERT INTO Problem_Statement (problem_id, problem_title, problem_description, problem_tag, problem_max_slots, track_id) VALUES (\"agenda-1\", \"Intro and presentation by Deepgram\", \"Kickoff: Organizer opening remarks (Guha Roy) ~5 min. Deepgram + Daily open the session ~10 min. Deepgram + Daily technical walkthrough including how to get API access ~45 min.\", \"Kickoff\", 0, \"${local.default_track_id}\"), (\"agenda-2\", \"Q&A with Deepgram and Hackathon Champions\", \"Open Q&A with the Deepgram team and the hackathon champions ~20 min.\", \"Kickoff\", 0, \"${local.default_track_id}\"), (\"agenda-3\", \"Building Session\", \"Teams build their Voice AI solution, working backwards from a real customer pain point.\", \"Jun 9 - Jun 12\", 0, \"${local.default_track_id}\"), (\"agenda-4\", \"Submission of MVP\", \"Submit your MVP: video demo, internal Amazon GitLab repository, and optional demo app URL.\", \"Jun 12\", 0, \"${local.default_track_id}\"), (\"agenda-5\", \"Judging\", \"Judges review and score each submission.\", \"Jun 12 - Jun 14\", 0, \"${local.default_track_id}\"), (\"agenda-6\", \"Winner Announcement\", \"Finalists and winners are announced.\", \"Jun 15\", 0, \"${local.default_track_id}\")"}' \
        /tmp/seed3.json

      # Insert the JUDGING RUBRIC (Problem_Statement rows tagged __RUBRIC__).
      # Backend scoring is fixed at 4 criteria; these rows are editable reference
      # guidance surfaced to judges and participants. Placeholder text for now.
      aws lambda invoke --function-name ${module.lambda_api.lambda_function_names["SqlEditorLambda"]} \
        --region ${var.aws_region} --cli-binary-format raw-in-base64-out \
        --payload '{"sql":"INSERT INTO Problem_Statement (problem_id, problem_title, problem_description, problem_tag, problem_max_slots, track_id) VALUES (\"rubric-1\", \"Innovation\", \"Scored 1-10 (band anchors in brackets). [2] Minimal Innovation: Little to no originality; very similar to existing applications; does not require GenAI. [4] Slight Innovation: Little originality in applying Generative AI; common or derivative use case. [6] Moderate Innovation: Some meaningful use of Generative AI; a somewhat meaningful degree of novelty. [8] Notable Innovation: Notable originality and creativity; unique aspects that set it apart. [10] Highly Innovative: Ground-breaking, significantly novel and original, unlike existing applications.\", \"__RUBRIC__\", 10, \"${local.default_track_id}\"), (\"rubric-2\", \"Impact\", \"Scored 1-10 (band anchors in brackets). [2] Limited Impact: Little practical application or significance. [4] Moderate Potential Impact: Relevant, but impact is somewhat limited in scope. [6] Solid Potential for Impact: Meaningful impact, though limited to a specific domain or user group. [8] Significant Widespread Impact: Meaningful benefits across a large user base or problems at scale. [10] Exceptional Transformative Impact: Game-changing, systemic change at massive scale.\", \"__RUBRIC__\", 10, \"${local.default_track_id}\"), (\"rubric-3\", \"Feasibility\", \"Scored 1-10 (band anchors in brackets). [2] Limited Feasibility: Requires data that does not exist and is too complex to implement. [4] Moderate Feasibility: Data might exist or be challenging to procure; significant complexity. [6] Potential Feasibility: Data exists and can be procured; moderate complexity and significant time. [8] Significant Feasibility: Data exists and can be procured; moderate complexity and moderate time. [10] Exceptional Feasibility: Data exists and is easily procured; simple complexity and short time.\", \"__RUBRIC__\", 10, \"${local.default_track_id}\"), (\"rubric-4\", \"Working Solution\", \"Scored 1-10 (band anchors in brackets). [2] Solution Incomplete: Incomplete and not working. [4] Complete But Not Working: Created, but not in a working state. [6] Working, Major Features Missing: Created and working, but major features are missing. [8] Working, Minor Features Missing: Created and working, but minor features are missing. [10] Complete and Fully Working: Created and working with all features.\", \"__RUBRIC__\", 10, \"${local.default_track_id}\")"}' \
        /tmp/seed_rubric.json

      # Insert Judges (judge-1 email matches the default Cognito judge user)
      aws lambda invoke --function-name ${module.lambda_api.lambda_function_names["SqlEditorLambda"]} \
        --region ${var.aws_region} --cli-binary-format raw-in-base64-out \
        --payload '{"sql":"INSERT INTO Judge (judge_id, email_address, judge_name) VALUES (\"judge-1\", \"judge@hackhub.com\", \"Lead Judge\")"}' \
        /tmp/seed4.json

      # Insert Judging Stages
      aws lambda invoke --function-name ${module.lambda_api.lambda_function_names["SqlEditorLambda"]} \
        --region ${var.aws_region} --cli-binary-format raw-in-base64-out \
        --payload '{"sql":"INSERT INTO Judging_Stage (stage_id, stage_name, description) VALUES (\"stage-1\", \"Initial Review\", \"First round of judging\"), (\"stage-2\", \"Final Round\", \"Final judging round\")"}' \
        /tmp/seed5.json
    EOT
  }

  depends_on = [null_resource.db_init_trigger]
}

output "db_seed_status" {
  description = "Database seed data status"
  value       = "Default data inserted successfully"
  depends_on  = [null_resource.db_seed]
}
