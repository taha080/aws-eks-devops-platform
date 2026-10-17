output "cluster_name" {
  description = "EKS cluster name."
  value       = aws_eks_cluster.this.name
}

output "cluster_endpoint" {
  description = "Kubernetes API endpoint."
  value       = aws_eks_cluster.this.endpoint
}

output "cluster_certificate_authority" {
  description = "Base64 cluster CA certificate."
  value       = aws_eks_cluster.this.certificate_authority[0].data
}

output "cluster_security_group_id" {
  description = "Security group EKS attaches to managed nodes."
  value       = aws_eks_cluster.this.vpc_config[0].cluster_security_group_id
}

output "oidc_provider_arn" {
  description = "IAM OIDC provider ARN."
  value       = aws_iam_openid_connect_provider.this.arn
}

output "oidc_provider_url" {
  description = "OIDC issuer host without the https:// scheme."
  value       = replace(aws_iam_openid_connect_provider.this.url, "https://", "")
}

output "node_role_arn" {
  description = "Managed node IAM role ARN."
  value       = aws_iam_role.node.arn
}

output "kms_key_arn" {
  description = "KMS key used for Kubernetes secret encryption."
  value       = aws_kms_key.secrets.arn
}

output "region" {
  description = "Region the cluster was created in."
  value       = data.aws_region.current.region
}
