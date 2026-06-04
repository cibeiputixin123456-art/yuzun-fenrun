const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const db = require('../database/db');
const { authMiddleware } = require('../middleware/auth');

const router = express.Router();

// 登录
router.post('/login', async (req, res) => {
  const { phone, password } = req.body;
  if (!phone || !password) return res.status(400).json({ error: '手机号和密码不能为空' });

  const member = await db.prepare('SELECT * FROM members WHERE phone = ?').get(phone);
  if (!member) return res.status(401).json({ error: '手机号或密码错误' });
  if (member.status === 'inactive') return res.status(403).json({ error: '账号已被禁用' });

  const ok = bcrypt.compareSync(password, member.password_hash);
  if (!ok) return res.status(401).json({ error: '手机号或密码错误' });

  const token = jwt.sign(
    { id: member.id, phone: member.phone, role: member.role, name: member.name },
    process.env.JWT_SECRET || 'yuzun_secret_key',
    { expiresIn: '7d' }
  );

  res.json({
    token,
    user: {
      id: member.id,
      name: member.name,
      phone: member.phone,
      role: member.role,
      level: member.level,
      rank: member.rank,
    },
  });
});

// 修改密码
router.post('/change-password', authMiddleware, async (req, res) => {
  const { oldPassword, newPassword } = req.body;
  if (!oldPassword || !newPassword) return res.status(400).json({ error: '参数不完整' });
  if (newPassword.length < 6) return res.status(400).json({ error: '新密码至少6位' });

  const member = await db.prepare('SELECT * FROM members WHERE id = ?').get(req.user.id);
  if (!bcrypt.compareSync(oldPassword, member.password_hash)) {
    return res.status(401).json({ error: '原密码错误' });
  }

  const hash = bcrypt.hashSync(newPassword, 10);
  await db.prepare('UPDATE members SET password_hash = ? WHERE id = ?').run(hash, req.user.id);
  res.json({ message: '密码修改成功' });
});

// 获取当前用户信息
router.get('/me', authMiddleware, async (req, res) => {
  const member = await db.prepare(`
    SELECT id, name, phone, wechat_id, role, level, rank,
           referrer_id, registered_at, upgraded_at,
           total_personal_sales, total_service_sales, total_commission_earned, status
    FROM members WHERE id = ?
  `).get(req.user.id);

  const referrer = member.referrer_id
    ? await db.prepare('SELECT id, name, phone FROM members WHERE id = ?').get(member.referrer_id)
    : null;

  const tierProgress = await db.prepare('SELECT * FROM tier_progress WHERE member_id = ?').get(member.id);

  res.json({ ...member, referrer, tierProgress });
});

module.exports = router;
