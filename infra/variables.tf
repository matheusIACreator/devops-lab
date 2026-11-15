variable "subscription_id" {
  type        = string
  description = "ID da assinatura Azure que receberá o laboratório."
}

variable "name" {
  type    = string
  default = "devops-lab"
  validation {
    condition     = can(regex("^[a-z][a-z0-9-]{2,19}$", var.name))
    error_message = "Use de 3 a 20 letras minúsculas, números e hífens."
  }
}

variable "location" {
  type    = string
  default = "francecentral"
}

variable "resource_group_location" {
  type        = string
  default     = "westeurope"
  description = "Local dos metadados do grupo; independente da região dos recursos."
}

variable "existing_environment_id" {
  type        = string
  default     = null
  description = "Opcional: ambiente Container Apps já existente, apenas referenciado e nunca alterado/destruído por este projeto."
}

variable "workload_profile_name" {
  type        = string
  default     = "Consumption"
  description = "Perfil de consumo do ambiente; use null para ambientes legados sem perfis."
}

variable "image" {
  type        = string
  default     = "mcr.microsoft.com/k8se/quickstart:latest"
  description = "Imagem inicial pública; depois use a imagem do ACR."
}

variable "app_port" {
  type        = number
  default     = 80
  description = "80 para a imagem inicial, 3000 para a aplicação do laboratório."
}

variable "revision" {
  type    = string
  default = "bootstrap"
}

variable "expires_on" {
  type    = string
  default = "2026-11-19"
}
