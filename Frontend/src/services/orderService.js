// Order API Service

import { apiGet, apiPost, apiPut } from './api';

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
      console.warn('[OrderService] Failed to parse response.data as JSON:', e);
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
 * Get list of orders
 * Response format: { success: boolean, message: string, data: array|string, errors: string[] }
 * @param {object} params - Query parameters (optional)
 * @returns {Promise} - List of orders
 */
export const getOrders = async (params = {}) => {
  const response = await apiGet('Order/GetOrders', params);
  return handleResponse(response);
};

/**
 * Get order by ID
 * Response format: { success: boolean, message: string, data: object|string, errors: string[] }
 * @param {string|number} orderId - Order ID
 * @returns {Promise} - Order data with order_details
 */
export const getOrderById = async (orderId) => {
  const response = await apiGet(`Order/GetOrderById/${orderId}`);
  return handleResponse(response);
};

/**
 * Get order details (products in an order)
 * Response format: { 
 *   order: { order_id, order_date, status, total_amount, created_at, updated_at },
 *   order_details: [{ product_id, product_name, price_at_purchase, quantity, image_url }]
 * }
 * @param {string|number} orderId - Order ID
 * @returns {Promise} - Order details with products
 */
export const getOrderDetails = async (orderId) => {
  const response = await apiGet(`Order/GetOrderById/${orderId}`);
  return handleResponse(response);
};

/**
 * Create new order
 * Note: This endpoint might not exist in the API, but we'll create it for consistency
 * Response format: { success: boolean, message: string, data: object|string, errors: string[] }
 * @param {object} orderData - Order data
 * @returns {Promise} - Created order data
 */
export const createOrder = async (orderData) => {
  // If the API doesn't have CreateOrder endpoint, you might need to use Checkout endpoint
  // Adjust the endpoint name based on your actual API
  const response = await apiPost('Order/CreateOrder', orderData);
  return handleResponse(response);
};

/**
 * Update order status
 * Endpoint: PUT /v1/Order/{orderId}/status
 * Response format: { success: boolean, message: string, data: object|string, errors: string[] }
 * @param {string|number} orderId - Order ID
 * @param {string} status - New status (pending, processing, delivered, cancelled)
 * @returns {Promise} - Updated order data
 */
export const updateOrderStatus = async (orderId, status) => {
  const response = await apiPut(`Order/${orderId}/status`, { status });
  return handleResponse(response);
};

