output "cluster_name" {
  description = "EKS cluster name."
  value       = module.eks.cluster_name
}

output "cluster_endpoint" {
  description = "Kubernetes API endpoint."
  value       = module.eks.cluster_endpoint
}

output "ecr_repository_url" {
  description = "ECR repository URL."
  value       = module.ecr.repository_url
}

output "irsa_role_arn" {
  description = "IAM role ARN for the LinkForge service account."
  value       = module.irsa.role_arn
}

output "vpc_id" {
  description = "VPC ID."
  value       = module.vpc.vpc_id
}

output "private_subnet_ids" {
  description = "Private subnet IDs."
  value       = module.vpc.private_subnet_ids
}

output "rds_endpoint" {
  description = "RDS hostname, or an empty string when RDS is disabled."
  value       = var.enable_rds ? module.rds[0].endpoint : ""
}

output "rds_master_user_secret_arn" {
  description = "RDS-managed secret ARN, or an empty string when RDS is disabled."
  value       = var.enable_rds ? module.rds[0].master_user_secret_arn : ""
}
