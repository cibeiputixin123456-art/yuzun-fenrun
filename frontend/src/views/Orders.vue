<template>
  <div class="orders-page">
    <div class="page-title">服务记录</div>

    <!-- 新增服务记录 -->
    <div class="card form-card">
      <div class="card-title">新增服务记录</div>
      <el-form :model="form" label-position="top">
        <el-form-item label="服务类型">
          <el-radio-group v-model="form.order_type" class="type-group">
            <el-radio-button value="self_order">📦 个人选购</el-radio-button>
            <el-radio-button value="customer_sale">🛒 客户服务</el-radio-button>
            <el-radio-button value="upgrade" v-if="user.level === 'xinxiang'">⬆️ 身份升级</el-radio-button>
          </el-radio-group>
        </el-form-item>
        <el-form-item label="数量（盒）">
          <el-input-number
            v-model="form.quantity"
            :min="1"
            :max="form.order_type === 'upgrade' ? 4 : 99"
            :disabled="form.order_type === 'upgrade'"
            size="large"
            style="width:100%"
          />
          <div class="field-tip" v-if="form.order_type === 'upgrade'">身份升级固定4盒，合计 ¥{{ (4 * 698).toLocaleString() }}</div>
          <div class="field-tip" v-else>每盒 ¥698，合计 ¥{{ (form.quantity * 698).toLocaleString() }}</div>
        </el-form-item>
        <el-form-item label="客户姓名（选填）" v-if="form.order_type !== 'self_order'">
          <el-input v-model="form.buyer_name" placeholder="客户姓名或备注" />
        </el-form-item>
        <el-form-item label="备注（选填）">
          <el-input v-model="form.note" type="textarea" :rows="2" placeholder="备注信息" />
        </el-form-item>
        <el-button class="submit-btn" size="large" :loading="submitting" @click="submitOrder">
          确认提交服务记录
        </el-button>
      </el-form>
    </div>

    <!-- 历史记录 -->
    <div class="card list-card">
      <div class="card-title-row">
        <span class="card-title">历史服务记录</span>
        <el-date-picker
          v-model="filterMonth"
          type="month"
          placeholder="筛选月份"
          size="small"
          format="YYYY-MM"
          value-format="YYYY-MM"
          style="width:130px"
          @change="loadOrders"
          clearable
        />
      </div>
      <div class="orders-list">
        <div v-for="o in orders" :key="o.id" class="order-item">
          <div class="order-header">
            <el-tag :type="typeTagType(o.order_type)" size="small">{{ typeLabel(o.order_type) }}</el-tag>
            <span class="order-amount">¥{{ o.total_amount?.toLocaleString() }}</span>
          </div>
          <div class="order-info">
            <span>{{ o.quantity }}盒</span>
            <span v-if="o.buyer_name" class="dot-sep">· {{ o.buyer_name }}</span>
            <span class="order-time dot-sep">{{ fmtTime(o.created_at) }}</span>
          </div>
          <div class="order-note" v-if="o.note">{{ o.note }}</div>
        </div>
        <div class="empty" v-if="orders.length === 0 && !loading">暂无服务记录</div>
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
import { useRoute } from 'vue-router'
import { api } from '../api/index.js'
import { ElMessage } from 'element-plus'

const route = useRoute()
const user = ref(JSON.parse(localStorage.getItem('user') || '{}'))
const submitting = ref(false)
const loading = ref(false)
const orders = ref([])
const filterMonth = ref('')
const page = ref(1)
const hasMore = ref(false)

const form = ref({
  order_type: route.query.type || 'customer_sale',
  quantity: 1,
  buyer_name: '',
  note: '',
})

const TYPE_LABELS = {
  self_order: '个人选购',
  customer_sale: '客户服务',
  upgrade: '身份升级',
}

function typeLabel(t) { return TYPE_LABELS[t] || t }
function typeTagType(t) {
  if (t === 'customer_sale') return 'success'
  if (t === 'upgrade') return 'warning'
  return 'info'
}

function fmtTime(s) {
  if (!s) return ''
  return s.slice(0, 16).replace('T', ' ')
}

async function submitOrder() {
  if (form.value.order_type === 'upgrade') form.value.quantity = 4
  submitting.value = true
  try {
    await api.post('/orders', form.value)
    ElMessage.success('服务记录提交成功')
    form.value.buyer_name = ''
    form.value.note = ''
    form.value.quantity = 1
    page.value = 1
    orders.value = []
    await loadOrders()
  } catch {} finally {
    submitting.value = false
  }
}

async function loadOrders() {
  loading.value = true
  page.value = 1
  try {
    const res = await api.get('/orders/my', {
      params: { page: 1, pageSize: 20, month: filterMonth.value }
    })
    orders.value = res.data.data || []
    hasMore.value = res.data.total > orders.value.length
  } catch {} finally {
    loading.value = false
  }
}

async function loadMore() {
  page.value++
  try {
    const res = await api.get('/orders/my', {
      params: { page: page.value, pageSize: 20, month: filterMonth.value }
    })
    orders.value.push(...(res.data.data || []))
    hasMore.value = res.data.total > orders.value.length
  } catch {}
}

onMounted(loadOrders)
</script>

<style scoped>
.orders-page { max-width: 600px; margin: 0 auto; }
.page-title { font-size: 18px; font-weight: 700; color: var(--gold-dark); margin-bottom: 14px; }
.card {
  background: #fff;
  border: 1.5px solid var(--gold-border);
  border-radius: 14px;
  padding: 16px;
  margin-bottom: 14px;
  box-shadow: 0 2px 8px rgba(139,105,20,0.06);
}
.card-title { font-size: 15px; font-weight: 600; color: var(--gold); margin-bottom: 14px; }
.card-title-row { display: flex; align-items: center; justify-content: space-between; margin-bottom: 12px; }

.type-group { width: 100%; display: flex; gap: 6px; flex-wrap: wrap; }
.type-group :deep(.el-radio-button__inner) {
  border-radius: 8px !important;
  border-left: 1px solid var(--el-border-color) !important;
}
.type-group :deep(.el-radio-button.is-active .el-radio-button__inner) {
  background: var(--gold);
  border-color: var(--gold);
}

.field-tip { font-size: 12px; color: var(--gold-light); margin-top: 4px; }

.submit-btn {
  width: 100%;
  background: linear-gradient(135deg, #8B6914, #5C430C);
  color: #FAF6EE;
  border: none;
  border-radius: 10px;
  font-size: 15px;
  font-weight: 600;
  margin-top: 8px;
}

.order-item {
  padding: 12px 0;
  border-bottom: 1px solid #f0e8d0;
}
.order-item:last-child { border-bottom: none; }
.order-header { display: flex; align-items: center; justify-content: space-between; margin-bottom: 6px; }
.order-amount { font-size: 16px; font-weight: 600; color: var(--gold); }
.order-info { font-size: 12px; color: #888; }
.dot-sep::before { content: '·'; margin: 0 4px; }
.order-time { color: #bbb; }
.order-note { font-size: 11px; color: #aaa; margin-top: 4px; }
.empty { text-align: center; color: #bbb; padding: 24px; }
.load-more { width: 100%; margin-top: 8px; color: var(--gold); }

.compliance { font-size: 10px; color: #bbb; text-align: center; padding: 16px 8px 4px; line-height: 1.8; }
</style>
