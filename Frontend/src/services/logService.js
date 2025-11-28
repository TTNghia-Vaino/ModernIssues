import api from '../config/api';

/**
 * Log Service - Quản lý API calls cho Log tracking
 */
const logService = {
  /**
   * Lấy danh sách logs với phân trang và filters (Admin only)
   * @param {Object} params - Query parameters
   * @param {number} params.page - Số trang (mặc định: 1)
   * @param {number} params.limit - Số lượng records mỗi trang (mặc định: 20)
   * @param {number} params.userId - Lọc theo user ID (tùy chọn)
   * @param {number} params.productId - Lọc theo product ID (tùy chọn)
   * @param {string} params.actionType - Lọc theo loại hành động (tùy chọn)
   * @returns {Promise<Object>} Response với danh sách logs
   */
  async getLogs(params = {}) {
    try {
      const { page = 1, limit = 20, userId, productId, actionType } = params;
      
      const queryParams = new URLSearchParams({
        page: page.toString(),
        limit: limit.toString(),
      });

      if (userId) queryParams.append('userId', userId.toString());
      if (productId) queryParams.append('productId', productId.toString());
      if (actionType) queryParams.append('actionType', actionType);

      const response = await fetch(
        `${api.getApiUrl('Log')}?${queryParams.toString()}`,
        {
          method: 'GET',
          headers: api.getDefaultHeaders(),
          credentials: 'include', // Include cookies for session
        }
      );

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || `HTTP error! status: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      console.error('[LogService] getLogs error:', error);
      throw error;
    }
  },

  /**
   * Lấy logs của user hiện tại
   * @param {Object} params - Query parameters
   * @param {number} params.page - Số trang (mặc định: 1)
   * @param {number} params.limit - Số lượng records mỗi trang (mặc định: 20)
   * @returns {Promise<Object>} Response với danh sách logs của user
   */
  async getMyLogs(params = {}) {
    try {
      const { page = 1, limit = 20 } = params;
      
      const queryParams = new URLSearchParams({
        page: page.toString(),
        limit: limit.toString(),
      });

      const response = await fetch(
        `${api.getApiUrl('Log/my-logs')}?${queryParams.toString()}`,
        {
          method: 'GET',
          headers: api.getDefaultHeaders(),
          credentials: 'include', // Include cookies for session
        }
      );

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || `HTTP error! status: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      console.error('[LogService] getMyLogs error:', error);
      throw error;
    }
  },

  /**
   * Lấy logs của một user cụ thể (Admin only)
   * @param {number} userId - ID của user
   * @param {Object} params - Query parameters
   * @param {number} params.page - Số trang (mặc định: 1)
   * @param {number} params.limit - Số lượng records mỗi trang (mặc định: 20)
   * @returns {Promise<Object>} Response với danh sách logs của user
   */
  async getUserLogs(userId, params = {}) {
    try {
      const { page = 1, limit = 20 } = params;
      
      const queryParams = new URLSearchParams({
        page: page.toString(),
        limit: limit.toString(),
      });

      const response = await fetch(
        `${api.getApiUrl(`Log/user/${userId}`)}?${queryParams.toString()}`,
        {
          method: 'GET',
          headers: api.getDefaultHeaders(),
          credentials: 'include', // Include cookies for session
        }
      );

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || `HTTP error! status: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      console.error('[LogService] getUserLogs error:', error);
      throw error;
    }
  },

  /**
   * Lấy logs của một sản phẩm cụ thể (Admin only)
   * @param {number} productId - ID của sản phẩm
   * @param {Object} params - Query parameters
   * @param {number} params.page - Số trang (mặc định: 1)
   * @param {number} params.limit - Số lượng records mỗi trang (mặc định: 20)
   * @returns {Promise<Object>} Response với danh sách logs của sản phẩm
   */
  async getProductLogs(productId, params = {}) {
    try {
      const { page = 1, limit = 20 } = params;
      
      const queryParams = new URLSearchParams({
        page: page.toString(),
        limit: limit.toString(),
      });

      const response = await fetch(
        `${api.getApiUrl(`Log/product/${productId}`)}?${queryParams.toString()}`,
        {
          method: 'GET',
          headers: api.getDefaultHeaders(),
          credentials: 'include', // Include cookies for session
        }
      );

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || `HTTP error! status: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      console.error('[LogService] getProductLogs error:', error);
      throw error;
    }
  },

  /**
   * Lấy logs theo loại hành động (Admin only)
   * @param {string} actionType - Loại hành động (ví dụ: "view_product", "add_to_cart", "login")
   * @param {Object} params - Query parameters
   * @param {number} params.page - Số trang (mặc định: 1)
   * @param {number} params.limit - Số lượng records mỗi trang (mặc định: 20)
   * @returns {Promise<Object>} Response với danh sách logs theo loại hành động
   */
  async getLogsByActionType(actionType, params = {}) {
    try {
      const { page = 1, limit = 20 } = params;
      
      const queryParams = new URLSearchParams({
        page: page.toString(),
        limit: limit.toString(),
      });

      const response = await fetch(
        `${api.getApiUrl(`Log/action/${actionType}`)}?${queryParams.toString()}`,
        {
          method: 'GET',
          headers: api.getDefaultHeaders(),
          credentials: 'include', // Include cookies for session
        }
      );

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || `HTTP error! status: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      console.error('[LogService] getLogsByActionType error:', error);
      throw error;
    }
  },
};

export default logService;

