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

// 自助注册
router.post('/register', async (req, res) => {
  try {
    const { name, phone, password, wechat_id, referrer_id } = req.body;
    if (!name || !phone || !password) return res.status(400).json({ error: '姓名、手机号、密码不能为空' });
    if (password.length < 6) return res.status(400).json({ error: '密码至少6位' });
    if (!/^1[3-9]\d{9}$/.test(phone)) return res.status(400).json({ error: '手机号格式不正确' });

    const existing = await db.prepare('SELECT id FROM members WHERE phone = ?').get(phone);
    if (existing) return res.status(400).json({ error: '该手机号已注册' });

    // 验证推荐人
    let referrer = null;
    if (referrer_id) {
      referrer = await db.prepare('SELECT id, name, level FROM members WHERE id = ?').get(referrer_id);
      if (!referrer) return res.status(400).json({ error: '推荐人ID不存在，请确认后重新输入' });
    }

    const hash = bcrypt.hashSync(password, 10);
    const result = await db.prepare(`
      INSERT INTO members (name, phone, password_hash, wechat_id, role, level, rank, referrer_id)
      VALUES (?, ?, ?, ?, 'member', 'huiyuan', 'xingyao', ?)
    `).run(name, phone, hash, wechat_id || null, referrer ? referrer.id : null);

    await db.prepare('INSERT INTO tier_progress (member_id) VALUES (?)').run(result.lastInsertRowid);

    const token = jwt.sign(
      { id: result.lastInsertRowid, phone, role: 'member', name },
      process.env.JWT_SECRET || 'yuzun_secret_key',
      { expiresIn: '7d' }
    );

    res.json({
      token,
      user: { id: result.lastInsertRowid, name, phone, role: 'member', level: 'huiyuan', rank: 'xingyao' },
      referrer: referrer ? { id: referrer.id, name: referrer.name } : null,
    });
  } catch (e) {
    console.error('register error:', e);
    res.status(500).json({ error: e.message });
  }
});

// 根据ID查询推荐人信息（注册前预览）
router.get('/referrer/:id', async (req, res) => {
  try {
    const m = await db.prepare('SELECT id, name, level FROM members WHERE id = ? AND role != ?').get(req.params.id, 'admin');
    if (!m) return res.status(404).json({ error: '推荐人不存在' });
    const levelLabel = { xinxiang: '星享体验官', xingyao: '星耀服务官', huiyuan: '普通会员' };
    res.json({ id: m.id, name: m.name, levelLabel: levelLabel[m.level] || m.level });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
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
