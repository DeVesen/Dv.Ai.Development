<#
.SYNOPSIS
    Installs a skill package into a target project's .cursor directory.

.PARAMETER PackageName
    Name of the package to install (without .json extension).
    Use -List to see all available packages.

.PARAMETER TargetCursorPath
    Absolute path to the target project's .cursor directory.

.PARAMETER DryRun
    Show what would be copied without actually copying anything.

.PARAMETER List
    List all available packages and exit.

.EXAMPLE
    .\install-skill.ps1 planning-workflow C:\Projects\MyApp\.cursor
    .\install-skill.ps1 genericrtk-filter C:\Projects\MyApp\.cursor -DryRun
    .\install-skill.ps1 all C:\Projects\MyApp\.cursor
    .\install-skill.ps1 -List
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
# Params store (skill-params.json) — used only when MCP entries are present
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
# Copy a file or directory to target
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
        $available = (Get-ChildItem $script:PackagesDir -Filter "*.json").BaseName -join ", "
        Write-Error "Package '$Name' not found. Available: $available"
        exit 1
    }

    $m = Get-Content $manifestFile -Raw | ConvertFrom-Json

    Write-Host ""
    Write-Host "-> $Name" -ForegroundColor Cyan
    if ($m.description) { Write-Host "   $($m.description)" -ForegroundColor DarkGray }

    foreach ($dep in $m.dependsOn) { Install-Package $dep }

    foreach ($r   in $m.rules)      { Copy-Asset (Join-Path $script:SourceCursorPath $r)   (Join-Path $script:TargetCursorPath "rules\$(Split-Path $r -Leaf)") }
    foreach ($s   in $m.skills)     { Copy-Asset (Join-Path $script:SourceCursorPath $s)   (Join-Path $script:TargetCursorPath "skills\$(Split-Path $s -Leaf)") }
    foreach ($a   in $m.agents)     { Copy-Asset (Join-Path $script:SourceCursorPath $a)   (Join-Path $script:TargetCursorPath "agents\$(Split-Path $a -Leaf)") }
    foreach ($ref in $m.references) { Copy-Asset (Join-Path $script:SourceCursorPath $ref) (Join-Path $script:TargetCursorPath "references\$(Split-Path $ref -Leaf)") }
    foreach ($doc in $m.docs)       { Copy-Asset (Join-Path $script:SourceCursorPath $doc) (Join-Path $script:TargetCursorPath "$(Split-Path $doc -Leaf)") }

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
    Write-Error "PackageName is required. Use 'all' to install all packages, or -List to see available packages."
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

if ($DryRun) { Write-Host "[DRY RUN — no files will be copied]" -ForegroundColor Yellow }

if ($PackageName -eq 'all') {
    Write-Host "Installing all packages..." -ForegroundColor Cyan
    Get-ChildItem $script:PackagesDir -Filter "*.json" | Sort-Object Name | ForEach-Object {
        Install-Package $_.BaseName
    }
} else {
    Install-Package $PackageName
}

Save-ParamsStore

Write-Host ""
Write-Host "Done." -ForegroundColor Green
