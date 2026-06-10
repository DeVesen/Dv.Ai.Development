# Shared deploy-parameter handling for install-cursor-skills.ps1 and update-cursor-skills.ps1
# Requires: $script:ParamsStore, $script:DryRun, $script:TargetCursorPath, $script:PackagesDir

$script:CoreDeployParams = @(
    '{code-root}',
    '{frontend-path}',
    '{backend-path}'
)

$script:McpDerivedParams = @(
    '{mcp-frontend-path}',
    '{mcp-backend-path}'
)

$script:McpOptionalParams = @(
    '{mcp-backend-solution}',
    '{index-solution-policy}'
)

$script:AdoOnlyDeployParams = @(
    '{devops-pipelines-path}'
)

$script:AdoPackageName = 'ado-requests-stories'

# Fixed values — set automatically, never prompted (see Initialize-DefaultParams)
$script:FixedDeployParams = @{
    '{workspace-root}'         = '.'
    '{mcp-project-paths}'      = '.cursor/references/mcp-project-paths.md'
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

    foreach ($p in $script:McpOptionalParams) {
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

function ConvertTo-McpWorkspacePath {
    param(
        [string] $CodeRoot,
        [string] $RelativePath
    )

    if (-not $RelativePath) { return $null }

    $rel = ($RelativePath -replace '\\', '/').Trim('/')
    $root = ($CodeRoot -replace '\\', '/').Trim('/')

    if ($root -and ($rel -eq $root -or $rel.StartsWith("$root/"))) {
        return "/workspace/$rel"
    }
    if ($root) {
        return "/workspace/$root/$rel"
    }
    return "/workspace/$rel"
}

function Initialize-McpDerivedParams {
    $codeRoot = $script:ParamsStore['{code-root}']
    $fe = $script:ParamsStore['{frontend-path}']
    $be = $script:ParamsStore['{backend-path}']

    if (-not $script:ParamsStore['{mcp-frontend-path}'] -and $fe) {
        $script:ParamsStore['{mcp-frontend-path}'] = ConvertTo-McpWorkspacePath $codeRoot $fe
    }
    if (-not $script:ParamsStore['{mcp-backend-path}'] -and $be) {
        $script:ParamsStore['{mcp-backend-path}'] = ConvertTo-McpWorkspacePath $codeRoot $be
    }
    if (-not $script:ParamsStore['{index-solution-policy}']) {
        $script:ParamsStore['{index-solution-policy}'] = 'disabled'
    }
    if (-not $script:ParamsStore['{mcp-backend-solution}']) {
        $script:ParamsStore['{mcp-backend-solution}'] = '— (optional; nur bei index_solution: allowed setzen)'
    }
}

function Sync-McpProjectPathsFile {
    if (-not $script:TargetCursorPath) { return }

    Initialize-McpDerivedParams

    $templatePath = Join-Path $PSScriptRoot 'references\mcp-project-paths.template.md'
    $destPath     = Join-Path $script:TargetCursorPath 'references\mcp-project-paths.md'

    if (Test-Path $destPath) {
        if ($script:DryRun) {
            Write-Host '  [DRY] Platzhalter in references/mcp-project-paths.md' -ForegroundColor Yellow
            return
        }
        Apply-Params $destPath
        Write-Host '  ~ references/mcp-project-paths.md (bestehend; Platzhalter aktualisiert)' -ForegroundColor DarkGray
        return
    }

    if (-not (Test-Path $templatePath)) {
        Write-Warning "MCP template missing: $templatePath"
        return
    }

    $content = Get-Content $templatePath -Raw -Encoding UTF8

    foreach ($key in ($script:ParamsStore.Keys | Sort-Object { $_.Length } -Descending)) {
        $val = $script:ParamsStore[$key]
        if ($null -ne $val -and $content.Contains($key)) {
            $content = $content.Replace($key, [string]$val)
        }
    }

    if ($script:DryRun) {
        Write-Host '  [DRY] generieren: references/mcp-project-paths.md' -ForegroundColor Yellow
        return
    }

    New-Item -ItemType Directory -Path (Split-Path $destPath -Parent) -Force | Out-Null
    Set-Content $destPath $content -Encoding UTF8 -NoNewline
    Write-Host '  + references/mcp-project-paths.md (aus skill-params generiert)' -ForegroundColor Green
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
    $sortedKeys = $script:ParamsStore.Keys | Sort-Object { $_.Length } -Descending
    foreach ($key in $sortedKeys) {
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
