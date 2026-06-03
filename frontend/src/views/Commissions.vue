<template>
  <div class="commissions-page">
    <div class="page-title">我的分享收益</div>

    <!-- 筛选栏 -->
    <div class="filter-bar">
      <el-date-picker
        v-model="filterMonth"
        type="month"
        placeholder="筛选月份"
        format="YYYY-MM"
        value-format="YYYY-MM"
        size="small"
        clearable
        @change="load"
        style="width:140px"
      />
      <el-select v-model="filterType" placeholder="收益类型" size="small" clearable @change="load" style="width:150px">
        <el-option label="全部类型" value="" />
        <el-option label="个人分享收益" value="self_retail" />
        <el-option label="推荐服务收益" value="referral_income" />
        <el-option label="直属伙伴服务津贴" value="service_subsidy" />
        <el-option label="带教培育补贴" value="training_subsidy" />
        <el-option label="升级服务收益" value="upgrade_bonus" />
        <el-option label="公司经营激励" value="tier_incentive" />
      </el-select>
    </div>

    <!-- 汇总3卡 -->
    <div class="summary-grid">
      <div class="summary-card pending">
        <div class="s-label">待发放</div>
        <div class="s-amount">¥{{ fmt(summary.pending_total) }}</div>
      </div>
      <div class="summary-card paid">
        <div class="s-label">已发放</div>
        <div class="s-amount">¥{{ fmt(summary.paid_total) }}</div>
      </div>
      <div class="summary-card total">
        <div class="s-label">合计</div>
        <div class="s-amount gold">¥{{ fmt(summary.total) }}</div>
      </div>
    </div>

    <!-- 收益列表 -->
    <div class="card">
      <div class="card-title">收益明细</div>
      <div class="list">
        <div v-for="r in records" :key="r.id" class="record-item">
          <div class="record-header">
            <el-tag size="small" :type="tagType(r.commission_type)">
              {{ typeLabel(r.commission_type) }}
            </el-tag>
            <el-tag size="small" :type="r.status === 'paid' ? 'success' : 'warning'" class="status-tag">
              {{ r.status === 'paid' ? '已发放' : '待发放' }}
            </el-tag>
          </div>
          <div class="record-main">
            <span class="record-amount">¥{{ (r.amount || 0).toFixed(2) }}</span>
            <span class="record-rate" v-if="r.rate">{{ (r.rate * 100).toFixed(1) }}%</span>
          </div>
          <div class="record-info">
            <span>来自：{{ r.from_member_name || '—' }}</span>
            <span class="dot-sep">{{ fmtTime(r.created_at) }}</span>
          </div>
        </div>
        <div class="empty" v-if="records.length === 0 && !loading">暂无收益记录</div>
        <el-button v-if="hasMore" text size="small" @click="loadMore" class="load-more">加载更多</el-button>
      </div>
    </div>

    <div class="compliance">
      本平台所有收益均来自真实产品分享 · 严格两级服务收益 · 0元加入 · 无入门费
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { api } from '../api/index.js'

const filterMonth = ref('')
const filterType  = ref('')
const loading     = ref(false)
const records     = ref([])
const summary     = ref({ pending_total: 0, paid_total: 0, total: 0 })
const page        = ref(1)
const hasMore     = ref(false)

const TYPE_LABELS = {
  self_retail:      '个人分享收益',
  referral_income:  '推荐服务收益',
  service_subsidy:  '直属伙伴服务津贴',
  training_subsidy: '带教培育补贴',
  upgrade_bonus:    '升级服务收益',
  tier_incentive:   '公司经营激励',
}

function typeLabel(t) { return TYPE_LABELS[t] || t }
function tagType(t) {
  if (t === 'tier_incentive') return 'warning'
  if (t === 'self_retail') return 'success'
  return 'info'
}
function fmt(n) { return (n || 0).toFixed(2) }
function fmtTime(s) { return s ? s.slice(0, 16).replace('T', ' ') : '' }

async function load() {
  loading.value = true
  page.value = 1
  try {
    const res = await api.get('/commissions/my', {
      params: { page: 1, pageSize: 50, month: filterMonth.value, commission_type: filterType.value }
    })
    records.value = res.data.data || []
    summary.value = res.data.summary || {}
    hasMore.value = res.data.total > records.value.length
  } catch {} finally {
    loading.value = false
  }
}

async function loadMore() {
  page.value++
  try {
    const res = await api.get('/commissions/my', {
      params: { page: page.value, pageSize: 50, month: filterMonth.value, commission_type: filterType.value }
    })
    records.value.push(...(res.data.data || []))
    hasMore.value = res.data.total > records.value.length
  } catch {}
}

onMounted(load)
</script>

<style scoped>
.commissions-page { max-width: 600px; margin: 0 auto; }
.page-title { font-size: 18px; font-weight: 700; color: var(--gold-dark); margin-bottom: 14px; }

.filter-bar {
  display: flex;
  gap: 10px;
  margin-bottom: 14px;
  flex-wrap: wrap;
}

.summary-grid {
  display: grid;
  grid-template-columns: 1fr 1fr 1fr;
  gap: 10px;
  margin-bottom: 14px;
}
.summary-card {
  background: #fff;
  border: 1.5px solid #e8e0cc;
  border-radius: 12px;
  padding: 14px 10px;
  text-align: center;
}
.summary-card.pending { border-color: #fad399; }
.summary-card.paid    { border-color: #b7d9a8; }
.summary-card.total   { border-color: var(--gold-border); background: var(--gold-bg); }
.s-label { font-size: 11px; color: #888; margin-bottom: 6px; }
.s-amount { font-size: 16px; font-weight: 600; color: #333; }
.s-amount.gold { color: var(--gold); }

.card {
  background: #fff;
  border: 1.5px solid var(--gold-border);
  border-radius: 14px;
  padding: 16px;
  margin-bottom: 14px;
  box-shadow: 0 2px 8px rgba(139,105,20,0.06);
}
.card-title { font-size: 15px; font-weight: 600; color: var(--gold); margin-bottom: 12px; }

.record-item {
  padding: 12px 0;
  border-bottom: 1px solid #f5f0e8;
}
.record-item:last-child { border-bottom: none; }
.record-header { display: flex; gap: 6px; margin-bottom: 6px; }
.status-tag { margin-left: 4px; }
.record-main { display: flex; align-items: baseline; gap: 8px; margin-bottom: 4px; }
.record-amount { font-size: 18px; font-weight: 700; color: var(--gold); }
.record-rate { font-size: 12px; color: #aaa; }
.record-info { font-size: 11px; color: #bbb; }
.dot-sep::before { content: '·'; margin: 0 4px; }
.empty { text-align: center; color: #bbb; padding: 24px; }
.load-more { width: 100%; margin-top: 8px; color: var(--gold); }
.compliance { font-size: 10px; color: #bbb; text-align: center; padding: 16px 8px 4px; line-height: 1.8; }
</style>
