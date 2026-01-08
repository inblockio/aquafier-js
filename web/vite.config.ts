import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
// import { nodePolyfills } from 'vite-plugin-node-polyfills'
import path from 'path'
import tailwindcss from '@tailwindcss/vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    {
      name: 'configure-response-headers',
      configureServer: (server) => {
        server.middlewares.use((_req, res, next) => {
          res.setHeader('Cross-Origin-Opener-Policy', 'same-origin-allow-popups')
          res.setHeader('Cross-Origin-Embedder-Policy', 'require-corp')
          next()
        })
      },
      configurePreviewServer: (server) => {
        server.middlewares.use((_req, res, next) => {
          res.setHeader('Cross-Origin-Opener-Policy', 'same-origin-allow-popups')
          res.setHeader('Cross-Origin-Embedder-Policy', 'require-corp')
          next()
        })
      }
    }
  ],
  server: {
 allowedHosts: ['localhost', '8297ed98a409.ngrok-free.app'],
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