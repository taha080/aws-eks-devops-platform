variable "project" {
  description = "Short project name used in resource names."
  type        = string
  default     = "linkforge"
}

variable "environment" {
  description = "Environment name, for example dev or prod."
  type        = string
}

variable "aws_region" {
  description = "AWS region. Passed through so the IRSA secret ARN matches the provider region."
  type        = string
}

variable "vpc_cidr" {
  description = "CIDR block for this environment's VPC."
  type        = string
}

variable "az_count" {
  description = "Number of availability zones."
  type        = number
  default     = 2
}

variable "single_nat_gateway" {
  description = "Share one NAT gateway across private subnets."
  type        = bool
  default     = true
}

variable "enable_flow_logs" {
  description = "Enable VPC flow logs."
  type        = bool
  default     = false
}

variable "kubernetes_version" {
  description = "EKS Kubernetes version."
  type        = string
  default     = "1.35"
}

variable "node_instance_types" {
  description = "Managed node group instance types."
  type        = list(string)
  default     = ["t3.small"]
}

variable "node_desired_size" {
  description = "Desired node count."
  type        = number
  default     = 2
}

variable "node_min_size" {
  description = "Minimum node count."
  type        = number
  default     = 1
}

variable "node_max_size" {
  description = "Maximum node count."
  type        = number
  default     = 3
}

variable "endpoint_public_access" {
  description = "Expose the Kubernetes API publicly. Leave false unless public_access_cidrs is restricted."
  type        = bool
  default     = false
}

variable "public_access_cidrs" {
  description = "CIDRs allowed to reach the public EKS API. Required when endpoint_public_access is true."
  type        = list(string)
  default     = []
}

variable "admin_principal_arns" {
  description = "Extra IAM principals to register as cluster admins."
  type        = list(string)
  default     = []
}

variable "enable_rds" {
  description = "Create a private PostgreSQL instance. Dev leaves this off."
  type        = bool
  default     = false
}

variable "rds_instance_class" {
  description = "RDS instance class, used when enable_rds is true."
  type        = string
  default     = "db.t4g.micro"
}

variable "rds_multi_az" {
  description = "Enable a Multi-AZ RDS deployment."
  type        = bool
  default     = false
}

variable "k8s_namespace" {
  description = "Namespace of the LinkForge service account."
  type        = string
  default     = "linkforge"
}

variable "k8s_service_account" {
  description = "LinkForge service account name."
  type        = string
  default     = "linkforge"
}

variable "tags" {
  description = "Extra tags merged into the standard set."
  type        = map(string)
  default     = {}
}
