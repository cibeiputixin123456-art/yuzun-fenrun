<template>
  <div class="login-page">
    <!-- 顶部产品区 -->
    <div class="product-banner">
      <div class="product-overlay">
        <div class="product-title">御尊·通络保健油</div>
        <div class="product-sub">天然草本 · 温经通络</div>
      </div>
    </div>

    <!-- 登录卡片 -->
    <div class="login-card">
      <div class="brand-name">御尊通络保健油</div>
      <div class="slogan">通经络·养万家</div>

      <el-form @submit.prevent="handleLogin" class="login-form">
        <el-form-item>
          <el-input
            v-model="form.phone"
            placeholder="请输入手机号"
            size="large"
            class="gold-input"
            prefix-icon="Phone"
          />
        </el-form-item>
        <el-form-item>
          <el-input
            v-model="form.password"
            type="password"
            placeholder="请输入密码"
            size="large"
            class="gold-input"
            prefix-icon="Lock"
            show-password
            @keyup.enter="handleLogin"
          />
        </el-form-item>
        <el-button
          class="login-btn"
          size="large"
          :loading="loading"
          @click="handleLogin"
        >
          登 录
        </el-button>
      </el-form>

      <div style="text-align:center;margin-top:12px;font-size:13px;color:#999">
        没有账号？<a @click="$router.push('/register')" style="color:#8B6914;cursor:pointer">立即注册</a>
      </div>

      <!-- 合规声明 -->
      <div class="compliance">
        本平台所有收益均来自真实产品分享 · 严格两级服务收益 · 0元加入 · 无入门费
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { api } from '../api/index.js'
import { ElMessage } from 'element-plus'

const router = useRouter()
const loading = ref(false)
const form = ref({ phone: '', password: '' })

async function handleLogin() {
  if (!form.value.phone || !form.value.password) {
    ElMessage.warning('请填写手机号和密码')
    return
  }
  loading.value = true
  try {
    const res = await api.post('/auth/login', form.value)
    localStorage.setItem('token', res.data.token)
    localStorage.setItem('user', JSON.stringify(res.data.user))
    ElMessage.success('登录成功')
    router.push('/dashboard')
  } catch (e) {
    // 错误由拦截器处理
  } finally {
    loading.value = false
  }
}
</script>

<style scoped>
.login-page {
  min-height: 100vh;
  background: var(--gold-bg);
  display: flex;
  flex-direction: column;
  align-items: center;
}

.product-banner {
  width: 100%;
  height: 220px;
  background: linear-gradient(135deg, #8B6914 0%, #5C430C 60%, #3a2a08 100%);
  display: flex;
  align-items: center;
  justify-content: center;
  position: relative;
  overflow: hidden;
}

.product-banner::before {
  content: '';
  position: absolute;
  inset: 0;
  background: radial-gradient(ellipse at 50% 120%, rgba(201,168,76,0.3) 0%, transparent 70%);
}

.product-overlay {
  text-align: center;
  color: #FAF6EE;
  position: relative;
  z-index: 1;
}

.product-title {
  font-size: 26px;
  font-weight: 700;
  letter-spacing: 4px;
  text-shadow: 0 2px 8px rgba(0,0,0,0.4);
}

.product-sub {
  font-size: 14px;
  color: #D4AF5A;
  margin-top: 8px;
  letter-spacing: 3px;
}

.login-card {
  width: 100%;
  max-width: 420px;
  background: #fff;
  border-radius: 20px 20px 0 0;
  margin-top: -20px;
  padding: 32px 28px 24px;
  box-shadow: 0 -4px 20px rgba(139,105,20,0.12);
  flex: 1;
}

.brand-name {
  font-size: 22px;
  font-weight: 700;
  color: var(--gold);
  text-align: center;
  letter-spacing: 2px;
}

.slogan {
  font-size: 13px;
  color: var(--gold-light);
  text-align: center;
  margin: 6px 0 28px;
  letter-spacing: 3px;
}

.login-form {
  margin-bottom: 16px;
}

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

.login-btn {
  width: 100%;
  height: 48px;
  font-size: 17px;
  font-weight: 600;
  letter-spacing: 4px;
  background: linear-gradient(135deg, #8B6914, #5C430C);
  color: #FAF6EE;
  border: none;
  border-radius: 12px;
  margin-top: 8px;
  box-shadow: 0 4px 16px rgba(92,67,12,0.35);
}

.login-btn:hover {
  background: linear-gradient(135deg, #a07820, #6b4e12);
}

.compliance {
  font-size: 11px;
  color: #999;
  text-align: center;
  line-height: 1.7;
  margin-top: 24px;
  padding: 12px 8px;
  border-top: 1px dashed #e8e0cc;
}

@media (max-width: 768px) {
  .login-card {
    max-width: 100%;
    border-radius: 20px 20px 0 0;
  }
  .product-banner {
    height: 200px;
  }
}
</style>
