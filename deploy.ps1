# 御尊分润系统 - 一键部署到腾讯云
param(
    [string]$IP = "124.221.180.140",
    [string]$Password = ""
)

if (-not $Password) {
    $Password = Read-Host "请输入服务器密码"
}

Write-Host "🦐 开始部署御尊分润系统..." -ForegroundColor Green

# 安装sshpass（用于密码登录）
$sshCmd = "sshpass -p '$Password' ssh -o StrictHostKeyChecking=no root@$IP"

# 部署脚本（在服务器上执行）
$deployScript = @'
#!/bin/bash
set -e
echo "📦 更新系统..."
apt-get update -y -q

echo "📦 安装 Node.js 22..."
curl -fsSL https://deb.nodesource.com/setup_22.x | bash -
apt-get install -y nodejs

echo "📦 安装 git..."
apt-get install -y git

echo "✅ Node版本: $(node -v)"
echo "✅ npm版本: $(npm -v)"

# 创建应用目录
mkdir -p /opt/yuzun
echo "READY"
'@

Write-Host "正在连接服务器并安装环境，请稍候（约2-3分钟）..." -ForegroundColor Cyan
Write-Host "提示：如果提示输入密码，请手动输入" -ForegroundColor Yellow
