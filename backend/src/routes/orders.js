const express = require('express');
const db = require('../database/db');
const { authMiddleware, adminOnly } = require('../middleware/auth');
const { calcCommissions, calcTierBonus, getRankByServiceSales, UNIT_PRICE } = require('../engine/commission');

const router = express.Router();

/**
 * 获取会员的level1和level2
 */
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

/**
 * 沿上级链更新 total_service_sales，并检查阶梯激励
 */
async function updateServiceSalesChain(sellerId, amount, orderId) {
  let currentId = sellerId;
  const tierCommissions = [];

  while (currentId) {
    const member = await db.prepare('SELECT id, referrer_id, total_service_sales FROM members WHERE id = ?').get(currentId);
    if (!member) break;

    const oldSales = member.total_service_sales;
    const newSales = oldSales + amount;

    await db.prepare('UPDATE members SET total_service_sales = ? WHERE id = ?').run(newSales, member.id);

    // 检查阶梯激励
    const progress = await db.prepare('SELECT * FROM tier_progress WHERE member_id = ?').get(member.id);
    if (progress) {
      const { bonus, newRank, tierDetails } = calcTierBonus(progress.cumulative_sales, amount);

      if (bonus > 0) {
        tierDetails.forEach(detail => {
          tierCommissions.push({
            order_id: orderId,
            member_id: member.id,
            commission_type: 'tier_incentive',
            rate: detail.rate,
            amount: detail.amount,
          });
        });

        await db.prepare(`
          UPDATE tier_progress SET
            cumulative_sales = cumulative_sales + ?,
            tier_bonus_earned = tier_bonus_earned + ?,
            tier_level = ?,
            updated_at = datetime('now','localtime')
          WHERE member_id = ?
        `).run(amount, bonus, newRank, member.id);

        // 同步更新 rank
        await db.prepare('UPDATE members SET rank = ? WHERE id = ?').run(newRank, member.id);
      } else {
        await db.prepare(`
          UPDATE tier_progress SET
            cumulative_sales = cumulative_sales + ?,
            updated_at = datetime('now','localtime')
          WHERE member_id = ?
        `).run(amount, member.id);
      }
    }

    currentId = member.referrer_id;
  }

  return tierCommissions;
}

// 创建订单（会员自己操作）
router.post('/', authMiddleware, async (req, res) => {
  const { quantity, buyer_name, order_type, note } = req.body;

  if (!quantity || quantity < 1) return res.status(400).json({ error: '数量不合法' });
  if (!order_type) return res.status(400).json({ error: '订单类型不能为空' });
  if (!['self_order', 'customer_sale', 'upgrade', 'repurchase'].includes(order_type)) {
    return res.status(400).json({ error: '订单类型无效' });
  }

  const seller = await db.prepare('SELECT * FROM members WHERE id = ?').get(req.user.id);
  if (!seller) return res.status(404).json({ error: '账号不存在' });

  // 星享体验官才能升级
  if (order_type === 'upgrade') {
    if (seller.level !== 'xinxiang') {
      return res.status(400).json({ error: '只有星享体验官才能升级' });
    }
    if (quantity !== 4) {
      return res.status(400).json({ error: '升级补购固定为4盒' });
    }
  }

  // 普通会员只能自购（不能customer_sale）
  if (seller.level === 'huiyuan' && order_type === 'customer_sale') {
    return res.status(400).json({ error: '普通会员不能进行销售分润，请先购买产品成为星享体验官' });
  }

  // 复购7.5折，不计算佣金
  const unitPrice = order_type === 'repurchase' ? Math.round(UNIT_PRICE * 0.75 * 100) / 100 : UNIT_PRICE;
  const totalAmount = quantity * unitPrice;
  const { level1, level2 } = await getAncestors(seller.id);

  // 开启事务
  const createOrder = db.transaction(async () => {
    // 1. 创建订单
    const orderResult = await db.prepare(`
      INSERT INTO orders (seller_id, buyer_name, quantity, unit_price, total_amount, order_type, note)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run(seller.id, buyer_name || null, quantity, unitPrice, totalAmount, order_type, note || null);

    const orderId = orderResult.lastInsertRowid;

    // 2. 计算并写入佣金（复购不计算佣金）
    const commissions = order_type === 'repurchase' ? [] : calcCommissions({
      seller: { id: seller.id, level: seller.level },
      level1,
      level2,
      totalAmount,
      orderType: order_type,
      orderId,
    });

    for (const c of commissions) {
      await db.prepare(`
        INSERT INTO commissions (order_id, member_id, commission_type, rate, amount)
        VALUES (?, ?, ?, ?, ?)
      `).run(c.order_id, c.member_id, c.commission_type, c.rate, c.amount);

      // 更新收佣人的累计佣金
      await db.prepare('UPDATE members SET total_commission_earned = total_commission_earned + ? WHERE id = ?')
        .run(c.amount, c.member_id);
    }

    // 3. 更新 seller 个人销售额（customer_sale 才算个人销售）
    if (order_type === 'customer_sale') {
      await db.prepare('UPDATE members SET total_personal_sales = total_personal_sales + ? WHERE id = ?')
        .run(totalAmount, seller.id);
    }

    // 4. 沿链更新 service_sales 并计算阶梯激励
    const tierCommissions = await updateServiceSalesChain(seller.id, totalAmount, orderId);
    for (const c of tierCommissions) {
      await db.prepare(`
        INSERT INTO commissions (order_id, member_id, commission_type, rate, amount)
        VALUES (?, ?, ?, ?, ?)
      `).run(c.order_id, c.member_id, c.commission_type, c.rate, c.amount);
      await db.prepare('UPDATE members SET total_commission_earned = total_commission_earned + ? WHERE id = ?')
        .run(c.amount, c.member_id);
    }

    // 5. 升级处理
    if (order_type === 'upgrade') {
      await db.prepare(`
        UPDATE members SET level = 'xingyao', upgraded_at = datetime('now','localtime') WHERE id = ?
      `).run(seller.id);
    }

    // 6. 返回订单 + 佣金详情
    return {
      orderId,
      totalAmount,
      commissions: [...commissions, ...tierCommissions],
    };
  });

  try {
    const result = await createOrder();
    res.json({ message: '订单创建成功', ...result });
  } catch (err) {
    console.error('创建订单失败：', err);
    res.status(500).json({ error: '系统错误，请联系管理员' });
  }
});

// 获取我的订单列表
router.get('/my', authMiddleware, async (req, res) => {
  const { page = 1, pageSize = 20, month = '' } = req.query;
  const offset = (page - 1) * pageSize;

  let where = 'WHERE seller_id = ?';
  const params = [req.user.id];
  if (month) {
    where += ` AND strftime('%Y-%m', created_at) = ?`;
    params.push(month);
  }

  const totalRow = await db.prepare(`SELECT COUNT(*) as cnt FROM orders ${where}`).get(...params);
  const total = totalRow ? totalRow.cnt : 0;
  const orders = await db.prepare(`
    SELECT * FROM orders ${where}
    ORDER BY created_at DESC LIMIT ? OFFSET ?
  `).all(...params, pageSize, offset);

  res.json({ total, page: +page, pageSize: +pageSize, data: orders });
});

// 管理员：获取所有订单
router.get('/', authMiddleware, adminOnly, async (req, res) => {
  const { page = 1, pageSize = 20, seller_id = '' } = req.query;
  const offset = (page - 1) * pageSize;

  let where = 'WHERE 1=1';
  const params = [];
  if (seller_id) {
    where += ' AND o.seller_id = ?';
    params.push(seller_id);
  }

  const totalRow = await db.prepare(`SELECT COUNT(*) as cnt FROM orders o ${where}`).get(...params);
  const total = totalRow ? totalRow.cnt : 0;
  const orders = await db.prepare(`
    SELECT o.*, m.name as seller_name, m.phone as seller_phone
    FROM orders o
    JOIN members m ON o.seller_id = m.id
    ${where}
    ORDER BY o.created_at DESC LIMIT ? OFFSET ?
  `).all(...params, pageSize, offset);

  res.json({ total, page: +page, pageSize: +pageSize, data: orders });
});

// 管理员：手动添加订单（帮会员录入）
router.post('/admin', authMiddleware, adminOnly, async (req, res) => {
  const seller = await db.prepare('SELECT id FROM members WHERE id = ?').get(req.body.seller_id);
  if (!seller) return res.status(404).json({ error: '会员不存在' });
  req.user.id = seller.id;
  // 调用上面的逻辑（通过内部请求复用）
  res.status(501).json({ error: '请使用 POST /api/orders 并以对应会员身份登录操作，或联系开发者开启管理员代录功能' });
});

module.exports = router;
