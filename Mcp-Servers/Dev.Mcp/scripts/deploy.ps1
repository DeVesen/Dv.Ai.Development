# Deploy script for Dev.Mcp
# Usage: .\deploy.ps1 [-Target <path>] [-Configuration <Release|Debug>]
# Default target: C:\Develop\.apps\dev-mcp

param(
    [string]$Target        = "C:\Develop\.apps\dev-mcp",
    [string]$Configuration = "Release"
)

$ErrorActionPreference = "Stop"
$ProjectRoot = Split-Path $PSScriptRoot -Parent
$CsprojPath  = Join-Path $ProjectRoot "Dev.Mcp\Dev.Mcp.csproj"

Write-Host "=== Dev.Mcp Deploy ===" -ForegroundColor Cyan
Write-Host "Source : $ProjectRoot"
Write-Host "Target : $Target"
Write-Host "Config : $Configuration"
Write-Host ""

# --- Build & Publish ---
Write-Host "[1/3] Publishing .NET project..." -ForegroundColor Yellow
$publishDir = Join-Path $ProjectRoot "publish-output"
if (Test-Path $publishDir) { Remove-Item $publishDir -Recurse -Force }

dotnet publish $CsprojPath `
    --configuration $Configuration `
    --runtime win-x64 `
    --self-contained true `
    -p:PublishSingleFile=true `
    --output $publishDir

if ($LASTEXITCODE -ne 0) { throw "dotnet publish failed (exit $LASTEXITCODE)" }
Write-Host "      Publish OK" -ForegroundColor Green

# --- Copy to target ---
Write-Host "[2/3] Copying to target..." -ForegroundColor Yellow
if (-not (Test-Path $Target)) {
    New-Item -ItemType Directory -Force $Target | Out-Null
}
Copy-Item "$publishDir\*" $Target -Recurse -Force
Remove-Item $publishDir -Recurse -Force
Write-Host "      Copy OK" -ForegroundColor Green

# --- Verify ---
Write-Host "[3/3] Verifying..." -ForegroundColor Yellow
$required = @(
    "Dev.Mcp.exe",
    "appsettings.json"
)
$allOk = $true
foreach ($rel in $required) {
    $full = Join-Path $Target $rel
    if (Test-Path $full) {
        Write-Host "      OK  $rel" -ForegroundColor Green
    } else {
        Write-Host "      MISSING  $rel" -ForegroundColor Red
        $allOk = $false
    }
}

Write-Host ""
if ($allOk) {
    Write-Host "Deploy completed successfully -> $Target" -ForegroundColor Green
} else {
    Write-Host "Deploy completed with missing files (see above)." -ForegroundColor Red
    exit 1
}
