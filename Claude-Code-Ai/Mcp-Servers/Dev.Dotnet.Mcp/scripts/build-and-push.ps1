$ErrorActionPreference = 'Stop'

$SrcDir = Split-Path $PSScriptRoot -Parent

# Determine Docker Hub username via credential helper (works with Docker Desktop on Windows)
$DockerUser = $null
$configPath = "$env:USERPROFILE\.docker\config.json"

if (Test-Path $configPath) {
    $config = Get-Content $configPath -Raw | ConvertFrom-Json
    $credStore = $config.credsStore
    if ($credStore) {
        $cred = 'https://index.docker.io/v1/' |
            & "docker-credential-$credStore" get 2>$null |
            ConvertFrom-Json -ErrorAction SilentlyContinue
        if ($cred) { $DockerUser = $cred.Username }
    }
}

if (-not $DockerUser) {
    Write-Error "Could not determine Docker Hub user. Run: docker login"
    exit 1
}

Write-Host "Logged in as: $DockerUser"

$Repo = Read-Host "Repository name"

if (-not $Repo) {
    Write-Error "Repository name must not be empty."
    exit 1
}

$Image     = "$DockerUser/$Repo"
$Timestamp = Get-Date -Format 'yyyyMMddHHmmss'

Write-Host "Building ${Image}:latest and ${Image}:${Timestamp} ..."

docker build `
  -f "$SrcDir/Dev.Dotnet.Mcp/Dockerfile" `
  -t "${Image}:latest" `
  -t "${Image}:${Timestamp}" `
  $SrcDir

docker push "${Image}:latest"
docker push "${Image}:${Timestamp}"

Write-Host "Pushed:"
Write-Host "  ${Image}:latest"
Write-Host "  ${Image}:${Timestamp}"
