$ErrorActionPreference = 'Stop'

$ProjectRoot = (Resolve-Path -LiteralPath (Join-Path $PSScriptRoot '..\..')).Path
$ServerScript = Join-Path $ProjectRoot 'scripts\startLocalApp.mjs'
$BuildIndex = Join-Path $ProjectRoot 'dist\index.html'
$Node = (Get-Command node.exe -ErrorAction Stop).Source

if (-not (Test-Path -LiteralPath $BuildIndex -PathType Leaf)) {
  throw 'Summer Rescue production build is missing. Run npm run build in the app directory first.'
}

try {
  $Health = Invoke-RestMethod -Uri 'http://127.0.0.1:5173/api/health' -TimeoutSec 2
  if ($Health.ok -eq $true) { exit 0 }
} catch {
  # The service is not running yet; start it below.
}

Set-Location -LiteralPath $ProjectRoot
& $Node $ServerScript
exit $LASTEXITCODE
