<template>
  <div>
    <el-card>
      <template #header>
        <div style="display: flex; justify-content: space-between; align-items: center; gap: 12px; flex-wrap: wrap">
          <b>会员管理</b>
          <div style="display: flex; gap: 8px">
            <el-input v-model="keyword" placeholder="搜索姓名/手机/微信" style="width: 200px" clearable @input="load" />
            <el-select v-model="levelFilter" placeholder="身份筛选" style="width: 130px" clearable @change="load">
              <el-option label="全部" value="" />
              <el-option label="普通会员" value="huiyuan" />
              <el-option label="星享体验官" value="xinxiang" />
              <el-option label="星耀服务官" value="xingyao" />
            </el-select>
            <el-button type="primary" @click="openAdd">+ 添加会员</el-button>
          </div>
        </div>
      </template>

      <el-table :data="members" v-loading="loading" stripe>
        <el-table-column prop="id" label="ID" width="60" />
        <el-table-column prop="name" label="姓名" width="90" />
        <el-table-column prop="phone" label="手机号" width="130" />
        <el-table-column prop="wechat_id" label="微信号" width="110" />
        <el-table-column label="身份" width="110">
          <template #default="{ row }">
            <el-tag :type="{ huiyuan: 'info', xinxiang: 'warning', xingyao: 'success' }[row.level]" size="small">
              {{ { huiyuan: '普通会员', xinxiang: '星享体验官', xingyao: '星耀服务官' }[row.level] }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column label="职级" width="130">
          <template #default="{ row }">{{ RANK_LABELS[row.rank] || row.rank }}</template>
        </el-table-column>
        <el-table-column label="上级" width="90">
          <template #default="{ row }">{{ row.referrer?.name || '-' }}</template>
        </el-table-column>
        <el-table-column label="累计收益" width="110">
          <template #default="{ row }">¥{{ fmt(row.total_commission_earned) }}</template>
        </el-table-column>
        <el-table-column label="团队销售额" width="120">
          <template #default="{ row }">¥{{ fmt(row.total_service_sales) }}</template>
        </el-table-column>
        <el-table-column label="状态" width="80">
          <template #default="{ row }">
            <el-tag :type="row.status === 'active' ? 'success' : 'danger'" size="small">
              {{ row.status === 'active' ? '正常' : '禁用' }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column label="操作" width="220" fixed="right">
          <template #default="{ row }">
            <el-button size="small" @click="openEdit(row)">编辑</el-button>
            <el-button size="small" type="warning" @click="openReset(row)">重置密码</el-button>
            <el-button size="small" type="danger" @click="doDelete(row)">删除</el-button>
          </template>
        </el-table-column>
      </el-table>

      <div style="margin-top: 16px; display: flex; justify-content: flex-end">
        <el-pagination v-model:current-page="page" :page-size="20" :total="total" layout="prev, pager, next" @current-change="load" />
      </div>
    </el-card>

    <!-- 添加会员 -->
    <el-dialog v-model="showAdd" title="添加会员" width="440px">
      <el-form :model="addForm" label-width="90px">
        <el-form-item label="姓名" required><el-input v-model="addForm.name" /></el-form-item>
        <el-form-item label="手机号" required><el-input v-model="addForm.phone" maxlength="11" /></el-form-item>
        <el-form-item label="密码" required><el-input v-model="addForm.password" show-password /></el-form-item>
        <el-form-item label="微信号"><el-input v-model="addForm.wechat_id" /></el-form-item>
        <el-form-item label="初始身份">
          <el-select v-model="addForm.level">
            <el-option label="普通会员" value="huiyuan" />
            <el-option label="星享体验官" value="xinxiang" />
            <el-option label="星耀服务官" value="xingyao" />
          </el-select>
        </el-form-item>
        <el-form-item label="上级手机号"><el-input v-model="addForm.referrer_phone" placeholder="选填" /></el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="showAdd = false">取消</el-button>
        <el-button type="primary" :loading="submitting" @click="doAdd">确认添加</el-button>
      </template>
    </el-dialog>

    <!-- 编辑 -->
    <el-dialog v-model="showEdit" title="编辑会员" width="400px">
      <el-form :model="editForm" label-width="80px">
        <el-form-item label="姓名"><el-input v-model="editForm.name" /></el-form-item>
        <el-form-item label="微信号"><el-input v-model="editForm.wechat_id" /></el-form-item>
        <el-form-item label="状态">
          <el-select v-model="editForm.status">
            <el-option label="正常" value="active" />
            <el-option label="禁用" value="inactive" />
          </el-select>
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="showEdit = false">取消</el-button>
        <el-button type="primary" :loading="submitting" @click="doEdit">保存</el-button>
      </template>
    </el-dialog>

    <!-- 重置密码 -->
    <el-dialog v-model="showReset" title="重置密码" width="360px">
      <el-form label-width="80px">
        <el-form-item label="新密码"><el-input v-model="resetPwd" show-password /></el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="showReset = false">取消</el-button>
        <el-button type="warning" :loading="submitting" @click="doReset">确认重置</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { api } from '../../api'

const RANK_LABELS = {
  xingyao: '星耀分享官', senior: '高级服务顾问', expert: '资深服务顾问',
  city: '城市运营负责人', region: '大区运营负责人', strategy: '战略共建合伙人',
  shareholder: '公司股东董事',
}

const members = ref([])
const loading = ref(false)
const submitting = ref(false)
const page = ref(1)
const total = ref(0)
const keyword = ref('')
const levelFilter = ref('')

const showAdd = ref(false)
const showEdit = ref(false)
const showReset = ref(false)
const addForm = ref({ name: '', phone: '', password: '', wechat_id: '', level: 'huiyuan', referrer_phone: '' })
const editForm = ref({ id: null, name: '', wechat_id: '', status: 'active' })
const resetId = ref(null)
const resetPwd = ref('')

function fmt(v) { return (+v || 0).toLocaleString('zh-CN', { minimumFractionDigits: 2 }) }

async function load() {
  loading.value = true
  try {
    const res = await api.get('/members', { params: { page: page.value, pageSize: 20, keyword: keyword.value, level: levelFilter.value } })
    members.value = res.data.data
    total.value = res.data.total
  } finally {
    loading.value = false
  }
}

function openAdd() {
  addForm.value = { name: '', phone: '', password: '', wechat_id: '', level: 'huiyuan', referrer_phone: '' }
  showAdd.value = true
}

async function doAdd() {
  if (!addForm.value.name || !addForm.value.phone || !addForm.value.password) return ElMessage.warning('请填写必填项')
  submitting.value = true
  try {
    await api.post('/members', addForm.value)
    ElMessage.success('添加成功')
    showAdd.value = false
    load()
  } finally {
    submitting.value = false
  }
}

function openEdit(row) {
  editForm.value = { id: row.id, name: row.name, wechat_id: row.wechat_id || '', status: row.status }
  showEdit.value = true
}

async function doEdit() {
  submitting.value = true
  try {
    await api.put(`/members/${editForm.value.id}`, editForm.value)
    ElMessage.success('修改成功')
    showEdit.value = false
    load()
  } finally {
    submitting.value = false
  }
}

function openReset(row) {
  resetId.value = row.id
  resetPwd.value = ''
  showReset.value = true
}

async function doReset() {
  if (!resetPwd.value || resetPwd.value.length < 6) return ElMessage.warning('密码至少6位')
  submitting.value = true
  try {
    await api.post(`/members/${resetId.value}/reset-password`, { newPassword: resetPwd.value })
    ElMessage.success('密码重置成功')
    showReset.value = false
  } finally {
    submitting.value = false
  }
}

async function doDelete(row) {
  try {
    await ElMessageBox.confirm(`确定删除会员「${row.name}」吗？删除后不可恢复！`, '警告', { type: 'warning', confirmButtonText: '确定删除', cancelButtonText: '取消', confirmButtonClass: 'el-button--danger' })
    await api.delete(`/members/${row.id}`)
    ElMessage.success('删除成功')
    load()
  } catch (e) {
    if (e !== 'cancel') ElMessage.error('删除失败')
  }
}

onMounted(load)
</script>
