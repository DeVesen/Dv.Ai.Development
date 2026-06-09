$ErrorActionPreference = 'Stop'

$SrcDir = Split-Path $PSScriptRoot -Parent

Write-Host "Building local Docker image: dv-filesystem-mcp:local"

docker build `
  -f "$SrcDir/Dockerfile" `
  -t dv-filesystem-mcp:local `
  $SrcDir

Write-Host "Done: dv-filesystem-mcp:local"
