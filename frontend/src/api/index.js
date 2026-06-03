import axios from 'axios'
import { ElMessage } from 'element-plus'

export const api = axios.create({
  baseURL: '/api',
  timeout: 10000,
})

// 请求拦截：自动带 token
api.interceptors.request.use(config => {
  const token = localStorage.getItem('token')
  if (token) config.headers.Authorization = `Bearer ${token}`
  return config
})

// 响应拦截：统一错误处理
api.interceptors.response.use(
  res => res,
  err => {
    const msg = err.response?.data?.error || '网络错误，请稍后重试'
    if (err.response?.status === 401) {
      localStorage.removeItem('token')
      localStorage.removeItem('user')
      window.location.href = '/login'
    } else {
      ElMessage.error(msg)
    }
    return Promise.reject(err)
  }
)
