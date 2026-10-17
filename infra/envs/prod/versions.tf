terraform {
  required_version = ">= 1.6.0"

  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 6.0"
    }
    tls = {
      source  = "hashicorp/tls"
      version = "~> 4.0"
    }
  }

  # Copy backend.hcl.example to backend.hcl (gitignored) after the bootstrap stack
  # has created the bucket and lock table, then run:
  #   terraform init -backend-config=backend.hcl
  # CI uses `terraform init -backend=false` and never needs those values.
  backend "s3" {}
}
