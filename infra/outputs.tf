output "url" {
  value = "https://${azurerm_container_app.lab.ingress[0].fqdn}"
}
output "resource_group" {
  value = azurerm_resource_group.lab.name
}
output "app_name" {
  value = azurerm_container_app.lab.name
}
output "registry_name" {
  value = azurerm_container_registry.lab.name
}
output "registry_server" {
  value = azurerm_container_registry.lab.login_server
}
output "workspace_id" {
  value = azurerm_log_analytics_workspace.lab.workspace_id
}
