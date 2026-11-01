import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      '/products': 'http://127.0.0.1:5000',
      '/stock': 'http://127.0.0.1:5000',
    },
  },
})
