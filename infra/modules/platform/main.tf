data "aws_caller_identity" "current" {}

locals {
  name = "${var.project}-${var.environment}"
  tags = merge(var.tags, {
    Project     = var.project
    Environment = var.environment
    ManagedBy   = "terraform"
  })
  secret_resources = var.enable_rds ? [module.rds[0].master_user_secret_arn] : [
    "arn:aws:secretsmanager:${var.aws_region}:${data.aws_caller_identity.current.account_id}:secret:${var.project}/${var.environment}/*"
  ]
}

module "vpc" {
  source = "../vpc"

  name               = local.name
  cluster_name       = local.name
  cidr_block         = var.vpc_cidr
  az_count           = var.az_count
  single_nat_gateway = var.single_nat_gateway
  enable_flow_logs   = var.enable_flow_logs
  tags               = local.tags
}

module "eks" {
  source = "../eks"

  cluster_name           = local.name
  kubernetes_version     = var.kubernetes_version
  private_subnet_ids     = module.vpc.private_subnet_ids
  endpoint_public_access = var.endpoint_public_access
  public_access_cidrs    = var.public_access_cidrs
  admin_principal_arns   = var.admin_principal_arns

  node_instance_types = var.node_instance_types
  node_desired_size   = var.node_desired_size
  node_min_size       = var.node_min_size
  node_max_size       = var.node_max_size
  tags                = local.tags
}

module "ecr" {
  source = "../ecr"

  name = local.name
  tags = local.tags
}

module "rds" {
  count  = var.enable_rds ? 1 : 0
  source = "../rds"

  identifier                = local.name
  vpc_id                    = module.vpc.vpc_id
  private_subnet_ids        = module.vpc.private_subnet_ids
  cluster_security_group_id = module.eks.cluster_security_group_id
  instance_class            = var.rds_instance_class
  multi_az                  = var.rds_multi_az
  tags                      = local.tags
}

module "irsa" {
  source = "../iam-irsa"

  name                 = "${local.name}-api"
  oidc_provider_arn    = module.eks.oidc_provider_arn
  oidc_provider_url    = module.eks.oidc_provider_url
  namespace            = var.k8s_namespace
  service_account_name = var.k8s_service_account
  tags                 = local.tags

  policy_json = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Sid    = "ReadApplicationSecrets"
        Effect = "Allow"
        Action = [
          "secretsmanager:GetSecretValue",
          "secretsmanager:DescribeSecret",
        ]
        Resource = local.secret_resources
      }
    ]
  })
}
