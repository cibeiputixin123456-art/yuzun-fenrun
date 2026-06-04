const express = require('express');
const db = require('../database/db');
const { authMiddleware, adminOnly } = require('../middleware/auth');
const router = express.Router();

router.get('/overview', authMiddleware, adminOnly, async (req, res) => {
  try {
    const { period = 'month' } = req.query;

    let dateFilter;
    if (period === 'today') {
      dateFilter = "date(created_at) = date('now', 'localtime')";
    } else if (period === 'year') {
      dateFilter = "strftime('%Y', created_at) = strftime('%Y', 'now', 'localtime')";
    } else {
      dateFilter = "strftime('%Y-%m', created_at) = strftime('%Y-%m', 'now', 'localtime')";
    }

    const salesData = await db.prepare(`SELECT COUNT(*) as orderCount, COALESCE(SUM(total_amount), 0) as totalSales, COALESCE(SUM(quantity), 0) as totalQuantity FROM orders WHERE ${dateFilter} AND order_type != 'dividend'`).get();
    const commData = await db.prepare(`SELECT COALESCE(SUM(amount), 0) as totalComm FROM commissions WHERE ${dateFilter}`).get();
    const tierData = await db.prepare(`SELECT COALESCE(SUM(amount), 0) as totalTier FROM commissions WHERE ${dateFilter} AND commission_type = 'tier_incentive'`).get();
    const pendingData = await db.prepare(`SELECT COALESCE(SUM(amount), 0) as pendingAmount FROM commissions WHERE status = 'pending'`).get();
    const memberCounts = await db.prepare(`SELECT level, COUNT(*) as cnt FROM members WHERE role != 'admin' GROUP BY level`).all();
    const totalMembers = await db.prepare(`SELECT COUNT(*) as cnt FROM members WHERE role != 'admin'`).get();

    const costPerBox = 300;
    const totalCost = (salesData.totalQuantity || 0) * costPerBox;
    const grossProfit = (salesData.totalSales || 0) - totalCost - (commData.totalComm || 0);
    const isAdmin = req.user.role === 'admin';

    res.json({
      period,
      totalSales: salesData.totalSales || 0,
      orderCount: salesData.orderCount || 0,
      totalCommissions: commData.totalComm || 0,
      totalTierBonus: tierData.totalTier || 0,
      pendingAmount: pendingData.pendingAmount || 0,
      totalCost: isAdmin ? totalCost : undefined,
      grossProfit: isAdmin ? grossProfit : undefined,
      totalMembers: totalMembers ? totalMembers.cnt : 0,
      memberCounts: Object.fromEntries((memberCounts || []).map(r => [r.level, r.cnt])),
    });
  } catch (e) { console.error(e); res.status(500).json({ error: e.message }); }
});

module.exports = router;
