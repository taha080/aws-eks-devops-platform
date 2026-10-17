output "endpoint" {
  description = "RDS hostname."
  value       = aws_db_instance.this.address
}

output "port" {
  description = "RDS port."
  value       = aws_db_instance.this.port
}

output "master_user_secret_arn" {
  description = "Secrets Manager ARN of the RDS-managed master password."
  value       = aws_db_instance.this.master_user_secret[0].secret_arn
}

output "security_group_id" {
  description = "Database security group ID."
  value       = aws_security_group.this.id
}
