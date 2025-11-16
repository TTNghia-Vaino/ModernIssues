import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    open: true, // Tự động mở browser khi chạy dev server
    proxy: {
      '/v1': {
        target: 'http://35.232.61.38:5000',
        changeOrigin: true,
        secure: false, // Allow self-signed certificates
        rewrite: (path) => path, // Keep the path as is
        configure: (proxy) => {
          proxy.on('error', (err) => {
            console.log('[Proxy Error]', err.message);
          });
          proxy.on('proxyReq', (proxyReq, req) => {
            console.log('[Proxy Request]', req.method, req.url, '→', proxyReq.path);
          });
        },
      },
      '/GenerateQr': {
        target: 'http://35.232.61.38:5000',
        changeOrigin: true,
        secure: false,
        rewrite: (path) => path,
        configure: (proxy) => {
          proxy.on('error', (err) => {
            console.log('[Proxy Error]', err.message);
          });
          proxy.on('proxyReq', (proxyReq, req) => {
            console.log('[Proxy Request]', req.method, req.url, '→', proxyReq.path);
          });
        },
      },
      '/Payment/GenerateQr': {
        target: 'http://35.232.61.38:5000',
        changeOrigin: true,
        secure: false,
        rewrite: (path) => path,
        configure: (proxy) => {
          proxy.on('error', (err) => {
            console.log('[Proxy Error]', err.message);
          });
          proxy.on('proxyReq', (proxyReq, req) => {
            console.log('[Proxy Request]', req.method, req.url, '→', proxyReq.path);
          });
        },
      }
    }
  }
})
