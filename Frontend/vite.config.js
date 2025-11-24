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
        secure: false, // Allow HTTP
        rewrite: (path) => path, // Keep the path as is
        cookieDomainRewrite: 'localhost', // Rewrite cookie domain to localhost
        cookiePathRewrite: '/', // Rewrite cookie path
        configure: (proxy) => {
          proxy.on('error', (err) => {
            console.log('[Proxy Error]', err.message);
          });
          proxy.on('proxyReq', (proxyReq, req) => {
            console.log('[Proxy Request]', req.method, req.url, '→', proxyReq.path);
          });
          proxy.on('proxyRes', (proxyRes, req, res) => {
            // Log cookies from backend
            const cookies = proxyRes.headers['set-cookie'];
            if (cookies) {
              console.log('[Proxy Response] Set-Cookie:', cookies);
            }
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
      },
      '/paymentHub': {
        target: 'http://35.232.61.38:5000',
        ws: true,
        changeOrigin: true,
        secure: false,
        configure: (proxy, _options) => {
          proxy.on('error', (err, _req, _res) => {
            console.log('[SignalR Proxy Error]', err.message);
          });
          proxy.on('proxyReq', (proxyReq, req, _res) => {
            console.log('[SignalR Proxy HTTP]', req.url, '→', proxyReq.path);
          });
          proxy.on('proxyReqWs', (proxyReq, req, _socket) => {
            console.log('[SignalR Proxy WS]', req.url, '→', proxyReq.path);
          });
        },
      }
    }
  }
})
