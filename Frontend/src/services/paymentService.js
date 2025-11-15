// Payment API Service

import { apiGet } from './api';
import { getApiUrl, getDefaultHeaders, getBaseURL } from '../config/api';

/**
 * Handle Swagger response format: { success, message, data, errors }
 * @param {object} response - API response
 * @returns {Promise} - Parsed data
 */
const handleResponse = (response) => {
  console.log('[PaymentService.handleResponse] Input response type:', typeof response);
  console.log('[PaymentService.handleResponse] Input response keys:', response && typeof response === 'object' ? Object.keys(response) : 'N/A');
  console.log('[PaymentService.handleResponse] Input response:', response);
  
  // If response is null/undefined or not an object, return as is
  if (!response || typeof response !== 'object') {
    console.log('[PaymentService.handleResponse] Response is not an object, returning as is');
    return response;
  }
  
  // Check if it's an error object (has error properties)
  if (response.error || (response.name && response.message)) {
    console.log('[PaymentService.handleResponse] Response is an error object');
    // This is likely an error object, re-throw it
    throw response;
  }
  
  // Handle Swagger response format
  if (response.success === false) {
    console.log('[PaymentService.handleResponse] Response indicates failure');
    throw new Error(response.message || 'Generate QR failed');
  }
  
  // If data is string, try to parse
  if (response.data && typeof response.data === 'string') {
    console.log('[PaymentService.handleResponse] Response.data is string, attempting to parse');
    try {
      const parsed = JSON.parse(response.data);
      console.log('[PaymentService.handleResponse] Parsed response.data:', parsed);
      return parsed;
    } catch (e) {
      console.warn('[PaymentService] Failed to parse response.data as JSON:', e);
      return response.data;
    }
  }
  
  // Return data if available
  if (response.data !== undefined) {
    console.log('[PaymentService.handleResponse] Returning response.data:', response.data);
    return response.data;
  }
  
  // Fallback: return response as is (in case API returns QR code directly)
  console.log('[PaymentService.handleResponse] No data field found, returning response as is');
  return response;
};

/**
 * Generate QR code for payment
 * Endpoint: GET /GenerateQr?amount={amount}&gencode={gencode} (no v1 prefix)
 * @param {number} amount - Payment amount (required)
 * @param {string} gencode - Order code/gencode (required)
 * @returns {Promise} - QR code data (usually contains QR code URL or image data)
 */
export const generateQr = async (amount, gencode) => {
  // Ensure amount is a number and format it properly
  const numAmount = typeof amount === 'string' ? parseFloat(amount) : Number(amount);
  if (isNaN(numAmount) || numAmount <= 0) {
    throw new Error(`Invalid amount: ${amount}`);
  }
  
  // Ensure gencode is a string and not empty
  const strGencode = String(gencode || '').trim();
  if (!strGencode) {
    throw new Error(`Invalid gencode: ${gencode}`);
  }
  
  // Some APIs expect amount as integer (in smallest currency unit like VND cents)
  // But typically VND uses whole numbers, so we keep as is or round to integer
  const finalAmount = Math.round(numAmount);
  
  const params = {
    amount: finalAmount,
    gencode: strGencode
  };
  
  console.log('[PaymentService] Generating QR with params:', params);
  console.log('[PaymentService] Amount type:', typeof finalAmount, 'Value:', finalAmount);
  console.log('[PaymentService] Gencode type:', typeof strGencode, 'Value:', strGencode);
  
  // Helper function to fetch QR from an endpoint (without v1 prefix)
  const fetchQrFromEndpoint = async (endpoint) => {
    // This endpoint doesn't have v1 prefix, so use base URL directly
    const baseUrl = getBaseURL() || '';
    const cleanEndpoint = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
    const url = `${baseUrl}${cleanEndpoint}`;
    const queryString = new URLSearchParams(params).toString();
    const fullUrl = `${url}?${queryString}`;
    
    console.log(`[PaymentService] Fetching QR from: ${fullUrl}`);
    
    const response = await fetch(fullUrl, {
      method: 'GET',
      headers: getDefaultHeaders(),
    });
    
    console.log(`[PaymentService] Response status: ${response.status} ${response.statusText}`);
    
    const contentType = response.headers.get('content-type') || '';
    
    // If response is an image, convert to base64 data URL
    if (contentType.includes('image/')) {
      console.log('[PaymentService] Detected image response, converting to base64...');
      const blob = await response.blob();
      return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onloadend = () => {
          const base64data = reader.result;
          console.log('[PaymentService] QR code image received (base64)');
          resolve({ qrCode: base64data, imageUrl: base64data, base64: base64data, data: base64data });
        };
        reader.onerror = reject;
        reader.readAsDataURL(blob);
      });
    }
    
    // Otherwise, handle as JSON or text
    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`HTTP ${response.status}: ${errorText}`);
    }
    
    const text = await response.text();
    console.log('[PaymentService] Raw response text (first 500 chars):', text.substring(0, 500));
    console.log('[PaymentService] Response text length:', text.length);
    
    let data;
    try {
      data = JSON.parse(text);
      console.log('[PaymentService] Parsed JSON response type:', typeof data);
      console.log('[PaymentService] Parsed JSON response keys:', data && typeof data === 'object' ? Object.keys(data) : 'N/A');
      console.log('[PaymentService] Parsed JSON response:', data);
    } catch (parseError) {
      console.log('[PaymentService] Response is not JSON, treating as text/string');
      // If not JSON, might be base64 string or URL string
      if (text.startsWith('data:image/') || text.startsWith('http://') || text.startsWith('https://')) {
        return { qrCode: text, imageUrl: text, url: text, data: text };
      } else if (text.trim().length > 0) {
        return { qrCode: `data:image/png;base64,${text}`, imageUrl: `data:image/png;base64,${text}`, base64: text, data: text };
      } else {
        throw new Error('Empty response from QR API');
      }
    }
    
    const handledResponse = handleResponse(data);
    console.log('[PaymentService] Handled response type:', typeof handledResponse);
    console.log('[PaymentService] Handled response keys:', handledResponse && typeof handledResponse === 'object' ? Object.keys(handledResponse) : 'N/A');
    console.log('[PaymentService] Handled response:', handledResponse);
    
    // If handledResponse is an object with only one key, and that key's value might be the QR code
    // try to extract it
    if (handledResponse && typeof handledResponse === 'object') {
      const keys = Object.keys(handledResponse);
      console.log('[PaymentService] Checking for single-key response. Keys:', keys);
      
      // If there's only one key, check if its value is a string (likely QR code data)
      if (keys.length === 1) {
        const firstKey = keys[0];
        const firstValue = handledResponse[firstKey];
        console.log('[PaymentService] Single key found:', firstKey);
        console.log('[PaymentService] First value type:', typeof firstValue);
        console.log('[PaymentService] First value (first 200 chars):', typeof firstValue === 'string' ? firstValue.substring(0, 200) : firstValue);
        
        // If the value is a string (base64, URL, etc.), return it in a standardized format
        if (typeof firstValue === 'string') {
          let qrValue = firstValue;
          // If it doesn't have a prefix and looks like base64, add prefix
          if (!qrValue.startsWith('data:image/') && 
              !qrValue.startsWith('http://') && 
              !qrValue.startsWith('https://') && 
              qrValue.trim().length > 0) {
            qrValue = `data:image/png;base64,${qrValue}`;
          }
          console.log('[PaymentService] Extracted QR value from single-key response');
          return { 
            qrCode: qrValue, 
            imageUrl: qrValue, 
            url: qrValue, 
            data: qrValue,
            [firstKey]: qrValue  // Also include the original key
          };
        }
        // If the value is an object, check if it has QR-related fields
        else if (firstValue && typeof firstValue === 'object') {
          console.log('[PaymentService] First value is object, keys:', Object.keys(firstValue));
          // Recursively check for QR fields
          if (firstValue.qrCode || firstValue.imageUrl || firstValue.url || firstValue.data || firstValue.qrCodeUrl) {
            return firstValue;
          }
        }
      }
    }
    
    return handledResponse;
  };

  // Try endpoints in order: GenerateQr first (as shown in Swagger), then Payment/GenerateQr as fallback
  const endpoints = ['GenerateQr', 'Payment/GenerateQr'];
  
  for (const endpoint of endpoints) {
    try {
      console.log(`[PaymentService] Trying endpoint: ${endpoint}`);
      const result = await fetchQrFromEndpoint(endpoint);
      console.log(`[PaymentService] Success with endpoint: ${endpoint}`);
      return result;
    } catch (error) {
      console.warn(`[PaymentService] Failed with endpoint ${endpoint}:`, error.message);
      // Continue to next endpoint if this one fails
      if (endpoint !== endpoints[endpoints.length - 1]) {
        continue;
      }
      // If this is the last endpoint, throw the error
      throw error;
    }
  }
};

