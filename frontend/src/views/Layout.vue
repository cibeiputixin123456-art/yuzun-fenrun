<template>
  <div class="layout">
    <!-- 顶部 Header -->
    <header class="header">
      <div class="header-brand">御尊通络保健油</div>
      <div class="header-right">
        <el-tag :type="user?.level === 'xingyao' ? 'warning' : 'success'" size="small" class="level-tag">
          {{ levelLabel }}
        </el-tag>
        <el-button size="small" text class="logout-btn" @click="logout">退出</el-button>
      </div>
    </header>

    <div class="main-container">
      <!-- PC端侧边栏 -->
      <aside class="sidebar" v-if="!isMobile">
        <nav class="sidebar-nav">
          <router-link to="/dashboard" class="nav-item">
            <span class="nav-icon">🏠</span> 主页
          </router-link>
          <router-link to="/orders" class="nav-item">
            <span class="nav-icon">📋</span> 服务记录
          </router-link>
          <router-link to="/commissions" class="nav-item">
            <span class="nav-icon">💰</span> 我的收益
          </router-link>
          <router-link to="/team" class="nav-item">
            <span class="nav-icon">👥</span> 服务网络
          </router-link>
          <router-link to="/tier-progress" class="nav-item">
            <span class="nav-icon">📈</span> 成长路径
          </router-link>
          <template v-if="user?.role === 'admin'">
            <div class="nav-divider">管理菜单</div>
            <router-link to="/admin/members" class="nav-item admin-item">
              <span class="nav-icon">👤</span> 会员管理
            </router-link>
            <router-link to="/admin/orders" class="nav-item admin-item">
              <span class="nav-icon">📦</span> 订单管理
            </router-link>
            <router-link to="/admin/commissions" class="nav-item admin-item">
              <span class="nav-icon">💳</span> 收益管理
            </router-link>
            <router-link to="/admin/stats" class="nav-item admin-item">
              <span class="nav-icon">📊</span> 数据统计
            </router-link>
          </template>
        </nav>
      </aside>

      <!-- 主内容区 -->
      <main class="content">
        <router-view />
      </main>
    </div>

    <!-- 移动端底部导航 -->
    <nav class="bottom-nav" v-if="isMobile">
      <router-link to="/dashboard" class="bottom-tab">
        <span class="tab-icon">🏠</span>
        <span class="tab-label">主页</span>
      </router-link>
      <router-link to="/orders" class="bottom-tab">
        <span class="tab-icon">📋</span>
        <span class="tab-label">服务记录</span>
      </router-link>
      <router-link to="/commissions" class="bottom-tab">
        <span class="tab-icon">💰</span>
        <span class="tab-label">我的收益</span>
      </router-link>
      <router-link to="/team" class="bottom-tab">
        <span class="tab-icon">👥</span>
        <span class="tab-label">服务网络</span>
      </router-link>
    </nav>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessageBox } from 'element-plus'

const router = useRouter()
const user = ref(JSON.parse(localStorage.getItem('user') || '{}'))
const isMobile = ref(window.innerWidth <= 768)

const LEVEL_MAP = {
  xinxiang: '⭐ 星享体验官',
  xingyao: '🌟 星耀服务官',
  huiyuan: '普通会员',
}
const levelLabel = computed(() => LEVEL_MAP[user.value?.level] || user.value?.level || '未知')

function handleResize() {
  isMobile.value = window.innerWidth <= 768
}

onMounted(() => window.addEventListener('resize', handleResize))
onUnmounted(() => window.removeEventListener('resize', handleResize))

async function logout() {
  try {
    await ElMessageBox.confirm('确定要退出登录吗？', '提示', { type: 'warning' })
    localStorage.removeItem('token')
    localStorage.removeItem('user')
    router.push('/login')
  } catch {}
}
</script>

<style scoped>
.layout {
  display: flex;
  flex-direction: column;
  min-height: 100vh;
  background: #f5f7fa;
}

.header {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  z-index: 100;
  height: 52px;
  background: linear-gradient(135deg, #8B6914, #5C430C);
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 16px;
  box-shadow: 0 2px 8px rgba(92,67,12,0.3);
}

.header-brand {
  font-size: 16px;
  font-weight: 700;
  color: #FAF6EE;
  letter-spacing: 1px;
}

.header-right {
  display: flex;
  align-items: center;
  gap: 8px;
}

.level-tag {
  font-size: 11px;
}

.logout-btn {
  color: #FAF6EE !important;
  font-size: 13px;
}

.main-container {
  display: flex;
  margin-top: 52px;
  flex: 1;
}

/* PC侧边栏 */
.sidebar {
  width: 200px;
  min-height: calc(100vh - 52px);
  background: linear-gradient(180deg, #5C430C 0%, #3a2a08 100%);
  position: fixed;
  top: 52px;
  left: 0;
  bottom: 0;
  overflow-y: auto;
}

.sidebar-nav {
  padding: 16px 0;
}

.nav-item {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 12px 20px;
  color: #D4AF5A;
  text-decoration: none;
  font-size: 14px;
  transition: all 0.2s;
}

.nav-item:hover {
  background: rgba(212,175,90,0.15);
  color: #FAF6EE;
}

.nav-item.router-link-active {
  background: rgba(212,175,90,0.25);
  color: #FAF6EE;
  border-left: 3px solid #D4AF5A;
}

.nav-icon {
  font-size: 16px;
}

.nav-divider {
  font-size: 11px;
  color: #8B6914;
  padding: 16px 20px 6px;
  text-transform: uppercase;
  letter-spacing: 1px;
}

.admin-item {
  color: #C9A84C;
  font-size: 13px;
}

.content {
  flex: 1;
  padding: 16px;
  min-height: calc(100vh - 52px);
}

@media (min-width: 769px) {
  .content {
    margin-left: 200px;
  }
}

/* 移动端底部导航 */
.bottom-nav {
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
  height: 60px;
  background: #fff;
  border-top: 1px solid #e8e0cc;
  display: flex;
  z-index: 100;
  box-shadow: 0 -2px 10px rgba(0,0,0,0.08);
}

.bottom-tab {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  text-decoration: none;
  color: #999;
  font-size: 11px;
  gap: 2px;
  transition: color 0.2s;
}

.bottom-tab.router-link-active {
  color: var(--gold);
}

.tab-icon {
  font-size: 20px;
}

.tab-label {
  font-size: 10px;
}

@media (max-width: 768px) {
  .content {
    padding: 12px;
    padding-bottom: 72px;
  }
}
</style>
