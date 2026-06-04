<template>
  <div class="dashboard">
    <!-- 顶部横幅 -->
    <div class="top-banner">
      <div class="banner-title">御尊通络保健油</div>
      <div class="banner-slogan">通经络·养万家</div>
    </div>

    <!-- 身份卡片 -->
    <div class="card identity-card">
      <div class="identity-level">{{ levelIcon }} {{ levelName }}</div>
      <div class="identity-rank">{{ rankName }}</div>
    </div>

    <!-- 本月收益2x2网格 -->
    <div class="section-title">本月收益</div>
    <div class="income-grid">
      <div class="income-item">
        <div class="income-label">个人分享收益</div>
        <div class="income-val">¥{{ fmt(monthStats.selfRetail) }}</div>
      </div>
      <div class="income-item">
        <div class="income-label">服务津贴</div>
        <div class="income-val">¥{{ fmt(monthStats.subsidy) }}</div>
      </div>
      <div class="income-item">
        <div class="income-label">公司经营激励</div>
        <div class="income-val">¥{{ fmt(monthStats.tierIncentive) }}</div>
      </div>
      <div class="income-item gold">
        <div class="income-label">本月总收益</div>
        <div class="income-val big">¥{{ fmt(monthStats.total) }}</div>
      </div>
    </div>

    <!-- 累计服务销售额 -->
    <div class="card sales-card">
      <div class="sales-label">累计服务销售额</div>
      <div class="sales-amount">¥{{ fmtWan(user.total_service_sales) }}</div>
      <div class="sales-sub">您的服务网络为您创造的总业绩</div>
    </div>

    <!-- 阶梯进度条 -->
    <div class="card tier-card">
      <div class="tier-title">成长路径进度</div>
      <div class="tier-current">当前：{{ currentTier.name }}</div>
      <div class="tier-bar-wrap">
        <div class="tier-bar" :style="{ width: tierProgress + '%' }"></div>
      </div>
      <div class="tier-next-info">
        <span v-if="nextTier">距 <b>{{ nextTier.name }}</b> 还差 ¥{{ fmtWan(tierGap) }}</span>
        <span v-else>🎉 您已达到最高级别</span>
      </div>
      <router-link to="/tier-progress" class="tier-link">查看完整成长路径 →</router-link>
    </div>

    <!-- 累计总收益 -->
    <div class="card total-income-card">
      <div class="ti-label">累计总收益</div>
      <div class="ti-amount">¥{{ fmt(user.total_commission_earned) }}</div>
    </div>

    <!-- 快捷操作 -->
    <div class="section-title">快捷操作</div>
    <div class="quick-ops">
      <button class="op-btn gold-btn" @click="goOrder('customer_sale')">🛒 客户服务</button>
      <button class="op-btn gray-btn" @click="goOrder('self_order')">📦 个人选购</button>
      <button class="op-btn orange-btn" v-if="user.level === 'xinxiang'" @click="goOrder('upgrade')">⬆️ 身份升级</button>
    </div>

    <!-- 合规声明 -->
    <div class="compliance">
      本平台所有收益均来自真实产品分享 · 严格两级服务收益 · 0元加入 · 无入门费
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { api } from '../api/index.js'

const router = useRouter()
function getSavedUser() {
  try {
    const raw = localStorage.getItem('user')
    if (!raw || raw === 'undefined' || raw === 'null') return {}
    return JSON.parse(raw)
  } catch { return {} }
}
const user = ref(getSavedUser())

const monthStats = ref({ selfRetail: 0, subsidy: 0, tierIncentive: 0, total: 0 })

// 阶梯数据
const TIERS = [
  { name: '星耀服务官',    min: 0,       max: 600000,   rate: 0 },
  { name: '高级服务顾问',  min: 600000,  max: 1300000,  rate: 0.05 },
  { name: '资深服务顾问',  min: 1300000, max: 1990000,  rate: 0.06 },
  { name: '城市运营负责人',min: 1990000, max: 3000000,  rate: 0.07 },
  { name: '大区运营负责人',min: 3000000, max: 5000000,  rate: 0.08 },
  { name: '战略共建合伙人',min: 5000000, max: 10000000, rate: 0.10 },
  { name: '公司股东董事',  min: 10000000,max: Infinity, rate: null },
]

const LEVEL_MAP = {
  xinxiang: { icon: '⭐', name: '星享体验官' },
  xingyao:  { icon: '🌟', name: '星耀服务官' },
  huiyuan:  { icon: '👤', name: '普通会员' },
}
const RANK_MAP = {
  none: '暂无职级',
  senior_consultant: '高级服务顾问',
  expert_consultant: '资深服务顾问',
  city_manager: '城市运营负责人',
  region_manager: '大区运营负责人',
  partner: '战略共建合伙人',
  shareholder: '公司股东董事',
}

const levelIcon = computed(() => LEVEL_MAP[user.value.level]?.icon || '👤')
const levelName = computed(() => LEVEL_MAP[user.value.level]?.name || user.value.level)
const rankName  = computed(() => RANK_MAP[user.value.rank] || user.value.rank || '')

const serviceSales = computed(() => user.value.total_service_sales || 0)
const currentTier  = computed(() => {
  const s = serviceSales.value
  for (let i = TIERS.length - 1; i >= 0; i--) {
    if (s >= TIERS[i].min) return TIERS[i]
  }
  return TIERS[0]
})
const nextTier = computed(() => {
  const idx = TIERS.indexOf(currentTier.value)
  return idx < TIERS.length - 1 ? TIERS[idx + 1] : null
})
const tierProgress = computed(() => {
  if (!nextTier.value) return 100
  const cur = currentTier.value
  const s = serviceSales.value
  const range = cur.max - cur.min
  return Math.min(100, Math.round(((s - cur.min) / range) * 100))
})
const tierGap = computed(() => {
  if (!nextTier.value) return 0
  return Math.max(0, nextTier.value.min - serviceSales.value)
})

function fmt(n) { return (n || 0).toFixed(2) }
function fmtWan(n) {
  const v = n || 0
  if (v >= 10000) return (v / 10000).toFixed(1) + '万'
  return v.toFixed(0)
}

async function loadMonthStats() {
  try {
    const now = new Date()
    const month = `${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,'0')}`
    const res = await api.get('/commissions/my', { params: { pageSize: 1000, month } })
    const s = res.data.summary
    monthStats.value.selfRetail = s?.pending_total + s?.paid_total || 0
    // re-fetch with type filters for breakdown
    const breakdown = { selfRetail: 0, subsidy: 0, tierIncentive: 0, total: 0 }
    const recs = res.data.data || []
    recs.forEach(r => {
      if (r.commission_type === 'self_retail') breakdown.selfRetail += r.amount
      else if (['service_subsidy','training_subsidy'].includes(r.commission_type)) breakdown.subsidy += r.amount
      else if (r.commission_type === 'tier_incentive') breakdown.tierIncentive += r.amount
      breakdown.total += r.amount
    })
    monthStats.value = breakdown
  } catch {}
}

async function refreshUser() {
  try {
    // refresh from local storage (updated by server sync)
    user.value = getSavedUser()
  } catch {}
}

function goOrder(type) {
  router.push({ path: '/orders', query: { type } })
}

onMounted(() => {
  loadMonthStats()
  refreshUser()
})
</script>

<style scoped>
.dashboard {
  max-width: 600px;
  margin: 0 auto;
}

.top-banner {
  background: linear-gradient(135deg, #8B6914 0%, #5C430C 100%);
  border-radius: 14px;
  padding: 24px 20px;
  text-align: center;
  margin-bottom: 14px;
}
.banner-title {
  font-size: 20px;
  font-weight: 700;
  color: #FAF6EE;
  letter-spacing: 2px;
}
.banner-slogan {
  font-size: 13px;
  color: #D4AF5A;
  margin-top: 6px;
  letter-spacing: 4px;
}

.card {
  background: #A07820;
  border: 1.5px solid rgba(255,255,255,0.3);
  border-radius: 14px;
  padding: 16px;
  margin-bottom: 14px;
  box-shadow: 0 2px 12px rgba(0,0,0,0.15);
  color: #fff;
}

.identity-card {
  text-align: center;
  padding: 20px;
}
.identity-level {
  font-size: 22px;
  font-weight: 700;
  color: #fff;
}
.identity-rank {
  font-size: 14px;
  color: rgba(255,255,255,0.8);
  margin-top: 6px;
}

.section-title {
  font-size: 14px;
  font-weight: 600;
  color: #fff;
  margin: 4px 0 10px;
  padding-left: 2px;
}

.income-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 10px;
  margin-bottom: 14px;
}
.income-item {
  background: rgba(255,255,255,0.15);
  border: 1px solid rgba(255,255,255,0.3);
  border-radius: 12px;
  padding: 14px 12px;
  text-align: center;
}
.income-item.gold {
  background: rgba(255,255,255,0.25);
  border-color: rgba(255,255,255,0.5);
}
.income-label {
  font-size: 11px;
  color: rgba(255,255,255,0.8);
  margin-bottom: 6px;
}
.income-val {
  font-size: 18px;
  font-weight: 600;
  color: #fff;
}
.income-val.big {
  font-size: 22px;
  color: #fff;
}

.sales-card {
  background: linear-gradient(135deg, #8B6914 0%, #5C430C 100%);
  border-color: transparent;
  text-align: center;
  color: #FAF6EE;
  padding: 20px;
}
.sales-label {
  font-size: 13px;
  color: #D4AF5A;
  letter-spacing: 1px;
}
.sales-amount {
  font-size: 36px;
  font-weight: 700;
  margin: 8px 0;
  letter-spacing: 1px;
}
.sales-sub {
  font-size: 11px;
  color: rgba(250,246,238,0.7);
}

.tier-card {}
.tier-title {
  font-size: 14px;
  font-weight: 600;
  color: #fff;
  margin-bottom: 8px;
}
.tier-current {
  font-size: 13px;
  color: rgba(255,255,255,0.85);
  margin-bottom: 8px;
}
.tier-bar-wrap {
  height: 10px;
  background: rgba(255,255,255,0.25);
  border-radius: 10px;
  overflow: hidden;
  margin-bottom: 8px;
}
.tier-bar {
  height: 100%;
  background: linear-gradient(90deg, #C9A84C, #8B6914);
  border-radius: 10px;
  transition: width 0.5s ease;
}
.tier-next-info {
  font-size: 12px;
  color: #666;
  margin-bottom: 8px;
}
.tier-next-info b {
  color: #fff;
}
.tier-link {
  font-size: 12px;
  color: rgba(255,255,255,0.9);
  text-decoration: none;
}

.total-income-card {
  display: flex;
  align-items: center;
  justify-content: space-between;
}
.ti-label {
  font-size: 14px;
  color: rgba(255,255,255,0.85);
}
.ti-amount {
  font-size: 22px;
  font-weight: 700;
  color: #fff;
}

.quick-ops {
  display: flex;
  gap: 10px;
  margin-bottom: 14px;
  flex-wrap: wrap;
}
.op-btn {
  flex: 1;
  min-width: 90px;
  padding: 14px 8px;
  border: none;
  border-radius: 12px;
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
  transition: opacity 0.2s;
}
.op-btn:active { opacity: 0.8; }
.gold-btn {
  background: rgba(255,255,255,0.25);
  color: #fff;
  box-shadow: 0 3px 10px rgba(0,0,0,0.15);
  border: 1px solid rgba(255,255,255,0.4);
}
.gray-btn {
  background: rgba(255,255,255,0.15);
  color: #fff;
  border: 1px solid rgba(255,255,255,0.3);
}
.orange-btn {
  background: rgba(255,255,255,0.2);
  color: #fff;
  border: 1px solid rgba(255,255,255,0.35);
}

.compliance {
  font-size: 10px;
  color: rgba(255,255,255,0.6);
  text-align: center;
  padding: 16px 8px 4px;
  line-height: 1.8;
}
</style>
