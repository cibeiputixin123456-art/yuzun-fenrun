<template>
  <div class="register-page">
    <!-- 顶部 -->
    <div class="product-banner">
      <div class="product-overlay">
        <div class="product-title">御尊·通络保健油</div>
        <div class="product-sub">天然草本 · 温经通络</div>
      </div>
    </div>

    <div class="register-card">
      <div class="brand-name">加入御尊服务网络</div>
      <div class="slogan">通经络·养万家</div>

      <el-form @submit.prevent="handleRegister" class="form">

        <!-- 推荐人预览 -->
        <div class="referrer-box" v-if="referrerInfo">
          <span class="ref-label">推荐人</span>
          <span class="ref-name">{{ referrerInfo.name }}</span>
          <span class="ref-level">{{ referrerInfo.levelLabel }}</span>
        </div>
        <div class="referrer-error" v-if="referrerError">{{ referrerError }}</div>

        <el-form-item>
          <el-input
            v-model="form.referrer_id"
            placeholder="推荐人ID（选填，由推荐人告知）"
            size="large"
            class="gold-input"
            @blur="lookupReferrer"
            clearable
          />
        </el-form-item>

        <el-form-item>
          <el-input v-model="form.name" placeholder="真实姓名" size="large" class="gold-input" />
        </el-form-item>

        <el-form-item>
          <el-input v-model="form.phone" placeholder="手机号（登录账号）" size="large" class="gold-input" maxlength="11" />
        </el-form-item>

        <el-form-item>
          <el-input v-model="form.password" type="password" placeholder="设置密码（至少6位）" size="large" class="gold-input" show-password />
        </el-form-item>

        <el-form-item>
          <el-input v-model="form.wechat_id" placeholder="微信号（选填）" size="large" class="gold-input" />
        </el-form-item>

        <el-button class="register-btn" size="large" :loading="loading" @click="handleRegister">
          立即注册
        </el-button>

        <div class="login-link">
          已有账号？<a @click="$router.push('/login')">去登录</a>
        </div>
      </el-form>

      <div class="compliance">
        本平台所有收益均来自真实产品分享 · 严格两级服务收益 · 0元加入 · 无入门费
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { api } from '../api/index.js'
import { ElMessage } from 'element-plus'

const router = useRouter()
const route  = useRoute()
const loading = ref(false)
const referrerInfo = ref(null)
const referrerError = ref('')

const form = ref({
  name: '',
  phone: '',
  password: '',
  wechat_id: '',
  referrer_id: route.query.ref || '',  // 支持链接带推荐人ID
})

// 自动查询推荐人
onMounted(() => {
  if (form.value.referrer_id) lookupReferrer()
})

async function lookupReferrer() {
  const id = form.value.referrer_id?.trim()
  referrerInfo.value = null
  referrerError.value = ''
  if (!id) return
  try {
    const res = await api.get(`/auth/referrer/${id}`)
    referrerInfo.value = res.data
  } catch {
    referrerError.value = '推荐人ID不存在，请重新确认'
  }
}

async function handleRegister() {
  if (!form.value.name) return ElMessage.warning('请填写姓名')
  if (!form.value.phone) return ElMessage.warning('请填写手机号')
  if (!form.value.password || form.value.password.length < 6) return ElMessage.warning('密码至少6位')
  if (referrerError.value) return ElMessage.warning('推荐人ID有误，请修正')

  loading.value = true
  try {
    const res = await api.post('/auth/register', {
      name: form.value.name,
      phone: form.value.phone,
      password: form.value.password,
      wechat_id: form.value.wechat_id,
      referrer_id: form.value.referrer_id || null,
    })
    localStorage.setItem('token', res.data.token)
    localStorage.setItem('user', JSON.stringify(res.data.user))
    ElMessage.success('注册成功，欢迎加入御尊！')
    router.push('/dashboard')
  } catch (e) {
    ElMessage.error(e.response?.data?.error || '注册失败')
  } finally {
    loading.value = false
  }
}
</script>

<style scoped>
.register-page {
  min-height: 100vh;
  background: var(--gold-bg);
  display: flex;
  flex-direction: column;
  align-items: center;
}

.product-banner {
  width: 100%;
  height: 180px;
  background: linear-gradient(135deg, #8B6914 0%, #5C430C 60%, #3a2a08 100%);
  display: flex;
  align-items: center;
  justify-content: center;
  position: relative;
}
.product-banner::before {
  content: '';
  position: absolute;
  inset: 0;
  background: radial-gradient(ellipse at 50% 120%, rgba(201,168,76,0.3) 0%, transparent 70%);
}
.product-overlay { text-align: center; color: #FAF6EE; position: relative; z-index: 1; }
.product-title { font-size: 24px; font-weight: 700; letter-spacing: 4px; }
.product-sub { font-size: 13px; color: #D4AF5A; margin-top: 6px; letter-spacing: 3px; }

.register-card {
  width: 100%;
  max-width: 420px;
  background: #fff;
  border-radius: 20px 20px 0 0;
  margin-top: -20px;
  padding: 28px 24px 24px;
  box-shadow: 0 -4px 20px rgba(139,105,20,0.12);
  flex: 1;
}
.brand-name { font-size: 20px; font-weight: 700; color: var(--gold); text-align: center; letter-spacing: 2px; }
.slogan { font-size: 12px; color: var(--gold-light); text-align: center; margin: 4px 0 20px; letter-spacing: 3px; }

.referrer-box {
  background: #f0f9eb;
  border: 1px solid #b7eb8f;
  border-radius: 8px;
  padding: 8px 12px;
  margin-bottom: 12px;
  display: flex;
  align-items: center;
  gap: 8px;
}
.ref-label { font-size: 11px; color: #666; }
.ref-name { font-size: 14px; font-weight: 600; color: #333; }
.ref-level { font-size: 11px; color: #8B6914; background: #fef9e7; border: 1px solid #D4AF5A; border-radius: 4px; padding: 1px 6px; }
.referrer-error { font-size: 12px; color: #f56c6c; margin-bottom: 8px; padding-left: 4px; }

.gold-input :deep(.el-input__wrapper) {
  border: 1.5px solid var(--gold-border);
  border-radius: 10px;
  box-shadow: none;
}
.gold-input :deep(.el-input__wrapper):hover,
.gold-input :deep(.el-input__wrapper.is-focus) {
  border-color: var(--gold);
  box-shadow: 0 0 0 2px rgba(139,105,20,0.1);
}

.register-btn {
  width: 100%;
  height: 48px;
  font-size: 16px;
  font-weight: 600;
  letter-spacing: 3px;
  background: linear-gradient(135deg, #8B6914, #5C430C);
  color: #FAF6EE;
  border: none;
  border-radius: 12px;
  margin-top: 8px;
  box-shadow: 0 4px 16px rgba(92,67,12,0.35);
}

.login-link {
  text-align: center;
  font-size: 13px;
  color: #999;
  margin-top: 14px;
}
.login-link a { color: var(--gold); cursor: pointer; }

.compliance {
  font-size: 11px;
  color: #999;
  text-align: center;
  line-height: 1.7;
  margin-top: 20px;
  padding: 12px 8px;
  border-top: 1px dashed #e8e0cc;
}
</style>
