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
 * @returns {Promise} - User data and token, or 2FA requirement { requires2FA: true, email, message, method }
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
  
  // Check if 2FA is required (check both response and data)
  const requires2FA = data?.requires2FA || response?.requires2FA;
  if (requires2FA) {
    // Return 2FA requirement without storing token
    return {
      requires2FA: true,
      email: data?.email || response?.email,
      message: data?.message || response?.message || 'Please enter your 2FA code to complete login.',
      method: data?.method || response?.method
    };
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
      throw new Error(response.message || 'Gửi mã OTP thất bại. Vui lòng thử lại.');
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
  try {
    const response = await apiPost('Auth/VerifyOtp', data);
    
    // Handle Swagger response format
    let result = response;
    if (response && typeof response === 'object') {
      // Check for errors
      if (response.success === false) {
        // Translate common OTP error messages to Vietnamese
        let errorMessage = response.message || 'Xác thực OTP thất bại. Vui lòng thử lại.';
        const errorLower = errorMessage.toLowerCase();
        if (errorLower.includes('otp is incorrect') || errorLower.includes('otp incorrect') || errorLower.includes('invalid otp')) {
          errorMessage = 'Mã xác thực không đúng. Vui lòng thử lại.';
        } else if (errorLower.includes('otp expired') || errorLower.includes('expired')) {
          errorMessage = 'Mã xác thực đã hết hạn. Vui lòng yêu cầu mã mới.';
        }
        throw new Error(errorMessage);
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
  } catch (error) {
    // Translate common OTP error messages to Vietnamese
    let errorMessage = error.message || 'Xác thực OTP thất bại. Vui lòng thử lại.';
    const errorLower = errorMessage.toLowerCase();
    if (errorLower.includes('otp is incorrect') || errorLower.includes('otp incorrect') || errorLower.includes('invalid otp')) {
      errorMessage = 'Mã xác thực không đúng. Vui lòng thử lại.';
    } else if (errorLower.includes('otp expired') || errorLower.includes('expired')) {
      errorMessage = 'Mã xác thực đã hết hạn. Vui lòng yêu cầu mã mới.';
    } else if (errorLower.includes('otp') && errorLower.includes('wrong')) {
      errorMessage = 'Mã xác thực không đúng. Vui lòng thử lại.';
    }
    
    // Create new error with translated message
    const translatedError = new Error(errorMessage);
    translatedError.data = error.data;
    translatedError.status = error.status;
    throw translatedError;
  }
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

