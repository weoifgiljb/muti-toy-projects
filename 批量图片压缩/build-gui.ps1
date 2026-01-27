$ErrorActionPreference = "Stop"

$appName = "BatchImageCompressorGui"
$root = $PSScriptRoot
$uiDist = Join-Path $root "ui\\dist"

if (-not (Test-Path $uiDist)) {
  Write-Host "UI dist not found. Build it first:" -ForegroundColor Yellow
  Write-Host "  cd ui" -ForegroundColor Yellow
  Write-Host "  npm install" -ForegroundColor Yellow
  Write-Host "  npm run build" -ForegroundColor Yellow
  exit 1
}

python -m PyInstaller `
  --onefile `
  --windowed `
  --clean `
  --name $appName `
  --add-data "$uiDist;ui\\dist" `
  "gui.py"

Write-Host "Built dist\\$appName.exe"
