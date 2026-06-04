const express = require('express');
const db = require('../database/db');
const { authMiddleware, adminOnly } = require('../middleware/auth');
const router = express.Router();

router.get('/overview', authMiddleware, adminOnly, (req, res) => {
  const { period = 'month' } = req.query;

  let dateFilter;
  if (period === 'today') {
    dateFilter = "date(created_at) = date('now', 'localtime')";
  } else if (period === 'year') {
    dateFilter = "strftime('%Y', created_at) = strftime('%Y', 'now', 'localtime')";
  } else {
    dateFilter = "strftime('%Y-%m', created_at) = strftime('%Y-%m', 'now', 'localtime')";
  }

  const salesData = db.prepare(`
    SELECT COUNT(*) as orderCount, COALESCE(SUM(total_amount), 0) as totalSales,
           COALESCE(SUM(quantity), 0) as totalQuantity
    FROM orders WHERE ${dateFilter} AND order_type != 'dividend'
  `).get();

  const commData = db.prepare(`
    SELECT COALESCE(SUM(amount), 0) as totalComm FROM commissions WHERE ${dateFilter}
  `).get();

  const tierData = db.prepare(`
    SELECT COALESCE(SUM(amount), 0) as totalTier FROM commissions WHERE ${dateFilter} AND commission_type = 'tier_incentive'
  `).get();

  const pendingData = db.prepare(`
    SELECT COALESCE(SUM(amount), 0) as pendingAmount FROM commissions WHERE status = 'pending'
  `).get();

  const memberCounts = db.prepare(`
    SELECT level, COUNT(*) as cnt FROM members WHERE role != 'admin' GROUP BY level
  `).all();

  const totalMembers = db.prepare(`SELECT COUNT(*) as cnt FROM members WHERE role != 'admin'`).get();

  // 成本和毛利仅管理员可见，不对外暴露
  const costPerBox = 300;
  const totalCost = salesData.totalQuantity * costPerBox;
  const grossProfit = salesData.totalSales - totalCost - commData.totalComm;

  const isAdmin = req.user.role === 'admin';

  res.json({
    period,
    totalSales: salesData.totalSales,
    orderCount: salesData.orderCount,
    totalCommissions: commData.totalComm,
    totalTierBonus: tierData.totalTier,
    pendingAmount: pendingData.pendingAmount,
    // 成本和毛利只给管理员
    totalCost: isAdmin ? totalCost : undefined,
    grossProfit: isAdmin ? grossProfit : undefined,
    totalMembers: totalMembers.cnt,
    memberCounts: Object.fromEntries(memberCounts.map(r => [r.level, r.cnt])),
  });
});

module.exports = router;
