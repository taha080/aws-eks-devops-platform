variable "aws_region" {
  description = "Region for the state bucket and lock table."
  type        = string
  default     = "us-east-1"
}

variable "project" {
  description = "Project tag."
  type        = string
  default     = "linkforge"
}

variable "state_bucket_name" {
  description = "Globally unique name for the Terraform state bucket. Set this at apply time, for example linkforge-tfstate-<unique-suffix>."
  type        = string
}

variable "lock_table_name" {
  description = "DynamoDB table used for state locking."
  type        = string
  default     = "linkforge-terraform-locks"
}
