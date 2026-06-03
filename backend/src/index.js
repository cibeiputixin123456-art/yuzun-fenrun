require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

// API 路由
app.use('/api/auth', require('./routes/auth'));
app.use('/api/members', require('./routes/members'));
app.use('/api/orders', require('./routes/orders'));
app.use('/api/commissions', require('./routes/commissions'));
app.use('/api/stats', require('./routes/stats'));

// 健康检查
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', time: new Date().toLocaleString('zh-CN') });
});

// 托管前端静态文件（生产模式）
const frontendDist = path.join(__dirname, '../../frontend/dist');
const fs = require('fs');
if (fs.existsSync(frontendDist)) {
  app.use(express.static(frontendDist));
  app.get('*', (req, res) => {
    res.sendFile(path.join(frontendDist, 'index.html'));
  });
}

app.listen(PORT, () => {
  console.log(`\n🦐 御尊分润系统已启动`);
  console.log(`📡 地址：http://localhost:${PORT}`);
  console.log(`🔧 API：http://localhost:${PORT}/api/health\n`);
});
