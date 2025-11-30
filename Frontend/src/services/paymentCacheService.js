// Payment Cache Service
// Quản lý cache thông tin thanh toán với TTL 30 phút

const CACHE_KEY_PREFIX = 'payment_cache_';
const CACHE_TTL = 30 * 60 * 1000; // 30 phút (milliseconds)
const CLEANUP_INTERVAL = 60 * 1000; // Kiểm tra mỗi 1 phút

/**
 * Lấy key cache cho orderId
 */
const getCacheKey = (orderId) => {
  return `${CACHE_KEY_PREFIX}${orderId}`;
};

/**
 * Lưu thông tin thanh toán vào cache
 * @param {string|number} orderId - ID đơn hàng
 * @param {object} paymentData - Thông tin thanh toán (orderData)
 * @returns {boolean} - true nếu lưu thành công
 */
export const savePaymentCache = (orderId, paymentData) => {
  try {
    const cacheData = {
      orderId: String(orderId),
      paymentData: paymentData,
      timestamp: Date.now(),
      expiresAt: Date.now() + CACHE_TTL
    };
    
    const key = getCacheKey(orderId);
    localStorage.setItem(key, JSON.stringify(cacheData));
    
    console.log('[PaymentCacheService] Saved payment cache for order:', orderId);
    return true;
  } catch (error) {
    console.error('[PaymentCacheService] Error saving payment cache:', error);
    return false;
  }
};

/**
 * Lấy thông tin thanh toán từ cache
 * @param {string|number} orderId - ID đơn hàng
 * @returns {object|null} - Thông tin thanh toán hoặc null nếu không tìm thấy/hết hạn
 */
export const getPaymentCache = (orderId) => {
  try {
    const key = getCacheKey(orderId);
    const cached = localStorage.getItem(key);
    
    if (!cached) {
      console.log('[PaymentCacheService] No cache found for order:', orderId);
      return null;
    }
    
    const cacheData = JSON.parse(cached);
    
    // Kiểm tra hết hạn
    if (Date.now() > cacheData.expiresAt) {
      console.log('[PaymentCacheService] Cache expired for order:', orderId);
      localStorage.removeItem(key);
      return null;
    }
    
    console.log('[PaymentCacheService] Retrieved payment cache for order:', orderId);
    return cacheData.paymentData;
  } catch (error) {
    console.error('[PaymentCacheService] Error getting payment cache:', error);
    return null;
  }
};

/**
 * Xóa cache thanh toán
 * @param {string|number} orderId - ID đơn hàng
 * @returns {boolean} - true nếu xóa thành công
 */
export const removePaymentCache = (orderId) => {
  try {
    const key = getCacheKey(orderId);
    localStorage.removeItem(key);
    console.log('[PaymentCacheService] Removed payment cache for order:', orderId);
    return true;
  } catch (error) {
    console.error('[PaymentCacheService] Error removing payment cache:', error);
    return false;
  }
};

/**
 * Kiểm tra cache có tồn tại và còn hạn không
 * @param {string|number} orderId - ID đơn hàng
 * @returns {boolean} - true nếu cache còn hạn
 */
export const hasValidCache = (orderId) => {
  try {
    const key = getCacheKey(orderId);
    const cached = localStorage.getItem(key);
    
    if (!cached) {
      return false;
    }
    
    const cacheData = JSON.parse(cached);
    const isValid = Date.now() <= cacheData.expiresAt;
    
    if (!isValid) {
      // Tự động xóa cache hết hạn
      localStorage.removeItem(key);
    }
    
    return isValid;
  } catch (error) {
    console.error('[PaymentCacheService] Error checking cache validity:', error);
    return false;
  }
};

/**
 * Lấy thời gian còn lại của cache (milliseconds)
 * @param {string|number} orderId - ID đơn hàng
 * @returns {number} - Thời gian còn lại (0 nếu hết hạn hoặc không tồn tại)
 */
export const getCacheTimeRemaining = (orderId) => {
  try {
    const key = getCacheKey(orderId);
    const cached = localStorage.getItem(key);
    
    if (!cached) {
      return 0;
    }
    
    const cacheData = JSON.parse(cached);
    const remaining = cacheData.expiresAt - Date.now();
    
    return remaining > 0 ? remaining : 0;
  } catch (error) {
    console.error('[PaymentCacheService] Error getting cache time remaining:', error);
    return 0;
  }
};

/**
 * Lấy tất cả các orderId đang có cache
 * @returns {string[]} - Danh sách orderId
 */
export const getAllCachedOrderIds = () => {
  try {
    const orderIds = [];
    const keys = Object.keys(localStorage);
    
    for (const key of keys) {
      if (key.startsWith(CACHE_KEY_PREFIX)) {
        const orderId = key.replace(CACHE_KEY_PREFIX, '');
        if (hasValidCache(orderId)) {
          orderIds.push(orderId);
        }
      }
    }
    
    return orderIds;
  } catch (error) {
    console.error('[PaymentCacheService] Error getting all cached order IDs:', error);
    return [];
  }
};

/**
 * Xóa tất cả cache đã hết hạn
 */
export const cleanupExpiredCache = () => {
  try {
    const keys = Object.keys(localStorage);
    let cleanedCount = 0;
    
    for (const key of keys) {
      if (key.startsWith(CACHE_KEY_PREFIX)) {
        try {
          const cached = localStorage.getItem(key);
          if (cached) {
            const cacheData = JSON.parse(cached);
            if (Date.now() > cacheData.expiresAt) {
              localStorage.removeItem(key);
              cleanedCount++;
            }
          }
        } catch (e) {
          // Nếu parse lỗi, xóa luôn
          localStorage.removeItem(key);
          cleanedCount++;
        }
      }
    }
    
    if (cleanedCount > 0) {
      console.log(`[PaymentCacheService] Cleaned up ${cleanedCount} expired cache entries`);
    }
    
    return cleanedCount;
  } catch (error) {
    console.error('[PaymentCacheService] Error cleaning up expired cache:', error);
    return 0;
  }
};

/**
 * Xóa tất cả cache (dùng khi đăng xuất)
 */
export const clearAllPaymentCache = () => {
  try {
    const keys = Object.keys(localStorage);
    let clearedCount = 0;
    
    for (const key of keys) {
      if (key.startsWith(CACHE_KEY_PREFIX)) {
        localStorage.removeItem(key);
        clearedCount++;
      }
    }
    
    console.log(`[PaymentCacheService] Cleared ${clearedCount} payment cache entries`);
    return clearedCount;
  } catch (error) {
    console.error('[PaymentCacheService] Error clearing all payment cache:', error);
    return 0;
  }
};

// Tự động cleanup cache hết hạn mỗi phút
if (typeof window !== 'undefined') {
  // Chạy cleanup ngay khi load
  cleanupExpiredCache();
  
  // Setup interval để cleanup định kỳ
  setInterval(() => {
    cleanupExpiredCache();
  }, CLEANUP_INTERVAL);
}

