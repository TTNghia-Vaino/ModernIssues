// User Activity Log API Service

import { getApiUrl, getDefaultHeaders } from '../config/api';

/**
 * Get user activity logs
 * @param {object} params - { actionType?, startDate?, endDate?, page?, limit? }
 * @returns {Promise} - Logs data with pagination
 */
export const getLogs = async (params = {}) => {
  const {
    actionType = null,
    startDate = null,
    endDate = null,
    page = 1,
    limit = 50
  } = params;

  const queryParams = new URLSearchParams();
  if (actionType) queryParams.append('actionType', actionType);
  if (startDate) queryParams.append('startDate', startDate);
  if (endDate) queryParams.append('endDate', endDate);
  queryParams.append('page', page.toString());
  queryParams.append('limit', limit.toString());

  const url = `${getApiUrl('Log')}?${queryParams.toString()}`;
  
  const response = await fetch(url, {
    method: 'GET',
    headers: getDefaultHeaders(),
    credentials: 'include' // Include cookies for session
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ message: 'Failed to fetch logs' }));
    throw new Error(error.message || 'Failed to fetch logs');
  }

  const data = await response.json();
  
  // Handle Swagger response format
  if (data && typeof data === 'object') {
    if (data.success === false) {
      throw new Error(data.message || 'Failed to fetch logs');
    }
    
    // Return data if available
    if (data.data !== undefined) {
      return data.data;
    }
  }

  return data;
};

/**
 * Get log statistics
 * @returns {Promise} - Statistics data
 */
export const getLogStats = async () => {
  const url = getApiUrl('Log/stats');
  
  const response = await fetch(url, {
    method: 'GET',
    headers: getDefaultHeaders(),
    credentials: 'include' // Include cookies for session
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ message: 'Failed to fetch log stats' }));
    throw new Error(error.message || 'Failed to fetch log stats');
  }

  const data = await response.json();
  
  // Handle Swagger response format
  if (data && typeof data === 'object') {
    if (data.success === false) {
      throw new Error(data.message || 'Failed to fetch log stats');
    }
    
    // Return data if available
    if (data.data !== undefined) {
      return data.data;
    }
  }

  return data;
};

export default {
  getLogs,
  getLogStats
};

