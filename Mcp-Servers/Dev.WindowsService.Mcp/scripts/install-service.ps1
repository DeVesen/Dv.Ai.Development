#Requires -RunAsAdministrator
<#
.SYNOPSIS
    Builds, publishes, and installs Dev.WindowsService.Mcp as a Windows Service.
.DESCRIPTION
    Publishes the project as a self-contained executable, then registers it as
    a Windows Service named "DvMcpService" that starts automatically with Windows.
#>

$ErrorActionPreference = "Stop"

$ServiceName    = "DvMcpService"
$ServiceDisplay = "Dev MCP Windows Service"
$ServiceDesc    = "MCP server providing Filesystem, .NET, and Angular tools for Claude Desktop"
$ProjectRoot    = Split-Path $PSScriptRoot -Parent
$ProjectFile    = Join-Path $ProjectRoot "Dev.WindowsService.Mcp\Dev.WindowsService.Mcp.csproj"
$PublishDir     = Join-Path $ProjectRoot "publish"
$ExePath        = Join-Path $PublishDir "Dev.WindowsService.Mcp.exe"

Write-Host "=== Dev.WindowsService.Mcp — Install ===" -ForegroundColor Cyan
Write-Host "Project : $ProjectFile"
Write-Host "Output  : $PublishDir"

# Stop existing service if running
if (Get-Service -Name $ServiceName -ErrorAction SilentlyContinue) {
    Write-Host "Stopping existing service..." -ForegroundColor Yellow
    Stop-Service -Name $ServiceName -Force -ErrorAction SilentlyContinue
    Start-Sleep -Seconds 2
    Write-Host "Removing existing service..." -ForegroundColor Yellow
    sc.exe delete $ServiceName | Out-Null
    Start-Sleep -Seconds 1
}

# Publish self-contained executable
Write-Host "Publishing..." -ForegroundColor Cyan
dotnet publish $ProjectFile `
    --configuration Release `
    --runtime win-x64 `
    --self-contained true `
    --output $PublishDir `
    /p:PublishSingleFile=true `
    /p:IncludeNativeLibrariesForSelfExtract=true

if ($LASTEXITCODE -ne 0) {
    Write-Error "dotnet publish failed (exit code $LASTEXITCODE)"
    exit 1
}

if (-not (Test-Path $ExePath)) {
    Write-Error "Published executable not found: $ExePath"
    exit 1
}

# Copy appsettings.json if not already in publish dir
$AppSettings = Join-Path $ProjectRoot "Dev.WindowsService.Mcp\appsettings.json"
$PublishedSettings = Join-Path $PublishDir "appsettings.json"
if (-not (Test-Path $PublishedSettings)) {
    Copy-Item $AppSettings $PublishedSettings
    Write-Host "Copied appsettings.json to publish dir"
}

# Register Windows Service
Write-Host "Registering service '$ServiceName'..." -ForegroundColor Cyan
New-Service `
    -Name $ServiceName `
    -DisplayName $ServiceDisplay `
    -Description $ServiceDesc `
    -BinaryPathName $ExePath `
    -StartupType Automatic

# Start it
Write-Host "Starting service..." -ForegroundColor Cyan
Start-Service -Name $ServiceName

$svc = Get-Service -Name $ServiceName
Write-Host ""
Write-Host "=== Done ===" -ForegroundColor Green
Write-Host "Service : $ServiceName ($($svc.Status))"
Write-Host "Log View: http://localhost:5050"
Write-Host "MCP SSE : http://localhost:5050/mcp/sse"
Write-Host ""
Write-Host "Claude Desktop config (claude_desktop_config.json):" -ForegroundColor Yellow
Write-Host '{
  "mcpServers": {
    "dev-windows-service": {
      "url": "http://localhost:5050/mcp/sse"
    }
  }
}'
