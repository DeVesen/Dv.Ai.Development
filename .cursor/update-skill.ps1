<#
.SYNOPSIS
    Updates a skill package in a target project's .cursor directory.
    Already configured parameters and MCP settings are preserved; new ones are prompted for.

.PARAMETER PackageName
    Name of the package to update (without .json extension).
    Use -List to see all available packages.

.PARAMETER TargetCursorPath
    Absolute path to the target project's .cursor directory.

.PARAMETER DryRun
    Show what would be copied/substituted without making any changes.

.PARAMETER List
    List all available packages and exit.

.EXAMPLE
    .\update-skill.ps1 planning-workflow C:\Projects\MyApp\.cursor
    .\update-skill.ps1 genericrtk-filter C:\Projects\MyApp\.cursor -DryRun
    .\update-skill.ps1 all C:\Projects\MyApp\.cursor
    .\update-skill.ps1 -List
#>
[CmdletBinding()]
param(
    [Parameter(Position = 0)]
    [string] $PackageName,

    [Parameter(Position = 1)]
    [string] $TargetCursorPath,

    [switch] $DryRun,
    [switch] $List
)

$script:SourceCursorPath = $PSScriptRoot
$script:PackagesDir      = Join-Path $PSScriptRoot "packages"
$script:DryRun           = $DryRun.IsPresent
$script:ParamsFile       = $null
$script:ParamsStore      = @{}

# ---------------------------------------------------------------------------
# Parameter store (skill-params.json in target .cursor)
# ---------------------------------------------------------------------------

function Read-ParamsStore {
    if (Test-Path $script:ParamsFile) {
        $json = Get-Content $script:ParamsFile -Raw | ConvertFrom-Json
        $ht   = @{}
        $json.PSObject.Properties | ForEach-Object { $ht[$_.Name] = $_.Value }
        $script:ParamsStore = $ht
    }
}

function Save-ParamsStore {
    if ($script:DryRun) { return }
    if ($script:ParamsStore.Count -eq 0) { return }
    $script:ParamsStore | ConvertTo-Json -Depth 2 | Set-Content $script:ParamsFile -Encoding UTF8
}

# ---------------------------------------------------------------------------
# Collect all {param} placeholders from source template files of a package
# ---------------------------------------------------------------------------

function Get-PackageParams {
    param([object] $Manifest)

    $found = [System.Collections.Generic.HashSet[string]]::new()

    # If manifest explicitly defines params, use that list (no file scanning)
    if ($Manifest.PSObject.Properties['params']) {
        foreach ($p in $Manifest.params) { $found.Add($p) | Out-Null }
        return $found
    }

    # Fallback: scan files for {param} patterns
    $paths = @()
    foreach ($r   in $Manifest.rules)      { $paths += Join-Path $script:SourceCursorPath $r }
    foreach ($s   in $Manifest.skills)     { $paths += Join-Path $script:SourceCursorPath $s }
    foreach ($a   in $Manifest.agents)     { $paths += Join-Path $script:SourceCursorPath $a }
    foreach ($ref in $Manifest.references) { $paths += Join-Path $script:SourceCursorPath $ref }

    foreach ($path in $paths) {
        $files = if (Test-Path $path -PathType Container) {
            Get-ChildItem $path -Recurse -File -Include "*.md","*.mdc","*.json"
        } else {
            Get-Item $path -ErrorAction SilentlyContinue
        }
        foreach ($file in $files) {
            $content = Get-Content $file.FullName -Raw -ErrorAction SilentlyContinue
            if ($content) {
                [regex]::Matches($content, '\{[a-zA-Z][a-zA-Z0-9._-]*\}') | ForEach-Object {
                    $found.Add($_.Value) | Out-Null
                }
            }
        }
    }
    return $found
}

# ---------------------------------------------------------------------------
# Prompt for a regular {param} value
# ---------------------------------------------------------------------------

function Request-ParamValue {
    param([string] $Param, [string] $Existing)

    if ($Existing) {
        Write-Host "  $Param" -ForegroundColor White -NoNewline
        Write-Host " (aktuell: " -ForegroundColor DarkGray -NoNewline
        Write-Host $Existing -ForegroundColor Yellow -NoNewline
        Write-Host ") — Enter zum Behalten:" -ForegroundColor DarkGray
        $input = Read-Host "  Neuer Wert"
        return if ($input) { $input } else { $Existing }
    } else {
        Write-Host "  $Param" -ForegroundColor White -NoNewline
        Write-Host " (neu — leer lassen = Platzhalter behalten):" -ForegroundColor DarkGray
        $input = Read-Host "  Wert"
        return $input
    }
}

# ---------------------------------------------------------------------------
# MCP configuration (shared with install-skill.ps1)
# ---------------------------------------------------------------------------

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

            $entry    = $entryJson | ConvertFrom-Json
            $infoLine = $parts -join ', '
        }

        # ---- write entry to mcp.json ----
        $mcpFile = Join-Path $script:TargetCursorPath "mcp.json"

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
            $mcpDoc.mcpServers.PSObject.Properties[$serverName].Value = $entry
        } else {
            $mcpDoc.mcpServers | Add-Member -NotePropertyName $serverName -NotePropertyValue $entry
        }

        $mcpDoc | ConvertTo-Json -Depth 10 | Set-Content $mcpFile -Encoding UTF8
        Write-Host "  + mcp.json → $serverName ($infoLine)" -ForegroundColor Green
    }
}

# ---------------------------------------------------------------------------
# Apply stored {params} to a single text file
# ---------------------------------------------------------------------------

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

# ---------------------------------------------------------------------------
# Copy asset (file or directory) to target, then substitute params
# ---------------------------------------------------------------------------

function Copy-Asset {
    param([string] $Src, [string] $Dst)

    if ($script:DryRun) {
        $rel = ($Dst -replace [regex]::Escape($script:TargetCursorPath), '').TrimStart('\', '/')
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

    $rel = ($Dst -replace [regex]::Escape($script:TargetCursorPath), '').TrimStart('\', '/')
    Write-Host "  + $rel" -ForegroundColor Green

    Apply-ParamsToPath $Dst
}

# ---------------------------------------------------------------------------
# Update one package (recursively resolves dependsOn)
# ---------------------------------------------------------------------------

$script:updated = [System.Collections.Generic.HashSet[string]]::new()

function Update-Package {
    param([string] $Name)

    if (-not $script:updated.Add($Name)) { return }

    $manifestFile = Join-Path $script:PackagesDir "$Name.json"
    if (-not (Test-Path $manifestFile)) {
        $available = (Get-ChildItem $script:PackagesDir -Filter "*.json").BaseName -join ", "
        Write-Error "Package '$Name' not found. Available: $available"
        exit 1
    }

    $m = Get-Content $manifestFile -Raw | ConvertFrom-Json

    Write-Host ""
    Write-Host "-> $Name" -ForegroundColor Cyan
    if ($m.description) { Write-Host "   $($m.description)" -ForegroundColor DarkGray }

    foreach ($dep in $m.dependsOn) { Update-Package $dep }

    # Prompt for missing/new {param} placeholders found in template files
    $needed = Get-PackageParams $m
    $hasNew  = $false
    foreach ($param in ($needed | Sort-Object)) {
        if (-not $script:ParamsStore.ContainsKey($param) -or -not $script:ParamsStore[$param]) {
            if (-not $hasNew) {
                Write-Host ""
                Write-Host "  Parameter fuer $Name :" -ForegroundColor Cyan
                $hasNew = $true
            }
            $val = Request-ParamValue $param $script:ParamsStore[$param]
            if ($val) { $script:ParamsStore[$param] = $val }
        }
    }

    # Copy fresh files and apply params
    foreach ($r   in $m.rules)      { Copy-Asset (Join-Path $script:SourceCursorPath $r)   (Join-Path $script:TargetCursorPath "rules\$(Split-Path $r -Leaf)") }
    foreach ($s   in $m.skills)     { Copy-Asset (Join-Path $script:SourceCursorPath $s)   (Join-Path $script:TargetCursorPath "skills\$(Split-Path $s -Leaf)") }
    foreach ($a   in $m.agents)     { Copy-Asset (Join-Path $script:SourceCursorPath $a)   (Join-Path $script:TargetCursorPath "agents\$(Split-Path $a -Leaf)") }
    foreach ($ref in $m.references) { Copy-Asset (Join-Path $script:SourceCursorPath $ref) (Join-Path $script:TargetCursorPath "references\$(Split-Path $ref -Leaf)") }
    foreach ($doc in $m.docs)       { Copy-Asset (Join-Path $script:SourceCursorPath $doc) (Join-Path $script:TargetCursorPath "$(Split-Path $doc -Leaf)") }

    # MCP configuration (e.g. genericRTK Docker image)
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
        Write-Host "  $($_.BaseName)$deps" -ForegroundColor White
        if ($m.description) { Write-Host "    $($m.description)" -ForegroundColor DarkGray }
    }
    Write-Host ""
    exit 0
}

if (-not $PackageName) {
    Write-Error "PackageName is required. Use 'all' to update all packages, or -List to see available packages."
    exit 1
}

if (-not $TargetCursorPath) {
    Write-Error "TargetCursorPath is required."
    exit 1
}

if (-not (Test-Path $TargetCursorPath) -and -not $DryRun) {
    Write-Error "Target path not found: $TargetCursorPath"
    exit 1
}

$script:TargetCursorPath = $TargetCursorPath.TrimEnd('\', '/')
$script:ParamsFile       = Join-Path $script:TargetCursorPath "skill-params.json"

Read-ParamsStore

if ($DryRun) { Write-Host "[DRY RUN — keine Dateien werden veraendert]" -ForegroundColor Yellow }

if ($PackageName -eq 'all') {
    Write-Host "Updating all packages..." -ForegroundColor Cyan
    Get-ChildItem $script:PackagesDir -Filter "*.json" | Sort-Object Name | ForEach-Object {
        Update-Package $_.BaseName
    }
} else {
    Update-Package $PackageName
}

if ($script:ParamsStore.Count -gt 0) {
    Save-ParamsStore
    Write-Host ""
    Write-Host "  Parameter gespeichert: $script:ParamsFile" -ForegroundColor DarkGray
}

Write-Host ""
Write-Host "Fertig." -ForegroundColor Green
