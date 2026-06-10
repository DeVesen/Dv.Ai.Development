# Shared deploy-parameter handling for install-cursor-skills.ps1 and update-cursor-skills.ps1
# Requires: $script:ParamsStore, $script:DryRun, $script:TargetCursorPath, $script:PackagesDir

$script:CoreDeployParams = @(
    '{code-root}',
    '{frontend-path}',
    '{backend-path}'
)

$script:AdoOnlyDeployParams = @(
    '{devops-pipelines-path}'
)

$script:AdoPackageName = 'ado-requests-stories'

# Fixed values — set automatically, never prompted (see Initialize-DefaultParams)
$script:FixedDeployParams = @{
    '{workspace-root}'         = '.'
    '{agent-index}'            = './AGENTS.md'
    '{insights-path}'          = './insights'
    '{verification-commands}'  = '.cursor/references/verification-commands.md'
}

function Initialize-DefaultParams {
    foreach ($key in $script:FixedDeployParams.Keys) {
        $script:ParamsStore[$key] = $script:FixedDeployParams[$key]
    }
}

function Get-PackageManifestParams {
    param([object] $Manifest)

    $found = [System.Collections.Generic.HashSet[string]]::new()
    if ($Manifest.PSObject.Properties['params'] -and $Manifest.params) {
        foreach ($p in $Manifest.params) {
            if ($p) { $found.Add([string]$p) | Out-Null }
        }
    }
    return $found
}

function Resolve-RequiredParams {
    param(
        [string[]] $PackageNames,
        [bool] $AdoInstalled
    )

    $found = [System.Collections.Generic.HashSet[string]]::new()

    foreach ($p in $script:CoreDeployParams) {
        $found.Add($p) | Out-Null
    }

    foreach ($pkgName in $PackageNames) {
        $manifestFile = Join-Path $script:PackagesDir "$pkgName.json"
        if (-not (Test-Path $manifestFile)) { continue }
        $m = Get-Content $manifestFile -Raw | ConvertFrom-Json
        foreach ($p in (Get-PackageManifestParams $m)) {
            $found.Add([string]$p) | Out-Null
        }
    }

    foreach ($key in $script:FixedDeployParams.Keys) {
        $found.Remove($key) | Out-Null
    }

    if (-not $AdoInstalled) {
        foreach ($p in $script:AdoOnlyDeployParams) {
            $found.Remove($p) | Out-Null
        }
    }

    return $found
}

function Request-ParamValue {
    param([string] $Param, [string] $Existing)

    if ($Existing) {
        Write-Host "  $Param" -ForegroundColor White -NoNewline
        Write-Host " (aktuell: " -ForegroundColor DarkGray -NoNewline
        Write-Host $Existing -ForegroundColor Yellow -NoNewline
        Write-Host ") — Enter zum Behalten:" -ForegroundColor DarkGray
        $in = Read-Host "  Neuer Wert"
        return if ($in) { $in } else { $Existing }
    } else {
        Write-Host "  $Param" -ForegroundColor White -NoNewline
        Write-Host " (neu — leer lassen = Platzhalter behalten):" -ForegroundColor DarkGray
        $in = Read-Host "  Wert"
        return $in
    }
}

function Request-MissingParams {
    param(
        [System.Collections.Generic.HashSet[string]] $Params,
        [string] $Label = 'Deploy'
    )

    $hasNew = $false
    foreach ($param in ($Params | Sort-Object)) {
        if (-not $script:ParamsStore.ContainsKey($param) -or -not $script:ParamsStore[$param]) {
            if (-not $hasNew) {
                Write-Host ""
                Write-Host "  Parameter fuer $Label :" -ForegroundColor Cyan
                $hasNew = $true
            }
            $val = Request-ParamValue $param $script:ParamsStore[$param]
            if ($val) { $script:ParamsStore[$param] = $val }
        }
    }
}

function Apply-Params {
    param([string] $FilePath)

    if ($script:ParamsStore.Count -eq 0) { return }

    $content = Get-Content $FilePath -Raw -ErrorAction SilentlyContinue
    if (-not $content) { return }

    $changed = $false
    foreach ($key in $script:ParamsStore.Keys) {
        $val = $script:ParamsStore[$key]
        if ($val -and $content.Contains($key)) {
            $content = $content.Replace($key, $val)
            $changed = $true
        }
    }

    if ($changed) {
        if ($script:DryRun) {
            $rel = ($FilePath -replace [regex]::Escape($script:TargetCursorPath), '').TrimStart('\', '/')
            Write-Host "  [DRY] params anwenden: $rel" -ForegroundColor Yellow
        } else {
            Set-Content $FilePath $content -Encoding UTF8 -NoNewline
        }
    }
}

function Apply-ParamsToPath {
    param([string] $Path)

    if (Test-Path $Path -PathType Container) {
        Get-ChildItem $Path -Recurse -File -Include "*.md","*.mdc","*.json" | ForEach-Object {
            Apply-Params $_.FullName
        }
    } elseif (Test-Path $Path -PathType Leaf) {
        Apply-Params $Path
    }
}

function Remove-LegacyDeployReadme {
    $readmePath = Join-Path $script:TargetCursorPath 'Readme.md'
    if (-not (Test-Path $readmePath)) { return }

    if ($script:DryRun) {
        Write-Host '  [DRY] loeschen: Readme.md (nicht mehr deployt)' -ForegroundColor Yellow
        return
    }

    Remove-Item $readmePath -Force
    Write-Host '  - Readme.md (legacy deploy entfernt)' -ForegroundColor DarkGray
}
