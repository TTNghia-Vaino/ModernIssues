// API Configuration
// Switch between local and server by changing the environment variable

// Get base URL from environment variable or use default
// For local: use proxy (relative path) or http://35.232.61.38:5000
// For server: set VITE_API_BASE_URL in .env file
export const getBaseURL = () => {
  // If VITE_API_BASE_URL is set, use it
  if (import.meta.env.VITE_API_BASE_URL) {
    return import.meta.env.VITE_API_BASE_URL;
  }
  
  // Default: use remote server URL (API chạy trên server)
  // Có thể dùng proxy trong dev hoặc direct URL
  // Để dùng proxy, return ''; Để dùng direct, return server URL
  if (import.meta.env.DEV) {
    // Development: dùng remote server
    // Return remote server URL để gọi trực tiếp
    return 'http://35.232.61.38:5000';
    // Nếu muốn dùng proxy (cần cấu hình proxy trong vite.config.js):
    // return '';
  }
  
  // Default for production - use remote server
  return 'http://35.232.61.38:5000';
};

// API Base URL
export const API_BASE_URL = getBaseURL();

// API Version (can be overridden via VITE_API_VERSION)
// Default matches backend route structure (e.g., /v1/Auth/Login)
export const API_VERSION = import.meta.env.VITE_API_VERSION !== undefined 
  ? import.meta.env.VITE_API_VERSION 
  : 'v1';

// Full API URL
// Format: {BASE_URL}/{VERSION} or {BASE_URL} if no version
// Note: Backend API doesn't have /api prefix, directly uses /v1/
export const API_URL = API_BASE_URL 
  ? (API_VERSION ? `${API_BASE_URL}/${API_VERSION}` : API_BASE_URL)
  : (API_VERSION ? `/${API_VERSION}` : '');

// Log API configuration in development
if (import.meta.env.DEV) {
  console.log('[API Config]', {
    API_BASE_URL: API_BASE_URL || '(using Vite proxy)',
    API_VERSION: API_VERSION || '(no version)',
    API_URL: API_URL,
    Backend: API_BASE_URL ? `Direct: ${API_BASE_URL}` : 'Proxy: http://35.232.61.38:5000'
  });
}

// Helper function to get full endpoint URL
export const getApiUrl = (endpoint) => {
  // Remove leading slash if present
  const cleanEndpoint = endpoint.startsWith('/') ? endpoint.slice(1) : endpoint;
  // Ensure proper URL construction
  const base = API_URL.endsWith('/') ? API_URL.slice(0, -1) : API_URL;
  return `${base}/${cleanEndpoint}`;
};

// Default headers
export const getDefaultHeaders = () => {
  const headers = {
    'Content-Type': 'application/json',
    'Accept': 'application/json',
  };
  
  // Add authorization token if available
  const token = localStorage.getItem('auth_token');
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  
  return headers;
};

export default {
  API_BASE_URL,
  API_URL,
  API_VERSION,
  getApiUrl,
  getDefaultHeaders,
  getBaseURL
};

