import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    open: true, // Tự động mở browser khi chạy dev server
    proxy: {
      '/v1': {
        target: 'http://35.232.61.38:5000', // Remote server backend
        changeOrigin: true,
        secure: false, // Allow HTTP
        rewrite: (path) => path, // Keep the path as is
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
      // Proxy for images from remote server
      '/Uploads': {
        target: 'http://35.232.61.38:5000', // Remote server for images
        changeOrigin: true,
        secure: false,
        rewrite: (path) => path, // Keep the path as is
        configure: (proxy) => {
          proxy.on('error', (err) => {
            console.log('[Image Proxy Error]', err.message);
          });
        },
      },
      '/chat': {
        target: 'http://35.232.61.38:5000', // Server backend
        changeOrigin: true,
        secure: false, // Allow HTTP
        rewrite: (path) => path, // Keep the path as is
        configure: (proxy) => {
          proxy.on('error', (err) => {
            console.log('[Chat Proxy Error]', err.message);
          });
          proxy.on('proxyReq', (proxyReq, req) => {
            console.log('[Chat Proxy Request]', req.method, req.url, '→', proxyReq.path);
          });
        },
      },
      '/update-vector-by-product-id': {
        target: 'http://35.232.61.38:5000', // Server backend
        changeOrigin: true,
        secure: false, // Allow HTTP
        rewrite: (path) => path, // Keep the path as is
        configure: (proxy) => {
          proxy.on('error', (err) => {
            console.log('[Update Vector Proxy Error]', err.message);
          });
          proxy.on('proxyReq', (proxyReq, req) => {
            console.log('[Update Vector Proxy Request]', req.method, req.url, '→', proxyReq.path);
          });
        },
      },
      '/GenerateQr': {
        target: 'http://localhost:5273', // Local backend
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
        target: 'http://localhost:5273', // Local backend
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
        target: 'http://localhost:5273', // Local backend
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
