const express = require('express');
const multer = require('multer');
const XLSX = require('xlsx');
const db = require('../database/db');
const { authMiddleware, adminOnly } = require('../middleware/auth');
const { calcCommissions, calcTierBonus, UNIT_PRICE } = require('../engine/commission');

const router = express.Router();
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 10 * 1024 * 1024 } });

const ORDER_TYPE_MAP = {
  '自用复购': 'repurchase', '复购': 'repurchase',
  '自己下单': 'self_order', '自用': 'self_order',
  '卖给客户': 'customer_sale', '客户销售': 'customer_sale',
  '升级': 'upgrade', '升级补购': 'upgrade',
};

function parseRows(worksheet) {
  const rows = XLSX.utils.sheet_to_json(worksheet, { defval: '' });
  return rows.map((r, i) => {
    const phone = String(r['下单人手机号'] || r['手机号'] || r['phone'] || '').trim();
    const name  = String(r['下单人姓名'] || r['姓名'] || r['name'] || '').trim();
    const qty   = parseInt(r['盒数'] || r['数量'] || r['qty'] || 1);
    const typeRaw = String(r['订单类型'] || r['type'] || '').trim();
    const orderType = ORDER_TYPE_MAP[typeRaw] || 'self_order';
    const orderTime = r['下单时间'] || r['时间'] || '';
    return { rowNum: i + 2, phone, name, qty, typeRaw, orderType, orderTime };
  }).filter(r => r.phone);
}

async function getAncestors(sellerId) {
  const seller = await db.prepare('SELECT referrer_id FROM members WHERE id = ?').get(sellerId);
  if (!seller || !seller.referrer_id) return { level1: null, level2: null };
  const level1 = await db.prepare('SELECT id, level, referrer_id FROM members WHERE id = ?').get(seller.referrer_id);
  if (!level1) return { level1: null, level2: null };
  const level2 = level1.referrer_id
    ? await db.prepare('SELECT id, level FROM members WHERE id = ?').get(level1.referrer_id)
    : null;
  return { level1, level2 };
}

// 预览
router.post('/preview', authMiddleware, adminOnly, upload.single('file'), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: '请上传文件' });
    const workbook = XLSX.read(req.file.buffer, { type: 'buffer' });
    const sheet = workbook.Sheets[workbook.SheetNames[0]];
    const rows = parseRows(sheet);

    const preview = [];
    let totalAmount = 0, totalCommission = 0;
    const memberSet = new Set();

    for (const row of rows) {
      const member = await db.prepare('SELECT id, name, level FROM members WHERE phone = ?').get(row.phone);
      if (!member) { preview.push({ ...row, status: 'error', msg: '手机号未找到会员' }); continue; }

      const unitPrice = row.orderType === 'repurchase' ? Math.round(UNIT_PRICE * 0.75 * 100) / 100 : UNIT_PRICE;
      const amount = row.qty * unitPrice;
      const { level1, level2 } = await getAncestors(member.id);

      const commissions = row.orderType === 'repurchase' ? [] : calcCommissions({
        seller: { id: member.id, level: member.level }, level1, level2,
        totalAmount: amount, orderType: row.orderType, orderId: 0,
      });

      const commTotal = commissions.reduce((s, c) => s + c.amount, 0);
      totalAmount += amount;
      totalCommission += commTotal;
      memberSet.add(member.id);
      commissions.forEach(c => memberSet.add(c.member_id));

      const commWithNames = [];
      for (const c of commissions) {
        const m = await db.prepare('SELECT name FROM members WHERE id = ?').get(c.member_id);
        commWithNames.push({ ...c, memberName: m ? m.name : '?' });
      }

      preview.push({ ...row, memberName: member.name, memberId: member.id, memberLevel: member.level,
        unitPrice, amount, status: 'ok', msg: '', commissions: commWithNames, commTotal });
    }

    const errorCount = preview.filter(r => r.status === 'error').length;
    const okCount = preview.filter(r => r.status === 'ok').length;

    res.json({
      rows: preview,
      summary: { total: preview.length, ok: okCount, error: errorCount,
        totalAmount: Math.round(totalAmount * 100) / 100,
        totalCommission: Math.round(totalCommission * 100) / 100,
        affectedMembers: memberSet.size },
    });
  } catch (e) { console.error('import preview error:', e); res.status(500).json({ error: e.message }); }
});

// 正式导入
router.post('/confirm', authMiddleware, adminOnly, upload.single('file'), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: '请上传文件' });
    const workbook = XLSX.read(req.file.buffer, { type: 'buffer' });
    const sheet = workbook.Sheets[workbook.SheetNames[0]];
    const rows = parseRows(sheet);

    let importedOrders = 0, totalAmount = 0, totalCommission = 0;
    const memberSet = new Set();
    const errors = [];

    for (const row of rows) {
      try {
        const member = await db.prepare('SELECT * FROM members WHERE phone = ?').get(row.phone);
        if (!member) { errors.push(`第${row.rowNum}行：手机号 ${row.phone} 未找到会员`); continue; }

        const unitPrice = row.orderType === 'repurchase' ? Math.round(UNIT_PRICE * 0.75 * 100) / 100 : UNIT_PRICE;
        const amount = row.qty * unitPrice;

        const orderResult = await db.prepare(
          'INSERT INTO orders (seller_id, buyer_name, quantity, unit_price, total_amount, order_type, note) VALUES (?, ?, ?, ?, ?, ?, ?)'
        ).run(member.id, row.name || null, row.qty, unitPrice, amount, row.orderType, '批量导入');
        const orderId = orderResult.lastInsertRowid;

        const { level1, level2 } = await getAncestors(member.id);
        const commissions = row.orderType === 'repurchase' ? [] : calcCommissions({
          seller: { id: member.id, level: member.level }, level1, level2,
          totalAmount: amount, orderType: row.orderType, orderId,
        });

        for (const c of commissions) {
          await db.prepare('INSERT INTO commissions (order_id, member_id, commission_type, rate, amount) VALUES (?, ?, ?, ?, ?)').run(c.order_id, c.member_id, c.commission_type, c.rate, c.amount);
          await db.prepare('UPDATE members SET total_commission_earned = total_commission_earned + ? WHERE id = ?').run(c.amount, c.member_id);
          memberSet.add(c.member_id);
        }

        if (row.orderType === 'customer_sale') {
          await db.prepare('UPDATE members SET total_personal_sales = total_personal_sales + ? WHERE id = ?').run(amount, member.id);
        }

        let currentId = member.id;
        while (currentId) {
          const m = await db.prepare('SELECT id, referrer_id FROM members WHERE id = ?').get(currentId);
          if (!m) break;
          await db.prepare('UPDATE members SET total_service_sales = total_service_sales + ? WHERE id = ?').run(amount, m.id);
          const progress = await db.prepare('SELECT * FROM tier_progress WHERE member_id = ?').get(m.id);
          if (progress) {
            const { bonus, newRank, tierDetails } = calcTierBonus(progress.cumulative_sales, amount);
            if (bonus > 0) {
              for (const detail of tierDetails) {
                await db.prepare('INSERT INTO commissions (order_id, member_id, commission_type, rate, amount) VALUES (?, ?, ?, ?, ?)').run(orderId, m.id, 'tier_incentive', detail.rate, detail.amount);
                await db.prepare('UPDATE members SET total_commission_earned = total_commission_earned + ? WHERE id = ?').run(detail.amount, m.id);
                totalCommission += detail.amount;
              }
              await db.prepare("UPDATE tier_progress SET cumulative_sales = cumulative_sales + ?, tier_bonus_earned = tier_bonus_earned + ?, tier_level = ?, updated_at = datetime('now','localtime') WHERE member_id = ?").run(amount, bonus, newRank, m.id);
              await db.prepare('UPDATE members SET rank = ? WHERE id = ?').run(newRank, m.id);
            } else {
              await db.prepare("UPDATE tier_progress SET cumulative_sales = cumulative_sales + ?, updated_at = datetime('now','localtime') WHERE member_id = ?").run(amount, m.id);
            }
          }
          currentId = m.referrer_id;
        }

        const commTotal = commissions.reduce((s, c) => s + c.amount, 0);
        totalAmount += amount;
        totalCommission += commTotal;
        memberSet.add(member.id);
        importedOrders++;
      } catch (rowErr) {
        errors.push(`第${row.rowNum}行处理失败：${rowErr.message}`);
      }
    }

    res.json({ success: true, summary: { importedOrders, totalAmount: Math.round(totalAmount * 100) / 100, totalCommission: Math.round(totalCommission * 100) / 100, affectedMembers: memberSet.size, errors } });
  } catch (e) { console.error('import confirm error:', e); res.status(500).json({ error: e.message }); }
});

module.exports = router;
