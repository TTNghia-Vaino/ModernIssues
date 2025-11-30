// Category API Service

import { apiGet, apiPost, apiPut, apiDelete } from './api';

/**
 * Handle Swagger response format: { success, message, data, errors }
 * @param {object} response - API response
 * @returns {Promise} - Parsed data
 */
const handleResponse = (response) => {
  console.log('[CategoryService.handleResponse] Input:', response);
  console.log('[CategoryService.handleResponse] Type:', typeof response);
  console.log('[CategoryService.handleResponse] Is array:', Array.isArray(response));
  console.log('[CategoryService.handleResponse] Keys:', response && typeof response === 'object' ? Object.keys(response) : 'N/A');
  
  // If response is null/undefined or not an object, return as is
  if (!response || typeof response !== 'object') {
    console.log('[CategoryService.handleResponse] Response is not an object, returning as is');
    return response;
  }
  
  // If response is already an array, return it directly (API might return array directly)
  if (Array.isArray(response)) {
    console.log('[CategoryService.handleResponse] Response is array, returning directly');
    return response;
  }
  
  // Check if it's an error object (has error properties)
  if (response.error || (response.name && response.message)) {
    // This is likely an error object, re-throw it
    console.log('[CategoryService.handleResponse] Response is error object, throwing');
    throw response;
  }
  
  // Handle Swagger response format
  if (response.success === false) {
    console.log('[CategoryService.handleResponse] Response indicates failure');
    throw new Error(response.message || 'Request failed');
  }
  
  // If data is string, try to parse
  if (response.data && typeof response.data === 'string') {
    try {
      const parsed = JSON.parse(response.data);
      console.log('[CategoryService.handleResponse] Parsed string data:', parsed);
      return parsed;
    } catch (e) {
      console.warn('[CategoryService] Failed to parse response.data as JSON:', e);
      return response.data;
    }
  }
  
  // Return data if available
  if (response.data !== undefined) {
    console.log('[CategoryService.handleResponse] Returning response.data:', response.data);
    return response.data;
  }
  
  // Fallback: return response as is
  console.log('[CategoryService.handleResponse] Returning response as is (fallback)');
  return response;
};

/**
 * Get all categories (hierarchical tree)
 * Customers can view
 * Response format: { success: boolean, message: string, data: array|string, errors: string[] }
 * @returns {Promise} - List of categories
 */
export const getCategories = async () => {
  const response = await apiGet('Category');
  return handleResponse(response);
};

/**
 * Get category tree (only root and child categories)
 * Customers can view
 * Response format: { success: boolean, message: string, data: array|string, errors: string[] }
 * @returns {Promise} - Category tree
 */
export const getCategoryTree = async () => {
  const response = await apiGet('Category/tree');
  return handleResponse(response);
};

/**
 * Get full category tree (supports 3+ levels)
 * Customers can view
 * Response format: { success: boolean, message: string, data: array|string, errors: string[] }
 * @returns {Promise} - Full category tree with all levels
 */
export const getCategoryTreeFull = async () => {
  const response = await apiGet('Category/tree-full');
  return handleResponse(response);
};

/**
 * Get category by ID
 * Customers can view
 * Response format: { success: boolean, message: string, data: object|string, errors: string[] }
 * @param {string|number} id - Category ID
 * @returns {Promise} - Category details
 */
export const getCategoryById = async (id) => {
  const response = await apiGet(`Category/${id}`);
  return handleResponse(response);
};

/**
 * Create new category
 * Admin only
 * Response format: { success: boolean, message: string, data: object|string, errors: string[] }
 * @param {object} categoryData - Category data
 * @returns {Promise} - Created category
 */
export const createCategory = async (categoryData) => {
  const response = await apiPost('Category', categoryData);
  return handleResponse(response);
};

/**
 * Update category
 * Endpoint: PUT /v1/Category/{id}
 * Admin only
 * Response format: { success: boolean, message: string, data: object|string, errors: string[] }
 * @param {string|number} id - Category ID
 * @param {object} categoryData - Updated category data
 *   - categoryName (optional): Tên danh mục mới
 *   - parentId (optional): ID danh mục cha, có thể null để xóa danh mục cha
 * @returns {Promise} - Updated category
 * 
 * @example
 * // Chỉ cập nhật tên
 * updateCategory(1, { categoryName: "Tên mới" })
 * 
 * // Chỉ cập nhật parent
 * updateCategory(1, { parentId: 3 })
 * 
 * // Xóa danh mục cha (đưa về gốc)
 * updateCategory(1, { parentId: null })
 * 
 * // Cập nhật cả hai
 * updateCategory(1, { categoryName: "Tên mới", parentId: null })
 */
export const updateCategory = async (id, categoryData) => {
  const response = await apiPut(`Category/${id}`, categoryData);
  return handleResponse(response);
};

/**
 * Delete category (soft delete)
 * Admin only
 * Response format: { success: boolean, message: string, data: string, errors: string[] }
 * @param {string|number} id - Category ID
 * @returns {Promise}
 */
export const deleteCategory = async (id) => {
  const response = await apiDelete(`Category/${id}`);
  return handleResponse(response);
};

