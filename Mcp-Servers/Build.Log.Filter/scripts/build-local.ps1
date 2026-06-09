$ErrorActionPreference = 'Stop'

$SrcDir = Split-Path $PSScriptRoot -Parent

Write-Host "Building local Docker image: dv-build-log-filter-mcp:local"

docker build `
  -f "$SrcDir/Build.Log.Filter/Dockerfile" `
  -t dv-build-log-filter-mcp:local `
  $SrcDir

Write-Host "Done: dv-build-log-filter-mcp:local"
