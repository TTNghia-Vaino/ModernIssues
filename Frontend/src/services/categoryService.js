// Category API Service

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
      console.warn('[CategoryService] Failed to parse response.data as JSON:', e);
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
 * Admin only
 * Response format: { success: boolean, message: string, data: object|string, errors: string[] }
 * @param {string|number} id - Category ID
 * @param {object} categoryData - Updated category data
 * @returns {Promise} - Updated category
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

