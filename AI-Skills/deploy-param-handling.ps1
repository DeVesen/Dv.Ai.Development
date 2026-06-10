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
    '{agent-index}'            = 'AGENTS.md'
    '{agent-compliance}'       = '.cursor/references/agent-compliance.md'
}

$script:AgentsComplianceMarkerStart = '<!-- ai-skills:agent-compliance:start -->'
$script:AgentsComplianceMarkerEnd   = '<!-- ai-skills:agent-compliance:end -->'

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

function Apply-ParamsToContent {
    param([string] $Content)

    if ($script:ParamsStore.Count -eq 0) { return $Content }

    $sortedKeys = $script:ParamsStore.Keys | Sort-Object { $_.Length } -Descending
    foreach ($key in $sortedKeys) {
        $val = $script:ParamsStore[$key]
        if ($val -and $Content.Contains($key)) {
            $Content = $Content.Replace($key, [string]$val)
        }
    }
    return $Content
}

function Get-AgentsComplianceBlock {
    $snippetPath = Join-Path $PSScriptRoot 'references\agents-compliance.snippet.md'
    if (-not (Test-Path $snippetPath)) {
        Write-Warning "Agent-compliance snippet missing: $snippetPath"
        return $null
    }
    $content = Get-Content $snippetPath -Raw -Encoding UTF8
    return Apply-ParamsToContent $content
}

function Resolve-AgentIndexPath {
    $projectRoot = Split-Path $script:TargetCursorPath -Parent
    if (-not $projectRoot) { return $null }

    $agentIndex = $script:ParamsStore['{agent-index}']
    if (-not $agentIndex) { $agentIndex = 'AGENTS.md' }

    $relative = ($agentIndex -replace '^\./', '').Trim()
    if ([System.IO.Path]::IsPathRooted($relative)) {
        return $relative
    }
    return Join-Path $projectRoot $relative
}

function Set-AgentsComplianceMarkers {
    param(
        [string] $Content,
        [string] $BlockBody
    )

    $start = $script:AgentsComplianceMarkerStart
    $end   = $script:AgentsComplianceMarkerEnd
    $wrapped = "$start`r`n$BlockBody`r`n$end"

    $pattern = [regex]::Escape($start) + '[\s\S]*?' + [regex]::Escape($end)
    if ($Content -match $pattern) {
        return [regex]::Replace($Content, $pattern, $wrapped)
    }

    if ($Content -and -not $Content.EndsWith("`n")) {
        $Content += "`r`n"
    }
    return $Content + "`r`n`r`n$wrapped`r`n"
}

function Sync-AgentsMdSection {
    if (-not $script:TargetCursorPath) { return }

    $complianceRef = Join-Path $script:TargetCursorPath 'references\agent-compliance.md'
    if (-not (Test-Path $complianceRef)) {
        Write-Host '  ~ AGENTS.md Sync übersprungen (references/agent-compliance.md nicht installiert)' -ForegroundColor DarkGray
        return
    }

    $agentsPath = Resolve-AgentIndexPath
    if (-not $agentsPath) { return }

    $blockBody = Get-AgentsComplianceBlock
    if (-not $blockBody) { return }

    $relDisplay = $agentsPath
    if ($script:TargetCursorPath -and $agentsPath.StartsWith((Split-Path $script:TargetCursorPath -Parent))) {
        $relDisplay = '..' + ($agentsPath.Substring((Split-Path $script:TargetCursorPath -Parent).Length) -replace '\\', '/')
    }

    if (Test-Path $agentsPath) {
        $existing = Get-Content $agentsPath -Raw -Encoding UTF8
        $updated  = Set-AgentsComplianceMarkers $existing $blockBody

        if ($script:DryRun) {
            Write-Host "  [DRY] Agent-Compliance-Block in $relDisplay (Marker ersetzen/einfuegen)" -ForegroundColor Yellow
            return
        }

        if ($updated -ne $existing) {
            Set-Content $agentsPath $updated -Encoding UTF8 -NoNewline
            Write-Host "  ~ $relDisplay (Agent-Compliance Marker-Block aktualisiert)" -ForegroundColor Green
        } else {
            Write-Host "  ~ $relDisplay (Agent-Compliance unveraendert)" -ForegroundColor DarkGray
        }
        return
    }

    $templatePath = Join-Path $PSScriptRoot 'references\agents-index.template.md'
    if (-not (Test-Path $templatePath)) {
        Write-Warning "agents-index.template.md missing — AGENTS.md nicht erzeugt: $agentsPath"
        return
    }

    $content = Get-Content $templatePath -Raw -Encoding UTF8
    $content = Apply-ParamsToContent $content
    $content = $content -replace '(?s)<!-- ai-skills:agent-compliance:start -->.*?<!-- ai-skills:agent-compliance:end -->', ''
    $content = Set-AgentsComplianceMarkers $content $blockBody

    if ($script:DryRun) {
        Write-Host "  [DRY] erzeugen: $relDisplay (aus Template + Compliance-Block)" -ForegroundColor Yellow
        return
    }

    Set-Content $agentsPath $content -Encoding UTF8 -NoNewline
    Write-Host "  + $relDisplay (neu aus Template + Agent-Compliance)" -ForegroundColor Green
}

function Get-McpsMdDeployedIntro {
    $introPath = Join-Path $PSScriptRoot 'references\mcps-md-intro.md'
    if (-not (Test-Path $introPath)) {
        Write-Warning "mcps-md-intro.md missing — fallback header ohne Umlaute"
        return "# Projekt MCPs`n`n## MCPs`n`n"
    }
    $text = Get-Content $introPath -Raw -Encoding UTF8
    if (-not $text.EndsWith("`n")) { $text += "`n" }
    return $text
}

function Sync-McpsMdIntro {
    param([string] $McpsMdFile)

    if (-not (Test-Path $McpsMdFile)) { return }

    $intro = Get-McpsMdDeployedIntro
    $content = Get-Content $McpsMdFile -Raw -Encoding UTF8
    if (-not $content) { return }

    if ($content -notmatch '(?m)^## MCPs\s*$') { return }

    $match = [regex]::Match($content, '(?ms)^## MCPs\s*\r?\n')
    if (-not $match.Success) { return }

    $tail = $content.Substring($match.Index + $match.Length)
    $header = $intro.TrimEnd("`r", "`n")
    if ($header -match '(?ms)\r?\n## MCPs\s*$') {
        $header = [regex]::Replace($header, '(?ms)\r?\n## MCPs\s*$', '')
    }
    $newContent = $header + "`n`n## MCPs`n`n" + $tail.TrimStart("`r", "`n")

    if ($newContent -eq $content) { return }

    if ($script:DryRun) {
        Write-Host '  [DRY] mcps.md Intro aktualisiert' -ForegroundColor Yellow
        return
    }

    Set-Content $McpsMdFile $newContent -Encoding UTF8 -NoNewline
    Write-Host '  ~ mcps.md Intro (Header synchronisiert)' -ForegroundColor DarkGray
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
