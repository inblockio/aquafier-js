import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
// import { nodePolyfills } from 'vite-plugin-node-polyfills'
import path from 'path'
import tailwindcss from '@tailwindcss/vite'

// https://vite.dev/config/
export default defineConfig({
  server: {
    allowedHosts: ['moonscape.ngrok.io'],
  },
  plugins: [
    react(),
    // nodePolyfills()
    tailwindcss(),
  ],
  preview: {
    port: 3000,
    host: '0.0.0.0'
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "src"),
    },
  },
  // Optional: add fallback values
  //  define: {
  //   'import.meta.env.VITE_REMOTE': JSON.stringify(process.env.VITE_REMOTE || '127.0.0.1'),
  //   'import.meta.env.VITE_REMOTE_PORT': JSON.stringify(process.env.VITE_REMOTE_PORT || '3600')
  // }
})
