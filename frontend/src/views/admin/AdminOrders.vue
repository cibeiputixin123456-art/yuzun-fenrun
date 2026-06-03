<template>
  <div>
    <el-card>
      <template #header><b>所有订单</b></template>
      <el-table :data="orders" v-loading="loading" stripe>
        <el-table-column prop="id" label="ID" width="70" />
        <el-table-column prop="created_at" label="时间" width="160" />
        <el-table-column prop="seller_name" label="会员" width="90" />
        <el-table-column prop="seller_phone" label="手机号" width="130" />
        <el-table-column label="类型" width="110">
          <template #default="{ row }">
            <el-tag :type="typeMap[row.order_type]?.type || 'info'" size="small">
              {{ typeMap[row.order_type]?.label || row.order_type }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="quantity" label="盒数" width="70" align="center" />
        <el-table-column label="金额" width="110">
          <template #default="{ row }">¥{{ fmt(row.total_amount) }}</template>
        </el-table-column>
        <el-table-column prop="buyer_name" label="客户" width="90" />
        <el-table-column prop="note" label="备注" />
      </el-table>
      <div style="margin-top: 16px; display: flex; justify-content: flex-end">
        <el-pagination v-model:current-page="page" :page-size="20" :total="total" layout="prev, pager, next" @current-change="load" />
      </div>
    </el-card>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { api } from '../../api'

const orders = ref([])
const loading = ref(false)
const page = ref(1)
const total = ref(0)

const typeMap = {
  customer_sale: { label: '客户销售', type: 'success' },
  self_order: { label: '自用/复购', type: 'info' },
  upgrade: { label: '升级补购', type: 'warning' },
  dividend: { label: '股东分红', type: 'danger' },
}

function fmt(v) { return (+v || 0).toLocaleString('zh-CN', { minimumFractionDigits: 2 }) }

async function load() {
  loading.value = true
  try {
    const res = await api.get('/orders', { params: { page: page.value, pageSize: 20 } })
    orders.value = res.data.data
    total.value = res.data.total
  } finally {
    loading.value = false
  }
}

onMounted(load)
</script>
