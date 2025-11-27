# ============================================================================
# Database Seed Data
# ============================================================================

resource "null_resource" "db_seed" {
  triggers = {
    db_init_id = null_resource.db_init_trigger.id
  }

  provisioner "local-exec" {
    command = <<-EOT
      # Insert Tracks
      aws lambda invoke --function-name ${module.lambda_api.lambda_function_names["SqlEditorLambda"]} \
        --region ${var.aws_region} --cli-binary-format raw-in-base64-out \
        --payload '{"sql":"INSERT INTO Track (track_id, track_title) VALUES (\"track-1\", \"Student Track\"), (\"track-2\", \"Corporate Track\")"}' \
        /tmp/seed1.json

      # Insert Problem Statements
      aws lambda invoke --function-name ${module.lambda_api.lambda_function_names["SqlEditorLambda"]} \
        --region ${var.aws_region} --cli-binary-format raw-in-base64-out \
        --payload '{"sql":"INSERT INTO Problem_Statement (problem_id, problem_title, problem_description, problem_tag, problem_max_slots, track_id) VALUES (\"prob-1\", \"Build AI Chatbot\", \"Create an intelligent chatbot using AWS services\", \"AI\", 5, \"track-1\"), (\"prob-2\", \"Serverless Architecture\", \"Design a scalable serverless application\", \"Cloud\", 5, \"track-2\")"}' \
        /tmp/seed2.json

      # Insert Judges
      aws lambda invoke --function-name ${module.lambda_api.lambda_function_names["SqlEditorLambda"]} \
        --region ${var.aws_region} --cli-binary-format raw-in-base64-out \
        --payload '{"sql":"INSERT INTO Judge (judge_id, email_address, judge_name) VALUES (\"judge-1\", \"judge@hackhub.com\", \"John Smith\"), (\"judge-2\", \"judge2@example.com\", \"Jane Doe\")"}' \
        /tmp/seed3.json

      # Insert Judging Stages
      aws lambda invoke --function-name ${module.lambda_api.lambda_function_names["SqlEditorLambda"]} \
        --region ${var.aws_region} --cli-binary-format raw-in-base64-out \
        --payload '{"sql":"INSERT INTO Judging_Stage (stage_id, stage_name, description) VALUES (\"stage-1\", \"Preliminary Round\", \"First round of judging\"), (\"stage-2\", \"Final Round\", \"Final judging round\")"}' \
        /tmp/seed4.json

      # Insert Leaders
      aws lambda invoke --function-name ${module.lambda_api.lambda_function_names["SqlEditorLambda"]} \
        --region ${var.aws_region} --cli-binary-format raw-in-base64-out \
        --payload '{"sql":"INSERT INTO Leader (leader_id, email_address, track_id) VALUES (\"leader-1\", \"participant@hackhub.com\", \"track-1\"), (\"leader-2\", \"leader2@example.com\", \"track-2\")"}' \
        /tmp/seed5.json

      # Insert Teams
      aws lambda invoke --function-name ${module.lambda_api.lambda_function_names["SqlEditorLambda"]} \
        --region ${var.aws_region} --cli-binary-format raw-in-base64-out \
        --payload '{"sql":"INSERT INTO Team (team_id, leader_id, problem_id, team_name, is_finalist) VALUES (\"team-1\", \"leader-1\", \"prob-1\", \"AI Innovators\", 0), (\"team-2\", \"leader-2\", \"prob-2\", \"Cloud Masters\", 0)"}' \
        /tmp/seed6.json
    EOT
  }

  depends_on = [null_resource.db_init_trigger]
}

output "db_seed_status" {
  description = "Database seed data status"
  value       = "Default data inserted successfully"
  depends_on  = [null_resource.db_seed]
}
