<#
.SYNOPSIS
  Install the tailored Desktop Commander config on this Windows machine.

.DESCRIPTION
  Desktop Commander reads its settings from
  %USERPROFILE%\.claude-server-commander\config.json on Windows.
  This script copies config.json (next to it) into that location, backing up
  any existing config first. The config uses "~" for allowedDirectories, which
  Desktop Commander expands to your user profile, so no username is hardcoded.

.EXAMPLE
  .\apply-config.ps1

  If script execution is blocked, run:
  powershell -ExecutionPolicy Bypass -File .\apply-config.ps1
#>

$ErrorActionPreference = 'Stop'

$src = Join-Path $PSScriptRoot 'config.json'
if (-not (Test-Path -LiteralPath $src)) {
    Write-Error "config.json not found next to this script ($src)"
    exit 1
}

$destDir = Join-Path $env:USERPROFILE '.claude-server-commander'
$dest = Join-Path $destDir 'config.json'

if (-not (Test-Path -LiteralPath $destDir)) {
    New-Item -ItemType Directory -Path $destDir | Out-Null
}

if (Test-Path -LiteralPath $dest) {
    $backup = "$dest.bak.$(Get-Date -Format 'yyyyMMddHHmmss')"
    Copy-Item -LiteralPath $dest -Destination $backup
    Write-Host "Backed up existing config -> $backup"
}

Copy-Item -LiteralPath $src -Destination $dest -Force
Write-Host "Installed tailored config -> $dest"
Write-Host ""
Write-Host "Restart Desktop Commander (or reload the plugin) so it picks up the new settings."
