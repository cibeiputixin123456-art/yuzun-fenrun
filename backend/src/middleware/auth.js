const jwt = require('jsonwebtoken');

function authMiddleware(req, res, next) {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) return res.status(401).json({ error: '未登录' });

  try {
    req.user = jwt.verify(token, process.env.JWT_SECRET || 'yuzun_secret_key');
    next();
  } catch {
    res.status(401).json({ error: 'Token 已失效，请重新登录' });
  }
}

function adminOnly(req, res, next) {
  if (req.user?.role !== 'admin') {
    return res.status(403).json({ error: '无权限，仅管理员可操作' });
  }
  next();
}

module.exports = { authMiddleware, adminOnly };
