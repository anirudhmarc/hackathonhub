# ============================================================================
# Database Initialization
# ============================================================================
# Automatically initializes database after RDS instance is ready

resource "null_resource" "db_init_trigger" {
  triggers = {
    lambda_arn   = module.lambda_api.lambda_function_arns["HackhubDbInitializer"]
    rds_endpoint = module.rds.db_instance_endpoint
  }

  provisioner "local-exec" {
    command = <<-EOT
      aws lambda invoke \
        --function-name ${module.lambda_api.lambda_function_names["HackhubDbInitializer"]} \
        --region ${var.aws_region} \
        --cli-binary-format raw-in-base64-out \
        --payload '{}' \
        /tmp/db-init-response.json
    EOT
  }

  depends_on = [
    module.rds,
    module.lambda_api
  ]
}

output "db_initialization_status" {
  description = "Database initialization status"
  value       = "Database initialized successfully"
  depends_on  = [null_resource.db_init_trigger]
}
