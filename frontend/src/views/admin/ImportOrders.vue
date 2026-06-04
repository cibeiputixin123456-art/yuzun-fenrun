<template>
  <div class="import-page">
    <div class="page-title">📥 批量导入订单</div>

    <!-- 格式说明 -->
    <div class="card tip-card">
      <div class="tip-title">📋 Excel格式要求</div>
      <div class="tip-row">列名（第一行）：<b>下单人手机号、下单人姓名、盒数、订单类型、下单时间</b></div>
      <div class="tip-row">订单类型可填：<b>自己下单、卖给客户、自用复购、升级补购</b></div>
      <el-button size="small" type="success" @click="downloadTemplate" style="margin-top:10px">⬇️ 下载模板</el-button>
    </div>

    <!-- 上传区域 -->
    <div class="card">
      <el-upload
        ref="uploadRef"
        :auto-upload="false"
        :limit="1"
        accept=".xlsx,.xls"
        :on-change="onFileChange"
        :on-remove="onFileRemove"
        drag
      >
        <div class="upload-area">
          <div class="upload-icon">📂</div>
          <div class="upload-text">点击或拖拽 Excel 文件到此处</div>
          <div class="upload-sub">支持 .xlsx / .xls 格式</div>
        </div>
      </el-upload>

      <el-button
        type="primary"
        size="large"
        :loading="previewing"
        :disabled="!file"
        @click="doPreview"
        style="margin-top:16px;width:100%"
      >
        🔍 解析预览
      </el-button>
    </div>

    <!-- 预览结果 -->
    <div v-if="preview" class="card">
      <!-- 汇总 -->
      <div class="summary-grid">
        <div class="s-item">
          <div class="s-num">{{ preview.summary.total }}</div>
          <div class="s-label">总行数</div>
        </div>
        <div class="s-item green">
          <div class="s-num">{{ preview.summary.ok }}</div>
          <div class="s-label">可导入</div>
        </div>
        <div class="s-item red">
          <div class="s-num">{{ preview.summary.error }}</div>
          <div class="s-label">有错误</div>
        </div>
        <div class="s-item">
          <div class="s-num">¥{{ fmt(preview.summary.totalAmount) }}</div>
          <div class="s-label">总金额</div>
        </div>
        <div class="s-item">
          <div class="s-num">¥{{ fmt(preview.summary.totalCommission) }}</div>
          <div class="s-label">产生佣金</div>
        </div>
        <div class="s-item">
          <div class="s-num">{{ preview.summary.affectedMembers }}</div>
          <div class="s-label">涉及会员</div>
        </div>
      </div>

      <!-- 明细列表 -->
      <div style="margin:16px 0 8px;font-weight:600;color:#fff">订单明细预览</div>
      <div v-for="row in preview.rows" :key="row.rowNum" class="preview-row" :class="row.status">
        <div class="row-header">
          <span class="row-num">第{{ row.rowNum }}行</span>
          <span class="row-name">{{ row.phone }} {{ row.memberName || row.name }}</span>
          <span class="row-type">{{ row.typeRaw }}</span>
          <span class="row-qty">{{ row.qty }}盒</span>
          <span class="row-amount" v-if="row.status === 'ok'">¥{{ fmt(row.amount) }}</span>
          <el-tag v-if="row.status === 'error'" type="danger" size="small">{{ row.msg }}</el-tag>
        </div>
        <div v-if="row.commissions && row.commissions.length" class="row-comms">
          <span v-for="c in row.commissions" :key="c.member_id + c.commission_type" class="comm-item">
            {{ c.memberName }} +¥{{ fmt(c.amount) }}({{ (c.rate*100).toFixed(1) }}%)
          </span>
        </div>
        <div v-if="row.status === 'ok' && row.orderType === 'repurchase'" class="row-comms">
          <span class="comm-item gray">复购无佣金，累计业绩 +¥{{ fmt(row.amount) }}</span>
        </div>
      </div>

      <!-- 确认导入 -->
      <el-button
        v-if="preview.summary.ok > 0"
        type="success"
        size="large"
        :loading="importing"
        @click="doImport"
        style="margin-top:16px;width:100%"
      >
        ✅ 确认导入 {{ preview.summary.ok }} 条订单
      </el-button>
    </div>

    <!-- 导入结果 -->
    <div v-if="result" class="card result-card">
      <div class="result-title">🎉 导入完成！</div>
      <div class="result-grid">
        <div class="r-item"><b>{{ result.importedOrders }}</b> 条订单</div>
        <div class="r-item"><b>¥{{ fmt(result.totalAmount) }}</b> 总金额</div>
        <div class="r-item"><b>¥{{ fmt(result.totalCommission) }}</b> 佣金</div>
        <div class="r-item"><b>{{ result.affectedMembers }}</b> 人受益</div>
      </div>
      <div v-if="result.errors && result.errors.length" style="margin-top:12px">
        <div style="color:rgba(255,255,255,0.7);font-size:12px" v-for="e in result.errors" :key="e">⚠️ {{ e }}</div>
      </div>
      <el-button @click="reset" style="margin-top:16px;width:100%">继续导入</el-button>
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue'
import { ElMessage } from 'element-plus'
import { api } from '../../api'
import * as XLSX from 'xlsx'

const file = ref(null)
const previewing = ref(false)
const importing = ref(false)
const preview = ref(null)
const result = ref(null)

function fmt(n) { return (+n || 0).toFixed(2) }

function onFileChange(f) { file.value = f.raw }
function onFileRemove() { file.value = null; preview.value = null }

async function doPreview() {
  if (!file.value) return
  previewing.value = true
  preview.value = null
  try {
    const form = new FormData()
    form.append('file', file.value)
    const res = await api.post('/import/preview', form, { headers: { 'Content-Type': 'multipart/form-data' } })
    preview.value = res.data
  } catch (e) {
    ElMessage.error('解析失败：' + (e.response?.data?.error || e.message))
  } finally {
    previewing.value = false
  }
}

async function doImport() {
  if (!file.value) return
  importing.value = true
  try {
    const form = new FormData()
    form.append('file', file.value)
    const res = await api.post('/import/confirm', form, { headers: { 'Content-Type': 'multipart/form-data' } })
    result.value = res.data.summary
    preview.value = null
    ElMessage.success('导入成功！')
  } catch (e) {
    ElMessage.error('导入失败：' + (e.response?.data?.error || e.message))
  } finally {
    importing.value = false
  }
}

function reset() {
  file.value = null
  preview.value = null
  result.value = null
}

function downloadTemplate() {
  const data = [
    ['下单人手机号', '下单人姓名', '盒数', '订单类型', '下单时间'],
    ['13800000001', '张三', 2, '卖给客户', '2026-06-01'],
    ['13800000002', '李四', 1, '自己下单', '2026-06-01'],
    ['13800000003', '王五', 1, '自用复购', '2026-06-02'],
  ]
  const ws = XLSX.utils.aoa_to_sheet(data)
  const wb = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(wb, ws, '订单导入模板')
  XLSX.writeFile(wb, '御尊订单导入模板.xlsx')
}
</script>

<style scoped>
.import-page { padding-bottom: 40px; }
.page-title { font-size: 18px; font-weight: 700; color: #fff; margin-bottom: 16px; }

.card {
  background: #A07820;
  border: 1.5px solid rgba(255,255,255,0.3);
  border-radius: 14px;
  padding: 16px;
  margin-bottom: 14px;
  color: #fff;
}

.tip-card { background: rgba(255,255,255,0.15); }
.tip-title { font-weight: 600; margin-bottom: 8px; }
.tip-row { font-size: 13px; color: rgba(255,255,255,0.85); margin-bottom: 4px; }

.upload-area { padding: 24px; text-align: center; }
.upload-icon { font-size: 40px; margin-bottom: 8px; }
.upload-text { font-size: 15px; font-weight: 600; color: #fff; }
.upload-sub { font-size: 12px; color: rgba(255,255,255,0.6); margin-top: 4px; }

.summary-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 10px;
  margin-bottom: 8px;
}
.s-item {
  background: rgba(255,255,255,0.15);
  border-radius: 10px;
  padding: 12px;
  text-align: center;
}
.s-item.green { background: rgba(103,194,58,0.25); }
.s-item.red { background: rgba(245,108,108,0.25); }
.s-num { font-size: 18px; font-weight: 700; color: #fff; }
.s-label { font-size: 11px; color: rgba(255,255,255,0.7); margin-top: 2px; }

.preview-row {
  background: rgba(255,255,255,0.1);
  border-radius: 8px;
  padding: 10px 12px;
  margin-bottom: 8px;
}
.preview-row.error { background: rgba(245,108,108,0.2); }
.row-header { display: flex; align-items: center; gap: 8px; flex-wrap: wrap; }
.row-num { font-size: 11px; color: rgba(255,255,255,0.5); }
.row-name { font-weight: 600; font-size: 13px; }
.row-type { font-size: 12px; background: rgba(255,255,255,0.2); border-radius: 4px; padding: 1px 6px; }
.row-qty { font-size: 12px; }
.row-amount { font-size: 13px; font-weight: 600; color: #fff; margin-left: auto; }
.row-comms { margin-top: 6px; display: flex; flex-wrap: wrap; gap: 6px; }
.comm-item { font-size: 11px; background: rgba(255,255,255,0.15); border-radius: 4px; padding: 2px 8px; }
.comm-item.gray { color: rgba(255,255,255,0.5); }

.result-card { background: rgba(103,194,58,0.2); border-color: rgba(103,194,58,0.5); }
.result-title { font-size: 18px; font-weight: 700; text-align: center; margin-bottom: 16px; }
.result-grid { display: grid; grid-template-columns: repeat(2,1fr); gap: 10px; }
.r-item { text-align: center; font-size: 14px; padding: 10px; background: rgba(255,255,255,0.1); border-radius: 8px; }
</style>
