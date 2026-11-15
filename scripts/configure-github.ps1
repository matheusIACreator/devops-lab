param(
  [Parameter(Mandatory)][ValidatePattern('^[A-Za-z0-9_.-]+/[A-Za-z0-9_.-]+$')][string]$Repository,
  [Parameter(Mandatory)][guid]$SubscriptionId
)
$ErrorActionPreference = 'Stop'
Set-StrictMode -Version Latest
Set-Location (Split-Path $PSScriptRoot -Parent)
$env:GIT_TERMINAL_PROMPT = '0'
$env:GCM_INTERACTIVE = 'never'
$credentialLines = "protocol=https`nhost=github.com`n`n" | git credential fill
if ($LASTEXITCODE -ne 0) { throw 'GitHub authentication unavailable in Git Credential Manager.' }
$credential = @{}
foreach ($line in $credentialLines) {
  if ($line -match '^([^=]+)=(.*)$') { $credential[$matches[1]] = $matches[2] }
}
if (!$credential['password']) { throw 'GitHub credential missing.' }
$headers = @{ Authorization = ('Bearer ' + $credential['password']); Accept = 'application/vnd.github+json'; 'X-GitHub-Api-Version' = '2022-11-28' }
function Invoke-RepoApi {
  param([string]$Method, [string]$Path, $Body)
  $parameters = @{ Method = $Method; Uri = "https://api.github.com/repos/$Repository/$Path".TrimEnd('/'); Headers = $headers }
  if ($null -ne $Body) { $parameters.ContentType = 'application/json'; $parameters.Body = ($Body | ConvertTo-Json -Depth 10 -Compress) }
  Invoke-RestMethod @parameters
}
$tf = if (Test-Path '.tools/terraform/terraform.exe') { (Resolve-Path '.tools/terraform/terraform.exe').Path } else { 'terraform' }
$rawOutputs = & $tf '-chdir=infra' output -json
if ($LASTEXITCODE -ne 0) { throw 'Terraform outputs unavailable.' }
$outputs = ($rawOutputs -join "`n") | ConvertFrom-Json
$repo = Invoke-RepoApi -Method GET -Path '' -Body $null
if (!$repo.permissions.admin) { throw 'Repository administration permission required.' }
$oidc = Invoke-RepoApi -Method GET -Path 'actions/oidc/customization/sub' -Body $null
if (!$oidc.use_default -or !$oidc.PSObject.Properties['sub_claim_prefix']) {
  throw 'Custom OIDC subject: inspect the GitHub sub claim and configure the Azure trust explicitly.'
}
$expectedSubject = "$($oidc.sub_claim_prefix):environment:azure-lab"
if ($outputs.github_oidc_subject.value -ne $expectedSubject) {
  throw "OIDC subject mismatch. Configure github_oidc_subject = `"$expectedSubject`" and apply Terraform first."
}

# Only main may obtain an environment OIDC token. Existing environments are preserved.
$environmentNames = @((Invoke-RepoApi -Method GET -Path 'environments' -Body $null).environments | ForEach-Object { $_.name })
if ('azure-lab' -notin $environmentNames) {
  Invoke-RepoApi -Method PUT -Path 'environments/azure-lab' -Body @{ deployment_branch_policy = @{ protected_branches = $false; custom_branch_policies = $true } } | Out-Null
  Invoke-RepoApi -Method POST -Path 'environments/azure-lab/deployment-branch-policies' -Body @{ name = 'main'; type = 'branch' } | Out-Null
}
$values = [ordered]@{
  AZURE_CLIENT_ID       = $outputs.github_client_id.value
  AZURE_TENANT_ID       = $outputs.github_tenant_id.value
  AZURE_SUBSCRIPTION_ID = $SubscriptionId.ToString()
  AZURE_REGISTRY_NAME   = $outputs.registry_name.value
  AZURE_RESOURCE_GROUP  = $outputs.resource_group.value
  AZURE_APP_NAME        = $outputs.app_name.value
}
$existingVariables = @((Invoke-RepoApi -Method GET -Path 'environments/azure-lab/variables' -Body $null).variables | ForEach-Object { $_.name })
foreach ($name in $values.Keys) {
  $body = @{ name = $name; value = $values[$name] }
  if ($name -in $existingVariables) {
    Invoke-RepoApi -Method PATCH -Path "environments/azure-lab/variables/$name" -Body $body | Out-Null
  } else {
    Invoke-RepoApi -Method POST -Path 'environments/azure-lab/variables' -Body $body | Out-Null
  }
  Write-Host "Configured: $name"
}
Write-Host "GitHub environment ready: $Repository / azure-lab. No client secret created."
