import { reactive } from 'vue'
import { api } from '../api'

const state = reactive({
  token: localStorage.getItem('token') || '',
  user: JSON.parse(localStorage.getItem('user') || 'null'),
})

export function useUserStore() {
  function setAuth(token, user) {
    state.token = token
    state.user = user
    localStorage.setItem('token', token)
    localStorage.setItem('user', JSON.stringify(user))
  }

  function logout() {
    state.token = ''
    state.user = null
    localStorage.removeItem('token')
    localStorage.removeItem('user')
  }

  async function refreshMe() {
    try {
      const res = await api.get('/auth/me')
      state.user = res.data
      localStorage.setItem('user', JSON.stringify(res.data))
    } catch {}
  }

  return {
    state,
    setAuth,
    logout,
    refreshMe,
    get isLoggedIn() { return !!state.token },
    get isAdmin() { return state.user?.role === 'admin' },
  }
}
