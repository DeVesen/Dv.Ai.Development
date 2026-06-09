$ErrorActionPreference = 'Stop'

$SrcDir = Split-Path $PSScriptRoot -Parent

Write-Host "Building local Docker image: dv-dev-angular-mcp:local"

docker build `
  -f "$SrcDir/Dev.Angular.Mcp/Dockerfile" `
  -t dv-dev-angular-mcp:local `
  $SrcDir

Write-Host "Done: dv-dev-angular-mcp:local"
