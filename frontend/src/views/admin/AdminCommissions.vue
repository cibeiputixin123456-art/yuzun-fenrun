<template>
  <div>
    <el-card>
      <template #header>
        <div style="display: flex; justify-content: space-between; align-items: center">
          <b>佣金管理</b>
          <div style="display: flex; gap: 8px">
            <el-select v-model="statusFilter" style="width: 120px" clearable placeholder="状态" @change="load">
              <el-option label="全部" value="" />
              <el-option label="待发放" value="pending" />
              <el-option label="已发放" value="paid" />
            </el-select>
            <el-button type="success" :disabled="!selectedIds.length" @click="batchPay">
              标记已发放 ({{ selectedIds.length }})
            </el-button>
          </div>
        </div>
      </template>

      <el-table :data="records" v-loading="loading" stripe @selection-change="onSelect">
        <el-table-column type="selection" width="50" :selectable="row => row.status === 'pending'" />
        <el-table-column prop="created_at" label="时间" width="160" />
        <el-table-column prop="member_name" label="收益人" width="90" />
        <el-table-column prop="member_phone" label="手机号" width="130" />
        <el-table-column label="类型" width="140">
          <template #default="{ row }">
            <el-tag size="small">{{ row.type_label }}</el-tag>
          </template>
        </el-table-column>
        <el-table-column label="比例" width="80">
          <template #default="{ row }">{{ row.rate ? (row.rate * 100).toFixed(1) + '%' : '-' }}</template>
        </el-table-column>
        <el-table-column label="金额" width="110">
          <template #default="{ row }">
            <b style="color: #409eff">¥{{ fmt(row.amount) }}</b>
          </template>
        </el-table-column>
        <el-table-column label="状态" width="100">
          <template #default="{ row }">
            <el-tag :type="row.status === 'paid' ? 'success' : 'warning'" size="small">
              {{ row.status === 'paid' ? '已发放' : '待发放' }}
            </el-tag>
          </template>
        </el-table-column>
      </el-table>

      <div style="margin-top: 16px; display: flex; justify-content: flex-end">
        <el-pagination v-model:current-page="page" :page-size="20" :total="total" layout="prev, pager, next" @current-change="load" />
      </div>
    </el-card>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { ElMessage } from 'element-plus'
import { api } from '../../api'

const records = ref([])
const loading = ref(false)
const page = ref(1)
const total = ref(0)
const statusFilter = ref('')
const selectedIds = ref([])

function fmt(v) { return (+v || 0).toLocaleString('zh-CN', { minimumFractionDigits: 2 }) }

async function load() {
  loading.value = true
  try {
    const res = await api.get('/commissions', { params: { page: page.value, pageSize: 20, status: statusFilter.value } })
    records.value = res.data.data
    total.value = res.data.total
  } finally {
    loading.value = false
  }
}

function onSelect(rows) {
  selectedIds.value = rows.map(r => r.id)
}

async function batchPay() {
  try {
    await api.post('/commissions/pay', { ids: selectedIds.value })
    ElMessage.success('已标记为已发放')
    load()
  } catch {}
}

onMounted(load)
</script>
