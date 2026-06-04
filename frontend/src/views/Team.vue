<template>
  <div class="team-page">
    <div class="page-title">🌳 我的服务网络</div>

    <!-- 我的上级 -->
    <div class="card referrer-card" v-if="myInfo.referrer">
      <div class="section-label">📌 我的推荐人（上级）</div>
      <div class="member-row">
        <div class="avatar gold">{{ myInfo.referrer.name?.slice(0,1) }}</div>
        <div class="minfo">
          <div class="mname">{{ myInfo.referrer.name }}</div>
          <div class="mmeta">
            <el-tag size="small" type="warning">{{ levelLabel(myInfo.referrer_level) }}</el-tag>
            <span class="mphone">{{ myInfo.referrer.phone }}</span>
          </div>
          <div class="mrule">你下单 → 他收益 <b>28%</b>（服务补贴）</div>
        </div>
      </div>
    </div>
    <div class="card referrer-card empty-ref" v-else-if="loaded">
      <div class="section-label">📌 我的推荐人</div>
      <div class="empty-text">暂无推荐人，你是顶级节点</div>
    </div>

    <!-- 汇总 -->
    <div class="summary-row">
      <div class="summary-card">
        <div class="s-icon">👥</div>
        <div class="s-num">{{ deepData.totalCount || 0 }}</div>
        <div class="s-label">服务网络总人数</div>
      </div>
      <div class="summary-card">
        <div class="s-icon">⭐</div>
        <div class="s-num">{{ deepData.direct?.length || 0 }}</div>
        <div class="s-label">直属服务伙伴</div>
      </div>
      <div class="summary-card">
        <div class="s-icon">🌟</div>
        <div class="s-num">{{ deepData.indirect?.length || 0 }}</div>
        <div class="s-label">间接伙伴</div>
      </div>
    </div>

    <!-- 直属列表 -->
    <div class="card">
      <div class="section-label">👥 直接服务伙伴（一级）</div>
      <div class="rule-tip">他们下单/卖货 → 你收益 <b>28%</b> 或 <b>5%</b></div>

      <div v-if="deepData.direct?.length">
        <div v-for="m in deepData.direct" :key="m.id" class="member-row" style="border-bottom:1px solid rgba(255,255,255,0.1);padding-bottom:12px;margin-bottom:12px">
          <div class="avatar" :class="m.level === 'xingyao' ? 'gold' : 'silver'">{{ m.name?.slice(0,1) }}</div>
          <div class="minfo">
            <div class="mname">{{ m.name }}</div>
            <div class="mmeta">
              <el-tag size="small" :type="levelTagType(m.level)">{{ levelLabel(m.level) }}</el-tag>
              <span class="mphone">{{ m.phone }}</span>
            </div>
            <div class="mstats">
              <span>个人销售 ¥{{ fmt(m.total_personal_sales) }}</span>
              <span>团队销售 ¥{{ fmt(m.total_service_sales) }}</span>
            </div>
            <div class="mrule" v-if="m.level === 'xinxiang'">
              他卖给客户 → 你收 <b>5%服务津贴</b>；他自用 → 你收 <b>28%</b>
            </div>
            <div class="mrule" v-else-if="m.level === 'xingyao'">
              他卖给客户 → 你收 <b>1.5%培育补贴</b>；他自用 → 你收 <b>28%</b>
            </div>
            <div class="msub" v-if="m.subCount > 0">↳ 他的下级 {{ m.subCount }} 人</div>
          </div>
        </div>
      </div>
      <div class="empty-text" v-else>暂无直接服务伙伴</div>
    </div>

    <!-- 间接列表 -->
    <div class="card" v-if="deepData.indirect?.length">
      <div class="section-label">🔗 间接服务伙伴（二级）</div>
      <div class="rule-tip">他们下单/卖货 → 你收 <b>1.5%培育补贴</b>（含星享节点时）</div>

      <div v-for="m in deepData.indirect" :key="m.id" class="member-row" style="border-bottom:1px solid rgba(255,255,255,0.1);padding-bottom:10px;margin-bottom:10px">
        <div class="avatar sm" :class="m.level === 'xingyao' ? 'gold' : 'silver'">{{ m.name?.slice(0,1) }}</div>
        <div class="minfo">
          <div class="mname">{{ m.name }}</div>
          <div class="mmeta">
            <el-tag size="small" :type="levelTagType(m.level)">{{ levelLabel(m.level) }}</el-tag>
            <span class="meta-via" v-if="m.via">经由 {{ m.via }}</span>
          </div>
          <div class="mstats">
            <span>个人销售 ¥{{ fmt(m.total_personal_sales) }}</span>
          </div>
        </div>
      </div>

      <div class="level3-tip" v-if="deepData.level3PlusCount > 0">
        三级以后还有 {{ deepData.level3PlusCount }} 人（不计入你的收益）
      </div>
    </div>

    <!-- 收益规则说明 -->
    <div class="card rule-card">
      <div class="section-label">📋 收益规则速查</div>
      <table class="rule-table">
        <tr><th>场景</th><th>你拿</th><th>上级拿</th></tr>
        <tr><td>你卖给客户（星享）</td><td>23%</td><td>5%</td></tr>
        <tr><td>你卖给客户（星耀）</td><td>28%</td><td>1.5%</td></tr>
        <tr><td>你自用下单</td><td>0</td><td>28%</td></tr>
        <tr><td>你的下级自用</td><td>28%</td><td>1.5%</td></tr>
        <tr><td>你的下级卖客户（星享）</td><td>5%</td><td>1.5%</td></tr>
      </table>
    </div>

    <div class="compliance">
      本平台所有收益均来自真实产品分享 · 严格两级服务收益 · 0元加入 · 无入门费
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { api } from '../api/index.js'

const deepData  = ref({ direct: [], indirect: [], level3PlusCount: 0, totalCount: 0 })
const myInfo    = ref({ referrer: null, referrer_level: '' })
const loaded    = ref(false)

const LEVEL_LABELS = { xinxiang: '星享体验官', xingyao: '星耀服务官', huiyuan: '普通会员' }
function levelLabel(l) { return LEVEL_LABELS[l] || l }
function levelTagType(l) {
  if (l === 'xingyao') return 'warning'
  if (l === 'xinxiang') return 'success'
  return 'info'
}
function fmt(n) { return (n || 0).toLocaleString('zh-CN', { minimumFractionDigits: 0, maximumFractionDigits: 0 }) }

async function load() {
  try {
    // 获取我的信息（含上级）
    const me = await api.get('/auth/me')
    myInfo.value.referrer = me.data.referrer || null
    myInfo.value.referrer_level = me.data.referrer?.level || ''
  } catch {}

  try {
    const res = await api.get('/members/my-team-deep')
    deepData.value = res.data
  } catch {
    try {
      const res2 = await api.get('/members/my-team')
      deepData.value.direct = res2.data || []
    } catch {}
  }
  loaded.value = true
}

onMounted(load)
</script>

<style scoped>
.team-page { padding-bottom: 80px; }
.page-title { font-size: 18px; font-weight: 700; color: #fff; margin-bottom: 14px; }

.card {
  background: #A07820;
  border: 1.5px solid rgba(255,255,255,0.25);
  border-radius: 14px;
  padding: 16px;
  margin-bottom: 14px;
  color: #fff;
}

.section-label { font-size: 13px; font-weight: 600; color: rgba(255,255,255,0.7); margin-bottom: 10px; }
.rule-tip { font-size: 12px; color: rgba(255,255,255,0.6); margin-bottom: 12px; }

.referrer-card { background: rgba(255,255,255,0.15); }
.empty-ref { }
.empty-text { font-size: 13px; color: rgba(255,255,255,0.5); padding: 8px 0; }

.summary-row { display: grid; grid-template-columns: repeat(3,1fr); gap: 10px; margin-bottom: 14px; }
.summary-card { background: rgba(255,255,255,0.15); border-radius: 12px; padding: 14px 8px; text-align: center; }
.s-icon { font-size: 22px; margin-bottom: 4px; }
.s-num { font-size: 20px; font-weight: 700; color: #fff; }
.s-label { font-size: 10px; color: rgba(255,255,255,0.65); margin-top: 2px; }

.member-row { display: flex; align-items: flex-start; gap: 12px; }
.avatar {
  width: 42px; height: 42px; border-radius: 50%;
  display: flex; align-items: center; justify-content: center;
  font-size: 16px; font-weight: 700; color: #fff; flex-shrink: 0;
}
.avatar.gold { background: linear-gradient(135deg, #C9A84C, #8B6914); }
.avatar.silver { background: linear-gradient(135deg, #aaa, #777); }
.avatar.sm { width: 34px; height: 34px; font-size: 13px; }

.minfo { flex: 1; }
.mname { font-size: 15px; font-weight: 600; margin-bottom: 4px; }
.mmeta { display: flex; align-items: center; gap: 6px; flex-wrap: wrap; margin-bottom: 4px; }
.mphone { font-size: 11px; color: rgba(255,255,255,0.6); }
.mstats { font-size: 11px; color: rgba(255,255,255,0.7); display: flex; gap: 12px; margin-bottom: 4px; }
.mrule { font-size: 12px; color: rgba(255,255,255,0.8); background: rgba(255,255,255,0.1); border-radius: 6px; padding: 3px 8px; display: inline-block; margin-top: 2px; }
.msub { font-size: 11px; color: rgba(255,255,255,0.5); margin-top: 4px; }
.meta-via { font-size: 11px; color: rgba(255,255,255,0.5); }

.level3-tip { text-align: center; font-size: 12px; color: rgba(255,255,255,0.4); padding: 8px; margin-top: 8px; }

.rule-card { background: rgba(255,255,255,0.1); }
.rule-table { width: 100%; border-collapse: collapse; font-size: 12px; }
.rule-table th { color: rgba(255,255,255,0.6); font-weight: 600; padding: 6px 4px; border-bottom: 1px solid rgba(255,255,255,0.2); text-align: left; }
.rule-table td { padding: 6px 4px; border-bottom: 1px solid rgba(255,255,255,0.1); color: rgba(255,255,255,0.85); }
.rule-table tr:last-child td { border-bottom: none; }

.compliance { font-size: 10px; color: rgba(255,255,255,0.4); text-align: center; padding: 16px 8px 4px; line-height: 1.8; }
</style>
