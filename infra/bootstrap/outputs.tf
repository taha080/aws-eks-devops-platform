output "state_bucket_name" {
  description = "State bucket to reference from backend.hcl."
  value       = aws_s3_bucket.state.bucket
}

output "lock_table_name" {
  description = "DynamoDB lock table to reference from backend.hcl."
  value       = aws_dynamodb_table.locks.name
}

output "region" {
  description = "Region of the state backend."
  value       = var.aws_region
}
