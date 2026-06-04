<template>
  <div class="ranking-page">
    <div class="page-title">🏆 团队累计业绩排行</div>

    <!-- 说明 -->
    <div class="tip-card">
      累计服务销售额 = 该会员整个团队（所有层级）的销售总额，每产生订单自动更新
    </div>

    <!-- 切换排行维度 -->
    <div class="tab-row">
      <div class="tab-btn" :class="{ active: rankBy === 'service' }" @click="rankBy = 'service'; load()">团队业绩</div>
      <div class="tab-btn" :class="{ active: rankBy === 'personal' }" @click="rankBy = 'personal'; load()">个人销售</div>
      <div class="tab-btn" :class="{ active: rankBy === 'commission' }" @click="rankBy = 'commission'; load()">累计佣金</div>
    </div>

    <!-- 排行榜 -->
    <div class="card" v-loading="loading">
      <div v-if="list.length">
        <div v-for="(m, idx) in list" :key="m.id" class="rank-row">
          <!-- 排名 -->
          <div class="rank-num" :class="{ gold: idx === 0, silver: idx === 1, bronze: idx === 2 }">
            {{ idx < 3 ? ['🥇','🥈','🥉'][idx] : idx + 1 }}
          </div>

          <!-- 头像 -->
          <div class="avatar" :class="m.level === 'xingyao' ? 'gold' : 'silver'">
            {{ m.name?.slice(0,1) }}
          </div>

          <!-- 信息 -->
          <div class="minfo">
            <div class="mname">{{ m.name }}</div>
            <div class="mmeta">
              <el-tag size="small" :type="levelTagType(m.level)">{{ levelLabel(m.level) }}</el-tag>
              <span class="mphone">{{ m.phone }}</span>
            </div>
          </div>

          <!-- 金额 -->
          <div class="amount-col">
            <div class="amount-num">¥{{ fmtWan(currentAmount(m)) }}</div>
            <div class="amount-label">{{ rankByLabel }}</div>
          </div>

          <!-- 进度条 -->
          <div class="bar-wrap" v-if="maxAmount > 0">
            <div class="bar-fill" :style="{ width: (currentAmount(m) / maxAmount * 100) + '%' }"></div>
          </div>
        </div>
      </div>
      <div class="empty-text" v-else>暂无数据</div>
    </div>

    <!-- 汇总 -->
    <div class="summary-row" v-if="list.length">
      <div class="s-card">
        <div class="s-num">{{ list.length }}</div>
        <div class="s-label">有销售记录会员</div>
      </div>
      <div class="s-card">
        <div class="s-num">¥{{ fmtWan(totalServiceSales) }}</div>
        <div class="s-label">全网总服务销售额</div>
      </div>
      <div class="s-card">
        <div class="s-num">¥{{ fmtWan(totalCommission) }}</div>
        <div class="s-label">全网累计佣金</div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { api } from '../../api'

const loading = ref(false)
const list = ref([])
const rankBy = ref('service')

const LEVEL_LABELS = { xinxiang: '星享体验官', xingyao: '星耀服务官', huiyuan: '普通会员' }
function levelLabel(l) { return LEVEL_LABELS[l] || l }
function levelTagType(l) {
  if (l === 'xingyao') return 'warning'
  if (l === 'xinxiang') return 'success'
  return 'info'
}
function fmtWan(n) {
  const v = n || 0
  if (v >= 10000000) return (v / 10000).toFixed(0) + '万'
  if (v >= 10000) return (v / 10000).toFixed(1) + '万'
  return v.toLocaleString('zh-CN', { maximumFractionDigits: 0 })
}

function currentAmount(m) {
  if (rankBy.value === 'personal') return m.total_personal_sales || 0
  if (rankBy.value === 'commission') return m.total_commission_earned || 0
  return m.total_service_sales || 0
}

const rankByLabel = computed(() => {
  if (rankBy.value === 'personal') return '个人销售额'
  if (rankBy.value === 'commission') return '累计佣金'
  return '团队业绩'
})

const maxAmount = computed(() => {
  if (!list.value.length) return 0
  return Math.max(...list.value.map(m => currentAmount(m)))
})

const totalServiceSales = computed(() => list.value.reduce((s, m) => s + (m.total_service_sales || 0), 0))
const totalCommission = computed(() => list.value.reduce((s, m) => s + (m.total_commission_earned || 0), 0))

async function load() {
  loading.value = true
  try {
    const sortField = rankBy.value === 'personal' ? 'total_personal_sales'
      : rankBy.value === 'commission' ? 'total_commission_earned'
      : 'total_service_sales'

    // 拉所有会员，前端排序
    const res = await api.get('/members', { params: { pageSize: 200 } })
    const all = res.data.data || []
    all.sort((a, b) => (b[sortField] || 0) - (a[sortField] || 0))
    // 只显示有销售记录的
    list.value = all.filter(m => (m.total_service_sales || 0) + (m.total_personal_sales || 0) + (m.total_commission_earned || 0) > 0)
  } finally {
    loading.value = false
  }
}

onMounted(load)
</script>

<style scoped>
.ranking-page { padding-bottom: 40px; }
.page-title { font-size: 18px; font-weight: 700; color: #fff; margin-bottom: 12px; }

.tip-card {
  font-size: 12px; color: rgba(255,255,255,0.65);
  background: rgba(255,255,255,0.1); border-radius: 10px;
  padding: 10px 14px; margin-bottom: 14px;
}

.tab-row { display: flex; gap: 8px; margin-bottom: 14px; }
.tab-btn {
  flex: 1; text-align: center; padding: 10px 0;
  border-radius: 10px; font-size: 13px; font-weight: 600;
  background: rgba(255,255,255,0.12); color: rgba(255,255,255,0.7);
  cursor: pointer; transition: all 0.2s;
}
.tab-btn.active { background: rgba(255,255,255,0.3); color: #fff; }

.card {
  background: #A07820;
  border: 1.5px solid rgba(255,255,255,0.25);
  border-radius: 14px;
  padding: 12px 14px;
  margin-bottom: 14px;
  color: #fff;
}

.rank-row {
  display: flex; align-items: center; gap: 10px;
  padding: 10px 0;
  border-bottom: 1px solid rgba(255,255,255,0.1);
  flex-wrap: wrap;
}
.rank-row:last-child { border-bottom: none; }

.rank-num { width: 32px; text-align: center; font-size: 18px; flex-shrink: 0; }
.rank-num.gold { color: #FFD700; }
.rank-num.silver { color: #C0C0C0; }
.rank-num.bronze { color: #CD7F32; }

.avatar {
  width: 36px; height: 36px; border-radius: 50%;
  display: flex; align-items: center; justify-content: center;
  font-size: 14px; font-weight: 700; color: #fff; flex-shrink: 0;
}
.avatar.gold { background: linear-gradient(135deg, #C9A84C, #8B6914); }
.avatar.silver { background: linear-gradient(135deg, #aaa, #777); }

.minfo { flex: 1; min-width: 100px; }
.mname { font-size: 14px; font-weight: 600; }
.mmeta { display: flex; align-items: center; gap: 6px; margin-top: 2px; }
.mphone { font-size: 11px; color: rgba(255,255,255,0.5); }

.amount-col { text-align: right; flex-shrink: 0; }
.amount-num { font-size: 15px; font-weight: 700; }
.amount-label { font-size: 10px; color: rgba(255,255,255,0.55); }

.bar-wrap { width: 100%; height: 4px; background: rgba(255,255,255,0.15); border-radius: 4px; overflow: hidden; }
.bar-fill { height: 100%; background: linear-gradient(90deg, #FFD700, #C9A84C); border-radius: 4px; transition: width 0.5s ease; }

.summary-row { display: grid; grid-template-columns: repeat(3,1fr); gap: 10px; }
.s-card { background: rgba(255,255,255,0.15); border-radius: 12px; padding: 14px 8px; text-align: center; }
.s-num { font-size: 16px; font-weight: 700; color: #fff; }
.s-label { font-size: 10px; color: rgba(255,255,255,0.6); margin-top: 3px; }

.empty-text { text-align: center; color: rgba(255,255,255,0.4); padding: 32px; }
</style>
