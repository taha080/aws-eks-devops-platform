variable "aws_region" {
  description = "AWS region for the prod stack."
  type        = string
  default     = "us-east-1"
}

variable "project" {
  description = "Project name."
  type        = string
  default     = "linkforge"
}

variable "environment" {
  description = "Environment name."
  type        = string
  default     = "prod"
}

variable "endpoint_public_access" {
  description = "Expose the Kubernetes API publicly. The default is private; set your IP in public_access_cidrs before turning this on."
  type        = bool
  default     = false
}

variable "public_access_cidrs" {
  description = "CIDRs allowed to call the public EKS API. Used only when endpoint_public_access is true."
  type        = list(string)
  default     = []
}

variable "admin_principal_arns" {
  description = "Optional IAM principal ARNs to grant cluster admin. Do not commit real account IDs."
  type        = list(string)
  default     = []
}
