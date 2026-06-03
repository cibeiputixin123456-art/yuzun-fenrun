<template>
  <div class="tier-page">
    <div class="page-title">我的成长路径</div>

    <!-- 当前累计服务销售额 -->
    <div class="current-sales-card">
      <div class="cs-label">当前累计服务销售额</div>
      <div class="cs-amount">¥{{ fmtNumber(userSales) }}</div>
      <div class="cs-sub">{{ currentTier.name }}</div>
    </div>

    <!-- 阶梯卡片 -->
    <div class="tiers-list">
      <div
        v-for="(tier, idx) in TIERS"
        :key="idx"
        :class="['tier-card', tierStatus(tier)]"
      >
        <!-- 状态标签 -->
        <div class="tier-badges">
          <el-tag v-if="tierStatus(tier) === 'current'" type="warning" size="small">当前</el-tag>
          <el-tag v-else-if="tierStatus(tier) === 'unlocked'" type="success" size="small">已解锁</el-tag>
          <el-tag v-else type="info" size="small">未解锁</el-tag>
        </div>

        <div class="tier-name">{{ tier.name }}</div>
        <div class="tier-threshold">门槛：{{ tier.min > 0 ? '¥' + fmtWan(tier.min) : '入门即享' }}</div>
        <div class="tier-rate" v-if="tier.rate !== null">公司经营激励：{{ (tier.rate * 100).toFixed(0) }}%</div>
        <div class="tier-rate special" v-else>利润分红（由公司审核后手动发放）</div>
        <div class="tier-earned" v-if="tierStatus(tier) !== 'locked'">
          <span class="earned-label">已获激励：</span>
          <span class="earned-val">¥{{ fmtNumber(calcEarned(tier, idx)) }}</span>
        </div>
      </div>
    </div>

    <div class="compliance">
      本平台所有收益均来自真实产品分享 · 严格两级服务收益 · 0元加入 · 无入门费
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { api } from '../api/index.js'

const user = ref(JSON.parse(localStorage.getItem('user') || '{}'))
const userSales = ref(user.value.total_service_sales || 0)
const earnedPerTier = ref([])

const TIERS = [
  { name: '星耀服务官',     min: 0,        max: 600000,   rate: 0 },
  { name: '高级服务顾问',   min: 600000,   max: 1300000,  rate: 0.05 },
  { name: '资深服务顾问',   min: 1300000,  max: 1990000,  rate: 0.06 },
  { name: '城市运营负责人', min: 1990000,  max: 3000000,  rate: 0.07 },
  { name: '大区运营负责人', min: 3000000,  max: 5000000,  rate: 0.08 },
  { name: '战略共建合伙人', min: 5000000,  max: 10000000, rate: 0.10 },
  { name: '公司股东董事',   min: 10000000, max: Infinity, rate: null },
]

function tierStatus(tier) {
  const s = userSales.value
  if (s >= tier.min && (tier.max === Infinity || s < tier.max)) return 'current'
  if (s >= tier.min) return 'unlocked'
  return 'locked'
}

const currentTier = computed(() => {
  for (let i = TIERS.length - 1; i >= 0; i--) {
    if (userSales.value >= TIERS[i].min) return TIERS[i]
  }
  return TIERS[0]
})

function fmtWan(n) {
  if (n >= 1000000) return (n / 10000).toFixed(0) + '万'
  if (n >= 10000) return (n / 10000).toFixed(1) + '万'
  return n.toLocaleString()
}

function fmtNumber(n) {
  return (n || 0).toLocaleString('zh-CN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

// 估算已赚激励（在该阶梯内的销售额 × 费率）
function calcEarned(tier, idx) {
  if (tier.rate === null) return 0
  const s = userSales.value
  if (s < tier.min) return 0
  const inTier = Math.min(s, tier.max === Infinity ? s : tier.max) - tier.min
  return Math.max(0, inTier * tier.rate)
}

async function loadUser() {
  try {
    // 刷新用户最新数据（如果有profile接口）
    const u = JSON.parse(localStorage.getItem('user') || '{}')
    userSales.value = u.total_service_sales || 0
  } catch {}
}

onMounted(loadUser)
</script>

<style scoped>
.tier-page { max-width: 600px; margin: 0 auto; }
.page-title { font-size: 18px; font-weight: 700; color: var(--gold-dark); margin-bottom: 14px; }

.current-sales-card {
  background: linear-gradient(135deg, #8B6914, #5C430C);
  border-radius: 16px;
  padding: 24px 20px;
  text-align: center;
  margin-bottom: 16px;
  color: #FAF6EE;
}
.cs-label { font-size: 13px; color: #D4AF5A; letter-spacing: 1px; margin-bottom: 8px; }
.cs-amount { font-size: 32px; font-weight: 700; letter-spacing: 1px; }
.cs-sub { font-size: 13px; color: rgba(250,246,238,0.7); margin-top: 6px; }

.tiers-list { display: flex; flex-direction: column; gap: 10px; margin-bottom: 16px; }

.tier-card {
  background: #fff;
  border: 2px solid #e0e0e0;
  border-radius: 14px;
  padding: 14px 16px;
  position: relative;
  transition: all 0.2s;
}

.tier-card.unlocked {
  border-color: var(--gold-border);
  background: var(--gold-bg);
}

.tier-card.current {
  border-color: var(--gold);
  background: linear-gradient(135deg, #FAF6EE, #f5ecca);
  box-shadow: 0 4px 16px rgba(139,105,20,0.15);
}

.tier-card.locked {
  opacity: 0.55;
  background: #f8f8f8;
}

.tier-badges {
  position: absolute;
  top: 12px;
  right: 12px;
}

.tier-name {
  font-size: 16px;
  font-weight: 700;
  color: var(--gold-dark);
  margin-bottom: 6px;
}
.tier-card.locked .tier-name { color: #aaa; }

.tier-threshold {
  font-size: 12px;
  color: #888;
  margin-bottom: 4px;
}

.tier-rate {
  font-size: 13px;
  color: var(--gold);
  font-weight: 600;
  margin-bottom: 4px;
}
.tier-rate.special {
  color: #e67e22;
  font-size: 12px;
}

.tier-earned {
  margin-top: 6px;
  font-size: 12px;
}
.earned-label { color: #888; }
.earned-val { color: var(--gold); font-weight: 600; margin-left: 4px; }

.compliance { font-size: 10px; color: #bbb; text-align: center; padding: 16px 8px 4px; line-height: 1.8; }
</style>
