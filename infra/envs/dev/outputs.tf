output "cluster_name" {
  description = "EKS cluster name."
  value       = module.platform.cluster_name
}

output "cluster_endpoint" {
  description = "Kubernetes API endpoint."
  value       = module.platform.cluster_endpoint
}

output "ecr_repository_url" {
  description = "ECR repository URL."
  value       = module.platform.ecr_repository_url
}

output "irsa_role_arn" {
  description = "IAM role ARN for the LinkForge service account."
  value       = module.platform.irsa_role_arn
}

output "rds_endpoint" {
  description = "RDS hostname when enabled."
  value       = module.platform.rds_endpoint
}

output "rds_master_user_secret_arn" {
  description = "RDS-managed secret ARN when enabled."
  value       = module.platform.rds_master_user_secret_arn
}
