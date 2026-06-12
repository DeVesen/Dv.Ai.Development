$ErrorActionPreference = 'Stop'

$SrcDir = Split-Path $PSScriptRoot -Parent

Write-Host "Building local Docker image: dv-dev-dotnet-mcp:local"

docker build `
  -f "$SrcDir/Dev.Dotnet.Mcp/Dockerfile" `
  -t dv-dev-dotnet-mcp:local `
  $SrcDir

Write-Host "Done: dv-dev-dotnet-mcp:local"
