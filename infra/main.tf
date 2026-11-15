locals {
  tags = {
    project    = var.name
    purpose    = "learning"
    expires_on = var.expires_on
    managed_by = "terraform"
  }
}

resource "azurerm_resource_group" "lab" {
  name     = "rg-${var.name}"
  location = var.resource_group_location
  tags     = local.tags
}

resource "azurerm_log_analytics_workspace" "lab" {
  count               = var.existing_environment_id == null ? 1 : 0
  name                = "log-${var.name}"
  resource_group_name = azurerm_resource_group.lab.name
  location            = var.location
  sku                 = "PerGB2018"
  retention_in_days   = 30
  daily_quota_gb      = 0.1
  tags                = local.tags
}

resource "azurerm_container_registry" "lab" {
  name                = "lab${substr(sha256(azurerm_resource_group.lab.id), 0, 16)}"
  resource_group_name = azurerm_resource_group.lab.name
  location            = var.location
  sku                 = "Basic"
  admin_enabled       = false
  tags                = local.tags
}

resource "azurerm_user_assigned_identity" "app" {
  name                = "id-${var.name}"
  resource_group_name = azurerm_resource_group.lab.name
  location            = var.location
  tags                = local.tags
}

resource "azurerm_role_assignment" "pull" {
  scope                = azurerm_container_registry.lab.id
  role_definition_name = "AcrPull"
  principal_id         = azurerm_user_assigned_identity.app.principal_id
}

resource "azurerm_container_app_environment" "lab" {
  count                      = var.existing_environment_id == null ? 1 : 0
  name                       = "cae-${var.name}"
  resource_group_name        = azurerm_resource_group.lab.name
  location                   = var.location
  log_analytics_workspace_id = azurerm_log_analytics_workspace.lab[0].id
  tags                       = local.tags
}

resource "azurerm_container_app" "lab" {
  name                         = "ca-${var.name}"
  resource_group_name          = azurerm_resource_group.lab.name
  container_app_environment_id = var.existing_environment_id != null ? var.existing_environment_id : azurerm_container_app_environment.lab[0].id
  revision_mode                = "Single"
  tags                         = local.tags

  identity {
    type         = "UserAssigned"
    identity_ids = [azurerm_user_assigned_identity.app.id]
  }

  registry {
    server   = azurerm_container_registry.lab.login_server
    identity = azurerm_user_assigned_identity.app.id
  }

  ingress {
    external_enabled           = true
    target_port                = var.app_port
    allow_insecure_connections = false
    traffic_weight {
      latest_revision = true
      percentage      = 100
    }
  }

  template {
    min_replicas = 0
    max_replicas = 2
    http_scale_rule {
      name                = "http"
      concurrent_requests = "20"
    }
    container {
      name   = "web"
      image  = var.image
      cpu    = 0.25
      memory = "0.5Gi"
      env {
        name  = "APP_REVISION"
        value = var.revision
      }
      env {
        name  = "APP_ENVIRONMENT"
        value = "azure"
      }
      readiness_probe {
        transport = "HTTP"
        port      = var.app_port
        path      = var.app_port == 3000 ? "/api/health" : "/"
      }
      liveness_probe {
        transport        = "HTTP"
        port             = var.app_port
        path             = var.app_port == 3000 ? "/api/health" : "/"
        initial_delay    = 30
        interval_seconds = 30
      }
    }
  }

  depends_on = [azurerm_role_assignment.pull]
}
