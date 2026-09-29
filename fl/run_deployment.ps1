# Film-friendly Flower deployment: opens one window for the national aggregator
# (SuperLink) and one window per state node (SuperNode), then starts the run in this
# window. Same topology as run_deployment.sh, but every process is visible on screen —
# "each state runs this node".
#
#   powershell -ExecutionPolicy Bypass -File fl\run_deployment.ps1 -RunName film-r40
param(
  [string]$RunName = ("film-" + (Get-Date -Format "yyyyMMdd-HHmmss")),
  [string]$Venv = "C:\Users\prath\venvs\saajha",
  [int]$Rounds = 40
)
$ErrorActionPreference = "Stop"
$here = Split-Path -Parent $MyInvocation.MyCommand.Path
$bin = Join-Path $Venv "Scripts"
$env:PYTHONUTF8 = "1"
$env:PYTHONIOENCODING = "utf-8"
$states = @("A", "B", "C", "D")

function Start-Window([string]$title, [string]$command) {
  $script = "`$host.UI.RawUI.WindowTitle = '$title'; `$env:PYTHONUTF8='1'; `$env:PYTHONIOENCODING='utf-8'; Set-Location '$here'; $command"
  Start-Process powershell -ArgumentList "-NoExit", "-Command", $script | Out-Null
}

Start-Window "National aggregator (SuperLink)" "& '$bin\flower-superlink.exe' --insecure --disable-runtime-dependency-installation"
Start-Sleep -Seconds 6
for ($i = 0; $i -lt 4; $i++) {
  $port = 9094 + $i
  Start-Window "State $($states[$i]) node" "& '$bin\flower-supernode.exe' --insecure --superlink 127.0.0.1:9092 --port $port --node-config 'partition-id=$i num-partitions=4'"
}
Start-Sleep -Seconds 6
Set-Location $here
& "$bin\flwr.exe" run . local-deployment --stream --run-config "run-name=`"$RunName`" num-server-rounds=$Rounds"
Write-Host "Run $RunName finished. Close the node windows when done."
