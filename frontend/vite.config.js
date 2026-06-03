import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'

export default defineConfig({
  plugins: [vue()],
  server: {
    proxy: {
      '/api': 'http://localhost:3000'
    }
  },
  define: {
    __API_BASE__: JSON.stringify(
      process.env.VITE_API_URL || ''
    )
  }
})
