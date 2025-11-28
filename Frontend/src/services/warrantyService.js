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

/**
 * Upload warranty images
 * Endpoint: POST /v1/Warranty/UploadImages
 * Content-Type: multipart/form-data
 * @param {File[]} imageFiles - Array of image files
 * @returns {Promise} - Array of uploaded image file names
 */
export const uploadWarrantyImages = async (imageFiles) => {
  if (!imageFiles || imageFiles.length === 0) {
    return [];
  }

  const formData = new FormData();
  // ASP.NET Core expects files parameter name to match the action parameter
  imageFiles.forEach((file) => {
    formData.append('files', file);
  });
  
  // Debug logging
  if (import.meta.env.DEV) {
    console.log('[WarrantyService.uploadWarrantyImages] Uploading', imageFiles.length, 'files');
    console.log('[WarrantyService.uploadWarrantyImages] FormData keys:', Array.from(formData.keys()));
  }

  const { getApiUrl, getDefaultHeaders } = await import('../config/api');
  const url = getApiUrl('Warranty/UploadImages');
  const headers = getDefaultHeaders();
  // Remove Content-Type header to let browser set it with boundary
  delete headers['Content-Type'];

  if (import.meta.env.DEV) {
    console.log('[WarrantyService.uploadWarrantyImages] POST to:', url);
    console.log('[WarrantyService.uploadWarrantyImages] Headers:', { ...headers, 'Content-Type': '(multipart/form-data - set by browser)' });
  }

  const response = await fetch(url, {
    method: 'POST',
    headers,
    body: formData
  });

  if (import.meta.env.DEV) {
    console.log('[WarrantyService.uploadWarrantyImages] Response status:', response.status, response.statusText);
  }

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({ message: `Request failed with status ${response.status}` }));
    if (import.meta.env.DEV) {
      console.error('[WarrantyService.uploadWarrantyImages] Error response:', errorData);
    }
    throw new Error(errorData.message || `HTTP error! status: ${response.status}`);
  }

  const result = await response.json();
  return handleResponse(result);
};

/**
 * Create warranty claim (user creates a warranty request)
 * Endpoint: POST /v1/Warranty/Claim
 * @param {object} claimData - Claim data { WarrantyId, Description, Notes, ImageUrls }
 * @param {File[]} imageFiles - Optional array of image files to upload
 * @returns {Promise} - Created warranty claim
 */
export const createWarrantyClaim = async (claimData, imageFiles = []) => {
  // If there are image files, upload them first
  if (imageFiles && imageFiles.length > 0) {
    try {
      const uploadedFileNames = await uploadWarrantyImages(imageFiles);
      // Build image URLs array from file names
      const { getBaseURL } = await import('../config/api');
      const baseURL = getBaseURL() || '';
      const imageUrls = uploadedFileNames.map(fileName => {
        // If using proxy, return relative path
        if (!baseURL || baseURL === '') {
          return `/Uploads/Images/${fileName}`;
        }
        return `${baseURL}/Uploads/Images/${fileName}`;
      });
      claimData.ImageUrls = JSON.stringify(imageUrls);
    } catch (err) {
      console.error('[WarrantyService] Error uploading images:', err);
      throw new Error(`Lỗi upload ảnh: ${err.message}`);
    }
  }

  const response = await apiPost('Warranty/Claim', claimData);
  return handleResponse(response);
};

/**
 * Get all warranty claims (admin)
 * Endpoint: GET /v1/Warranty/Claims
 * @param {object} params - Query parameters (page, limit, status, search)
 * @returns {Promise} - List of warranty claims with pagination
 */
export const getWarrantyClaims = async (params = {}) => {
  const { page = 1, limit = 10, status, search } = params;
  
  const queryParams = {
    page,
    limit,
  };
  
  if (status && status !== 'all') {
    queryParams.status = status;
  }
  
  if (search) {
    queryParams.search = search;
  }
  
  const response = await apiGet('Warranty/Claims', queryParams);
  return handleResponse(response);
};

/**
 * Get warranty claim by ID (admin)
 * Endpoint: GET /v1/Warranty/Claim/{detailId}
 * @param {number} detailId - Warranty detail ID
 * @returns {Promise} - Warranty claim details
 */
export const getWarrantyClaimById = async (detailId) => {
  const response = await apiGet(`Warranty/Claim/${detailId}`);
  return handleResponse(response);
};

/**
 * Update warranty status (admin workflow)
 * Endpoint: PUT /v1/Warranty/Status/{detailId}
 * @param {number} detailId - Warranty detail ID
 * @param {object} statusData - Status update data { Status, Notes, Solution, Cost }
 * @returns {Promise} - Updated warranty claim
 */
export const updateWarrantyStatus = async (detailId, statusData) => {
  const response = await apiPut(`Warranty/Status/${detailId}`, statusData);
  return handleResponse(response);
};

/**
 * Get warranty detail history (from history_json)
 * Endpoint: GET /v1/Warranty/History/{detailId}
 * @param {number} detailId - Warranty detail ID
 * @returns {Promise} - List of history entries
 */
export const getWarrantyDetailHistory = async (detailId) => {
  const response = await apiGet(`Warranty/History/${detailId}`);
  return handleResponse(response);
};

/**
 * Get my warranty claims (user's own claims)
 * Endpoint: GET /v1/Warranty/MyClaims
 * @returns {Promise} - List of warranty claims for current user
 */
export const getMyWarrantyClaims = async () => {
  const response = await apiGet('Warranty/MyClaims');
  return handleResponse(response);
};

