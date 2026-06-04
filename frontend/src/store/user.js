import { reactive } from 'vue'
import { api } from '../api'

function safeParseUser() {
  try {
    const raw = localStorage.getItem('user')
    if (!raw || raw === 'undefined' || raw === 'null') return null
    return JSON.parse(raw)
  } catch {
    localStorage.removeItem('user')
    return null
  }
}

const state = reactive({
  token: localStorage.getItem('token') || '',
  user: safeParseUser(),
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
