import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
// import { nodePolyfills } from 'vite-plugin-node-polyfills'
import path from 'path'
import tailwindcss from '@tailwindcss/vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    // nodePolyfills()
    tailwindcss(),
  ],
  server: {
    // allowedHosts: ['moonscape.ngrok.io'],
    // headers: {
    //   'Cross-Origin-Opener-Policy': 'same-origin-allow-popups',
    //   // 'Cross-Origin-Embedder-Policy': 'require-corp',
    //   'Cross-Origin-Embedder-Policy': 'unsafe-none',
    // }
  },
  preview: {
    port: 3000,
    host: '0.0.0.0',
    // headers: {
    //   'Cross-Origin-Opener-Policy': 'same-origin-allow-popups',
    //   // 'Cross-Origin-Embedder-Policy': 'unsafe-none',
    // }
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


// export default defineConfig({
//   plugins: [
//     react(),
//     tailwindcss(),
//     {
//       name: 'configure-response-headers',
//       configureServer: (server) => {
//         server.middlewares.use((_req, res, next) => {
//           res.setHeader('Cross-Origin-Opener-Policy', 'same-origin-allow-popups')
//           res.setHeader('Cross-Origin-Embedder-Policy', 'unsafe-none')
//           next()
//         })
//       },
//       configurePreviewServer: (server) => {
//         server.middlewares.use((_req, res, next) => {
//           res.setHeader('Cross-Origin-Opener-Policy', 'same-origin-allow-popups')
//           res.setHeader('Cross-Origin-Embedder-Policy', 'unsafe-none')
//           next()
//         })
//       }
//     }
//   ],

//   resolve: {
//     alias: {
//       "@": path.resolve(__dirname, "src"),
//     },
//   },

// })