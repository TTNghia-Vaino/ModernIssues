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
 * Map frontend payment method to backend PaymentType
 * Frontend: 'vietqr', 'cod', 'transfer', 'atm'
 * Backend: 'Transfer', 'ATM', 'COD'
 */
const mapPaymentType = (paymentMethod) => {
  const mapping = {
    'vietqr': 'Transfer',  // Default to Transfer for QR payment
    'transfer': 'Transfer',
    'atm': 'ATM',
    'cod': 'COD'
  };
  return mapping[paymentMethod?.toLowerCase()] || 'COD';
};

/**
 * Checkout - Tạo đơn hàng từ giỏ hàng của user hiện tại
 * Endpoint: POST /v1/Checkout
 * Request: { paymentType: "Transfer" | "ATM" | "COD" }
 * Response format: { success: boolean, message: string, data: OrderDto, errors: string[] }
 * OrderDto includes: orderId, qrUrl, gencode, totalAmount, status, etc.
 * @param {object} checkoutData - Checkout data with paymentMethod or paymentType
 * @returns {Promise} - Created order data with QrUrl and Gencode (if Transfer/ATM)
 */
export const checkout = async (checkoutData) => {
  // Backend only needs PaymentType, not shipping info
  // Shipping info can be stored separately or in order notes
  const paymentType = checkoutData.paymentType || mapPaymentType(checkoutData.paymentMethod);
  
  const requestData = {
    paymentType: paymentType
  };
  
  console.log('[CheckoutService] Sending checkout request:', requestData);
  const response = await apiPost('Checkout', requestData);
  const orderData = handleResponse(response);
  
  console.log('[CheckoutService] Checkout response:', orderData);
  return orderData;
};

