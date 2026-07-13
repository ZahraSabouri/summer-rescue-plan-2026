$ErrorActionPreference = 'Stop'

$TaskName = 'Summer Rescue Local Service'
$ExistingTask = Get-ScheduledTask -TaskName $TaskName -ErrorAction SilentlyContinue

if ($null -eq $ExistingTask) {
  Write-Host "Startup task is not installed: $TaskName"
  exit 0
}

Unregister-ScheduledTask -TaskName $TaskName -Confirm:$false
Write-Host "Removed startup task: $TaskName"
Write-Host 'Any currently running local service is unchanged.'

