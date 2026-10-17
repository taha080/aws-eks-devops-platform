variable "name" {
  description = "Repository name."
  type        = string
}

variable "image_tag_mutability" {
  description = "MUTABLE or IMMUTABLE. IMMUTABLE fits pipelines that push a git SHA once."
  type        = string
  default     = "IMMUTABLE"
}

variable "keep_last" {
  description = "How many images to retain."
  type        = number
  default     = 30
}

variable "force_delete" {
  description = "Delete the repository even when it still contains images. Useful for a demo teardown."
  type        = bool
  default     = true
}

variable "tags" {
  description = "Tags applied to the repository."
  type        = map(string)
  default     = {}
}
