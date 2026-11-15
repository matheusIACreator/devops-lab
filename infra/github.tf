variable "github_repository" {
  type        = string
  default     = null
  description = "Repositorio owner/name autorizado a publicar pelo environment azure-lab."
  validation {
    condition     = var.github_repository == null ? true : can(regex("^[A-Za-z0-9_.-]+/[A-Za-z0-9_.-]+$", var.github_repository))
    error_message = "Use owner/repository, sem URL."
  }
}

variable "github_oidc_subject" {
  type        = string
  default     = null
  description = "Claim sub exato do GitHub; repositorios novos incluem owner_id e repo_id."
  validation {
    condition     = var.github_oidc_subject == null ? true : can(regex("^repo:[A-Za-z0-9_.-]+(@[0-9]+)?/[A-Za-z0-9_.-]+(@[0-9]+)?:environment:azure-lab$", var.github_oidc_subject))
    error_message = "Informe o sub exato para o environment azure-lab, incluindo IDs imutaveis quando presentes."
  }
}

resource "azurerm_user_assigned_identity" "github" {
  count               = var.github_repository == null ? 0 : 1
  name                = "id-${var.name}-github"
  resource_group_name = azurerm_resource_group.lab.name
  location            = var.location
  tags                = local.tags
}

resource "azurerm_federated_identity_credential" "github" {
  count                     = var.github_repository == null ? 0 : 1
  name                      = "github-azure-lab"
  user_assigned_identity_id = azurerm_user_assigned_identity.github[0].id
  audience                  = ["api://AzureADTokenExchange"]
  issuer                    = "https://token.actions.githubusercontent.com"
  subject                   = var.github_oidc_subject == null ? "" : var.github_oidc_subject
  lifecycle {
    precondition {
      condition     = var.github_oidc_subject != null
      error_message = "Configure github_oidc_subject com o claim sub exato antes de habilitar o deploy."
    }
  }
}

resource "azurerm_role_assignment" "github_app" {
  count                = var.github_repository == null ? 0 : 1
  scope                = azurerm_container_app.lab.id
  role_definition_name = "Container Apps Contributor"
  principal_id         = azurerm_user_assigned_identity.github[0].principal_id
}

resource "azurerm_role_assignment" "github_push" {
  count                = var.github_repository == null ? 0 : 1
  scope                = azurerm_container_registry.lab.id
  role_definition_name = "AcrPush"
  principal_id         = azurerm_user_assigned_identity.github[0].principal_id
}

resource "azurerm_role_assignment" "github_registry_reader" {
  count                = var.github_repository == null ? 0 : 1
  scope                = azurerm_container_registry.lab.id
  role_definition_name = "Reader"
  principal_id         = azurerm_user_assigned_identity.github[0].principal_id
}

resource "azurerm_role_assignment" "github_identity" {
  count                = var.github_repository == null ? 0 : 1
  scope                = azurerm_user_assigned_identity.app.id
  role_definition_name = "Managed Identity Operator"
  principal_id         = azurerm_user_assigned_identity.github[0].principal_id
}

resource "azurerm_role_assignment" "github_environment" {
  count                = var.github_repository == null ? 0 : 1
  scope                = azurerm_container_app.lab.container_app_environment_id
  role_definition_name = "Container Apps Operator"
  principal_id         = azurerm_user_assigned_identity.github[0].principal_id
}

output "github_client_id" {
  value = var.github_repository == null ? null : azurerm_user_assigned_identity.github[0].client_id
}

output "github_tenant_id" {
  value = var.github_repository == null ? null : azurerm_user_assigned_identity.github[0].tenant_id
}

output "github_oidc_subject" {
  value = var.github_repository == null ? null : var.github_oidc_subject
}
