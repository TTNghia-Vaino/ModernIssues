// Cart API Service

import { apiGet, apiPost, apiPut, apiDelete } from './api';

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
    throw new Error(response.message || 'Request failed');
  }
  
  // If data is string, try to parse
  if (response.data && typeof response.data === 'string') {
    try {
      return JSON.parse(response.data);
    } catch (e) {
      console.warn('[CartService] Failed to parse response.data as JSON:', e);
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
 * Get current user's cart
 * Response format: { success: boolean, message: string, data: object|string, errors: string[] }
 * @returns {Promise} - Cart data with items
 */
export const getCart = async () => {
  const response = await apiGet('Cart');
  return handleResponse(response);
};

/**
 * Get cart summary (total amount, item count)
 * Response format: { success: boolean, message: string, data: object|string, errors: string[] }
 * @returns {Promise} - { totalAmount, itemCount }
 */
export const getCartSummary = async () => {
  const response = await apiGet('Cart/summary');
  return handleResponse(response);
};

/**
 * Add product to cart
 * Response format: { success: boolean, message: string, data: object|string, errors: string[] }
 * @param {object} itemData - { productId, quantity, capacity? }
 * @returns {Promise} - Updated cart
 */
export const addToCart = async (itemData) => {
  const response = await apiPost('Cart/add', itemData);
  return handleResponse(response);
};

/**
 * Update cart item quantity
 * Response format: { success: boolean, message: string, data: object|string, errors: string[] }
 * @param {string|number} cartId - Cart ID
 * @param {string|number} productId - Product ID
 * @param {object} data - { quantity }
 * @returns {Promise} - Updated cart
 */
export const updateCartItem = async (cartId, productId, data) => {
  const response = await apiPut(`Cart/${cartId}/${productId}`, data);
  return handleResponse(response);
};

/**
 * Remove item from cart
 * Response format: { success: boolean, message: string, data: string, errors: string[] }
 * @param {string|number} cartId - Cart ID
 * @param {string|number} productId - Product ID
 * @returns {Promise}
 */
export const removeCartItem = async (cartId, productId) => {
  const response = await apiDelete(`Cart/${cartId}/${productId}`);
  return handleResponse(response);
};

/**
 * Clear all items from cart
 * Response format: { success: boolean, message: string, data: string, errors: string[] }
 * @returns {Promise}
 */
export const clearCart = async () => {
  const response = await apiDelete('Cart/clear');
  return handleResponse(response);
};

