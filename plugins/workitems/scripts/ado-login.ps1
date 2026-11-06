# Azure DevOps login for the current project. Run by the user, never by an agent.
# Uses <main checkout>/.claude/azure as AZURE_CONFIG_DIR only while the script runs,
# logs in to the tenant from .claude/ado.json and checks the identity afterwards.
# The previous value of AZURE_CONFIG_DIR in the calling shell is restored at the end.

$ErrorActionPreference = 'Stop'
$setup = Join-Path $PSScriptRoot 'ado-setup.js'

$json = node $setup show
if ($LASTEXITCODE -ne 0) {
    Write-Error 'Keine gueltige .claude/ado.json gefunden. Zuerst die Einrichtung ueber den Skill ado-cli ausfuehren.'
    exit 1
}
$config = $json | Out-String | ConvertFrom-Json

$previous = $env:AZURE_CONFIG_DIR
$exitCode = 1
try {
    $env:AZURE_CONFIG_DIR = $config.configDir
    New-Item -ItemType Directory -Force -Path $config.configDir | Out-Null
    Write-Host "Projekt-Config-Ordner: $($config.configDir)"
    Write-Host "Anmeldung an Tenant $($config.tenantId) als $($config.user)"

    az login --tenant $config.tenantId --allow-no-subscriptions | Out-Null
    if ($LASTEXITCODE -ne 0) {
        Write-Error 'az login fehlgeschlagen.'
    }
    else {
        node $setup check-identity
        $exitCode = $LASTEXITCODE
    }
}
finally {
    if ($null -eq $previous) {
        Remove-Item Env:AZURE_CONFIG_DIR -ErrorAction SilentlyContinue
    }
    else {
        $env:AZURE_CONFIG_DIR = $previous
    }
}
exit $exitCode
