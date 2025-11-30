// Base API service with common functions

import { getApiUrl, getDefaultHeaders } from '../config/api';

/**
 * Generic API request function
 * @param {string} endpoint - API endpoint (e.g., 'Auth/Login')
 * @param {object} options - Fetch options (method, body, headers, etc.)
 * @returns {Promise} - Response data
 */
export const apiRequest = async (endpoint, options = {}) => {
  const url = getApiUrl(endpoint);
  
  const defaultOptions = {
    method: 'GET',
    headers: getDefaultHeaders(),
    credentials: 'include', // Send cookies/session for 2FA and session-based auth
    ...options,
  };
  
  // Debug logging in production for authentication issues
  if (import.meta.env.PROD) {
    const token = localStorage.getItem('auth_token');
    const user = localStorage.getItem('modernissues_auth_v1');
    console.log('[API Request]', {
      url,
      method: defaultOptions.method,
      hasToken: !!token,
      hasUser: !!user,
      credentials: defaultOptions.credentials,
      headers: {
        ...defaultOptions.headers,
        Authorization: defaultOptions.headers['Authorization'] ? 'Bearer ***' : 'none'
      }
    });
  }

  // Handle request body
  if (options.body && typeof options.body === 'object') {
    defaultOptions.body = JSON.stringify(options.body);
    // Ensure Content-Type is set for JSON body
    if (!defaultOptions.headers) {
      defaultOptions.headers = {};
    }
    if (!defaultOptions.headers['Content-Type']) {
      defaultOptions.headers['Content-Type'] = 'application/json';
    }
  }
  
  // Debug logging in development (after body is stringified)
  if (import.meta.env.DEV) {
    console.log(`[API Request] ${defaultOptions.method || 'GET'} ${url}`);
    if (defaultOptions.body) {
      try {
        console.log('[API Request Body]', JSON.parse(defaultOptions.body));
      } catch {
        console.log('[API Request Body]', defaultOptions.body);
      }
    }
  }

  try {
    const response = await fetch(url, defaultOptions);
    
    // Handle non-JSON responses
    const contentType = response.headers.get('content-type');
    const isJson = contentType && contentType.includes('application/json');
    
    let data;
    if (isJson) {
      data = await response.json();
    } else {
      const text = await response.text();
      data = text ? { message: text } : {};
    }

    // Handle errors
    if (!response.ok) {
      if (import.meta.env.DEV) {
        console.error(`[API Error] ${response.status} ${url}`, data);
        if (response.status === 404) {
          console.error(`[API 404] Endpoint not found: ${url}`);
          console.error(`[API 404] Check if endpoint exists on backend: ${defaultOptions.method || 'GET'} ${url}`);
        }
      }
      
      // Handle 401 Unauthorized - clear token and trigger logout
      if (response.status === 401) {
        // Check if we're in grace period (first 8 seconds after login)
        // Don't trigger logout if user just logged in
        let shouldTriggerLogout = true;
        try {
          const storedUser = localStorage.getItem('modernissues_auth_v1');
          if (storedUser) {
            const user = JSON.parse(storedUser);
            // Check if user has loginTime stored
            if (user.loginTime) {
              const timeSinceLogin = Date.now() - new Date(user.loginTime).getTime();
              if (timeSinceLogin < 8000) { // 8 seconds threshold
                shouldTriggerLogout = false;
                if (import.meta.env.DEV) {
                  console.log('[API] Ignoring 401 during grace period', {
                    timeSinceLogin,
                    url
                  });
                }
              }
            }
          }
        } catch (e) {
          // If error checking, proceed with logout
          console.warn('[API] Error checking grace period:', e);
        }
        
        if (shouldTriggerLogout) {
          // Clear invalid tokens
          localStorage.removeItem('auth_token');
          localStorage.removeItem('refresh_token');
          
          // Dispatch event to notify AuthContext and other components
          window.dispatchEvent(new CustomEvent('authTokenExpired', { detail: { url } }));
        }
        
        // Get user-friendly error message
        const errorMessage = data?.message || data?.errors?.[0] || 'Bạn cần đăng nhập để thực hiện thao tác này.';
        const error = new Error(errorMessage);
        error.status = 401;
        error.data = data;
        error.isUnauthorized = true;
        throw error;
      }
      
      const error = new Error(data.message || `HTTP error! status: ${response.status}`);
      error.status = response.status;
      error.data = data;
      throw error;
    }

    if (import.meta.env.DEV) {
      console.log(`[API Success] ${response.status} ${url}`);
    }

    return data;
  } catch (error) {
    // Network errors or other issues
    if (error.name === 'TypeError' && error.message.includes('fetch')) {
      // Check if it's a CORS error
      if (error.message.includes('CORS') || error.message.includes('Failed to fetch')) {
        const backendUrl = import.meta.env.DEV 
          ? 'http://35.232.61.38:5000 (qua Vite proxy)' 
          : 'http://35.232.61.38:5000';
        const errorMsg = import.meta.env.DEV 
          ? `Lỗi kết nối: Backend server có thể chưa chạy hoặc không thể truy cập. Vui lòng:\n1. Kiểm tra backend có đang chạy tại ${backendUrl}\n2. Kiểm tra Vite proxy trong vite.config.js (proxy /v1 → http://35.232.61.38:5000)\n3. Kiểm tra kết nối mạng và firewall\n4. Xem console để biết thêm chi tiết`
          : 'Lỗi CORS: Backend server chưa cấu hình CORS.';
        throw new Error(errorMsg);
      }
      throw new Error('Không thể kết nối đến server. Vui lòng kiểm tra kết nối mạng và đảm bảo backend server đang chạy tại http://35.232.61.38:5000.');
    }
    throw error;
  }
};

/**
 * GET request
 * @param {string} endpoint - API endpoint
 * @param {object} params - Query parameters (optional)
 * @param {object} options - Additional fetch options (optional)
 */
export const apiGet = (endpoint, params = {}, options = {}) => {
  // Build query string if params provided
  let url = endpoint;
  if (params && Object.keys(params).length > 0) {
    const queryString = new URLSearchParams(params).toString();
    url = `${endpoint}?${queryString}`;
  }
  return apiRequest(url, { ...options, method: 'GET' });
};

/**
 * POST request
 */
export const apiPost = (endpoint, data, options = {}) => {
  return apiRequest(endpoint, {
    ...options,
    method: 'POST',
    body: data,
  });
};

/**
 * PUT request
 */
export const apiPut = (endpoint, data, options = {}) => {
  return apiRequest(endpoint, {
    ...options,
    method: 'PUT',
    body: data,
  });
};

/**
 * DELETE request
 */
export const apiDelete = (endpoint, options = {}) => {
  return apiRequest(endpoint, { ...options, method: 'DELETE' });
};

/**
 * PATCH request
 */
export const apiPatch = (endpoint, data, options = {}) => {
  return apiRequest(endpoint, {
    ...options,
    method: 'PATCH',
    body: data,
  });
};

