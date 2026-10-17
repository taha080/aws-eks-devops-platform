output "role_arn" {
  description = "ARN to annotate onto the Kubernetes service account."
  value       = aws_iam_role.this.arn
}

output "role_name" {
  description = "IAM role name."
  value       = aws_iam_role.this.name
}
