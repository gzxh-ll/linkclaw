param(
  [Parameter(Mandatory=$false)]
  [string]$Repo = "miaoxworld/openclaw-manager",

  [Parameter(Mandatory=$false)]
  [string]$ReleaseDir = "$(Resolve-Path .)\release",

  [Parameter(Mandatory=$false)]
  [string]$Tag = "",

  [Parameter(Mandatory=$false)]
  [switch]$IncludeWindows
)

$ErrorActionPreference = "Stop"

New-Item -ItemType Directory -Force -Path $ReleaseDir | Out-Null

function Invoke-GitHubJson([string]$Url) {
  $headers = @{
    "Accept" = "application/vnd.github+json"
    "User-Agent" = "openclaw-manager-sync"
  }
  if ($env:GITHUB_TOKEN) {
    $headers["Authorization"] = "Bearer $env:GITHUB_TOKEN"
  }
  return Invoke-RestMethod -Uri $Url -Headers $headers -Method Get
}

function Download-Asset([string]$Url, [string]$OutFile) {
  $headers = @{
    "Accept" = "application/octet-stream"
    "User-Agent" = "openclaw-manager-sync"
  }
  if ($env:GITHUB_TOKEN) {
    $headers["Authorization"] = "Bearer $env:GITHUB_TOKEN"
  }
  Invoke-WebRequest -Uri $Url -Headers $headers -OutFile $OutFile -UseBasicParsing
}

$releases = Invoke-GitHubJson "https://api.github.com/repos/$Repo/releases?per_page=20"
if (-not $releases) { throw "Failed to fetch releases: $Repo" }

$target = $null
if ($Tag -and $Tag.Trim().Length -gt 0) {
  $target = $releases | Where-Object { $_.tag_name -eq $Tag } | Select-Object -First 1
} else {
  $target = $releases | Select-Object -First 1
}

if (-not $target) { throw "Target release not found (Repo=$Repo, Tag=$Tag)" }

$assets = @($target.assets)
if (-not $assets -or $assets.Count -eq 0) { throw "Target release has no assets (tag=$($target.tag_name))" }

$macAssets = $assets | Where-Object {
  $_.name -match "\.dmg$" -or $_.name -match "\.app\.tar\.gz$" -or $_.name -match "macos" -or $_.name -match "darwin"
}

if (-not $IncludeWindows) {
  $assetsToDownload = $macAssets
} else {
  $assetsToDownload = $assets
}

if (-not $assetsToDownload -or $assetsToDownload.Count -eq 0) {
  throw "No macOS assets matched. Try -IncludeWindows to download all assets. tag=$($target.tag_name)"
}

foreach ($a in $assetsToDownload) {
  $out = Join-Path $ReleaseDir $a.name
  Write-Host "Downloading $($a.name) -> $out"
  Download-Asset $a.url $out
}

Write-Host ""
Write-Host "Done. ReleaseDir=$ReleaseDir"
Get-ChildItem -Path $ReleaseDir | Select-Object Name, Length, LastWriteTime | Format-Table -AutoSize
