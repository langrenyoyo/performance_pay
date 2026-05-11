$ErrorActionPreference = "Stop"

$root = Split-Path -Parent $MyInvocation.MyCommand.Path
$env:PERF_HOST = "0.0.0.0"
$env:PERF_PORT = "5175"
if (-not $env:DATABASE_URL) {
  $env:PERF_DB_PATH = Join-Path $root "data\performance.db"
}

Set-Location $root

Write-Host "绩效工资数据库系统已启动"
Write-Host "本机访问：http://127.0.0.1:$env:PERF_PORT/index.html"

$addresses = Get-NetIPAddress -AddressFamily IPv4 |
  Where-Object {
    $_.IPAddress -notlike "127.*" -and
    $_.IPAddress -notlike "169.254.*" -and
    $_.PrefixOrigin -ne "WellKnown"
  } |
  Select-Object -ExpandProperty IPAddress

foreach ($address in $addresses) {
  Write-Host "内网访问：http://$address`:$env:PERF_PORT/index.html"
}

if ($env:DATABASE_URL) {
  Write-Host "数据库：PostgreSQL"
  Write-Host "DATABASE_URL：$env:DATABASE_URL"
} else {
  Write-Host "数据库：SQLite 本地开发模式"
  Write-Host "数据库文件：$env:PERF_DB_PATH"
}
Write-Host "按 Ctrl+C 停止服务"
python server.py
