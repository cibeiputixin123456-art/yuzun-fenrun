<template>
  <div class="team-page">
    <div class="page-title">我的服务网络</div>

    <!-- 顶部汇总卡 -->
    <div class="summary-row">
      <div class="summary-card">
        <div class="s-icon">👥</div>
        <div class="s-num">{{ deepData.totalCount || 0 }}</div>
        <div class="s-label">服务网络总人数</div>
      </div>
      <div class="summary-card">
        <div class="s-icon">💰</div>
        <div class="s-num">¥{{ fmtWan(monthSales) }}</div>
        <div class="s-label">本月服务销售额</div>
      </div>
    </div>

    <!-- Tab切换 -->
    <el-tabs v-model="activeTab" class="team-tabs">
      <!-- 直接服务伙伴 -->
      <el-tab-pane label="直接服务伙伴" name="direct">
        <div class="member-list">
          <div v-for="m in deepData.direct" :key="m.id" class="member-item">
            <div class="member-avatar">{{ m.name?.slice(0,1) }}</div>
            <div class="member-info">
              <div class="member-name">{{ m.name }}</div>
              <div class="member-meta">
                <el-tag size="small" :type="levelTagType(m.level)" class="level-tag">{{ levelLabel(m.level) }}</el-tag>
                <span class="meta-text">服务网络 {{ m.subCount || 0 }}人</span>
              </div>
            </div>
            <div class="member-sales">
              <div class="sales-num">¥{{ (m.total_personal_sales || 0).toLocaleString() }}</div>
              <div class="sales-label">个人销售额</div>
            </div>
          </div>
          <div class="empty" v-if="deepData.direct?.length === 0">暂无直接服务伙伴</div>
        </div>
      </el-tab-pane>

      <!-- 间接服务伙伴 -->
      <el-tab-pane label="间接服务伙伴" name="indirect">
        <div class="member-list" v-if="!deepError">
          <div v-for="m in deepData.indirect" :key="m.id" class="member-item">
            <div class="member-avatar secondary">{{ m.name?.slice(0,1) }}</div>
            <div class="member-info">
              <div class="member-name">{{ m.name }}</div>
              <div class="member-meta">
                <el-tag size="small" :type="levelTagType(m.level)" class="level-tag">{{ levelLabel(m.level) }}</el-tag>
                <span class="meta-via" v-if="m.via">经由 {{ m.via }}</span>
              </div>
            </div>
            <div class="member-sales">
              <div class="sales-num">¥{{ (m.total_personal_sales || 0).toLocaleString() }}</div>
              <div class="sales-label">个人销售额</div>
            </div>
          </div>
          <!-- 三级以后汇总 -->
          <div class="level3-row" v-if="deepData.level3PlusCount > 0">
            <span class="level3-text">三级以后共 {{ deepData.level3PlusCount }} 人</span>
          </div>
          <div class="empty" v-if="deepData.indirect?.length === 0 && !deepData.level3PlusCount">暂无间接服务伙伴</div>
        </div>
        <div class="error-tip" v-else>
          暂无数据，请联系管理员更新
        </div>
      </el-tab-pane>
    </el-tabs>

    <!-- 说明 -->
    <div class="team-note">
      说明：直接服务伙伴为您直接推荐的伙伴；间接服务伙伴为服务伙伴推荐的下一层伙伴。收益按两级严格计算。
    </div>

    <div class="compliance">
      本平台所有收益均来自真实产品分享 · 严格两级服务收益 · 0元加入 · 无入门费
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, computed } from 'vue'
import { api } from '../api/index.js'

const activeTab = ref('direct')
const deepData  = ref({ direct: [], indirect: [], level3PlusCount: 0, totalCount: 0 })
const deepError = ref(false)
const monthSales = ref(0)

const LEVEL_LABELS = {
  xinxiang: '星享体验官',
  xingyao:  '星耀服务官',
  huiyuan:  '普通会员',
}
function levelLabel(l) { return LEVEL_LABELS[l] || l }
function levelTagType(l) {
  if (l === 'xingyao') return 'warning'
  if (l === 'xinxiang') return 'success'
  return 'info'
}

function fmtWan(n) {
  const v = n || 0
  if (v >= 10000) return (v / 10000).toFixed(1) + '万'
  return v.toFixed(0)
}

async function load() {
  try {
    const res = await api.get('/members/my-team-deep')
    deepData.value = res.data
    // 本月销售额 = 直属所有人当月销售额合计（用 total_service_sales 近似）
    const total = (res.data.direct || []).reduce((s, m) => s + (m.total_service_sales || 0), 0)
    monthSales.value = total
  } catch (e) {
    deepError.value = true
    // 降级：尝试加载直属
    try {
      const res2 = await api.get('/members/my-team')
      deepData.value.direct = res2.data || []
    } catch {}
  }
}

onMounted(load)
</script>

<style scoped>
.team-page { max-width: 600px; margin: 0 auto; }
.page-title { font-size: 18px; font-weight: 700; color: var(--gold-dark); margin-bottom: 14px; }

.summary-row {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 12px;
  margin-bottom: 16px;
}
.summary-card {
  background: #fff;
  border: 1.5px solid var(--gold-border);
  border-radius: 14px;
  padding: 16px;
  text-align: center;
  box-shadow: 0 2px 8px rgba(139,105,20,0.06);
}
.s-icon { font-size: 24px; margin-bottom: 6px; }
.s-num { font-size: 22px; font-weight: 700; color: var(--gold); }
.s-label { font-size: 11px; color: #888; margin-top: 4px; }

.team-tabs :deep(.el-tabs__item.is-active) { color: var(--gold); }
.team-tabs :deep(.el-tabs__active-bar) { background: var(--gold); }

.member-list { }
.member-item {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px 0;
  border-bottom: 1px solid #f0e8d0;
}
.member-item:last-child { border-bottom: none; }
.member-avatar {
  width: 40px;
  height: 40px;
  border-radius: 50%;
  background: linear-gradient(135deg, #8B6914, #5C430C);
  color: #FAF6EE;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 16px;
  font-weight: 700;
  flex-shrink: 0;
}
.member-avatar.secondary {
  background: linear-gradient(135deg, #C9A84C, #8B6914);
  width: 34px;
  height: 34px;
  font-size: 13px;
}
.member-info { flex: 1; }
.member-name { font-size: 15px; font-weight: 600; color: #333; margin-bottom: 4px; }
.member-meta { display: flex; align-items: center; gap: 6px; flex-wrap: wrap; }
.level-tag { }
.meta-text { font-size: 11px; color: #999; }
.meta-via { font-size: 11px; color: #aaa; }
.member-sales { text-align: right; flex-shrink: 0; }
.sales-num { font-size: 14px; font-weight: 600; color: var(--gold); }
.sales-label { font-size: 10px; color: #bbb; }

.level3-row {
  padding: 12px 0;
  text-align: center;
}
.level3-text {
  font-size: 12px;
  color: #bbb;
  background: #f5f5f5;
  padding: 6px 16px;
  border-radius: 20px;
}
.error-tip { text-align: center; color: #bbb; padding: 32px; font-size: 13px; }
.empty { text-align: center; color: #bbb; padding: 24px; }

.team-note {
  font-size: 11px;
  color: #bbb;
  background: #faf8f4;
  border-radius: 8px;
  padding: 10px 14px;
  margin: 8px 0;
  line-height: 1.7;
}
.compliance { font-size: 10px; color: #bbb; text-align: center; padding: 16px 8px 4px; line-height: 1.8; }
</style>
