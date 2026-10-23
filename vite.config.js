import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    proxy: {
      '/api': {
        target: process.env.BGA_API_PROXY_TARGET || 'http://localhost:5000',
        changeOrigin: true,
        secure: false
      }
    }
  }
})
