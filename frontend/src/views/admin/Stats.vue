<template>
  <div class="stats-page">
    <div class="page-title">数据统计</div>

    <!-- 周期切换 -->
    <el-tabs v-model="period" @tab-change="load" class="period-tabs">
      <el-tab-pane label="今天" name="today" />
      <el-tab-pane label="本月" name="month" />
      <el-tab-pane label="本年" name="year" />
    </el-tabs>

    <!-- 6个统计卡片 -->
    <div class="stats-grid">
      <div class="stat-card">
        <div class="stat-icon">💰</div>
        <div class="stat-label">总销售额</div>
        <div class="stat-val">¥{{ fmt(data.totalSales) }}</div>
      </div>
      <div class="stat-card">
        <div class="stat-icon">📦</div>
        <div class="stat-label">总订单数</div>
        <div class="stat-val">{{ data.orderCount || 0 }}</div>
      </div>
      <div class="stat-card">
        <div class="stat-icon">👥</div>
        <div class="stat-label">会员总数</div>
        <div class="stat-val">{{ data.totalMembers || 0 }}</div>
      </div>
      <div class="stat-card">
        <div class="stat-icon">📤</div>
        <div class="stat-label">总收益支出</div>
        <div class="stat-val">¥{{ fmt(data.totalCommissions) }}</div>
      </div>
      <div class="stat-card">
        <div class="stat-icon">🏆</div>
        <div class="stat-label">公司经营激励</div>
        <div class="stat-val">¥{{ fmt(data.totalTierBonus) }}</div>
      </div>
      <div class="stat-card warn">
        <div class="stat-icon">⏳</div>
        <div class="stat-label">待发放金额</div>
        <div class="stat-val">¥{{ fmt(data.pendingAmount) }}</div>
      </div>
    </div>

    <!-- 身份人数分布 -->
    <div class="card member-dist">
      <div class="card-title">会员身份分布</div>
      <div class="dist-list">
        <div class="dist-item">
          <span class="dist-icon">⭐</span>
          <span class="dist-name">星享体验官</span>
          <span class="dist-count">{{ data.memberCounts?.xinxiang || 0 }} 人</span>
        </div>
        <div class="dist-item">
          <span class="dist-icon">🌟</span>
          <span class="dist-name">星耀服务官</span>
          <span class="dist-count">{{ data.memberCounts?.xingyao || 0 }} 人</span>
        </div>
        <div class="dist-item">
          <span class="dist-icon">👤</span>
          <span class="dist-name">普通会员</span>
          <span class="dist-count">{{ data.memberCounts?.huiyuan || 0 }} 人</span>
        </div>
      </div>
    </div>

    <!-- 毛利润估算 -->
    <div class="card profit-card">
      <div class="card-title">毛利润估算</div>
      <div class="profit-row">
        <span class="pr-label">总销售额</span>
        <span class="pr-val">¥{{ fmt(data.totalSales) }}</span>
      </div>
      <div class="profit-row">
        <span class="pr-label">产品成本（¥300/盒）</span>
        <span class="pr-val neg">- ¥{{ fmt(data.totalCost) }}</span>
      </div>
      <div class="profit-row">
        <span class="pr-label">总收益支出</span>
        <span class="pr-val neg">- ¥{{ fmt(data.totalCommissions) }}</span>
      </div>
      <div class="profit-divider" />
      <div class="profit-row total-row">
        <span class="pr-label">估算毛利润</span>
        <span class="pr-val gold">¥{{ fmt(data.grossProfit) }}</span>
      </div>
      <div class="profit-note">* 估算仅供参考，实际以财务核算为准，成本按¥300/盒计算</div>
    </div>

    <div class="compliance">
      本平台所有收益均来自真实产品分享 · 严格两级服务收益 · 0元加入 · 无入门费
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { api } from '../../api/index.js'

const period = ref('month')
const data   = ref({})

function fmt(n) { return (n || 0).toFixed(2) }

async function load() {
  try {
    const res = await api.get('/stats/overview', { params: { period: period.value } })
    data.value = res.data
  } catch {
    // 降级：尝试旧接口
    try {
      const r = await api.get('/commissions/stats')
      data.value = {
        totalSales: r.data.totalSalesAmount,
        orderCount: r.data.totalOrders,
        totalMembers: r.data.memberCount,
        totalCommissions: r.data.totalCommissionsPaid,
        totalTierBonus: r.data.totalTierBonus,
        pendingAmount: r.data.pendingPayAmount,
        memberCounts: {},
        totalCost: 0,
        grossProfit: 0,
      }
    } catch {}
  }
}

onMounted(load)
</script>

<style scoped>
.stats-page { max-width: 700px; margin: 0 auto; }
.page-title { font-size: 18px; font-weight: 700; color: var(--gold-dark); margin-bottom: 14px; }

.period-tabs :deep(.el-tabs__item.is-active) { color: var(--gold); }
.period-tabs :deep(.el-tabs__active-bar) { background: var(--gold); }

.stats-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 10px;
  margin: 14px 0;
}
@media (max-width: 480px) {
  .stats-grid { grid-template-columns: repeat(2, 1fr); }
}

.stat-card {
  background: #fff;
  border: 1.5px solid var(--gold-border);
  border-radius: 14px;
  padding: 16px 12px;
  text-align: center;
  box-shadow: 0 2px 8px rgba(139,105,20,0.06);
}
.stat-card.warn { border-color: #fad399; background: #fffaf5; }
.stat-icon { font-size: 22px; margin-bottom: 6px; }
.stat-label { font-size: 11px; color: #888; margin-bottom: 6px; }
.stat-val { font-size: 17px; font-weight: 700; color: var(--gold); }
.stat-card.warn .stat-val { color: #e67e22; }

.card {
  background: #fff;
  border: 1.5px solid var(--gold-border);
  border-radius: 14px;
  padding: 16px;
  margin-bottom: 14px;
  box-shadow: 0 2px 8px rgba(139,105,20,0.06);
}
.card-title { font-size: 15px; font-weight: 600; color: var(--gold); margin-bottom: 14px; }

.dist-list { display: flex; flex-direction: column; gap: 8px; }
.dist-item {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 8px 0;
  border-bottom: 1px solid #f5f0e8;
}
.dist-item:last-child { border-bottom: none; }
.dist-icon { font-size: 18px; }
.dist-name { flex: 1; font-size: 14px; color: #444; }
.dist-count { font-size: 16px; font-weight: 600; color: var(--gold); }

.profit-row { display: flex; justify-content: space-between; align-items: center; padding: 8px 0; }
.pr-label { font-size: 13px; color: #666; }
.pr-val { font-size: 15px; font-weight: 600; color: #333; }
.pr-val.neg { color: #e74c3c; }
.pr-val.gold { color: var(--gold); font-size: 18px; }
.profit-divider { border-top: 1.5px dashed #e8e0cc; margin: 4px 0; }
.total-row .pr-label { font-weight: 600; color: #333; }
.profit-note { font-size: 10px; color: #bbb; margin-top: 8px; }

.compliance { font-size: 10px; color: #bbb; text-align: center; padding: 16px 8px 4px; line-height: 1.8; }
</style>
