// Checkout API Service

import { apiPost } from './api';

/**
 * Handle Swagger response format: { success, message, data, errors }
 * @param {object} response - API response
 * @returns {Promise} - Parsed data
 */
const handleResponse = (response) => {
  // If response is null/undefined or not an object, return as is
  if (!response || typeof response !== 'object') {
    return response;
  }
  
  // Check if it's an error object (has error properties)
  if (response.error || (response.name && response.message)) {
    // This is likely an error object, re-throw it
    throw response;
  }
  
  // Handle Swagger response format
  if (response.success === false) {
    throw new Error(response.message || 'Checkout failed');
  }
  
  // If data is string, try to parse
  if (response.data && typeof response.data === 'string') {
    try {
      return JSON.parse(response.data);
    } catch (e) {
      console.warn('[CheckoutService] Failed to parse response.data as JSON:', e);
      return response.data;
    }
  }
  
  // Return data if available
  if (response.data !== undefined) {
    return response.data;
  }
  
  // Fallback: return response as is
  return response;
};

/**
 * Checkout - Tạo đơn hàng từ giỏ hàng của user hiện tại
 * Endpoint: POST /v1/Checkout
 * Response format: { success: boolean, message: string, data: object|string, errors: string[] }
 * @param {object} checkoutData - Checkout data (shipping info, payment method)
 * @returns {Promise} - Created order data
 */
export const checkout = async (checkoutData) => {
  const response = await apiPost('Checkout', checkoutData);
  return handleResponse(response);
};

