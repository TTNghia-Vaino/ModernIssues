// Authentication API Service

import { apiPost } from './api';

/**
 * Register new user
 * Response format: { success: boolean, message: string, data: object|string, errors: string[] }
 * @param {object} userData - { username, email, password, phone?, address? }
 * @returns {Promise} - User data and token
 */
export const register = async (userData) => {
  // Ensure required fields are present and optional fields are only sent if provided
  const payload = {
    username: userData.username,
    email: userData.email,
    password: userData.password,
    ...(userData.phone && { phone: userData.phone }),
    ...(userData.address && { address: userData.address })
  };
  
  const response = await apiPost('Auth/Register', payload);
  
  // Handle Swagger response format
  if (response && typeof response === 'object') {
    if (response.success === false) {
      throw new Error(response.message || 'Registration failed');
    }
    
    // If data is string, try to parse
    if (response.data && typeof response.data === 'string') {
      try {
        return JSON.parse(response.data);
      } catch (e) {
        console.warn('[AuthService] Failed to parse response.data as JSON:', e);
        return response.data;
      }
    }
    
    // Return data if available
    if (response.data !== undefined) {
      return response.data;
    }
  }
  
  return response;
};

/**
 * Login user
 * Response format: { success: boolean, message: string, data: object|string, errors: string[] }
 * @param {object} credentials - { email, password }
 * @returns {Promise} - User data and token
 */
export const login = async (credentials) => {
  const response = await apiPost('Auth/Login', credentials);
  
  // Handle Swagger response format
  let data = response;
  if (response && typeof response === 'object') {
    // If response has Swagger format, extract data
    if (response.data !== undefined) {
      if (typeof response.data === 'string') {
        try {
          data = JSON.parse(response.data);
        } catch (e) {
          console.warn('[AuthService] Failed to parse response.data as JSON:', e);
          data = response.data;
        }
      } else {
        data = response.data;
      }
    }
    
    // Check for errors
    if (response.success === false) {
      throw new Error(response.message || 'Login failed');
    }
  }
  
  // Store token if provided (check both response and data)
  const token = data?.token || data?.accessToken || response?.token || response?.accessToken;
  if (token) {
    localStorage.setItem('auth_token', token);
    
    // Store refresh token if provided
    const refreshToken = data?.refreshToken || response?.refreshToken;
    if (refreshToken) {
      localStorage.setItem('refresh_token', refreshToken);
    }
  }
  
  return data || response;
};

/**
 * Logout user
 * @returns {Promise}
 */
export const logout = async () => {
  try {
    await apiPost('Auth/Logout');
  } finally {
    // Clear tokens regardless of API call success
    localStorage.removeItem('auth_token');
    localStorage.removeItem('refresh_token');
  }
};

/**
 * Forgot password - send OTP to email
 * Response format: { success: boolean, message: string, data: object|string, errors: string[] }
 * @param {object} data - { email }
 * @returns {Promise}
 */
export const forgotPassword = async (data) => {
  const response = await apiPost('Auth/ForgotPassword', data);
  
  // Handle Swagger response format
  if (response && typeof response === 'object') {
    if (response.success === false) {
      throw new Error(response.message || 'Failed to send OTP');
    }
    
    // If data is string, try to parse
    if (response.data && typeof response.data === 'string') {
      try {
        return JSON.parse(response.data);
      } catch (e) {
        console.warn('[AuthService] Failed to parse response.data as JSON:', e);
        return response.data;
      }
    }
    
    // Return data if available, otherwise return response
    return response.data !== undefined ? response.data : response;
  }
  
  return response;
};

/**
 * Verify OTP
 * Response format: { success: boolean, message: string, data: object|string, errors: string[] }
 * @param {object} data - { email, otp }
 * @returns {Promise} - Response containing tempToken
 */
export const verifyOtp = async (data) => {
  const response = await apiPost('Auth/VerifyOtp', data);
  
  // Handle Swagger response format
  let result = response;
  if (response && typeof response === 'object') {
    // Check for errors
    if (response.success === false) {
      throw new Error(response.message || 'OTP verification failed');
    }
    
    // If response has Swagger format, extract data
    if (response.data !== undefined) {
      if (typeof response.data === 'string') {
        try {
          result = JSON.parse(response.data);
        } catch (e) {
          console.warn('[AuthService] Failed to parse response.data as JSON:', e);
          result = response.data;
        }
      } else {
        result = response.data;
      }
    }
  }
  
  return result || response;
};

/**
 * Reset password
 * Response format: { success: boolean, message: string, data: object|string, errors: string[] }
 * @param {object} data - { tempToken, newPassword }
 * @returns {Promise}
 */
export const resetPassword = async (data) => {
  // Chỉ gửi tempToken và newPassword theo API spec
  const payload = {
    tempToken: data.tempToken,
    newPassword: data.newPassword
  };
  
  const response = await apiPost('Auth/ResetPassword', payload);
  
  // Handle Swagger response format
  if (response && typeof response === 'object') {
    if (response.success === false) {
      throw new Error(response.message || 'Password reset failed');
    }
    
    // If data is string, try to parse
    if (response.data && typeof response.data === 'string') {
      try {
        return JSON.parse(response.data);
      } catch (e) {
        console.warn('[AuthService] Failed to parse response.data as JSON:', e);
        return response.data;
      }
    }
    
    // Return data if available, otherwise return response
    return response.data !== undefined ? response.data : response;
  }
  
  return response;
};

