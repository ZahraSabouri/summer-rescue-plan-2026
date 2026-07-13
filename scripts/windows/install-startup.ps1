$ErrorActionPreference = 'Stop'

$TaskName = 'Summer Rescue Local Service'
$ProjectRoot = (Resolve-Path -LiteralPath (Join-Path $PSScriptRoot '..\..')).Path
$StartScript = (Resolve-Path -LiteralPath (Join-Path $PSScriptRoot 'start-background.ps1')).Path
$BuildIndex = Join-Path $ProjectRoot 'dist\index.html'

if (-not (Test-Path -LiteralPath $BuildIndex -PathType Leaf)) {
  throw 'Production build is missing. Run npm run build before installing the startup task.'
}

$PowerShell = (Get-Command powershell.exe -ErrorAction Stop).Source
$Arguments = "-NoProfile -ExecutionPolicy Bypass -WindowStyle Hidden -File `"$StartScript`""
$Action = New-ScheduledTaskAction -Execute $PowerShell -Argument $Arguments -WorkingDirectory $ProjectRoot
$Trigger = New-ScheduledTaskTrigger -AtLogOn -User ([System.Security.Principal.WindowsIdentity]::GetCurrent().Name)
$Principal = New-ScheduledTaskPrincipal `
  -UserId ([System.Security.Principal.WindowsIdentity]::GetCurrent().Name) `
  -LogonType Interactive `
  -RunLevel Limited
$Settings = New-ScheduledTaskSettingsSet `
  -AllowStartIfOnBatteries `
  -DontStopIfGoingOnBatteries `
  -MultipleInstances IgnoreNew `
  -ExecutionTimeLimit (New-TimeSpan -Days 3650)

Register-ScheduledTask `
  -TaskName $TaskName `
  -Action $Action `
  -Trigger $Trigger `
  -Principal $Principal `
  -Settings $Settings `
  -Description 'Starts the private Summer Rescue file and database service after sign-in.' `
  -Force | Out-Null

Write-Host "Installed startup task: $TaskName"
Write-Host 'The task will run at the next sign-in. To start the service now, run npm run app:start.'
