provider "aws" {
  region = var.aws_region

  default_tags {
    tags = {
      Project     = var.project
      Environment = var.environment
      ManagedBy   = "terraform"
    }
  }
}

module "platform" {
  source = "../../modules/platform"

  project     = var.project
  environment = var.environment
  aws_region  = var.aws_region

  vpc_cidr           = "10.30.0.0/16"
  az_count           = 3
  single_nat_gateway = false
  enable_flow_logs   = true

  kubernetes_version     = "1.35"
  node_instance_types    = ["t3.medium"]
  node_desired_size      = 3
  node_min_size          = 2
  node_max_size          = 6
  endpoint_public_access = var.endpoint_public_access
  public_access_cidrs    = var.public_access_cidrs
  admin_principal_arns   = var.admin_principal_arns

  enable_rds         = true
  rds_instance_class = "db.t4g.small"
  rds_multi_az       = true
}
