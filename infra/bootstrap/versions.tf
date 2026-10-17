terraform {
  required_version = ">= 1.6.0"

  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 6.0"
    }
  }

  # Apply this stack once, before the environment stacks. It intentionally uses
  # local state. After the bucket exists, migrate this state with `terraform init -migrate-state`
  # only if you want the bootstrap stack itself stored remotely.
  backend "local" {}
}
