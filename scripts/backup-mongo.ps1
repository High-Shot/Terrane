# Weekly MongoDB backup for the Terrane home-server setup (see LAPTOP-SETUP.md).
# Dumps the terrane database from the running compose stack to a dated archive
# and prunes backups older than 60 days.

$ErrorActionPreference = "Stop"

# Change this to a folder that syncs to the cloud (OneDrive/Google Drive/Dropbox).
$BackupDir = Join-Path $HOME "TerraneBackups"
$RepoDir = Split-Path -Parent $PSScriptRoot   # the Terrane checkout (parent of scripts/)

New-Item -ItemType Directory -Force -Path $BackupDir | Out-Null
$stamp = Get-Date -Format "yyyy-MM-dd_HHmm"
$outFile = Join-Path $BackupDir "terrane-$stamp.archive"

Set-Location $RepoDir
docker compose exec -T mongo mongodump --db terrane --archive > $outFile
if ($LASTEXITCODE -ne 0) { throw "mongodump failed (is the stack running? try: docker compose up -d)" }

# Keep 60 days of backups.
Get-ChildItem $BackupDir -Filter "terrane-*.archive" |
  Where-Object { $_.LastWriteTime -lt (Get-Date).AddDays(-60) } |
  Remove-Item

Write-Host "Backup written to $outFile"
