variable "cluster_name" {
  description = "EKS cluster name."
  type        = string
}

variable "kubernetes_version" {
  description = "Control plane version. 1.35 is the default used by the sample environments. EKS 1.37 is the latest standard-support release as of October 2026."
  type        = string
  default     = "1.35"
}

variable "private_subnet_ids" {
  description = "Private subnets for the control plane ENIs and the managed node group."
  type        = list(string)
}

variable "endpoint_public_access" {
  description = "Expose the Kubernetes API on the internet. Keep this false unless public_access_cidrs is limited to known networks."
  type        = bool
  default     = false
}

variable "public_access_cidrs" {
  description = "CIDR blocks allowed to reach the public API endpoint. Used only when endpoint_public_access is true."
  type        = list(string)
  default     = []
}

variable "enabled_log_types" {
  description = "Control plane log types shipped to CloudWatch."
  type        = list(string)
  default     = ["api", "audit", "authenticator"]
}

variable "log_retention_days" {
  description = "Retention for the control plane log group."
  type        = number
  default     = 30
}

variable "kms_deletion_window" {
  description = "Days before the secrets-encryption key is removed."
  type        = number
  default     = 7
}

variable "node_instance_types" {
  description = "Instance types for the managed node group."
  type        = list(string)
  default     = ["t3.small"]
}

variable "node_capacity_type" {
  description = "ON_DEMAND or SPOT."
  type        = string
  default     = "ON_DEMAND"
}

variable "node_desired_size" {
  description = "Initial desired node count. Later changes made outside Terraform are ignored."
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

variable "admin_principal_arns" {
  description = "IAM principals granted cluster admin through EKS access entries. Leave empty to keep only the cluster creator."
  type        = list(string)
  default     = []
}

variable "deletion_protection" {
  description = "Block cluster deletion until this is turned off. Leave false so a demo can be destroyed in one apply."
  type        = bool
  default     = false
}

variable "tags" {
  description = "Tags applied to cluster resources."
  type        = map(string)
  default     = {}
}
