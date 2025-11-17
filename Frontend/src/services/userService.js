// User API Service

import { apiGet, apiPost, apiPut, apiDelete } from './api';

/**
 * Register new user
 * Endpoint: POST /v1/User/register
 * Response format: { success: boolean, message: string, data: string|object, errors: string[] }
 * @param {object} userData - { fullName, email, phone, password }
 * @returns {Promise} - User data
 */
export const register = async (userData) => {
  const response = await apiPost('User/register', userData);
  
  // Handle Swagger response format
  if (response && typeof response === 'object') {
    if (response.success === false) {
      throw new Error(response.message || 'Registration failed');
    }
    
    // Return data if available
    if (response.data) {
      return response.data;
    }
  }
  
  return response;
};

/**
 * Register new user with avatar file upload
 * Endpoint: POST /v1/User/register
 * Response format: { success: boolean, message: string, data: object, errors: string[] }
 * @param {object} userData - { username, email, phone, address, password }
 * @param {File} avatarFile - Avatar image file (optional)
 * @returns {Promise} - User data
 */
export const registerWithAvatar = async (userData, avatarFile = null) => {
  const { getApiUrl, getDefaultHeaders } = await import('../config/api');
  const url = getApiUrl('User/register');
  const headers = getDefaultHeaders();
  
  let body;
  
  if (avatarFile) {
    // Use FormData for file upload
    const formData = new FormData();
    formData.append('username', userData.username || userData.name || '');
    formData.append('email', userData.email || '');
    formData.append('phone', userData.phone || '');
    formData.append('password', userData.password || '');
    if (userData.address) {
      formData.append('address', userData.address);
    }
    formData.append('avatar', avatarFile);
    
    // Remove Content-Type header to let browser set it with boundary
    delete headers['Content-Type'];
    body = formData;
  } else {
    // Use JSON for regular registration
    body = JSON.stringify({
      username: userData.username || userData.name || '',
      email: userData.email || '',
      phone: userData.phone || '',
      password: userData.password || '',
      ...(userData.address && { address: userData.address })
    });
  }
  
  const response = await fetch(url, {
    method: 'POST',
    headers,
    body
  });
  
  const contentType = response.headers.get('content-type');
  const isJson = contentType && contentType.includes('application/json');
  
  let data;
  if (isJson) {
    data = await response.json();
  } else {
    const text = await response.text();
    try {
      data = JSON.parse(text);
    } catch {
      data = { message: text };
    }
  }
  
  if (!response.ok) {
    const error = new Error(data.message || `HTTP error! status: ${response.status}`);
    error.status = response.status;
    error.data = data;
    throw error;
  }
  
  // Handle Swagger response format
  if (data && typeof data === 'object') {
    if (data.success === false) {
      throw new Error(data.message || 'Registration failed');
    }
    
    // Return data if available
    if (data.data) {
      return typeof data.data === 'string' ? (() => {
        try { return JSON.parse(data.data); } catch { return data.data; }
      })() : data.data;
    }
  }
  
  return data;
};

/**
 * Get current user information
 * Endpoint: GET /v1/User/CurrentUser
 * Response format: { success: boolean, message: string, data: string|object, errors: string[] }
 * @returns {Promise} - Current user data
 */
export const getCurrentUser = async () => {
  const response = await apiGet('User/CurrentUser');
  
  // Handle Swagger response format
  if (response && typeof response === 'object') {
    if (response.success === false) {
      throw new Error(response.message || 'Failed to get current user');
    }
    
    // If data is string, try to parse
    if (response.data && typeof response.data === 'string') {
      try {
        return JSON.parse(response.data);
      } catch (e) {
        console.warn('[UserService] Failed to parse response.data as JSON:', e);
        return response.data;
      }
    }
    
    // Return data if available
    if (response.data && typeof response.data === 'object') {
      return response.data;
    }
  }
  
  return response;
};

/**
 * Get user by ID
 * Endpoint: GET /v1/User/{userId}
 * Response format: { success: boolean, message: string, data: string|object, errors: string[] }
 * @param {string|number} userId - User ID
 * @returns {Promise} - User data
 */
export const getUserById = async (userId) => {
  const response = await apiGet(`User/${userId}`);
  
  // Handle Swagger response format
  if (response && typeof response === 'object') {
    if (response.success === false) {
      throw new Error(response.message || 'User not found');
    }
    
    // If data is string, try to parse
    if (response.data && typeof response.data === 'string') {
      try {
        return JSON.parse(response.data);
      } catch (e) {
        console.warn('[UserService] Failed to parse response.data as JSON:', e);
        return response.data;
      }
    }
    
    // Return data if available
    if (response.data && typeof response.data === 'object') {
      return response.data;
    }
  }
  
  return response;
};

/**
 * Update user profile
 * Endpoint: PUT /v1/User/{userId}
 * Response format: { success: boolean, message: string, data: string|object, errors: string[] }
 * @param {string|number} userId - User ID
 * @param {object} userData - Updated user data (Phone, Address, Email, Avatar)
 * @returns {Promise} - Updated user data
 */
export const updateUser = async (userId, userData) => {
  const response = await apiPut(`User/${userId}`, userData);
  
  // Handle Swagger response format
  if (response && typeof response === 'object') {
    if (response.success === false) {
      throw new Error(response.message || 'Failed to update user');
    }
    
    // If data is string, try to parse
    if (response.data && typeof response.data === 'string') {
      try {
        return JSON.parse(response.data);
      } catch (e) {
        console.warn('[UserService] Failed to parse response.data as JSON:', e);
        return response.data;
      }
    }
    
    // Return data if available
    if (response.data && typeof response.data === 'object') {
      return response.data;
    }
  }
  
  return response;
};

/**
 * Delete (disable) user account
 * Endpoint: DELETE /v1/User/{userId}
 * Response format: { success: boolean, message: string, data: string, errors: string[] }
 * @param {string|number} userId - User ID
 * @returns {Promise}
 */
export const deleteUser = async (userId) => {
  const response = await apiDelete(`User/${userId}`);
  
  // Handle Swagger response format
  if (response && typeof response === 'object') {
    if (response.success === false) {
      throw new Error(response.message || 'Failed to delete user');
    }
    
    return response;
  }
  
  return response;
};

/**
 * Get list of all users (Admin only)
 * Endpoint: GET /v1/User/ListUsers
 * Response format: { success: boolean, message: string, data: string|array, errors: string[] }
 * @param {object} params - Optional pagination parameters { page, pageSize }
 * @returns {Promise} - List of users or paginated response
 */
export const listUsers = async (params = {}) => {
  // Build query string if pagination params provided
  let endpoint = 'User/ListUsers';
  if (params.page || params.pageSize) {
    const queryParams = new URLSearchParams();
    if (params.page) queryParams.append('page', params.page);
    if (params.pageSize) queryParams.append('pageSize', params.pageSize);
    endpoint += `?${queryParams.toString()}`;
  }
  
  const response = await apiGet(endpoint);
  
  // Handle Swagger response format
  if (response && typeof response === 'object') {
    if (response.success === false) {
      throw new Error(response.message || 'Failed to get users list');
    }
    
    // If data is string, try to parse
    if (response.data && typeof response.data === 'string') {
      try {
        const parsed = JSON.parse(response.data);
        return Array.isArray(parsed) ? parsed : parsed.data || parsed;
      } catch (e) {
        console.warn('[UserService] Failed to parse response.data as JSON:', e);
        return [];
      }
    }
    
    // If data is array or object
    if (response.data) {
      return Array.isArray(response.data) ? response.data : response.data;
    }
  }
  
  // Fallback
  return Array.isArray(response) ? response : [];
};

/**
 * Search users by name, email or phone (Admin only)
 * Endpoint: GET /v1/User/search?keyword={keyword}
 * Response format: { success: boolean, message: string, data: string|array, errors: string[] }
 * @param {string} keyword - Search keyword
 * @returns {Promise} - List of matching users
 */
export const searchUsers = async (keyword) => {
  const response = await apiGet(`User/search?keyword=${encodeURIComponent(keyword)}`);
  
  // Handle Swagger response format
  if (response && typeof response === 'object') {
    if (response.success === false) {
      throw new Error(response.message || 'Failed to search users');
    }
    
    // If data is string, try to parse
    if (response.data && typeof response.data === 'string') {
      try {
        const parsed = JSON.parse(response.data);
        return Array.isArray(parsed) ? parsed : parsed;
      } catch (e) {
        console.warn('[UserService] Failed to parse search results:', e);
        return [];
      }
    }
    
    // Return data if available
    if (response.data) {
      return Array.isArray(response.data) ? response.data : response.data;
    }
  }
  
  // Fallback: return response as is or empty array
  return Array.isArray(response) ? response : [];
};

/**
 * Activate user account (Admin only)
 * Endpoint: PUT /v1/User/{userId}/activate
 * Response format: { success: boolean, message: string, data: string, errors: string[] }
 * @param {string|number} userId - User ID
 * @returns {Promise}
 */
export const activateUser = async (userId) => {
  const response = await apiPut(`User/${userId}/activate`);
  
  // Handle Swagger response format
  if (response && typeof response === 'object') {
    if (response.success === false) {
      throw new Error(response.message || 'Failed to activate user');
    }
    
    return response;
  }
  
  return response;
};

/**
 * Upload avatar for specific user
 * Endpoint: POST /v1/User/{userId}/avatar
 * Response format: { success: boolean, message: string, data: string|object, errors: string[] }
 * @param {string|number} userId - User ID
 * @param {File} imageFile - Avatar image file
 * @returns {Promise} - Updated user data
 */
export const uploadUserAvatar = async (userId, imageFile) => {
  const formData = new FormData();
  formData.append('avatar', imageFile);
  
  const { getApiUrl, getDefaultHeaders } = await import('../config/api');
  const url = getApiUrl(`User/${userId}/avatar`);
  const headers = getDefaultHeaders();
  delete headers['Content-Type'];
  
  const response = await fetch(url, {
    method: 'POST',
    headers,
    body: formData
  });
  
  const contentType = response.headers.get('content-type');
  const isJson = contentType && contentType.includes('application/json');
  
  let data;
  if (isJson) {
    data = await response.json();
  } else {
    const text = await response.text();
    try {
      data = JSON.parse(text);
    } catch {
      data = { message: text };
    }
  }
  
  if (!response.ok) {
    const error = new Error(data.message || `HTTP error! status: ${response.status}`);
    error.status = response.status;
    error.data = data;
    throw error;
  }
  
  // Handle Swagger response format
  if (data && typeof data === 'object') {
    if (data.success === false) {
      throw new Error(data.message || 'Failed to upload avatar');
    }
    
    // Return data if available
    if (data.data) {
      return typeof data.data === 'string' ? (() => {
        try { return JSON.parse(data.data); } catch { return data.data; }
      })() : data.data;
    }
  }
  
  return data;
};

/**
 * Delete user avatar (revert to default)
 * Endpoint: DELETE /v1/User/{userId}/avatar
 * Response format: { success: boolean, message: string, data: string, errors: string[] }
 * @param {string|number} userId - User ID
 * @returns {Promise}
 */
export const deleteUserAvatar = async (userId) => {
  const response = await apiDelete(`User/${userId}/avatar`);
  
  // Handle Swagger response format
  if (response && typeof response === 'object') {
    if (response.success === false) {
      throw new Error(response.message || 'Failed to delete avatar');
    }
    
    return response;
  }
  
  return response;
};

/**
 * Upload avatar for current user
 * Endpoint: POST /v1/User/avatar/upload
 * Response format: { success: boolean, message: string, data: string|object, errors: string[] }
 * @param {File} imageFile - Avatar image file
 * @returns {Promise} - Updated user data
 */
export const uploadCurrentUserAvatar = async (imageFile) => {
  const formData = new FormData();
  formData.append('avatar', imageFile);
  
  const { getApiUrl, getDefaultHeaders } = await import('../config/api');
  const url = getApiUrl('User/avatar/upload');
  const headers = getDefaultHeaders();
  delete headers['Content-Type'];
  
  const response = await fetch(url, {
    method: 'POST',
    headers,
    body: formData
  });
  
  const contentType = response.headers.get('content-type');
  const isJson = contentType && contentType.includes('application/json');
  
  let data;
  if (isJson) {
    data = await response.json();
  } else {
    const text = await response.text();
    try {
      data = JSON.parse(text);
    } catch {
      data = { message: text };
    }
  }
  
  if (!response.ok) {
    const error = new Error(data.message || `HTTP error! status: ${response.status}`);
    error.status = response.status;
    error.data = data;
    throw error;
  }
  
  // Handle Swagger response format
  if (data && typeof data === 'object') {
    if (data.success === false) {
      throw new Error(data.message || 'Failed to upload avatar');
    }
    
    // Return data if available
    if (data.data) {
      return typeof data.data === 'string' ? (() => {
        try { return JSON.parse(data.data); } catch { return data.data; }
      })() : data.data;
    }
  }
  
  return data;
};

/**
 * Delete current user avatar (revert to default)
 * Endpoint: DELETE /v1/User/avatar/delete
 * Response format: { success: boolean, message: string, data: string, errors: string[] }
 * @returns {Promise}
 */
export const deleteCurrentUserAvatar = async () => {
  const response = await apiDelete('User/avatar/delete');
  
  // Handle Swagger response format
  if (response && typeof response === 'object') {
    if (response.success === false) {
      throw new Error(response.message || 'Failed to delete avatar');
    }
    
    return response;
  }
  
  return response;
};

