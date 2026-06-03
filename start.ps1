# 御尊分润系统 - 一键启动脚本
Write-Host "🌿 御尊养生局分润系统 - 启动中..." -ForegroundColor Green

# 检查 Node.js
if (-not (Get-Command node -ErrorAction SilentlyContinue)) {
    Write-Host "❌ 未找到 Node.js，请先安装：https://nodejs.org" -ForegroundColor Red
    exit 1
}

$backendDir = Join-Path $PSScriptRoot "backend"
$frontendDir = Join-Path $PSScriptRoot "frontend"

# 安装后端依赖
Write-Host "`n📦 安装后端依赖..." -ForegroundColor Cyan
Set-Location $backendDir
if (-not (Test-Path "node_modules")) { npm install }

# 创建 .env
if (-not (Test-Path ".env")) {
    Copy-Item ".env.example" ".env"
    Write-Host "✅ 已创建 .env 文件，请根据需要修改管理员账号" -ForegroundColor Yellow
}

# 初始化数据库
Write-Host "`n🗄️ 初始化数据库..." -ForegroundColor Cyan
node src/database/init.js

# 安装前端依赖
Write-Host "`n📦 安装前端依赖..." -ForegroundColor Cyan
Set-Location $frontendDir
if (-not (Test-Path "node_modules")) { npm install }

# 构建前端
Write-Host "`n🔨 构建前端..." -ForegroundColor Cyan
npm run build

# 启动后端
Write-Host "`n🚀 启动服务..." -ForegroundColor Green
Set-Location $backendDir
Write-Host "✅ 访问地址：http://localhost:3000" -ForegroundColor Green
Write-Host "📱 手机也可访问（同一Wi-Fi下用电脑IP）" -ForegroundColor Green
Write-Host ""
node src/index.js
