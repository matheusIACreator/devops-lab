param(
  [Parameter(Mandatory)][ValidatePattern('^[a-f0-9]{40}$')][string]$ImageTag,
  [switch]$SkipBuild
)
$ErrorActionPreference = 'Stop'
Set-StrictMode -Version Latest
Set-Location (Split-Path $PSScriptRoot -Parent)
$tf = if (Test-Path '.tools/terraform/terraform.exe') { (Resolve-Path '.tools/terraform/terraform.exe').Path } else { 'terraform' }
function Check-Exit { if ($LASTEXITCODE -ne 0) { throw "Comando falhou: código $LASTEXITCODE" } }
$outputs = & $tf '-chdir=infra' output -json
Check-Exit
$infra = ($outputs -join "`n") | ConvertFrom-Json
$registry = $infra.registry_name.value
$image = "$($infra.registry_server.value)/devops-lab:$ImageTag"
if (!$SkipBuild) {
  az acr build --registry $registry --image "devops-lab:$ImageTag" .
  Check-Exit
}
# O Terraform também atualiza probes e porta no primeiro deploy.
& $tf '-chdir=infra' plan "-var=image=$image" '-var=app_port=3000' "-var=revision=$ImageTag" '-out=app.tfplan'
Check-Exit
Write-Host "Plano pronto em infra/app.tfplan. Revise antes de aplicar:"
Write-Host "$tf -chdir=infra apply app.tfplan"
Write-Host "Depois: node scripts/smoke.mjs $($infra.url.value) $ImageTag"
Write-Host 'Persistir image, app_port e revision em terraform.tfvars evita voltar ao bootstrap em um próximo apply.'
