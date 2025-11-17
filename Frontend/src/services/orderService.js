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
 * Endpoint: GET /v1/Order/GetOrders
 * Response format: { success: boolean, message: string, data: array|string, errors: string[] }
 * @param {object} params - Query parameters (optional: page, pageSize, status)
 * @returns {Promise} - List of orders
 */
export const getOrders = async (params = {}) => {
  try {
    const response = await apiGet('Order/GetOrders', params);
    const data = handleResponse(response);
    
    // Ensure we return an array
    if (Array.isArray(data)) {
      return data;
    } else if (data && typeof data === 'object' && Array.isArray(data.data)) {
      return data.data;
    } else if (data && typeof data === 'object' && Array.isArray(data.items)) {
      return data.items;
    } else if (data && typeof data === 'object' && Array.isArray(data.orders)) {
      return data.orders;
    }
    
    return Array.isArray(data) ? data : [];
  } catch (error) {
    console.error('[OrderService] Error getting orders:', error);
    throw error;
  }
};

/**
 * Get order by ID
 * Endpoint: GET /v1/Order/GetOrderById/{orderId}
 * Response format: { success: boolean, message: string, data: object|string, errors: string[] }
 * @param {string|number} orderId - Order ID
 * @returns {Promise} - Order data with order_details
 */
export const getOrderById = async (orderId) => {
  try {
    const response = await apiGet(`Order/GetOrderById/${orderId}`);
    return handleResponse(response);
  } catch (error) {
    console.error('[OrderService] Error getting order by ID:', error);
    throw error;
  }
};

/**
 * Get order details (products in an order)
 * Endpoint: GET /v1/Order/GetOrderById/{orderId}
 * Response format: { 
 *   order: { order_id, user_id, customer_name, phone, address, email, order_date, status, total_amount, types, types_display },
 *   order_details: [{ product_id, product_name, price_at_purchase, quantity, image_url }]
 * }
 * @param {string|number} orderId - Order ID
 * @returns {Promise} - Order details with products
 */
export const getOrderDetails = async (orderId) => {
  try {
    const response = await apiGet(`Order/GetOrderById/${orderId}`);
    const data = handleResponse(response);
    
    // API returns: { order: {...}, order_details: [...] }
    if (data && typeof data === 'object' && data.order && data.order_details) {
      return data;
    }
    
    // Fallback: if wrapped in data property
    if (data && typeof data === 'object' && data.data) {
      return data.data;
    }
    
    return data;
  } catch (error) {
    console.error('[OrderService] Error getting order details:', error);
    throw error;
  }
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
  try {
    const response = await apiPut(`Order/${orderId}/status`, { status });
    return handleResponse(response);
  } catch (error) {
    console.error('[OrderService] Error updating order status:', error);
    throw error;
  }
};

