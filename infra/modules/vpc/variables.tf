variable "name" {
  description = "Prefix used for VPC resource names."
  type        = string
}

variable "cluster_name" {
  description = "EKS cluster name, used to tag subnets for Kubernetes."
  type        = string
}

variable "cidr_block" {
  description = "VPC CIDR block. Subnets are carved as /20 networks."
  type        = string
}

variable "az_count" {
  description = "Number of availability zones to use. EKS requires at least two."
  type        = number
  default     = 2

  validation {
    condition     = var.az_count >= 2 && var.az_count <= 3
    error_message = "az_count must be 2 or 3."
  }
}

variable "single_nat_gateway" {
  description = "Use one NAT gateway for every private subnet. Cheaper, and a single point of egress failure."
  type        = bool
  default     = true
}

variable "enable_flow_logs" {
  description = "Send VPC flow logs to CloudWatch. Leave this off unless you want the extra log cost."
  type        = bool
  default     = false
}

variable "tags" {
  description = "Tags applied to every resource in the module."
  type        = map(string)
  default     = {}
}
