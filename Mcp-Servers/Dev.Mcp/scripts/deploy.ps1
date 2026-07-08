# Deploy script for Dev.Mcp
# Usage: .\deploy.ps1 [-Target <path>] [-Configuration <Release|Debug>]
# Default target: C:\Develop\.apps\dev-mcp
#
# Publishes a self-contained single-file win-x64 build, ships appsettings.json
# explicitly (NOT auto-copied for Microsoft.NET.Sdk), cleans the target first so
# no stale/foreign files remain, then verifies the required files.

param(
    [string]$Target        = "C:\Develop\.apps\dev-mcp",
    [string]$Configuration = "Release"
)

$ErrorActionPreference = "Stop"
$ProjectRoot = Split-Path $PSScriptRoot -Parent
$CsprojPath  = Join-Path $ProjectRoot "Dev.Mcp\Dev.Mcp.csproj"
$AppSettings = Join-Path $ProjectRoot "Dev.Mcp\appsettings.json"

Write-Host "=== Dev.Mcp Deploy ===" -ForegroundColor Cyan
Write-Host "Source : $ProjectRoot"
Write-Host "Target : $Target"
Write-Host "Config : $Configuration"
Write-Host ""

# --- Guard: the target server must not be running (it would lock Dev.Mcp.exe) ---
$proc = Get-Process -Name "Dev.Mcp" -ErrorAction SilentlyContinue
if ($proc) {
    throw "Dev.Mcp is running (PID $($proc.Id -join ', ')). Stop the MCP session / process before deploying, then re-run."
}

# --- Build & Publish ---
Write-Host "[1/4] Publishing .NET project..." -ForegroundColor Yellow
$publishDir = Join-Path $ProjectRoot "publish-output"
if (Test-Path $publishDir) { Remove-Item $publishDir -Recurse -Force }

dotnet publish $CsprojPath `
    --configuration $Configuration `
    --runtime win-x64 `
    --self-contained true `
    -p:PublishSingleFile=true `
    --output $publishDir

if ($LASTEXITCODE -ne 0) { throw "dotnet publish failed (exit $LASTEXITCODE)" }

# appsettings.json is NOT part of the default content globs for Microsoft.NET.Sdk
# (non-Web), so publish does not emit it. It is shipped directly into the target
# after the copy step below (unambiguous file->file copy).
if (-not (Test-Path $AppSettings)) { throw "appsettings.json not found at $AppSettings" }
Write-Host "      Publish OK" -ForegroundColor Green

# --- Clean target ---
Write-Host "[2/4] Cleaning target..." -ForegroundColor Yellow
if (Test-Path $Target) {
    try {
        Get-ChildItem -LiteralPath $Target -Force | Remove-Item -Recurse -Force
    } catch {
        throw "Failed to clean '$Target' (file locked? target process still running?): $($_.Exception.Message)"
    }
} else {
    New-Item -ItemType Directory -Force $Target | Out-Null
}
Write-Host "      Target cleaned" -ForegroundColor Green

# --- Copy to target ---
Write-Host "[3/4] Copying to target..." -ForegroundColor Yellow
Copy-Item "$publishDir\*" $Target -Recurse -Force
# Ship appsettings.json directly into the target root (publish does not emit it
# for a non-Web SDK; a direct file->file copy is robust regardless of layout).
Copy-Item -LiteralPath $AppSettings -Destination (Join-Path $Target "appsettings.json") -Force
Remove-Item $publishDir -Recurse -Force
Write-Host "      Copy OK (+ appsettings.json)" -ForegroundColor Green

# --- Verify ---
Write-Host "[4/4] Verifying..." -ForegroundColor Yellow
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
