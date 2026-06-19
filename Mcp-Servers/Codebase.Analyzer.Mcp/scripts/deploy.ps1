# Deploy script for Codebase.Analyzer.Mcp
# Usage: .\deploy.ps1 [-Target <path>]
# Default target: C:\Develop\.apps\codebase-analyzer

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
Write-Host "[1/4] Building TypeScript..." -ForegroundColor Yellow
Push-Location $ProjectRoot
try {
    npm run build
    if ($LASTEXITCODE -ne 0) { throw "Build failed (exit $LASTEXITCODE)" }
} finally {
    Pop-Location
}
Write-Host "      Build OK" -ForegroundColor Green

# --- Prepare target ---
Write-Host "[2/4] Preparing target directory..." -ForegroundColor Yellow
if (-not (Test-Path $Target)) {
    New-Item -ItemType Directory -Force $Target | Out-Null
}

# --- Copy files ---
Write-Host "[3/4] Copying files..." -ForegroundColor Yellow

# dist/ (compiled JS — subfolder structure preserved)
$distSrc = Join-Path $ProjectRoot "dist"
$distDst = $Target
Write-Host "      dist -> $distDst"
Copy-Item "$distSrc\*" $distDst -Recurse -Force

# roslyn-analyzer/ (.csx scripts)
$roslynSrc = Join-Path $ProjectRoot "roslyn-analyzer"
$roslynDst = Join-Path $Target "roslyn-analyzer"
Write-Host "      roslyn-analyzer -> $roslynDst"
if (-not (Test-Path $roslynDst)) { New-Item -ItemType Directory -Force $roslynDst | Out-Null }
Copy-Item "$roslynSrc\*" $roslynDst -Recurse -Force

# node_modules/ (production deps only — npm ci --omit=dev in a subdir of the project to avoid short-path issues)
$nmDst = Join-Path $Target "node_modules"
Write-Host "      node_modules -> $nmDst"
if (Test-Path $nmDst) { Remove-Item $nmDst -Recurse -Force }
$tmpDir = Join-Path $ProjectRoot ".deploy-tmp"
if (Test-Path $tmpDir) { Remove-Item $tmpDir -Recurse -Force }
New-Item -ItemType Directory $tmpDir | Out-Null
Copy-Item (Join-Path $ProjectRoot "package.json") $tmpDir
Copy-Item (Join-Path $ProjectRoot "package-lock.json") $tmpDir
Push-Location $tmpDir
try {
    npm ci --omit=dev --prefer-offline 2>&1 | Out-Null
    if ($LASTEXITCODE -ne 0) { throw "npm ci failed" }
    Copy-Item "$tmpDir\node_modules" $Target -Recurse -Force
} finally {
    Pop-Location
    Remove-Item $tmpDir -Recurse -Force -ErrorAction SilentlyContinue
}

# package.json (needed by Node for ESM "type": "module")
Copy-Item (Join-Path $ProjectRoot "package.json") $Target -Force

# --- Verify ---
Write-Host "[4/4] Verifying..." -ForegroundColor Yellow
$required = @(
    "index.js",
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
