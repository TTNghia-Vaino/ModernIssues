import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173, // Port cho frontend
    open: true, // Tự động mở browser khi chạy dev server
    proxy: {
      '/v1': {
        target: 'http://35.232.61.38:5000', // Remote backend server
        changeOrigin: true,
        secure: false, // Allow HTTP
        rewrite: (path) => path, // Keep the path as is
        cookieDomainRewrite: {
          '*': 'localhost' // Rewrite all cookie domains to localhost
        },
        cookiePathRewrite: {
          '*': '/' // Rewrite all cookie paths to /
        },
        configure: (proxy, _options) => {
          proxy.on('error', (err, _req, _res) => {
            console.log('[Proxy Error]', err.message);
          });
          proxy.on('proxyReq', (proxyReq, req, _res) => {
            console.log('[Proxy Request]', req.method, req.url, '→', proxyReq.path);
            // Log cookies being sent
            const cookieHeader = req.headers.cookie;
            if (cookieHeader) {
              console.log('[Proxy Request] Cookies being sent:', cookieHeader);
            } else {
              console.log('[Proxy Request] No cookies in request');
            }
          });
          proxy.on('proxyRes', (proxyRes, req, res) => {
            // Log cookies from backend
            const cookies = proxyRes.headers['set-cookie'];
            if (cookies) {
              console.log('[Proxy Response] Set-Cookie from backend:', cookies);
              // Ensure cookies are properly set for localhost
              let modifiedCookies;
              if (Array.isArray(cookies)) {
                modifiedCookies = cookies.map(cookie => {
                  // Remove domain restriction, set SameSite=Lax (works better with proxy), remove Secure
                  let modified = cookie
                    .replace(/;\s*[Dd]omain=[^;]+/gi, '')
                    .replace(/;\s*[Ss]ame[Ss]ite=[^;]+/gi, '')
                    .replace(/;\s*[Ss]ecure/gi, '');
                  // Add SameSite=Lax if not present
                  if (!modified.includes('SameSite')) {
                    modified += '; SameSite=Lax';
                  }
                  return modified;
                });
              } else {
                modifiedCookies = cookies
                  .replace(/;\s*[Dd]omain=[^;]+/gi, '')
                  .replace(/;\s*[Ss]ame[Ss]ite=[^;]+/gi, '')
                  .replace(/;\s*[Ss]ecure/gi, '');
                if (!modifiedCookies.includes('SameSite')) {
                  modifiedCookies += '; SameSite=Lax';
                }
              }
              proxyRes.headers['set-cookie'] = modifiedCookies;
              console.log('[Proxy Response] Set-Cookie after rewrite:', modifiedCookies);
            } else {
              console.log('[Proxy Response] No Set-Cookie header from backend');
            }
          });
        },
      },
      '/chat': {
        target: 'http://35.232.61.38:8000', // Python FastAPI Chat API runs on port 8000
        changeOrigin: true,
        secure: false, // Allow HTTP
        rewrite: (path) => path, // Keep the path as is
        configure: (proxy) => {
          proxy.on('error', (err) => {
            console.log('[Chat Proxy Error]', err.message);
            console.log('[Chat Proxy] Trying Python API server: http://35.232.61.38:8000/chat');
            console.log('[Chat Proxy] Make sure Python FastAPI is running on port 8000');
          });
          proxy.on('proxyReq', (proxyReq, req) => {
            console.log('[Chat Proxy Request]', req.method, req.url, '→', 'http://35.232.61.38:8000' + req.url);
          });
        },
      },
      '/update-vector-by-product-id': {
        target: 'http://35.232.61.38:5000', // Remote backend server
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
        target: 'http://35.232.61.38:5000', // Remote backend server
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
        target: 'http://35.232.61.38:5000', // Remote backend server
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
        target: 'http://35.232.61.38:5000', // Remote backend server
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
