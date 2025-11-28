// Warranty API Service

import { apiGet, apiPost, apiPut, apiPatch, apiDelete } from './api';

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
      console.warn('[WarrantyService] Failed to parse response.data as JSON:', e);
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
 * Get list of warranties with pagination
 * Endpoint: GET /v1/Warranty/GetAllWarranties
 * Response format: { success: boolean, message: string, data: { totalCount, currentPage, limit, data: [] }, errors: string[] }
 * @param {object} params - Query parameters (page, limit, status)
 * @returns {Promise} - List of warranties with pagination info
 */
export const listWarranties = async (params = {}) => {
  const { page = 1, limit = 10, status } = params;
  
  const queryParams = {
    page,
    limit,
  };
  
  if (status && status !== 'all') {
    queryParams.status = status;
  }
  
  const response = await apiGet('Warranty/GetAllWarranties', queryParams);
  return handleResponse(response);
};

/**
 * Get warranty by ID
 * Endpoint: GET /v1/Warranty/{id}
 * Response format: { success: boolean, message: string, data: warranty object, errors: string[] }
 * @param {number} id - Warranty ID
 * @returns {Promise} - Warranty object
 */
export const getWarrantyById = async (id) => {
  const response = await apiGet(`Warranty/${id}`);
  return handleResponse(response);
};

/**
 * Create new warranty
 * Endpoint: POST /v1/Warranty
 * Content-Type: multipart/form-data (if imageFiles provided) or application/json
 * @param {object} warrantyData - Warranty data
 * @param {File[]} imageFiles - Array of image files (optional)
 * @returns {Promise} - Created warranty
 */
export const createWarranty = async (warrantyData, imageFiles = []) => {
  // If there are image files, use FormData
  if (imageFiles && imageFiles.length > 0) {
    const formData = new FormData();
    
    // Append warranty data fields
    Object.keys(warrantyData).forEach(key => {
      if (warrantyData[key] !== null && warrantyData[key] !== undefined) {
        // Handle arrays (convert to JSON string if needed)
        if (Array.isArray(warrantyData[key])) {
          formData.append(key, JSON.stringify(warrantyData[key]));
        } else {
          formData.append(key, warrantyData[key]);
        }
      }
    });
    
    // Append image files
    imageFiles.forEach((file, index) => {
      formData.append('imageFiles', file); // Backend might expect 'imageFiles' or 'productImageUrl'
      // Or append with index if backend expects specific naming
      // formData.append(`imageFiles[${index}]`, file);
    });
    
    // Use custom fetch for FormData
    const { getApiUrl, getDefaultHeaders } = await import('../config/api');
    const url = getApiUrl('Warranty/CreateWarranty');
    const headers = getDefaultHeaders();
    // Remove Content-Type header to let browser set it with boundary
    delete headers['Content-Type'];
    
    const response = await fetch(url, {
      method: 'POST',
      headers,
      body: formData
    });
    
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ message: 'Request failed' }));
      throw new Error(errorData.message || `HTTP error! status: ${response.status}`);
    }
    
    const result = await response.json();
    return handleResponse(result);
  } else {
    // No files, use regular JSON POST
    const response = await apiPost('Warranty/CreateWarranty', warrantyData);
    return handleResponse(response);
  }
};

/**
 * Update warranty
 * Endpoint: PUT /v1/Warranty/{id} or PATCH /v1/Warranty/{id}
 * Content-Type: multipart/form-data (if imageFiles provided) or application/json
 * @param {number} id - Warranty ID
 * @param {object} warrantyData - Updated warranty data
 * @param {File[]} imageFiles - Array of image files (optional)
 * @returns {Promise} - Updated warranty
 */
export const updateWarranty = async (id, warrantyData, imageFiles = []) => {
  // If there are image files, use FormData
  if (imageFiles && imageFiles.length > 0) {
    const formData = new FormData();
    
    // Append warranty data fields
    Object.keys(warrantyData).forEach(key => {
      if (warrantyData[key] !== null && warrantyData[key] !== undefined) {
        // Handle arrays (convert to JSON string if needed)
        if (Array.isArray(warrantyData[key])) {
          formData.append(key, JSON.stringify(warrantyData[key]));
        } else {
          formData.append(key, warrantyData[key]);
        }
      }
    });
    
    // Append image files
    imageFiles.forEach((file, index) => {
      formData.append('imageFiles', file);
    });
    
    // Use custom fetch for FormData
    const { getApiUrl, getDefaultHeaders } = await import('../config/api');
    const url = getApiUrl(`Warranty/UpdateWarranty/${id}`);
    const headers = getDefaultHeaders();
    // Remove Content-Type header to let browser set it with boundary
    delete headers['Content-Type'];
    
    const response = await fetch(url, {
      method: 'PUT',
      headers,
      body: formData
    });
    
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ message: 'Request failed' }));
      throw new Error(errorData.message || `HTTP error! status: ${response.status}`);
    }
    
    const result = await response.json();
    return handleResponse(result);
  } else {
    // No files, use regular JSON PUT
    const response = await apiPut(`Warranty/UpdateWarranty/${id}`, warrantyData);
    return handleResponse(response);
  }
};

/**
 * Delete warranty
 * Endpoint: DELETE /v1/Warranty/{id}
 * @param {number} id - Warranty ID
 * @returns {Promise} - Deletion result
 */
export const deleteWarranty = async (id) => {
  const response = await apiDelete(`Warranty/${id}`);
  return handleResponse(response);
};

/**
 * Get my warranties (current user)
 * Endpoint: GET /v1/Warranty/GetMyWarranties
 * Response format: { success: boolean, message: string, data: [], errors: string[] }
 * @returns {Promise} - List of warranties for current user
 */
export const getMyWarranties = async () => {
  const response = await apiGet('Warranty/GetMyWarranties');
  return handleResponse(response);
};

