import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    host: true, // เปิดให้เครื่องอื่นใน WiFi เดียวกันเข้าถึงได้
  }
})
