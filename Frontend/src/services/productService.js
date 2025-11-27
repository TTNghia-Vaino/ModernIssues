// Product API Service

import { apiGet, apiPost, apiPut, apiDelete } from './api';
import { getApiUrl } from '../config/api';

/**
 * Get all products list (Admin - includes disabled products)
 * Endpoint: GET /v1/Product/GetAllListProducts
 * Response format: { success: boolean, message: string, data: array|string, errors: string[] }
 * @returns {Promise} - List of all products (including disabled)
 */
export const getAllListProducts = async () => {
  try {
    const response = await apiGet('Product/GetAllListProducts');
    
    // Log response
    if (import.meta.env.DEV) {
      console.log('[ProductService.getAllListProducts] Response received:', response);
      console.log('[ProductService.getAllListProducts] Response type:', typeof response);
    }
    
    // Handle Swagger response format
    if (response && typeof response === 'object') {
      // Check for error
      if (response.success === false) {
        console.error('[ProductService.getAllListProducts] API returned error:', response.message, response.errors);
        throw new Error(response.message || 'Failed to get all products list');
      }
      
      // Handle nested pagination response: { data: { totalCount, currentPage, limit, data: [...] } }
      if (response.data && response.data.data && Array.isArray(response.data.data)) {
        return response.data.data;
      }
      
      // Handle pagination response: { data: { totalCount, currentPage, limit, data: [...] } }
      if (response.data && Array.isArray(response.data)) {
        return response.data;
      }
      
      // If data is string, try to parse
      if (response.data && typeof response.data === 'string') {
        try {
          const parsed = JSON.parse(response.data);
          return Array.isArray(parsed) ? parsed : parsed.data || parsed;
        } catch (e) {
          console.warn('[ProductService.getAllListProducts] Failed to parse response.data as JSON:', e);
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
  } catch (error) {
    console.error('[ProductService.getAllListProducts] Error:', error);
    throw error;
  }
};

/**
 * Get list of active products (only non-disabled)
 * Endpoint: POST /v1/Product/ListProducts
 * Query params: page (default: 1), limit (default: 10), categoryId (optional), search (optional)
 * Response format: { success: boolean, message: string, data: { totalCount, currentPage, limit, data: [...] }, errors: string[] }
 * @param {object} params - Query parameters { page, limit, categoryId, search }
 * @returns {Promise} - List of products with pagination info (only active/non-disabled products)
 */
export const listProducts = async (params = {}) => {
  // Build query string from params
  const queryParams = new URLSearchParams();
  if (params.page !== undefined) queryParams.append('page', params.page);
  if (params.limit !== undefined) queryParams.append('limit', params.limit);
  if (params.categoryId !== undefined) queryParams.append('categoryId', params.categoryId);
  if (params.search) queryParams.append('search', params.search);
  
  const queryString = queryParams.toString();
  const endpoint = queryString ? `Product/ListProducts?${queryString}` : 'Product/ListProducts';
  
  // Log request details
  if (import.meta.env.DEV) {
    console.log('[ProductService.listProducts] Request params:', params);
    console.log('[ProductService.listProducts] Endpoint:', endpoint);
    const fullUrl = getApiUrl(endpoint);
    console.log('[ProductService.listProducts] Full URL:', fullUrl);
  }
  
  try {
    const response = await apiPost(endpoint, {});
    
    // Log response
    if (import.meta.env.DEV) {
      console.log('[ProductService.listProducts] Response received:', response);
      console.log('[ProductService.listProducts] Response type:', typeof response);
      console.log('[ProductService.listProducts] Response keys:', response && typeof response === 'object' ? Object.keys(response) : 'N/A');
    }
    
    // Handle Swagger response format
    if (response && typeof response === 'object') {
      // Check for error
      if (response.success === false) {
        console.error('[ProductService.listProducts] API returned error:', response.message, response.errors);
        throw new Error(response.message || 'Failed to get products list');
      }
      
      // Return data if available, otherwise return full response
      if (response.data) {
        if (import.meta.env.DEV) {
          console.log('[ProductService.listProducts] Returning response.data:', response.data);
        }
        return response.data;
      } else {
        if (import.meta.env.DEV) {
          console.warn('[ProductService.listProducts] No response.data, returning full response');
        }
      }
    }
    
    return response;
  } catch (error) {
    console.error('[ProductService.listProducts] Error:', error);
    console.error('[ProductService.listProducts] Error details:', {
      message: error.message,
      status: error.status,
      data: error.data,
      stack: error.stack
    });
    throw error;
  }
};

/**
 * Get product by ID
 * Endpoint: GET /v1/Product/{id}
 * Response format: { success: boolean, message: string, data: {...}, errors: string[] }
 * @param {string|number} id - Product ID
 * @returns {Promise} - Product data
 */
export const getProductById = async (id) => {
  const response = await apiGet(`Product/${id}`);
  
  // Handle Swagger response format
  if (response && typeof response === 'object') {
    // Check for error
    if (response.success === false) {
      throw new Error(response.message || 'Product not found');
    }
    
    // Return data if available
    if (response.data && typeof response.data === 'object') {
      return response.data;
    }
    
    // If data is string, try to parse
    if (response.data && typeof response.data === 'string') {
      try {
        return JSON.parse(response.data);
      } catch (e) {
        console.warn('[ProductService] Failed to parse response.data as JSON:', e);
      }
    }
  }
  
  // Fallback: return response as is (for backward compatibility)
  return response;
};

/**
 * Get current user information
 * Endpoint: GET /v1/Product/CurrentUser
 * Response format: { success: boolean, message: string, data: string, errors: string[] }
 * @returns {Promise} - Current user data (parsed from response.data if it's JSON string)
 */
export const getCurrentUserInfo = async () => {
  const response = await apiGet('Product/CurrentUser');
  
  // Handle response format according to Swagger spec
  // Response structure: { success, message, data, errors }
  if (response && typeof response === 'object') {
    // If data is a JSON string, parse it
    if (response.data && typeof response.data === 'string') {
      try {
        const parsedData = JSON.parse(response.data);
        return {
          ...response,
          data: parsedData
        };
      } catch (e) {
        // If parsing fails, return as is
        console.warn('[ProductService] Failed to parse response.data as JSON:', e);
      }
    }
    
    // Return response with success check
    if (response.success === false) {
      throw new Error(response.message || 'Failed to get current user info');
    }
    
    return response;
  }
  
  // If response is not in expected format, return as is
  return response;
};

/**
 * Get current user's products (for admin/seller)
 * Note: This endpoint might actually return user info, not products
 * @returns {Promise} - User info or products data
 * @deprecated Consider using getCurrentUserInfo() if endpoint returns user info
 */
export const getCurrentUserProducts = async () => {
  // Try to get user info first
  try {
    const response = await getCurrentUserInfo();
    // If response has data property, return it
    if (response.data) {
      return response.data;
    }
    return response;
  } catch (error) {
    console.error('[ProductService] Error getting current user info:', error);
    throw error;
  }
};

/**
 * Create new product
 * Endpoint: POST /v1/Product/CreateProduct
 * Content-Type: multipart/form-data
 * Fields: productName, description, price, categoryId, stock, warrantyPeriod, imageFile (optional), currentImageUrl (optional)
 * Response format: { success: boolean, message: string, data: {...}, errors: string[] }
 * @param {object} productData - Product data { productName, description, price, categoryId, stock, warrantyPeriod, currentImageUrl? }
 * @param {File} imageFile - Product image file (optional)
 * @returns {Promise} - Created product data
 */
export const createProduct = async (productData, imageFile = null) => {
  const formData = new FormData();
  
  // Append required fields according to Swagger spec
  if (productData.productName) formData.append('productName', productData.productName);
  if (productData.description !== undefined) formData.append('description', productData.description);
  if (productData.price !== undefined) formData.append('price', productData.price);
  if (productData.categoryId !== undefined) formData.append('categoryId', productData.categoryId);
  if (productData.stock !== undefined) formData.append('stock', productData.stock);
  if (productData.warrantyPeriod !== undefined) formData.append('warrantyPeriod', productData.warrantyPeriod);
  
  // Optional fields
  if (productData.currentImageUrl) formData.append('currentImageUrl', productData.currentImageUrl);
  if (imageFile) formData.append('imageFile', imageFile);
  
  // Use custom fetch for FormData
  const { getApiUrl, getDefaultHeaders } = await import('../config/api');
  const url = getApiUrl('Product/CreateProduct');
  const headers = getDefaultHeaders();
  // Remove Content-Type header to let browser set it with boundary
  delete headers['Content-Type'];
  
  // Debug logging
  if (import.meta.env.DEV) {
    console.log('[ProductService.createProduct] Request URL:', url);
    console.log('[ProductService.createProduct] Request Method: POST');
    console.log('[ProductService.createProduct] Request Headers:', headers);
    console.log('[ProductService.createProduct] Product Data:', productData);
    console.log('[ProductService.createProduct] Has Image File:', !!imageFile);
    
    // Log FormData contents (can't serialize FormData, but log what we appended)
    const formDataLog = {};
    formData.forEach((value, key) => {
      if (value instanceof File) {
        formDataLog[key] = `File: ${value.name} (${value.size} bytes)`;
      } else {
        formDataLog[key] = value;
      }
    });
    console.log('[ProductService.createProduct] FormData Contents:', formDataLog);
  }
  
  const response = await fetch(url, {
    method: 'POST',
    headers,
    body: formData
  });
  
  if (import.meta.env.DEV) {
    console.log('[ProductService.createProduct] Response Status:', response.status, response.statusText);
    console.log('[ProductService.createProduct] Response Headers:', Object.fromEntries(response.headers.entries()));
  }
  
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
  
  if (import.meta.env.DEV) {
    console.log('[ProductService.createProduct] Response Data:', data);
  }
  
  if (!response.ok) {
    const error = new Error(data.message || `HTTP error! status: ${response.status}`);
    error.status = response.status;
    error.data = data;
    if (import.meta.env.DEV) {
      console.error('[ProductService.createProduct] ❌ API Error Response:', {
        status: response.status,
        statusText: response.statusText,
        data: data
      });
    }
    throw error;
  }
  
  // Handle Swagger response format
  if (data && typeof data === 'object') {
    if (data.success === false) {
      if (import.meta.env.DEV) {
        console.error('[ProductService.createProduct] ❌ API returned success: false', data);
      }
      throw new Error(data.message || 'Failed to create product');
    }
    
    // Return data if available
    if (data.data && typeof data.data === 'object') {
      if (import.meta.env.DEV) {
        console.log('[ProductService.createProduct] ✅ Product created successfully:', data.data);
      }
      return data.data;
    }
    
    // If data is string, try to parse
    if (data.data && typeof data.data === 'string') {
      try {
        const parsed = JSON.parse(data.data);
        if (import.meta.env.DEV) {
          console.log('[ProductService.createProduct] ✅ Product created successfully (parsed):', parsed);
        }
        return parsed;
      } catch (e) {
        console.warn('[ProductService] Failed to parse response.data as JSON:', e);
      }
    }
    
    // If response itself is the product data
    if (import.meta.env.DEV) {
      console.log('[ProductService.createProduct] ✅ Product created successfully (direct response):', data);
    }
    return data;
  }
  
  if (import.meta.env.DEV) {
    console.log('[ProductService.createProduct] ✅ Returning response as-is:', data);
  }
  return data;
};

/**
 * Update product
 * Endpoint: PUT /v1/Product/{id}
 * Content-Type: multipart/form-data
 * Fields: productName, description, price, categoryId, stock, warrantyPeriod, imageFile (optional), currentImageUrl (optional)
 * Response format: { success: boolean, message: string, data: {...}, errors: string[] }
 * @param {string|number} id - Product ID
 * @param {object} productData - Updated product data { productName, description, price, categoryId, stock, warrantyPeriod, currentImageUrl? }
 * @param {File} imageFile - New product image file (optional)
 * @returns {Promise} - Updated product data
 */
export const updateProduct = async (id, productData, imageFile = null) => {
  const formData = new FormData();
  
  // Append fields according to Swagger spec
  if (productData.productName) formData.append('productName', productData.productName);
  if (productData.description !== undefined) formData.append('description', productData.description);
  if (productData.price !== undefined) formData.append('price', productData.price);
  if (productData.categoryId !== undefined) formData.append('categoryId', productData.categoryId);
  if (productData.stock !== undefined) formData.append('stock', productData.stock);
  if (productData.warrantyPeriod !== undefined) formData.append('warrantyPeriod', productData.warrantyPeriod);
  
  // Optional fields
  if (productData.isDisabled !== undefined) {
    // Convert boolean to string for FormData (API expects string "true" or "false")
    formData.append('isDisabled', String(productData.isDisabled));
  }
  if (productData.currentImageUrl) formData.append('currentImageUrl', productData.currentImageUrl);
  if (imageFile) formData.append('imageFile', imageFile);
  
  // Debug logging for isDisabled
  if (import.meta.env.DEV && productData.isDisabled !== undefined) {
    console.log('[ProductService.updateProduct] isDisabled value:', productData.isDisabled, 'as string:', String(productData.isDisabled));
  }
  
  // Use custom fetch for FormData
  const { getApiUrl, getDefaultHeaders } = await import('../config/api');
  const url = getApiUrl(`Product/${id}`);
  const headers = getDefaultHeaders();
  // Remove Content-Type header to let browser set it with boundary
  delete headers['Content-Type'];
  
  // Debug logging
  if (import.meta.env.DEV) {
    console.log('[ProductService.updateProduct] Request URL:', url);
    console.log('[ProductService.updateProduct] Request Method: PUT');
    console.log('[ProductService.updateProduct] Product Data:', productData);
    console.log('[ProductService.updateProduct] Has Image File:', !!imageFile);
    
    // Log FormData contents
    const formDataLog = {};
    formData.forEach((value, key) => {
      if (value instanceof File) {
        formDataLog[key] = `File: ${value.name} (${value.size} bytes)`;
      } else {
        formDataLog[key] = value;
      }
    });
    console.log('[ProductService.updateProduct] FormData Contents:', formDataLog);
  }
  
  const response = await fetch(url, {
    method: 'PUT',
    headers,
    body: formData
  });
  
  if (import.meta.env.DEV) {
    console.log('[ProductService.updateProduct] Response Status:', response.status, response.statusText);
  }
  
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
      throw new Error(data.message || 'Failed to update product');
    }
    
    // Return data if available
    if (data.data && typeof data.data === 'object') {
      return data.data;
    }
    
    // If data is string, try to parse
    if (data.data && typeof data.data === 'string') {
      try {
        return JSON.parse(data.data);
      } catch (e) {
        console.warn('[ProductService] Failed to parse response.data as JSON:', e);
      }
    }
  }
  
  return data;
};

/**
 * Delete (soft delete) product
 * Endpoint: DELETE /v1/Product/{id}
 * Vô hiệu hóa (Soft Delete) một sản phẩm theo ProductId. Chỉ dành cho Admin.
 * Thực hiện cập nhật cột 'is_disabled' thành TRUE thay vì xóa vật lý khỏi cơ sở dữ liệu.
 * Response format: { success: boolean, message: string, data: null, errors: null }
 * @param {string|number} id - Product ID
 * @returns {Promise} - Response data
 */
export const deleteProduct = async (id) => {
  if (import.meta.env.DEV) {
    console.log('[ProductService.deleteProduct] Soft deleting product:', id);
  }
  
  const response = await apiDelete(`Product/${id}`);
  
  if (import.meta.env.DEV) {
    console.log('[ProductService.deleteProduct] Response received:', response);
  }
  
  // Handle Swagger response format
  if (response && typeof response === 'object') {
    if (response.success === false) {
      const error = new Error(response.message || 'Failed to delete product');
      if (import.meta.env.DEV) {
        console.error('[ProductService.deleteProduct] ❌ API returned success: false', response);
      }
      throw error;
    }
    
    if (import.meta.env.DEV) {
      console.log('[ProductService.deleteProduct] ✅ Product soft deleted successfully:', response.message);
    }
    
    return response;
  }
  
  return response;
};

/**
 * Get product count by category
 * Endpoint: GET /v1/Product/GetProductCountByCategory
 * Response format: { success: boolean, message: string, data: [{ category_id, category_name, product_count }], errors: string[] }
 * @returns {Promise} - Array of category product counts
 */
export const getProductCountByCategory = async () => {
  try {
    const response = await apiGet('Product/GetProductCountByCategory');
    
    if (import.meta.env.DEV) {
      console.log('[ProductService.getProductCountByCategory] Response received:', response);
    }
    
    // Handle Swagger response format
    if (response && typeof response === 'object') {
      // Check for error
      if (response.success === false) {
        console.error('[ProductService.getProductCountByCategory] API returned error:', response.message, response.errors);
        throw new Error(response.message || 'Failed to get product count by category');
      }
      
      // Return data if available
      if (response.data && Array.isArray(response.data)) {
        return response.data;
      }
      
      // If data is string, try to parse
      if (response.data && typeof response.data === 'string') {
        try {
          const parsed = JSON.parse(response.data);
          return Array.isArray(parsed) ? parsed : [];
        } catch (e) {
          console.warn('[ProductService.getProductCountByCategory] Failed to parse response.data as JSON:', e);
          return [];
        }
      }
    }
    
    // Fallback: return empty array
    return Array.isArray(response) ? response : [];
  } catch (error) {
    console.error('[ProductService.getProductCountByCategory] Error:', error);
    throw error;
  }
};

/**
 * Get best selling products
 * Endpoint: GET /v1/Product/GetBestSellingProducts
 * Query params: limit (optional), period (optional), startDate (optional), endDate (optional)
 * @param {object} params - Query parameters { limit, period, startDate, endDate }
 * @returns {Promise} - Best selling products data
 */
export const getBestSellingProducts = async (params = {}) => {
  try {
    const queryParams = new URLSearchParams();
    if (params.limit) queryParams.append('limit', params.limit);
    if (params.period) queryParams.append('period', params.period);
    if (params.startDate) queryParams.append('startDate', params.startDate);
    if (params.endDate) queryParams.append('endDate', params.endDate);
    
    const queryString = queryParams.toString();
    const endpoint = queryString ? `Product/GetBestSellingProducts?${queryString}` : 'Product/GetBestSellingProducts';
    
    const response = await apiGet(endpoint);
    
    if (import.meta.env.DEV) {
      console.log('[ProductService.getBestSellingProducts] Response received:', response);
    }
    
    const data = handleResponse(response);
    
    // Extract data array if nested
    if (data && typeof data === 'object' && Array.isArray(data.data)) {
      return data.data;
    } else if (Array.isArray(data)) {
      return data;
    }
    
    return data || [];
  } catch (error) {
    console.error('[ProductService.getBestSellingProducts] Error:', error);
    throw error;
  }
};

export const getProductReport = async (params = {}) => {
  try {
    const queryParams = {};
    if (params.period) queryParams.period = params.period;
    if (params.startDate) queryParams.startDate = params.startDate;
    if (params.endDate) queryParams.endDate = params.endDate;
    
    const response = await apiGet('Product/GetProductReport', queryParams);
    
    if (import.meta.env.DEV) {
      console.log('[ProductService.getProductReport] Response received:', response);
    }
    
    // Handle Swagger response format
    if (response && typeof response === 'object') {
      if (response.success === false) {
        console.error('[ProductService.getProductReport] API returned error:', response.message, response.errors);
        throw new Error(response.message || 'Failed to get product report');
      }
      
      // Response structure: { periodType, totalCount, data: [...] }
      if (response.data && typeof response.data === 'object' && Array.isArray(response.data.data)) {
        return response.data.data;
      }
      
      // If data is string, try to parse
      if (response.data && typeof response.data === 'string') {
        try {
          const parsed = JSON.parse(response.data);
          if (parsed && typeof parsed === 'object' && Array.isArray(parsed.data)) {
            return parsed.data;
          }
          return Array.isArray(parsed) ? parsed : [];
        } catch (e) {
          console.warn('[ProductService.getProductReport] Failed to parse response.data as JSON:', e);
          return [];
        }
      }
      
      // Fallback: if data is directly an array
      if (response.data && Array.isArray(response.data)) {
        return response.data;
      }
    }
    
    return [];
  } catch (error) {
    console.error('[ProductService.getProductReport] Error:', error);
    throw error;
  }
};

/**
 * Update vector by product ID
 * Endpoint: POST /update-vector-by-product-id
 * Request body: { product_id: number }
 * Response: string (success message)
 * 
 * This endpoint updates the vector embedding for a product, typically used for
 * search/recommendation systems. The vector is regenerated based on the product's
 * current information (name, description, etc.)
 * 
 * @param {string|number} productId - Product ID to update vector for
 * @returns {Promise<string>} - Success message from API
 */
export const updateVectorByProductId = async (productId) => {
  // Get base URL helper for root-level endpoints
  const { getBaseURL, getDefaultHeaders } = await import('../config/api');
  const baseURL = getBaseURL();
  
  // Construct URL - endpoint is at root level, not under /v1
  // In dev: use proxy (empty baseURL means relative path)
  // In prod: use full URL
  const url = baseURL 
    ? `${baseURL}/update-vector-by-product-id`
    : '/update-vector-by-product-id';
  
  if (import.meta.env.DEV) {
    console.log('[ProductService.updateVectorByProductId] Sending request to:', url);
    console.log('[ProductService.updateVectorByProductId] Product ID:', productId);
  }

  try {
    const headers = getDefaultHeaders();
    const response = await fetch(url, {
      method: 'POST',
      headers,
      credentials: 'include',
      body: JSON.stringify({
        product_id: Number(productId)
      })
    });

    // Handle response - API returns string directly according to Swagger docs
    if (!response.ok) {
      const errorText = await response.text();
      let errorMessage = `HTTP error! status: ${response.status}`;
      
      try {
        const errorJson = JSON.parse(errorText);
        // Handle FastAPI validation error format
        if (errorJson.detail) {
          if (Array.isArray(errorJson.detail)) {
            errorMessage = errorJson.detail.map(d => d.msg || d.message || JSON.stringify(d)).join(', ');
          } else {
            errorMessage = errorJson.detail.msg || errorJson.detail.message || errorJson.detail;
          }
        } else {
          errorMessage = errorJson.message || errorMessage;
        }
      } catch {
        errorMessage = errorText || errorMessage;
      }
      
      const error = new Error(errorMessage);
      error.status = response.status;
      throw error;
    }

    // API returns string directly according to Swagger docs
    const responseText = await response.text();
    
    if (import.meta.env.DEV) {
      console.log('[ProductService.updateVectorByProductId] ✅ Success:', responseText);
    }
    
    // Return the response text (success message)
    return responseText || 'Vector updated successfully';

  } catch (error) {
    console.error('[ProductService.updateVectorByProductId] Error:', error);
    
    // Provide user-friendly error messages
    if (error.name === 'TypeError' && error.message.includes('fetch')) {
      throw new Error('Không thể kết nối đến server. Vui lòng kiểm tra kết nối mạng.');
    }
    
    if (error.status === 422) {
      throw new Error('Dữ liệu không hợp lệ. Vui lòng kiểm tra product ID.');
    }
    
    if (error.status === 404) {
      throw new Error('Không tìm thấy sản phẩm với ID này.');
    }
    
    if (error.status === 500) {
      throw new Error('Lỗi server khi cập nhật vector. Vui lòng thử lại sau.');
    }
    
    throw error;
  }
};

