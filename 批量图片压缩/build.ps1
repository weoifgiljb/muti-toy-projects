$ErrorActionPreference = "Stop"

$appName = "BatchImageCompressor"
$scriptPath = Join-Path $PSScriptRoot "compressor.py"

python -m PyInstaller `
  --onefile `
  --clean `
  --name $appName `
  $scriptPath

Write-Host "Built dist\$appName.exe"
