// Promotion API Service

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
      console.warn('[PromotionService] Failed to parse response.data as JSON:', e);
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
 * Map API response format to UI format
 * @param {object} apiPromotion - Promotion from API
 * @returns {object} - Mapped promotion for UI
 */
const mapApiToUi = (apiPromotion) => {
  if (!apiPromotion) return null;
  
  // Map status from API to UI format (Vietnamese status strings)
  let status = 'inactive';
  const statusStr = apiPromotion.status || '';
  if (statusStr === 'Đang hoạt động' || statusStr.toLowerCase().includes('đang hoạt động')) {
    status = 'active';
  } else if (statusStr === 'Đã hết hạn' || statusStr.toLowerCase().includes('hết hạn')) {
    status = 'expired';
  } else if (statusStr === 'Chưa kích hoạt' || statusStr.toLowerCase().includes('chưa kích hoạt')) {
    status = 'inactive';
  } else if (apiPromotion.isActive === true) {
    status = 'active';
  } else if (apiPromotion.isActive === false) {
    status = 'inactive';
  }
  
  // Format dates from ISO to YYYY-MM-DD for input fields
  const formatDate = (dateString) => {
    if (!dateString) return '';
    try {
      const date = new Date(dateString);
      if (isNaN(date.getTime())) return dateString;
      return date.toISOString().split('T')[0];
    } catch (e) {
      return dateString;
    }
  };
  
  // Format dates for display (keep ISO or format nicely)
  const formatDateDisplay = (dateString) => {
    if (!dateString) return '';
    try {
      const date = new Date(dateString);
      if (isNaN(date.getTime())) return dateString;
      // Return formatted date for display
      return date.toLocaleString('vi-VN', { 
        year: 'numeric', 
        month: '2-digit', 
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch (e) {
      return dateString;
    }
  };
  
  // Extract product IDs from products array or use productIds field
  let productIds = [];
  let products = [];
  
  if (apiPromotion.products && Array.isArray(apiPromotion.products)) {
    // Products can be array of objects or array of IDs
    products = apiPromotion.products;
    productIds = apiPromotion.products.map(p => 
      typeof p === 'object' ? (p.productId || p.id) : p
    ).filter(id => id !== undefined && id !== null);
  } else if (apiPromotion.productIds && Array.isArray(apiPromotion.productIds)) {
    productIds = apiPromotion.productIds;
    products = apiPromotion.productIds;
  }
  
  return {
    id: apiPromotion.promotionId,
    promotionId: apiPromotion.promotionId,
    name: apiPromotion.promotionName || apiPromotion.name || '',
    description: apiPromotion.description || '',
    discountPercent: apiPromotion.discountValue || apiPromotion.discountPercent || 0,
    discountValue: apiPromotion.discountValue || apiPromotion.discountPercent || 0,
    // Backend uses "fixed_amount", normalize to "fixed" for UI
    discountType: apiPromotion.discountType === 'fixed_amount' ? 'fixed' : (apiPromotion.discountType || 'percentage'),
    discountDisplay: apiPromotion.discountDisplay || (
      (apiPromotion.discountType === 'fixed_amount' || apiPromotion.discountType === 'fixed')
        ? new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(apiPromotion.discountValue || 0)
        : `${Math.round(apiPromotion.discountValue || 0)}%`
    ),
    startDate: formatDate(apiPromotion.startDate),
    endDate: formatDate(apiPromotion.endDate),
    startDateDisplay: formatDateDisplay(apiPromotion.startDate),
    endDateDisplay: formatDateDisplay(apiPromotion.endDate),
    status: status,
    isActive: apiPromotion.isActive !== undefined ? apiPromotion.isActive : (status === 'active'),
    products: products, // Full product objects for detail view
    productIds: productIds, // Array of product IDs for form
    productCount: apiPromotion.productCount !== undefined ? apiPromotion.productCount : productIds.length,
    banner: apiPromotion.bannerUrl || apiPromotion.banner || null,
    bannerUrl: apiPromotion.bannerUrl || apiPromotion.banner || null,
    categoryIds: apiPromotion.categoryIds || null,
    local: apiPromotion.local || apiPromotion.Local || 'hero',
    createdAt: apiPromotion.createdAt,
    updatedAt: apiPromotion.updatedAt,
    // Keep original data for reference
    _apiData: apiPromotion
  };
};

/**
 * Map UI format to API format
 * @param {object} uiPromotion - Promotion from UI
 * @returns {object} - Mapped promotion for API
 */
const mapUiToApi = (uiPromotion) => {
  if (!uiPromotion) return null;
  
  // Map status from UI to API format
  let isActive = false;
  if (uiPromotion.status === 'active') {
    isActive = true;
  } else if (uiPromotion.status === 'inactive') {
    isActive = false;
  } else {
    isActive = uiPromotion.isActive !== undefined ? uiPromotion.isActive : false;
  }
  
  // Extract product IDs - handle both array of IDs and array of objects
  let productIds = [];
  if (uiPromotion.products && Array.isArray(uiPromotion.products)) {
    productIds = uiPromotion.products.map(p => 
      typeof p === 'object' ? (p.productId || p.id) : p
    ).filter(id => id !== undefined && id !== null);
  } else if (uiPromotion.productIds && Array.isArray(uiPromotion.productIds)) {
    productIds = uiPromotion.productIds;
  }
  
  // Format dates - backend may expect YYYY-MM-DD format or ISO format
  // Try to keep YYYY-MM-DD format if that's what we have, otherwise convert to ISO
  const formatDateForApi = (dateString) => {
    if (!dateString) return '';
    
    // If already in YYYY-MM-DD format, return as is
    if (/^\d{4}-\d{2}-\d{2}$/.test(dateString)) {
      return dateString;
    }
    
    // If already ISO format, extract YYYY-MM-DD part
    if (dateString.includes('T') || dateString.includes('Z')) {
      try {
        const date = new Date(dateString);
        if (!isNaN(date.getTime())) {
          // Return YYYY-MM-DD format
          const year = date.getFullYear();
          const month = String(date.getMonth() + 1).padStart(2, '0');
          const day = String(date.getDate()).padStart(2, '0');
          return `${year}-${month}-${day}`;
        }
      } catch (e) {
        // Return as is if parsing fails
      }
    }
    
    // Try to parse and format as YYYY-MM-DD
    try {
      const date = new Date(dateString);
      if (!isNaN(date.getTime())) {
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
      }
    } catch (e) {
      // Return as is if parsing fails
    }
    
    return dateString;
  };
  
  // Ensure productIds are numbers
  const numericProductIds = productIds.map(id => {
    const numId = typeof id === 'number' ? id : parseInt(id, 10)
    return isNaN(numId) ? null : numId
  }).filter(id => id !== null && id !== undefined)
  
  // Determine discount value based on discountType
  // Backend uses "fixed_amount" not "fixed"
  const discountType = uiPromotion.discountType || 'percentage';
  const discountValue = discountType === 'fixed_amount' || discountType === 'fixed'
    ? (uiPromotion.discountValue || uiPromotion.discountPercent || 0)
    : (uiPromotion.discountPercent || uiPromotion.discountValue || 0);
  
  // Normalize discountType to backend format
  const normalizedDiscountType = (discountType === 'fixed' || discountType === 'fixed_amount') 
    ? 'fixed_amount' 
    : 'percentage';
  
  // Backend expects field names with capital first letter for FormData
  // PromotionName, Description, DiscountType, DiscountValue, StartDate, EndDate, IsActive, CategoryIds, ProductIds, BannerFile
  // Handle CategoryIds - convert to array of numbers or empty array
  let categoryIds = [];
  if (uiPromotion.categoryIds) {
    if (Array.isArray(uiPromotion.categoryIds)) {
      categoryIds = uiPromotion.categoryIds
        .map(id => {
          const numId = typeof id === 'number' ? id : parseInt(id, 10);
          return isNaN(numId) ? null : numId;
        })
        .filter(id => id !== null && id !== undefined);
    } else {
      const numId = typeof uiPromotion.categoryIds === 'number' 
        ? uiPromotion.categoryIds 
        : parseInt(uiPromotion.categoryIds, 10);
      if (!isNaN(numId)) {
        categoryIds = [numId];
      }
    }
  }
  
  // Build API data object - only include fields that have values
  const apiData = {
    PromotionName: uiPromotion.name || uiPromotion.promotionName || '',
    Description: uiPromotion.description || '',
    DiscountType: normalizedDiscountType,
    DiscountValue: discountValue,
    StartDate: formatDateForApi(uiPromotion.startDate || ''),
    EndDate: formatDateForApi(uiPromotion.endDate || ''),
    IsActive: isActive,
    Local: uiPromotion.local || 'hero'
  };
  
  // Only include ProductIds if not empty
  if (numericProductIds.length > 0) {
    apiData.ProductIds = numericProductIds;
  } else {
    // Send empty array if no products selected
    apiData.ProductIds = [];
  }
  
  // Only include CategoryIds if not empty
  if (categoryIds.length > 0) {
    apiData.CategoryIds = categoryIds;
  } else {
    // Send empty array if no categories selected
    apiData.CategoryIds = [];
  }
  
  // Don't include BannerUrl in FormData - only BannerFile is sent
  // BannerUrl is only used for display, not for API submission
  
  return apiData;
};

/**
 * Get list of promotions with pagination
 * Endpoint: GET /v1/Promotion/GetAllPromotions
 * Response format: { success: boolean, message: string, data: { totalCount, currentPage, limit, data: [] }, errors: string[] }
 * @param {object} params - Query parameters (page, limit, status)
 * @returns {Promise} - List of promotions with pagination info
 */
export const listPromotions = async (params = {}) => {
  const { page = 1, limit = 10, status, search } = params;
  
  const queryParams = {
    page,
    limit,
  };
  
  // Add search param if provided
  if (search && search.trim()) {
    queryParams.search = search.trim();
  }
  
  // Add status param - API expects active/inactive/expired
  if (status && status !== 'all') {
    // Map UI status to API status
    const statusMap = {
      'active': 'active',
      'inactive': 'inactive',
      'expired': 'expired'
    };
    queryParams.status = statusMap[status] || status;
  }
  
  try {
    // Endpoint: GET /v1/Promotion/GetAllPromotions
    // Query params: page, limit, search, status (active/inactive/expired)
    const response = await apiGet('Promotion/GetAllPromotions', queryParams);
    const data = handleResponse(response);
    
    // Handle response structure: { totalCount, currentPage, limit, data: [...] }
    if (data && typeof data === 'object') {
      // If data has nested data.data array (from API response)
      if (data.data && Array.isArray(data.data)) {
        return {
          totalCount: data.totalCount || 0,
          currentPage: data.currentPage || page,
          limit: data.limit || limit,
          data: data.data.map(mapApiToUi)
        };
      }
      
      // If data is directly an array
      if (Array.isArray(data)) {
        return {
          totalCount: data.length,
          currentPage: page,
          limit: limit,
          data: data.map(mapApiToUi)
        };
      }
    }
    
    // Fallback
    return {
      totalCount: 0,
      currentPage: page,
      limit: limit,
      data: []
    };
  } catch (error) {
    console.error('[PromotionService.listPromotions] Error:', error);
    throw error;
  }
};

/**
 * Get promotion by ID
 * Endpoint: GET /v1/Promotion/{id}
 * Response format: { success: boolean, message: string, data: promotion object, errors: string[] }
 * @param {number} id - Promotion ID
 * @returns {Promise} - Promotion object
 */
/**
 * Get promotions by local (display location)
 * Endpoint: GET /v1/Promotion/GetByLocal?local={local}
 * @param {string} local - Display location: 'hero', 'left', 'right'
 * @returns {Promise} - List of promotions for that location
 */
export const getPromotionsByLocal = async (local = 'hero') => {
  try {
    const response = await apiGet(`Promotion/GetByLocal`, { local });
    console.log(`[PromotionService.getPromotionsByLocal] Raw response for local="${local}":`, response);
    
    const data = handleResponse(response);
    console.log(`[PromotionService.getPromotionsByLocal] Processed data for local="${local}":`, data);
    
    // API returns ApiResponse<List<PromotionListDto>>, so data should be the list directly
    // Handle array response (direct array from ApiResponse)
    if (Array.isArray(data)) {
      const mapped = data.map(mapApiToUi);
      console.log(`[PromotionService.getPromotionsByLocal] Mapped ${mapped.length} promotions for local="${local}":`, mapped);
      return mapped;
    }
    
    // Handle object with data array (nested structure)
    if (data && data.data && Array.isArray(data.data)) {
      const mapped = data.data.map(mapApiToUi);
      console.log(`[PromotionService.getPromotionsByLocal] Mapped ${mapped.length} promotions for local="${local}":`, mapped);
      return mapped;
    }
    
    // If data is an object but not array, check if it's ApiResponse format
    if (data && typeof data === 'object' && !Array.isArray(data)) {
      // Check for common ApiResponse fields
      if (data.success !== undefined && data.data) {
        const listData = Array.isArray(data.data) ? data.data : [];
        const mapped = listData.map(mapApiToUi);
        console.log(`[PromotionService.getPromotionsByLocal] Mapped ${mapped.length} promotions from ApiResponse for local="${local}":`, mapped);
        return mapped;
      }
    }
    
    console.warn(`[PromotionService.getPromotionsByLocal] Unexpected response format for local="${local}":`, data);
    return [];
  } catch (error) {
    console.error(`[PromotionService.getPromotionsByLocal] Error for local="${local}":`, error);
    return []; // Return empty array instead of throwing to prevent breaking the UI
  }
};

export const getPromotionById = async (id) => {
  try {
    // Correct endpoint: GET /v1/Promotion/{id}
    const response = await apiGet(`Promotion/${id}`);
    const data = handleResponse(response);
    return mapApiToUi(data);
  } catch (error) {
    console.error('[PromotionService.getPromotionById] Error:', error);
    throw error;
  }
};

/**
 * Create new promotion
 * Endpoint: POST /v1/Promotion
 * Content-Type: multipart/form-data (if bannerFile provided) or application/json
 * @param {object} promotionData - Promotion data
 * @param {File} bannerFile - Banner image file (optional)
 * @returns {Promise} - Created promotion
 */
export const createPromotion = async (promotionData, bannerFile = null) => {
  try {
    const apiData = mapUiToApi(promotionData);
    
    // Log the mapped data for debugging
    if (import.meta.env.DEV) {
      console.log('[PromotionService.createPromotion] Mapped API data:', apiData);
    }
    
    // Backend requires multipart/form-data for POST requests to Promotion endpoint
    // Always use FormData for consistency with updatePromotion
    const formData = new FormData();
    
    // Append promotion data fields
    // Backend expects: PromotionName, Description, DiscountType, DiscountValue, StartDate, EndDate, IsActive, CategoryIds, ProductIds, BannerFile
    Object.keys(apiData).forEach(key => {
      const value = apiData[key]
      if (value !== null && value !== undefined) {
        // Handle arrays - for ProductIds and CategoryIds, send as JSON array string
        // API accepts both JSON string "[1,2,3]" or comma-separated "1,2,3"
        if (Array.isArray(value)) {
          if (key === 'ProductIds' || key === 'CategoryIds') {
            // Send as JSON string for consistency
            const jsonValue = JSON.stringify(value);
            formData.append(key, jsonValue);
            if (import.meta.env.DEV) {
              console.log(`[PromotionService.createPromotion] Appending ${key}:`, jsonValue);
            }
          } else {
            formData.append(key, JSON.stringify(value));
          }
        } else if (typeof value === 'boolean') {
          // IsActive should be "true" or "false" string
          formData.append(key, value.toString());
          if (import.meta.env.DEV) {
            console.log(`[PromotionService.createPromotion] Appending ${key}:`, value.toString());
          }
        } else if (typeof value === 'number') {
          // DiscountValue should be number as string
          formData.append(key, value.toString());
          if (import.meta.env.DEV) {
            console.log(`[PromotionService.createPromotion] Appending ${key}:`, value.toString());
          }
        } else if (value !== '') {
          // Only append non-empty strings
          formData.append(key, value);
          if (import.meta.env.DEV) {
            console.log(`[PromotionService.createPromotion] Appending ${key}:`, value);
          }
        }
      }
    });
    
    // Append banner file if provided
    // Backend expects BannerFile (capital B, capital F)
    if (bannerFile) {
      formData.append('BannerFile', bannerFile);
      if (import.meta.env.DEV) {
        console.log('[PromotionService.createPromotion] Appending BannerFile:', bannerFile.name);
      }
    }
    
    // Log all FormData entries in development
    if (import.meta.env.DEV) {
      console.log('[PromotionService.createPromotion] FormData entries:');
      for (const [key, value] of formData.entries()) {
        console.log(`  ${key}:`, value instanceof File ? `File: ${value.name}` : value);
      }
    }
    
    // Use custom fetch for FormData
    // Correct endpoint: POST /v1/Promotion
    // This will be sent to remote server (35.232.61.38:5000) and saved to Backend/wwwroot/Uploads/Images/
    const { getApiUrl, getDefaultHeaders, getBaseURL } = await import('../config/api');
    const url = getApiUrl('Promotion');
    const headers = getDefaultHeaders();
    // Remove Content-Type header to let browser set it with boundary
    delete headers['Content-Type'];
    
    if (import.meta.env.DEV) {
      const baseURL = getBaseURL();
      console.log('[PromotionService.createPromotion] POST to:', url);
      console.log('[PromotionService.createPromotion] Base URL:', baseURL || '(using Vite proxy → 35.232.61.38:5000)');
      console.log('[PromotionService.createPromotion] Banner file will be saved to: Backend/wwwroot/Uploads/Images/ on remote server');
    }
    
    const response = await fetch(url, {
      method: 'POST',
      headers,
      body: formData
    });
    
    const result = await response.json().catch(() => ({ message: 'Failed to parse response' }));
    
    if (!response.ok) {
      // Log detailed error information
      console.error('[PromotionService.createPromotion] API Error Response:', {
        status: response.status,
        statusText: response.statusText,
        data: result,
        errors: result.errors
      });
      
      // Include errors array in error message if available
      const errorMessage = result.errors && Array.isArray(result.errors) && result.errors.length > 0
        ? `${result.message || 'Request failed'}\n${result.errors.join('\n')}`
        : (result.message || `HTTP error! status: ${response.status}`);
      
      const error = new Error(errorMessage);
      error.status = response.status;
      error.data = result;
      error.errors = result.errors;
      throw error;
    }
    
    const data = handleResponse(result);
    return mapApiToUi(data);
  } catch (error) {
    console.error('[PromotionService.createPromotion] Error:', error);
    throw error;
  }
};

/**
 * Update promotion
 * Endpoint: PUT /v1/Promotion/{id}
 * Content-Type: multipart/form-data (if bannerFile provided) or application/json
 * @param {number} id - Promotion ID
 * @param {object} promotionData - Updated promotion data
 * @param {File} bannerFile - Banner image file (optional)
 * @returns {Promise} - Updated promotion
 */
export const updatePromotion = async (id, promotionData, bannerFile = null) => {
  try {
    const apiData = mapUiToApi(promotionData);
    
    // Log the mapped data for debugging
    if (import.meta.env.DEV) {
      console.log('[PromotionService.updatePromotion] Mapped API data:', apiData);
    }
    
    // Backend requires multipart/form-data for PUT requests to Promotion endpoint (415 error if JSON)
    // Always use FormData even without a banner file
    const formData = new FormData();
    
    // Append promotion data fields
    // Backend expects: PromotionName, Description, DiscountType, DiscountValue, StartDate, EndDate, IsActive, CategoryIds, ProductIds, BannerFile
    // Don't send BannerUrl - only BannerFile is sent
    Object.keys(apiData).forEach(key => {
      // Skip BannerUrl - only send BannerFile
      if (key === 'BannerUrl' || key === 'bannerUrl') {
        return;
      }
      
      const value = apiData[key]
      
      // Skip null and undefined
      if (value === null || value === undefined) {
        return;
      }
      
      // Handle arrays - for ProductIds and CategoryIds, send as JSON array string
      if (Array.isArray(value)) {
        if (key === 'ProductIds' || key === 'CategoryIds') {
          // Always send as JSON string, even if empty array
          const jsonValue = JSON.stringify(value);
          formData.append(key, jsonValue);
          if (import.meta.env.DEV) {
            console.log(`[PromotionService.updatePromotion] Appending ${key}:`, jsonValue);
          }
        } else {
          formData.append(key, JSON.stringify(value));
        }
      } else if (typeof value === 'boolean') {
        // IsActive should be "true" or "false" string
        formData.append(key, value.toString());
        if (import.meta.env.DEV) {
          console.log(`[PromotionService.updatePromotion] Appending ${key}:`, value.toString());
        }
      } else if (typeof value === 'number') {
        // DiscountValue should be number as string
        formData.append(key, value.toString());
        if (import.meta.env.DEV) {
          console.log(`[PromotionService.updatePromotion] Appending ${key}:`, value.toString());
        }
      } else if (value !== '') {
        // Only append non-empty strings
        formData.append(key, value);
        if (import.meta.env.DEV) {
          console.log(`[PromotionService.updatePromotion] Appending ${key}:`, value);
        }
      }
    });
    
    // Append banner file if provided
    // Backend expects BannerFile (capital B, capital F)
    if (bannerFile) {
      formData.append('BannerFile', bannerFile);
      if (import.meta.env.DEV) {
        console.log('[PromotionService.updatePromotion] Appending BannerFile:', bannerFile.name);
      }
    }
    
    // Log all FormData entries in development
    if (import.meta.env.DEV) {
      console.log('[PromotionService.updatePromotion] FormData entries:');
      for (const [key, value] of formData.entries()) {
        console.log(`  ${key}:`, value instanceof File ? `File: ${value.name}` : value);
      }
    }
    
    // Use custom fetch for FormData
    // Correct endpoint: PUT /v1/Promotion/{id}
    // This will be sent to remote server (35.232.61.38:5000) and saved to Backend/wwwroot/Uploads/Images/
    const { getApiUrl, getDefaultHeaders, getBaseURL } = await import('../config/api');
    const url = getApiUrl(`Promotion/${id}`);
    const headers = getDefaultHeaders();
    // Remove Content-Type header to let browser set it with boundary
    delete headers['Content-Type'];
    
    if (import.meta.env.DEV) {
      const baseURL = getBaseURL();
      console.log('[PromotionService.updatePromotion] PUT to:', url);
      console.log('[PromotionService.updatePromotion] Base URL:', baseURL || '(using Vite proxy → 35.232.61.38:5000)');
      console.log('[PromotionService.updatePromotion] Banner file will be saved to: Backend/wwwroot/Uploads/Images/ on remote server');
    }
    
    const response = await fetch(url, {
      method: 'PUT',
      headers,
      body: formData
    });
    
    const result = await response.json().catch(() => ({ message: 'Failed to parse response' }));
    
    if (!response.ok) {
      // Log detailed error information
      console.error('[PromotionService.updatePromotion] API Error Response:', {
        status: response.status,
        statusText: response.statusText,
        data: result,
        errors: result.errors
      });
      
      // Include errors array in error message if available
      const errorMessage = result.errors && Array.isArray(result.errors) && result.errors.length > 0
        ? `${result.message || 'Request failed'}\n${result.errors.join('\n')}`
        : (result.message || `HTTP error! status: ${response.status}`);
      
      const error = new Error(errorMessage);
      error.status = response.status;
      error.data = result;
      error.errors = result.errors;
      throw error;
    }
    
    const data = handleResponse(result);
    return mapApiToUi(data);
  } catch (error) {
    console.error('[PromotionService.updatePromotion] Error:', error);
    throw error;
  }
};

/**
 * Update product prices based on active promotions
 * Endpoint: POST /v1/Promotion/UpdatePrices
 * Query params: promotionId (optional)
 * This should be called after create/update/delete promotions to recalculate product prices
 * @param {number} promotionId - Optional promotion ID to update prices for specific promotion
 * @returns {Promise} - Update result with processed promotion and product counts
 */
export const updatePromotionPrices = async (promotionId = null) => {
  try {
    // Build URL with query params if promotionId provided
    let endpoint = 'Promotion/UpdatePrices';
    if (promotionId) {
      const queryString = new URLSearchParams({ promotionId: promotionId.toString() }).toString();
      endpoint = `${endpoint}?${queryString}`;
    }
    
    const response = await apiPost(endpoint, {});
    return handleResponse(response);
  } catch (error) {
    console.error('[PromotionService.updatePromotionPrices] Error:', error);
    throw error;
  }
};

/**
 * Toggle promotion active/inactive status
 * Endpoint: PUT /v1/Promotion/{id}/toggle
 * Automatically resets product prices when deactivated
 * @param {number} id - Promotion ID
 * @returns {Promise} - Updated promotion
 */
export const togglePromotion = async (id) => {
  try {
    // PUT /v1/Promotion/{id}/toggle - no body needed
    const { getApiUrl, getDefaultHeaders } = await import('../config/api');
    const url = getApiUrl(`Promotion/${id}/toggle`);
    const headers = getDefaultHeaders();
    
    const response = await fetch(url, {
      method: 'PUT',
      headers,
    });
    
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ message: 'Request failed' }));
      throw new Error(errorData.message || `HTTP error! status: ${response.status}`);
    }
    
    const result = await response.json();
    const data = handleResponse(result);
    return mapApiToUi(data);
  } catch (error) {
    console.error('[PromotionService.togglePromotion] Error:', error);
    throw error;
  }
};

/**
 * Delete promotion
 * Endpoint: DELETE /v1/Promotion/{id}
 * Automatically resets product prices to original prices and deletes banner
 * @param {number} id - Promotion ID
 * @returns {Promise} - Deletion result
 */
export const deletePromotion = async (id) => {
  try {
    // Try DELETE endpoint first
    const response = await apiDelete(`Promotion/${id}`);
    const data = handleResponse(response);
    
    // Response format: { promotionId: 1 }
    return data;
  } catch (error) {
    // If DELETE returns 405, fallback to toggle (deactivate)
    if (error.status === 405 || error.message?.includes('405')) {
      console.warn('[PromotionService.deletePromotion] DELETE not supported, using toggle instead');
      return await togglePromotion(id);
    }
    console.error('[PromotionService.deletePromotion] Error:', error);
    throw error;
  }
};

/**
 * Get available products for promotion
 * Endpoint: GET /v1/Promotion/AvailableProducts
 * Query params: promotionId, discountType, discountValue, categoryId, search, page, limit
 * @param {object} params - Query parameters
 * @returns {Promise} - Available products with pagination info
 */
export const getAvailableProducts = async (params = {}) => {
  const { 
    promotionId, 
    discountType, 
    discountValue, 
    categoryId, 
    search, 
    page = 1, 
    limit = 10 
  } = params;
  
  const queryParams = {
    page,
    limit,
  };
  
  if (promotionId) queryParams.promotionId = promotionId;
  if (discountType) queryParams.discountType = discountType;
  if (discountValue !== undefined) queryParams.discountValue = discountValue;
  if (categoryId) queryParams.categoryId = categoryId;
  if (search && search.trim()) queryParams.search = search.trim();
  
  try {
    const response = await apiGet('Promotion/AvailableProducts', queryParams);
    const data = handleResponse(response);
    
    // Response format: { totalCount, currentPage, limit, availableProducts: [], skippedCount, skippedProducts: [] }
    return {
      totalCount: data.totalCount || 0,
      currentPage: data.currentPage || page,
      limit: data.limit || limit,
      availableProducts: data.availableProducts || [],
      skippedCount: data.skippedCount || 0,
      skippedProducts: data.skippedProducts || []
    };
  } catch (error) {
    console.error('[PromotionService.getAvailableProducts] Error:', error);
    throw error;
  }
};

/**
 * Get products by promotion ID
 * Endpoint: GET /v1/Promotion/{id}/products
 * Response format: { success: boolean, message: string, data: ProductListResponse, errors: string[] }
 * @param {number} promotionId - Promotion ID
 * @param {object} params - Query parameters (page, limit)
 * @returns {Promise} - List of products in the promotion
 */
export const getProductsByPromotion = async (promotionId, params = {}) => {
  const { page = 1, limit = 20 } = params;
  
  try {
    const response = await apiGet(`Promotion/${promotionId}/products`, { page, limit });
    const data = handleResponse(response);
    
    // Handle response structure: { totalCount, currentPage, limit, data: [...] }
    if (data && typeof data === 'object') {
      if (data.data && Array.isArray(data.data)) {
        return {
          totalCount: data.totalCount || 0,
          currentPage: data.currentPage || page,
          limit: data.limit || limit,
          data: data.data
        };
      }
      
      // If data is directly the response object
      if (data.totalCount !== undefined) {
        return data;
      }
    }
    
    return {
      totalCount: 0,
      currentPage: page,
      limit: limit,
      data: []
    };
  } catch (error) {
    console.error('[PromotionService.getProductsByPromotion] Error:', error);
    throw error;
  }
};

