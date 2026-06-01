$ErrorActionPreference = 'Stop'

$SrcDir = Split-Path $PSScriptRoot -Parent

Write-Host "Building local Docker image: dv-generic-rtk-mcp:local"

docker build `
  -f "$SrcDir/Generic.Rtk/Dockerfile" `
  -t dv-generic-rtk-mcp:local `
  $SrcDir

Write-Host "Done: dv-generic-rtk-mcp:local"
