<#
.SYNOPSIS
    Installs all skill packages into a target project's .cursor and optionally .claude directory.
    Prompts for deploy {param} placeholders and MCP configuration interactively.
    ADO package is optional and will prompt for confirmation.
    Writes installed-manifest.json to track managed files (used by update-cursor-skills.ps1).

.PARAMETER TargetCursorPath
    Absolute path to the target project's .cursor directory.

.PARAMETER TargetClaudePath
    Optional. Absolute path to the target project's .claude directory.
    When provided, skills, agents and references are also deployed for Claude Code.
    Rules are Cursor-only and are never deployed to .claude.

.PARAMETER DryRun
    Show what would be copied without actually copying anything.

.PARAMETER List
    List all available packages and exit.

.EXAMPLE
    .\install-cursor-skills.ps1 C:\Projects\MyApp\.cursor
    .\install-cursor-skills.ps1 C:\Projects\MyApp\.cursor C:\Projects\MyApp\.claude
    .\install-cursor-skills.ps1 C:\Projects\MyApp\.cursor C:\Projects\MyApp\.claude -DryRun
    .\install-cursor-skills.ps1 -List
#>
[CmdletBinding()]
param(
    [Parameter(Position = 0)]
    [string] $TargetCursorPath,

    [Parameter(Position = 1)]
    [string] $TargetClaudePath,

    [switch] $DryRun,
    [switch] $List
)

$script:CliTargetCursorPath = $TargetCursorPath
$script:CliTargetClaudePath  = $TargetClaudePath
$script:CliDryRun           = $DryRun.IsPresent
$script:CliList             = $List.IsPresent

$script:SourceCursorPath = $PSScriptRoot
$script:PackagesDir      = Join-Path $PSScriptRoot "packages"
$script:DryRun           = $script:CliDryRun
$script:TargetClaudePath = $null
$script:ParamsFile       = $null
$script:ParamsStore      = @{}
$script:ManifestFile     = $null

. (Join-Path $PSScriptRoot "deploy-param-handling.ps1")

$TargetCursorPath = $script:CliTargetCursorPath
$TargetClaudePath = $script:CliTargetClaudePath
$DryRun = [bool]$script:CliDryRun
$List = [bool]$script:CliList
$script:DryRun = $script:CliDryRun

# Packages whose name matches this pattern will ask for confirmation before installing
$ADO_PATTERN = '^ado-'

# ---------------------------------------------------------------------------
# Manifest — tracks which files were installed per package
# Format: { "version": 1, "packages": { "<name>": { "cursorFiles": [...], "claudeFiles": [...] } } }
# ---------------------------------------------------------------------------

$script:Manifest = @{ version = 1; packages = @{} }

function Read-Manifest {
    if ($script:ManifestFile -and (Test-Path $script:ManifestFile)) {
        $json = Get-Content $script:ManifestFile -Raw | ConvertFrom-Json
        $ht   = @{ version = 1; packages = @{} }
        if ($json.PSObject.Properties['packages']) {
            $json.packages.PSObject.Properties | ForEach-Object {
                $pkg = @{ cursorFiles = @(); claudeFiles = @() }
                if ($_.Value.PSObject.Properties['cursorFiles']) { $pkg.cursorFiles = @($_.Value.cursorFiles) }
                if ($_.Value.PSObject.Properties['claudeFiles']) { $pkg.claudeFiles = @($_.Value.claudeFiles) }
                $ht.packages[$_.Name] = $pkg
            }
        }
        $script:Manifest = $ht
    }
}

function Save-Manifest {
    if ($script:DryRun -or -not $script:ManifestFile) { return }
    $out = [ordered]@{ version = 1; packages = [ordered]@{} }
    foreach ($name in ($script:Manifest.packages.Keys | Sort-Object)) {
        $pkg = $script:Manifest.packages[$name]
        $out.packages[$name] = [ordered]@{
            cursorFiles = @($pkg.cursorFiles | Sort-Object)
            claudeFiles = @($pkg.claudeFiles | Sort-Object)
        }
    }
    $out | ConvertTo-Json -Depth 5 | Set-Content $script:ManifestFile -Encoding UTF8
}

function Register-CursorFile {
    param([string] $PackageName, [string] $RelPath)
    if (-not $script:Manifest.packages.ContainsKey($PackageName)) {
        $script:Manifest.packages[$PackageName] = @{ cursorFiles = @(); claudeFiles = @() }
    }
    $list = [System.Collections.Generic.List[string]]$script:Manifest.packages[$PackageName].cursorFiles
    if (-not $list.Contains($RelPath)) { $list.Add($RelPath) }
    $script:Manifest.packages[$PackageName].cursorFiles = $list.ToArray()
}

function Register-ClaudeFile {
    param([string] $PackageName, [string] $RelPath)
    if (-not $script:Manifest.packages.ContainsKey($PackageName)) {
        $script:Manifest.packages[$PackageName] = @{ cursorFiles = @(); claudeFiles = @() }
    }
    $list = [System.Collections.Generic.List[string]]$script:Manifest.packages[$PackageName].claudeFiles
    if (-not $list.Contains($RelPath)) { $list.Add($RelPath) }
    $script:Manifest.packages[$PackageName].claudeFiles = $list.ToArray()
}

# ---------------------------------------------------------------------------
# Params store (skill-params.json) — deploy placeholders + MCP keys
# Shared logic: deploy-param-handling.ps1
# ---------------------------------------------------------------------------

function Read-ParamsStore {
    if ($script:ParamsFile -and (Test-Path $script:ParamsFile)) {
        $json = Get-Content $script:ParamsFile -Raw | ConvertFrom-Json
        $ht   = @{}
        $json.PSObject.Properties | ForEach-Object { $ht[$_.Name] = $_.Value }
        $script:ParamsStore = $ht
    }
}

function Save-ParamsStore {
    if ($script:DryRun -or -not $script:ParamsFile) { return }
    if ($script:ParamsStore.Count -eq 0) { return }
    $script:ParamsStore | ConvertTo-Json -Depth 2 | Set-Content $script:ParamsFile -Encoding UTF8
}

# ---------------------------------------------------------------------------
# MCP configuration
# ---------------------------------------------------------------------------

$script:McpHints = @{
    'codebase-analyzer'  = @(
        'Stärken: Indexierung, Symbol-Suche, Komplexitätsanalyse, Architektur-Überblick, Refactoring-Safety, Code-Review',
        'Bevorzugt wenn: Bereich/Symbol unbekannt · Abhängigkeiten analysieren · Code reviewen · Komplexität messen',
        'Skill: .cursor/skills/codebase-analyzer/SKILL.md',
        'Mount: /workspace · Parameter: projectPath, filePath'
    )
    'dev-filesystem-mcp' = @(
        'Stärken: Gezieltes Klassen-Lesen, Signaturen, Interface-Implementierungen — token-effizient',
        'Bevorzugt wenn: konkrete Datei/Klasse bekannt · Public API prüfen · alle Implementierungen eines Interfaces finden',
        'Skill: .cursor/skills/dev-filesystem-mcp/SKILL.md',
        'Mount: /project · Parameter: file_path, root (nicht path/filePath)'
    )
    'dev-angular-mcp'    = @(
        'Stärken: Angular-Komponenten und Services scaffolden',
        'Bevorzugt wenn: neue Komponente oder Service erstellen',
        'Skill: .cursor/skills/dev-angular-mcp/SKILL.md',
        'Kein Mount · Parameter: project_root (Host-Absolut)'
    )
    'dev-dotnet-mcp'     = @(
        'Stärken: .NET Projekte und Verzeichnisstrukturen scaffolden',
        'Bevorzugt wenn: neues .NET-Projekt erstellen · Verzeichnisstruktur anlegen',
        'Skill: .cursor/skills/dev-dotnet-mcp/SKILL.md',
        'Kein Mount · Parameter: output_path, base_path (Host-Absolut)'
    )
    'build-log-filter'   = @(
        'Stärken: Build- und Test-Output komprimieren und filtern',
        'Bevorzugt wenn: Build-Log analysieren · Test-Ergebnis auswerten',
        'Skill: .cursor/skills/build-log-filter/SKILL.md · Prozess: rules/build-log-filter.mdc'
    )
    'ado'                = @(
        'Stärken: Azure DevOps Work Items, Stories, Tasks lesen und schreiben',
        'Bevorzugt wenn: ADO-Integration · Work Items verwalten'
    )
}

function Update-McpsMd {
    param([string] $McpsMdFile, [string] $ServerName, [object] $McpEntry)

    $hintLines = if ($McpEntry -and $McpEntry.PSObject.Properties['llmHint']) {
        @($McpEntry.llmHint)
    } elseif ($script:McpHints.ContainsKey($ServerName)) {
        $script:McpHints[$ServerName]
    } else {
        @()
    }

    if ($script:DryRun) {
        Write-Host "  [DRY] mcps.md → $ServerName" -ForegroundColor Yellow
        return
    }

    Sync-McpsMdIntro -McpsMdFile $McpsMdFile

    $mdHeader = Get-McpsMdDeployedIntro

    if (-not (Test-Path $McpsMdFile)) {
        Set-Content $McpsMdFile $mdHeader -Encoding UTF8 -NoNewline
    }

    $content = Get-Content $McpsMdFile -Raw -ErrorAction SilentlyContinue
    if (-not $content) { $content = $mdHeader }

    if ($content -match "(?m)^$([regex]::Escape($ServerName))\s*$") {
        Write-Host "  ~ mcps.md → $ServerName (bereits vorhanden)" -ForegroundColor DarkGray
        return
    }

    $entry = $ServerName
    foreach ($line in $hintLines) { $entry += "`n  $line" }

    $newContent = $content.TrimEnd("`r", "`n") + "`n`n" + $entry + "`n"
    Set-Content $McpsMdFile $newContent -Encoding UTF8 -NoNewline
    Write-Host "  + mcps.md → $ServerName" -ForegroundColor Green
}

function Invoke-McpConfig {
    param([array] $McpEntries)

    foreach ($mcp in $McpEntries) {
        $serverName = $mcp.serverName
        $type       = if ($mcp.PSObject.Properties['type']) { $mcp.type } else { 'docker' }

        Write-Host ""
        Write-Host "  MCP: $serverName" -ForegroundColor Cyan

        $entry    = $null
        $infoLine = ''

        # ---- docker: image selection + optional --pull always ----
        if ($type -eq 'docker') {
            $imageKey     = $mcp.imageParamKey
            $pullKey      = $mcp.pullAlwaysKey
            $globalImage  = $mcp.globalImage
            $localDefault = $mcp.localDefault
            $storedImage  = $script:ParamsStore[$imageKey]
            $storedPull   = $script:ParamsStore[$pullKey]

            if ($storedImage) {
                Write-Host "  Image: $storedImage" -ForegroundColor DarkGray
                $keep = Read-Host "  Behalten? [J/n]"
                if ($keep -match '^[nN]') { $storedImage = $null }
            }
            if (-not $storedImage) {
                Write-Host "  Image auswaehlen:" -ForegroundColor White
                Write-Host "    [1] Global  — $globalImage" -ForegroundColor White
                Write-Host "    [2] Lokal   — eigener Image-Name" -ForegroundColor White
                $choice = Read-Host "  Auswahl [1/2]"
                if ($choice -eq '2') {
                    $in = Read-Host "  Image-Name [$localDefault]"
                    $storedImage = if ($in) { $in } else { $localDefault }
                } else {
                    $storedImage = $globalImage
                }
                $script:ParamsStore[$imageKey] = $storedImage
            }

            if ($pullKey) {
                if ($storedPull) {
                    $lbl  = if ($storedPull -eq 'true') { 'ja (--pull always)' } else { 'nein' }
                    Write-Host "  Immer neueste Version laden: $lbl" -ForegroundColor DarkGray
                    $keep = Read-Host "  Behalten? [J/n]"
                    if ($keep -match '^[nN]') { $storedPull = $null }
                }
                if (-not $storedPull) {
                    $ans        = Read-Host "  Bei jedem Start neueste Version laden? --pull always [j/N]"
                    $storedPull = if ($ans -match '^[jJyY]') { 'true' } else { 'false' }
                    $script:ParamsStore[$pullKey] = $storedPull
                }
            }

            $templateJson = if ($storedPull -eq 'true' -and $mcp.PSObject.Properties['entryPullAlways']) {
                $mcp.entryPullAlways | ConvertTo-Json -Depth 5
            } else {
                $mcp.entry | ConvertTo-Json -Depth 5
            }
            $entry    = ($templateJson -replace '__IMAGE__', $storedImage) | ConvertFrom-Json
            $infoLine = "$storedImage$(if ($storedPull -eq 'true') { ' --pull always' })"
        }

        # ---- simple: generic placeholder substitution ----
        elseif ($type -eq 'simple') {
            $entryJson = $mcp.entry | ConvertTo-Json -Depth 5
            $parts     = @()

            foreach ($p in $mcp.params) {
                $stored = $script:ParamsStore[$p.key]

                if ($stored) {
                    Write-Host "  $($p.label): $stored" -ForegroundColor DarkGray
                    $keep = Read-Host "  Behalten? [J/n]"
                    if ($keep -match '^[nN]') { $stored = $null }
                }
                if (-not $stored) {
                    $stored = Read-Host "  $($p.label)"
                    if ($stored) { $script:ParamsStore[$p.key] = $stored }
                }
                if ($stored) {
                    $entryJson = $entryJson -replace [regex]::Escape($p.placeholder), $stored
                    $parts    += $stored
                }
            }

            $entry = $entryJson | ConvertFrom-Json

            if ($entry.PSObject.Properties['env']) {
                $toRemove = $entry.env.PSObject.Properties |
                    Where-Object { $_.Value -is [string] -and $_.Value -match '^__[A-Z_]+__$' } |
                    Select-Object -ExpandProperty Name
                foreach ($key in $toRemove) { $entry.env.PSObject.Properties.Remove($key) }
                if ($entry.env.PSObject.Properties.Count -eq 0) {
                    $entry.PSObject.Properties.Remove('env')
                }
            }

            $infoLine = $parts -join ', '
        }

        # ---- write entry to mcp.json ----
        $mcpFile = Join-Path $script:TargetCursorPath "mcp.json"

        # Update mcps.md in project root
        $projectRoot = Split-Path $script:TargetCursorPath -Parent
        Update-McpsMd -McpsMdFile (Join-Path $projectRoot "mcps.md") -ServerName $serverName -McpEntry $mcp

        if ($script:DryRun) {
            Write-Host "  [DRY] mcp.json → $serverName : $infoLine" -ForegroundColor Yellow
            continue
        }

        $mcpDoc = if (Test-Path $mcpFile) {
            Get-Content $mcpFile -Raw | ConvertFrom-Json
        } else {
            [PSCustomObject]@{ mcpServers = [PSCustomObject]@{} }
        }

        if (-not $mcpDoc.PSObject.Properties['mcpServers']) {
            $mcpDoc | Add-Member -NotePropertyName 'mcpServers' -NotePropertyValue ([PSCustomObject]@{})
        }

        if ($mcpDoc.mcpServers.PSObject.Properties[$serverName]) {
            $existing = $mcpDoc.mcpServers.PSObject.Properties[$serverName].Value
            foreach ($prop in $entry.PSObject.Properties) {
                if ($existing.PSObject.Properties[$prop.Name]) {
                    $existing.PSObject.Properties[$prop.Name].Value = $prop.Value
                } else {
                    $existing | Add-Member -NotePropertyName $prop.Name -NotePropertyValue $prop.Value
                }
            }
            $mcpDoc.mcpServers.PSObject.Properties[$serverName].Value = $existing
        } else {
            $mcpDoc.mcpServers | Add-Member -NotePropertyName $serverName -NotePropertyValue $entry
        }

        $mcpDoc | ConvertTo-Json -Depth 10 | Set-Content $mcpFile -Encoding UTF8
        Write-Host "  + mcp.json → $serverName ($infoLine)" -ForegroundColor Green
    }
}

# ---------------------------------------------------------------------------
# Copy a file or directory to target and register in manifest
# ---------------------------------------------------------------------------

function Copy-Asset {
    param(
        [string] $Src,
        [string] $Dst,
        [string] $PackageName,
        [string] $Platform   # 'cursor' or 'claude'
    )

    $baseDir = if ($Platform -eq 'claude') { $script:TargetClaudePath } else { $script:TargetCursorPath }
    $rel     = ($Dst -replace [regex]::Escape($baseDir), '').TrimStart('\', '/')

    if ($script:DryRun) {
        Write-Host "  [DRY] $rel" -ForegroundColor Yellow
        return
    }

    if (Test-Path $Src -PathType Container) {
        if (Test-Path $Dst) { Remove-Item $Dst -Recurse -Force }
        Copy-Item $Src $Dst -Recurse -Force
    } else {
        New-Item -ItemType Directory -Path (Split-Path $Dst -Parent) -Force | Out-Null
        Copy-Item $Src $Dst -Force
    }

    Write-Host "  + $rel" -ForegroundColor Green
    Apply-ParamsToPath $Dst

    if ($Platform -eq 'claude') {
        Register-ClaudeFile $PackageName $rel
    } else {
        Register-CursorFile $PackageName $rel
    }
}

# ---------------------------------------------------------------------------
# Install one package (recursively resolves dependsOn)
# ---------------------------------------------------------------------------

$script:installed = [System.Collections.Generic.HashSet[string]]::new()

function Install-Package {
    param([string] $Name)

    if (-not $script:installed.Add($Name)) { return }

    $manifestFile = Join-Path $script:PackagesDir "$Name.json"
    if (-not (Test-Path $manifestFile)) {
        Write-Error "Package '$Name' not found."
        return
    }

    $m = Get-Content $manifestFile -Raw | ConvertFrom-Json

    Write-Host ""
    Write-Host "-> $Name" -ForegroundColor Cyan
    if ($m.description) { Write-Host "   $($m.description)" -ForegroundColor DarkGray }

    # Initialize package entry in manifest (clear previous file list for fresh install)
    if (-not $script:DryRun) {
        $script:Manifest.packages[$Name] = @{ cursorFiles = @(); claudeFiles = @() }
    }

    foreach ($dep in $m.dependsOn) { Install-Package $dep }

    # Rules → Cursor only
    foreach ($r in $m.rules) {
        Copy-Asset (Join-Path $script:SourceCursorPath $r) `
                   (Join-Path $script:TargetCursorPath "rules\$(Split-Path $r -Leaf)") `
                   $Name 'cursor'
    }
    # Skills → Cursor + Claude
    foreach ($s in $m.skills) {
        $leaf = Split-Path $s -Leaf
        Copy-Asset (Join-Path $script:SourceCursorPath $s) `
                   (Join-Path $script:TargetCursorPath "skills\$leaf") `
                   $Name 'cursor'
        if ($script:TargetClaudePath) {
            Copy-Asset (Join-Path $script:SourceCursorPath $s) `
                       (Join-Path $script:TargetClaudePath "skills\$leaf") `
                       $Name 'claude'
        }
    }
    # Agents → Cursor + Claude
    foreach ($a in $m.agents) {
        $leaf = Split-Path $a -Leaf
        Copy-Asset (Join-Path $script:SourceCursorPath $a) `
                   (Join-Path $script:TargetCursorPath "agents\$leaf") `
                   $Name 'cursor'
        if ($script:TargetClaudePath) {
            Copy-Asset (Join-Path $script:SourceCursorPath $a) `
                       (Join-Path $script:TargetClaudePath "agents\$leaf") `
                       $Name 'claude'
        }
    }
    # References → Cursor + Claude
    foreach ($ref in $m.references) {
        $leaf = Split-Path $ref -Leaf
        Copy-Asset (Join-Path $script:SourceCursorPath $ref) `
                   (Join-Path $script:TargetCursorPath "references\$leaf") `
                   $Name 'cursor'
        if ($script:TargetClaudePath) {
            Copy-Asset (Join-Path $script:SourceCursorPath $ref) `
                       (Join-Path $script:TargetClaudePath "references\$leaf") `
                       $Name 'claude'
        }
    }

    if ($m.PSObject.Properties['mcp'] -and $m.mcp.Count -gt 0) {
        Invoke-McpConfig $m.mcp
    }
}

# ---------------------------------------------------------------------------
# Entry point
# ---------------------------------------------------------------------------

if ($List) {
    Write-Host ""
    Write-Host "Available packages:" -ForegroundColor Cyan
    Write-Host ""
    Get-ChildItem $script:PackagesDir -Filter "*.json" | Sort-Object Name | ForEach-Object {
        $m    = Get-Content $_.FullName -Raw | ConvertFrom-Json
        $deps = if ($m.dependsOn.Count -gt 0) { " [needs: $($m.dependsOn -join ', ')]" } else { "" }
        $ado  = if ($_.BaseName -match $ADO_PATTERN) { " [optional — ADO]" } else { "" }
        Write-Host "  $($_.BaseName)$deps$ado" -ForegroundColor White
        if ($m.description) { Write-Host "    $($m.description)" -ForegroundColor DarkGray }
    }
    Write-Host ""
    exit 0
}

if (-not $TargetCursorPath) {
    Write-Error "TargetCursorPath is required."
    exit 1
}

if (-not (Test-Path $TargetCursorPath) -and -not $DryRun) {
    Write-Error "Target path not found: $TargetCursorPath"
    exit 1
}

if ($TargetClaudePath -and -not (Test-Path $TargetClaudePath) -and -not $DryRun) {
    Write-Error "Claude target path not found: $TargetClaudePath"
    exit 1
}

$script:TargetCursorPath = $TargetCursorPath.TrimEnd('\', '/')
$script:TargetClaudePath = if ($TargetClaudePath) { $TargetClaudePath.TrimEnd('\', '/') } else { $null }
$script:ParamsFile       = Join-Path $script:TargetCursorPath "skill-params.json"
$script:ManifestFile     = Join-Path $script:TargetCursorPath "installed-manifest.json"

Read-ParamsStore
Initialize-DefaultParams
Read-Manifest

if ($DryRun) { Write-Host "[DRY RUN — no files will be copied]" -ForegroundColor Yellow }

Write-Host "Installing all packages..." -ForegroundColor Cyan

$allPackages = Get-ChildItem $script:PackagesDir -Filter "*.json" | Sort-Object Name
$packagesToInstall = [System.Collections.Generic.List[string]]::new()

foreach ($pkgFile in $allPackages) {
    $pkgName = $pkgFile.BaseName

    if ($pkgName -match $ADO_PATTERN) {
        Write-Host ""
        Write-Host "Package '$pkgName' ist optional (ADO-Integration)." -ForegroundColor Yellow
        $ans = Read-Host "  Installieren? [j/N]"
        if ($ans -notmatch '^[jJyY]') {
            Write-Host "  Uebersprungen." -ForegroundColor DarkGray
            continue
        }
    }

    $packagesToInstall.Add($pkgName) | Out-Null
}

$adoInstalled = $packagesToInstall -contains $script:AdoPackageName
$requiredParams = Resolve-RequiredParams -PackageNames $packagesToInstall -AdoInstalled $adoInstalled
Request-MissingParams -Params $requiredParams -Label 'Install'

foreach ($pkgName in $packagesToInstall) {
    Install-Package $pkgName
}

Save-ParamsStore
Sync-McpProjectPathsFile
Sync-AgentsMdSection
Save-Manifest
Remove-LegacyDeployReadme

Write-Host ""
Write-Host "Done." -ForegroundColor Green
if (-not $DryRun) {
    Write-Host "  Manifest: $script:ManifestFile" -ForegroundColor DarkGray
    if ($script:ParamsStore.Count -gt 0) {
        Write-Host "  Parameter: $script:ParamsFile" -ForegroundColor DarkGray
    }
}
