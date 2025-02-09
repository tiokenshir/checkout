import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    host: true, // Listen on all addresses
    port: 5173,
    strictPort: false, // Allow fallback ports
    hmr: {
      clientPort: 443 // Force client to use HTTPS for HMR
    }
  },
  preview: {
    host: true,
    port: 5173,
    strictPort: false
  },
  optimizeDeps: {
    exclude: ['lucide-react']
  }
})