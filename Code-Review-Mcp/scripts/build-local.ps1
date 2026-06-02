$ErrorActionPreference = 'Stop'

$SrcDir = Split-Path $PSScriptRoot -Parent

$Tag = Read-Host "Local image tag (default: code-review-mcp:local)"
if (-not $Tag) { $Tag = 'code-review-mcp:local' }

Write-Host "Building $Tag ..."

docker build `
  -f "$SrcDir/Dockerfile" `
  -t $Tag `
  $SrcDir

Write-Host "Done: $Tag"
