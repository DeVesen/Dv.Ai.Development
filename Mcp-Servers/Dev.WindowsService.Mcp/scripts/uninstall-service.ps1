#Requires -RunAsAdministrator
<#
.SYNOPSIS
    Stops and removes the DvMcpService Windows Service.
#>

$ErrorActionPreference = "Stop"
$ServiceName = "DvMcpService"

Write-Host "=== Dev.WindowsService.Mcp — Uninstall ===" -ForegroundColor Cyan

$svc = Get-Service -Name $ServiceName -ErrorAction SilentlyContinue
if (-not $svc) {
    Write-Host "Service '$ServiceName' not found — nothing to do." -ForegroundColor Yellow
    exit 0
}

if ($svc.Status -eq 'Running') {
    Write-Host "Stopping service..." -ForegroundColor Yellow
    Stop-Service -Name $ServiceName -Force
    Start-Sleep -Seconds 2
}

Write-Host "Removing service..." -ForegroundColor Yellow
sc.exe delete $ServiceName | Out-Null

Write-Host "Done. Service '$ServiceName' has been removed." -ForegroundColor Green
