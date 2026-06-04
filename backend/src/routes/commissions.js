const express = require('express');
const db = require('../database/db');
const { authMiddleware, adminOnly } = require('../middleware/auth');

const router = express.Router();

const TYPE_LABELS = {
  self_retail: '零售提成',
  referral_income: '推荐收益',
  service_subsidy: '服务津贴(5%)',
  training_subsidy: '培育补贴(1.5%)',
  upgrade_bonus: '升级补差价',
  tier_incentive: '阶梯激励',
};

// 获取我的佣金记录
router.get('/my', authMiddleware, async (req, res) => {
  try {
    const { page = 1, pageSize = 20, month = '', commission_type = '' } = req.query;
    const offset = (page - 1) * pageSize;

    let where = 'WHERE c.member_id = ?';
    const params = [req.user.id];

    if (month) { where += ` AND strftime('%Y-%m', c.created_at) = ?`; params.push(month); }
    if (commission_type) { where += ' AND c.commission_type = ?'; params.push(commission_type); }

    const totalRow = await db.prepare(`SELECT COUNT(*) as cnt FROM commissions c ${where}`).get(...params);
    const total = totalRow ? totalRow.cnt : 0;

    const records = await db.prepare(`
      SELECT c.*, o.order_type, o.quantity, o.buyer_name, o.created_at as order_date,
             m.name as from_member_name
      FROM commissions c
      JOIN orders o ON c.order_id = o.id
      JOIN members m ON o.seller_id = m.id
      ${where}
      ORDER BY c.created_at DESC LIMIT ? OFFSET ?
    `).all(...params, Number(pageSize), Number(offset));

    const result = records.map(r => ({ ...r, type_label: TYPE_LABELS[r.commission_type] || r.commission_type }));

    const summaryParams = [req.user.id];
    let summaryWhere = 'WHERE member_id = ?';
    if (month) { summaryWhere += ` AND strftime('%Y-%m', created_at) = ?`; summaryParams.push(month); }

    const summary = await db.prepare(`
      SELECT
        SUM(CASE WHEN status = 'pending' THEN amount ELSE 0 END) as pending_total,
        SUM(CASE WHEN status = 'paid' THEN amount ELSE 0 END) as paid_total,
        SUM(amount) as total
      FROM commissions ${summaryWhere}
    `).get(...summaryParams);

    res.json({ total, page: +page, pageSize: +pageSize, data: result, summary });
  } catch (e) { console.error(e); res.status(500).json({ error: e.message }); }
});

// 管理员：获取所有佣金记录
router.get('/', authMiddleware, adminOnly, async (req, res) => {
  try {
    const { page = 1, pageSize = 20, member_id = '', status = '' } = req.query;
    const offset = (page - 1) * pageSize;

    let where = 'WHERE 1=1';
    const params = [];
    if (member_id) { where += ' AND c.member_id = ?'; params.push(member_id); }
    if (status) { where += ' AND c.status = ?'; params.push(status); }

    const totalRow = await db.prepare(`SELECT COUNT(*) as cnt FROM commissions c ${where}`).get(...params);
    const total = totalRow ? totalRow.cnt : 0;

    const records = await db.prepare(`
      SELECT c.*, m.name as member_name, m.phone as member_phone, o.order_type, o.quantity, o.buyer_name
      FROM commissions c
      JOIN members m ON c.member_id = m.id
      JOIN orders o ON c.order_id = o.id
      ${where}
      ORDER BY c.created_at DESC LIMIT ? OFFSET ?
    `).all(...params, Number(pageSize), Number(offset));

    const result = records.map(r => ({ ...r, type_label: TYPE_LABELS[r.commission_type] || r.commission_type }));
    res.json({ total, page: +page, pageSize: +pageSize, data: result });
  } catch (e) { console.error(e); res.status(500).json({ error: e.message }); }
});

// 管理员：标记佣金已发放
router.post('/pay', authMiddleware, adminOnly, async (req, res) => {
  try {
    const { ids } = req.body;
    if (!ids || !ids.length) return res.status(400).json({ error: 'ids 不能为空' });
    const placeholders = ids.map(() => '?').join(',');
    await db.prepare(`UPDATE commissions SET status = 'paid' WHERE id IN (${placeholders})`).run(...ids);
    res.json({ message: `已标记 ${ids.length} 条佣金为已发放` });
  } catch (e) { console.error(e); res.status(500).json({ error: e.message }); }
});

// 管理员：手动录入分红
router.post('/manual', authMiddleware, adminOnly, async (req, res) => {
  try {
    const { member_id, amount, note } = req.body;
    if (!member_id || !amount) return res.status(400).json({ error: '参数不完整' });

    const member = await db.prepare('SELECT * FROM members WHERE id = ?').get(member_id);
    if (!member) return res.status(404).json({ error: '会员不存在' });
    if (member.rank !== 'shareholder') return res.status(400).json({ error: '只有股东董事才能手动录入分红' });

    const orderResult = await db.prepare(`
      INSERT INTO orders (seller_id, buyer_name, quantity, unit_price, total_amount, order_type, note)
      VALUES (?, '股东分红', 0, 0, ?, 'dividend', ?)
    `).run(member_id, amount, note || '管理员手动录入分红');

    await db.prepare(`INSERT INTO commissions (order_id, member_id, commission_type, rate, amount, status) VALUES (?, ?, 'tier_incentive', 0, ?, 'pending')`).run(orderResult.lastInsertRowid, member_id, amount);
    await db.prepare('UPDATE members SET total_commission_earned = total_commission_earned + ? WHERE id = ?').run(amount, member_id);

    res.json({ message: '分红录入成功' });
  } catch (e) { console.error(e); res.status(500).json({ error: e.message }); }
});

// 管理员：汇总统计
router.get('/stats', authMiddleware, adminOnly, async (req, res) => {
  try {
    const totalOrders = await db.prepare("SELECT COUNT(*) as cnt, SUM(total_amount) as sum FROM orders WHERE order_type != 'dividend'").get();
    const totalCommissions = await db.prepare("SELECT SUM(amount) as sum FROM commissions WHERE commission_type != 'tier_incentive'").get();
    const totalTierBonus = await db.prepare("SELECT SUM(amount) as sum FROM commissions WHERE commission_type = 'tier_incentive'").get();
    const pendingPay = await db.prepare("SELECT SUM(amount) as sum FROM commissions WHERE status = 'pending'").get();
    const memberCount = await db.prepare("SELECT COUNT(*) as cnt FROM members WHERE role != 'admin'").get();

    res.json({
      totalOrders: totalOrders.cnt,
      totalSalesAmount: totalOrders.sum || 0,
      totalCommissionsPaid: totalCommissions.sum || 0,
      totalTierBonus: totalTierBonus.sum || 0,
      pendingPayAmount: pendingPay.sum || 0,
      memberCount: memberCount.cnt,
    });
  } catch (e) { console.error(e); res.status(500).json({ error: e.message }); }
});

module.exports = router;
