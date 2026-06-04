const express = require('express');
const bcrypt = require('bcryptjs');
const db = require('../database/db');
const { authMiddleware, adminOnly } = require('../middleware/auth');

const router = express.Router();

// 管理员：获取所有会员列表
router.get('/', authMiddleware, adminOnly, (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const pageSize = parseInt(req.query.pageSize) || 20;
    const keyword = req.query.keyword || '';
    const level = req.query.level || '';
    const offset = (page - 1) * pageSize;

    const conditions = ["role != 'admin'"];
    const params = [];

    if (keyword) {
      conditions.push('(name LIKE ? OR phone LIKE ? OR wechat_id LIKE ?)');
      params.push('%' + keyword + '%', '%' + keyword + '%', '%' + keyword + '%');
    }
    if (level) {
      conditions.push('level = ?');
      params.push(level);
    }

    const where = 'WHERE ' + conditions.join(' AND ');
    const totalRow = db.prepare('SELECT COUNT(*) as cnt FROM members ' + where).get(...params);
    const total = totalRow ? totalRow.cnt : 0;
    const members = db.prepare('SELECT id, name, phone, wechat_id, level, rank, referrer_id, registered_at, upgraded_at, total_personal_sales, total_service_sales, total_commission_earned, status FROM members ' + where + ' ORDER BY registered_at DESC LIMIT ? OFFSET ?').all(...params, pageSize, offset);

    const result = members.map(m => {
      const referrer = m.referrer_id
        ? db.prepare('SELECT id, name FROM members WHERE id = ?').get(m.referrer_id)
        : null;
      return Object.assign({}, m, { referrer: referrer });
    });

    res.json({ total: total, page: page, pageSize: pageSize, data: result });
  } catch (e) {
    console.error('members list error:', e);
    res.status(500).json({ error: e.message });
  }
});

// 管理员：添加会员
router.post('/', authMiddleware, adminOnly, (req, res) => {
  const { name, phone, password, wechat_id, level, referrer_phone } = req.body;

  if (!name || !phone || !password) return res.status(400).json({ error: '姓名、手机号、密码不能为空' });
  if (password.length < 6) return res.status(400).json({ error: '密码至少6位' });

  const existing = db.prepare('SELECT id FROM members WHERE phone = ?').get(phone);
  if (existing) return res.status(400).json({ error: '该手机号已注册' });

  let referrer_id = null;
  if (referrer_phone) {
    const referrer = db.prepare('SELECT id FROM members WHERE phone = ?').get(referrer_phone);
    if (!referrer) return res.status(400).json({ error: '上级手机号不存在' });
    referrer_id = referrer.id;
  }

  const memberLevel = level || 'huiyuan';
  const hash = bcrypt.hashSync(password, 10);

  const result = db.prepare(`
    INSERT INTO members (name, phone, password_hash, wechat_id, level, referrer_id)
    VALUES (?, ?, ?, ?, ?, ?)
  `).run(name, phone, hash, wechat_id || null, memberLevel, referrer_id);

  db.prepare('INSERT INTO tier_progress (member_id) VALUES (?)').run(result.lastInsertRowid);

  res.json({ message: '会员添加成功', id: result.lastInsertRowid });
});

// 管理员：修改会员信息
router.put('/:id', authMiddleware, adminOnly, (req, res) => {
  const { name, wechat_id, level, status } = req.body;
  const memberId = req.params.id;

  const member = db.prepare('SELECT * FROM members WHERE id = ?').get(memberId);
  if (!member) return res.status(404).json({ error: '会员不存在' });

  db.prepare(`
    UPDATE members SET
      name = COALESCE(?, name),
      wechat_id = COALESCE(?, wechat_id),
      level = COALESCE(?, level),
      status = COALESCE(?, status)
    WHERE id = ?
  `).run(name || null, wechat_id || null, level || null, status || null, memberId);

  res.json({ message: '修改成功' });
});

// 管理员：重置密码
router.post('/:id/reset-password', authMiddleware, adminOnly, (req, res) => {
  const { newPassword } = req.body;
  if (!newPassword || newPassword.length < 6) return res.status(400).json({ error: '密码至少6位' });

  const hash = bcrypt.hashSync(newPassword, 10);
  db.prepare('UPDATE members SET password_hash = ? WHERE id = ?').run(hash, req.params.id);
  res.json({ message: '密码重置成功' });
});

// 获取当前用户的直属下级
router.get('/my-team', authMiddleware, (req, res) => {
  const directTeam = db.prepare(`
    SELECT id, name, phone, wechat_id, level, rank,
           total_personal_sales, total_service_sales, total_commission_earned,
           registered_at, upgraded_at
    FROM members WHERE referrer_id = ?
    ORDER BY registered_at DESC
  `).all(req.user.id);

  // 每个直属下级的直属下级数量
  const result = directTeam.map(m => {
    const subCount = db.prepare('SELECT COUNT(*) as cnt FROM members WHERE referrer_id = ?').get(m.id).cnt;
    return { ...m, subCount };
  });

  res.json(result);
});

// 获取当前用户服务网络（含直属+间接）
router.get('/my-team-deep', authMiddleware, (req, res) => {
  const direct = db.prepare(`
    SELECT id, name, phone, level, rank, total_personal_sales, total_service_sales, registered_at,
           (SELECT COUNT(*) FROM members WHERE referrer_id = m.id) as subCount
    FROM members m WHERE referrer_id = ? AND role != 'admin'
    ORDER BY registered_at DESC
  `).all(req.user.id);

  // 每个直属的直属（间接）
  let indirect = [];
  let level3PlusCount = 0;

  for (const d of direct) {
    const subs = db.prepare(`
      SELECT id, name, level, rank, total_personal_sales, registered_at
      FROM members WHERE referrer_id = ? AND role != 'admin'
    `).all(d.id);
    indirect = indirect.concat(subs.map(s => ({ ...s, via: d.name })));

    // 三级以后（间接的下级）
    for (const s of subs) {
      const deepCount = db.prepare(`
        SELECT COUNT(*) as cnt FROM members WHERE referrer_id = ?
      `).get(s.id);
      level3PlusCount += deepCount.cnt;
    }
  }

  const totalCount = direct.length + indirect.length + level3PlusCount;

  res.json({
    direct,
    indirect,
    level3PlusCount,
    totalCount,
  });
});

// 管理员：获取某会员的完整服务网络树
router.get('/:id/tree', authMiddleware, adminOnly, (req, res) => {
  function buildTree(memberId, depth = 0) {
    if (depth > 10) return []; // 防止无限递归
    const children = db.prepare(`
      SELECT id, name, phone, level, rank, total_personal_sales, total_service_sales
      FROM members WHERE referrer_id = ? AND role != 'admin'
    `).all(memberId);
    return children.map(c => ({
      ...c,
      children: buildTree(c.id, depth + 1),
    }));
  }

  const member = db.prepare('SELECT id, name, level, rank FROM members WHERE id = ?').get(req.params.id);
  if (!member) return res.status(404).json({ error: '会员不存在' });

  res.json({
    ...member,
    children: buildTree(member.id),
  });
});

// 管理员：删除会员
router.delete('/:id', authMiddleware, adminOnly, (req, res) => {
  try {
    const member = db.prepare('SELECT id, name, role FROM members WHERE id = ?').get(req.params.id);
    if (!member) return res.status(404).json({ error: '会员不存在' });
    if (member.role === 'admin') return res.status(403).json({ error: '不能删除管理员' });

    // 把该会员的下级上级指向null（断开关系）
    db.prepare('UPDATE members SET referrer_id = NULL WHERE referrer_id = ?').run(req.params.id);
    // 删除相关数据
    db.prepare('DELETE FROM tier_progress WHERE member_id = ?').run(req.params.id);
    db.prepare('DELETE FROM commissions WHERE member_id = ?').run(req.params.id);
    db.prepare('DELETE FROM members WHERE id = ?').run(req.params.id);

    res.json({ message: '删除成功' });
  } catch (e) {
    console.error('delete member error:', e);
    res.status(500).json({ error: e.message });
  }
});

module.exports = router;
