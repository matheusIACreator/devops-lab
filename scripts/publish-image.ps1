param([string]$Registry = 'lab5c1e2bfd43205c96')
$ErrorActionPreference = 'Stop'
Set-StrictMode -Version Latest
Set-Location (Split-Path $PSScriptRoot -Parent)
function Check-Exit { if ($LASTEXITCODE -ne 0) { throw "Comando falhou: exit code $LASTEXITCODE" } }
$tag = git rev-parse HEAD
Check-Exit
$server = az acr show -n $Registry --query loginServer -o tsv
Check-Exit
$image = "$server/devops-lab:$tag"
docker build -t $image .
Check-Exit
$container = docker run -d --rm -p 127.0.0.1:3001:3000 -e "APP_REVISION=$tag" -e APP_ENVIRONMENT=docker $image
Check-Exit
try {
  node scripts/smoke.mjs http://127.0.0.1:3001 $tag
  Check-Exit
} finally { docker stop $container | Out-Null }
az acr login -n $Registry
Check-Exit
docker push $image
Check-Exit
Write-Host "Imagem publicada: $image"
Write-Host 'Nenhuma infraestrutura foi alterada por este script.'
