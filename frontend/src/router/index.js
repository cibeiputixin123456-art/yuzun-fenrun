import { createRouter, createWebHistory } from 'vue-router'

const routes = [
  { path: '/login', component: () => import('../views/Login.vue'), meta: { public: true } },
  { path: '/register', component: () => import('../views/Register.vue'), meta: { public: true } },
  {
    path: '/',
    component: () => import('../views/Layout.vue'),
    redirect: '/dashboard',
    children: [
      { path: 'dashboard', component: () => import('../views/Dashboard.vue'), meta: { title: '我的主页' } },
      { path: 'orders', component: () => import('../views/Orders.vue'), meta: { title: '服务记录' } },
      { path: 'commissions', component: () => import('../views/Commissions.vue'), meta: { title: '我的收益' } },
      { path: 'team', component: () => import('../views/Team.vue'), meta: { title: '服务网络' } },
      { path: 'tier-progress', component: () => import('../views/TierProgress.vue'), meta: { title: '成长路径' } },
      // 管理员
      { path: 'admin/members', component: () => import('../views/admin/Members.vue'), meta: { title: '会员管理', admin: true } },
      { path: 'admin/orders', component: () => import('../views/admin/AdminOrders.vue'), meta: { title: '订单管理', admin: true } },
      { path: 'admin/commissions', component: () => import('../views/admin/AdminCommissions.vue'), meta: { title: '收益管理', admin: true } },
      { path: 'admin/stats', component: () => import('../views/admin/Stats.vue'), meta: { title: '数据统计', admin: true } },
      { path: 'admin/import', component: () => import('../views/admin/ImportOrders.vue'), meta: { title: '导入订单', admin: true } },
      { path: 'admin/tree', component: () => import('../views/admin/TeamTree.vue'), meta: { title: '团队架构', admin: true } },
    ]
  },
]

const router = createRouter({
  history: createWebHistory(),
  routes,
})

router.beforeEach((to, from, next) => {
  const token = localStorage.getItem('token')
  if (!to.meta.public && !token) return next('/login')
  if (to.path === '/login' && token) return next('/')
  next()
})

export default router
