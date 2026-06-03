import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'

export default defineConfig({
  plugins: [vue()],
  build: {
    target: 'es2015',
    cssCodeSplit: false,
  },
  server: {
    proxy: {
      '/api': 'http://localhost:3000'
    }
  }
})
