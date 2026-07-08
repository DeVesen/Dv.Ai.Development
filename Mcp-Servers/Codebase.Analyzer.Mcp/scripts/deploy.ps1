# Deploy script for Codebase.Analyzer.Mcp
# Usage: .\deploy.ps1 [-Target <path>]
# Default target: C:\Develop\.apps\codebase-analyzer
#
# Builds the TypeScript, cleans the target first (no stale files), then ships the
# compiled dist output, the roslyn-analyzer .csx scripts, production-only
# node_modules (npm ci --omit=dev) and package.json.

param(
    [string]$Target = "C:\Develop\.apps\codebase-analyzer"
)

$ErrorActionPreference = "Stop"
$ProjectRoot = Split-Path $PSScriptRoot -Parent

Write-Host "=== Codebase.Analyzer.Mcp Deploy ===" -ForegroundColor Cyan
Write-Host "Source : $ProjectRoot"
Write-Host "Target : $Target"
Write-Host ""

# --- Build ---
Write-Host "[1/5] Building TypeScript..." -ForegroundColor Yellow
Push-Location $ProjectRoot
try {
    npm run build
    if ($LASTEXITCODE -ne 0) { throw "Build failed (exit $LASTEXITCODE)" }
} finally {
    Pop-Location
}
Write-Host "      Build OK" -ForegroundColor Green

# --- Clean target ---
Write-Host "[2/5] Cleaning target..." -ForegroundColor Yellow
if (Test-Path $Target) {
    try {
        Get-ChildItem -LiteralPath $Target -Force | Remove-Item -Recurse -Force
    } catch {
        throw "Failed to clean '$Target' (file locked? a node process may still be running from the target): $($_.Exception.Message)"
    }
} else {
    New-Item -ItemType Directory -Force $Target | Out-Null
}
Write-Host "      Target cleaned" -ForegroundColor Green

# --- Copy compiled output + assets ---
Write-Host "[3/5] Copying files..." -ForegroundColor Yellow

# dist/ (compiled JS — subfolder structure preserved)
$distSrc = Join-Path $ProjectRoot "dist"
if (-not (Test-Path $distSrc)) { throw "dist not found at $distSrc (did the build run?)" }
Write-Host "      dist -> $Target"
Copy-Item "$distSrc\*" $Target -Recurse -Force

# roslyn-analyzer/ (.csx scripts)
$roslynSrc = Join-Path $ProjectRoot "roslyn-analyzer"
$roslynDst = Join-Path $Target "roslyn-analyzer"
Write-Host "      roslyn-analyzer -> $roslynDst"
New-Item -ItemType Directory -Force $roslynDst | Out-Null
Copy-Item "$roslynSrc\*" $roslynDst -Recurse -Force

# package.json (needed by Node for ESM "type": "module")
Copy-Item (Join-Path $ProjectRoot "package.json") $Target -Force

# --- Production node_modules ---
# npm ci --omit=dev in a throwaway subdir to avoid touching the dev node_modules.
Write-Host "[4/5] Installing production node_modules..." -ForegroundColor Yellow
$nmDst  = Join-Path $Target "node_modules"
$tmpDir = Join-Path $ProjectRoot ".deploy-tmp"
if (Test-Path $tmpDir) { Remove-Item $tmpDir -Recurse -Force }
New-Item -ItemType Directory $tmpDir | Out-Null
try {
    Copy-Item (Join-Path $ProjectRoot "package.json") $tmpDir
    Copy-Item (Join-Path $ProjectRoot "package-lock.json") $tmpDir
    Push-Location $tmpDir
    try {
        npm ci --omit=dev --prefer-offline 2>&1 | Out-Null
        if ($LASTEXITCODE -ne 0) { throw "npm ci failed (exit $LASTEXITCODE)" }
    } finally {
        Pop-Location
    }
    Copy-Item (Join-Path $tmpDir "node_modules") $Target -Recurse -Force
} finally {
    Remove-Item $tmpDir -Recurse -Force -ErrorAction SilentlyContinue
}
Write-Host "      node_modules OK" -ForegroundColor Green

# --- Verify ---
Write-Host "[5/5] Verifying..." -ForegroundColor Yellow
$required = @(
    "index.js",
    "index-registry.js",
    "logviewer.js",
    "analyzers\roslyn-runner.js",
    "analyzers\ts-morph-analyzer.js",
    "features\dotnet-test-quality-runner.js",
    "indexers\dotnet-indexer-runner.js",
    "roslyn-analyzer\dotnet-indexer.csx",
    "roslyn-analyzer\roslyn-analyzer.csx",
    "node_modules\@modelcontextprotocol\sdk",
    "package.json"
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
