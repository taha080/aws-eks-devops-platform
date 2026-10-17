variable "name" {
  description = "IAM role name."
  type        = string
}

variable "oidc_provider_arn" {
  description = "ARN of the cluster's IAM OIDC provider."
  type        = string
}

variable "oidc_provider_url" {
  description = "OIDC issuer host without the https:// scheme."
  type        = string
}

variable "namespace" {
  description = "Kubernetes namespace of the service account allowed to assume the role."
  type        = string
}

variable "service_account_name" {
  description = "Kubernetes service account allowed to assume the role."
  type        = string
}

variable "policy_json" {
  description = "IAM policy document granted to the role."
  type        = string
}

variable "tags" {
  description = "Tags applied to the role and policy."
  type        = map(string)
  default     = {}
}
