# 开发模式（前后端同时启动，前端热更新）
Write-Host "🔧 开发模式启动..." -ForegroundColor Yellow

$backendDir = Join-Path $PSScriptRoot "backend"
$frontendDir = Join-Path $PSScriptRoot "frontend"

# 初始化数据库（如果还没有）
Set-Location $backendDir
if (-not (Test-Path "data/yuzun.db")) {
    node src/database/init.js
}

# 后台启动后端
Write-Host "🚀 启动后端 (port 3000)..." -ForegroundColor Cyan
Start-Process powershell -ArgumentList "-NoExit", "-Command", "Set-Location '$backendDir'; npm run dev" -WindowStyle Normal

Start-Sleep -Seconds 2

# 启动前端开发服务器
Write-Host "🎨 启动前端 (port 5173)..." -ForegroundColor Cyan
Set-Location $frontendDir
npm run dev
