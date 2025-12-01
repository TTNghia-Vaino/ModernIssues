// Payment Expiry Service
// Tự động hủy đơn hàng khi hết 30 phút hoặc khi đăng xuất/hết session

import * as paymentCacheService from './paymentCacheService';
import * as orderService from './orderService';

const CHECK_INTERVAL = 60 * 1000; // Kiểm tra mỗi 1 phút
let expiryCheckInterval = null;

/**
 * Hủy đơn hàng và xóa cache
 * @param {string|number} orderId - ID đơn hàng
 * @returns {Promise<boolean>} - true nếu hủy thành công
 */
export const cancelOrder = async (orderId) => {
  try {
    console.log('[PaymentExpiryService] Cancelling order:', orderId);
    
    // Cập nhật trạng thái đơn hàng sang "cancelled"
    try {
      await orderService.updateOrderStatus(orderId, 'cancelled');
      console.log('[PaymentExpiryService] Order cancelled successfully:', orderId);
    } catch (error) {
      console.error('[PaymentExpiryService] Error cancelling order:', error);
      // Tiếp tục xóa cache dù API call thất bại
    }
    
    // Xóa cache thanh toán
    paymentCacheService.removePaymentCache(orderId);
    
    return true;
  } catch (error) {
    console.error('[PaymentExpiryService] Error in cancelOrder:', error);
    return false;
  }
};

/**
 * Kiểm tra và hủy các đơn hàng đã hết hạn
 */
const checkAndCancelExpiredOrders = async () => {
  try {
    const cachedOrderIds = paymentCacheService.getAllCachedOrderIds();
    
    for (const orderId of cachedOrderIds) {
      const timeRemaining = paymentCacheService.getCacheTimeRemaining(orderId);
      
      // Nếu hết hạn (timeRemaining <= 0), hủy đơn hàng
      if (timeRemaining <= 0) {
        console.log('[PaymentExpiryService] Order expired, cancelling:', orderId);
        await cancelOrder(orderId);
      }
    }
  } catch (error) {
    console.error('[PaymentExpiryService] Error checking expired orders:', error);
  }
};

/**
 * Hủy tất cả đơn hàng đang trong cache (dùng khi đăng xuất)
 */
export const cancelAllPendingOrders = async () => {
  try {
    console.log('[PaymentExpiryService] Cancelling all pending orders...');
    const cachedOrderIds = paymentCacheService.getAllCachedOrderIds();
    
    const cancelPromises = cachedOrderIds.map(orderId => cancelOrder(orderId));
    await Promise.allSettled(cancelPromises);
    
    // Xóa tất cả cache
    paymentCacheService.clearAllPaymentCache();
    
    console.log('[PaymentExpiryService] Cancelled', cachedOrderIds.length, 'pending orders');
    return cachedOrderIds.length;
  } catch (error) {
    console.error('[PaymentExpiryService] Error cancelling all pending orders:', error);
    return 0;
  }
};

/**
 * Bắt đầu service kiểm tra đơn hàng hết hạn
 */
export const startExpiryCheck = () => {
  if (expiryCheckInterval) {
    console.log('[PaymentExpiryService] Expiry check already running');
    return;
  }
  
  console.log('[PaymentExpiryService] Starting expiry check service');
  
  // Chạy ngay lần đầu
  checkAndCancelExpiredOrders();
  
  // Setup interval để kiểm tra định kỳ
  expiryCheckInterval = setInterval(() => {
    checkAndCancelExpiredOrders();
  }, CHECK_INTERVAL);
};

/**
 * Dừng service kiểm tra đơn hàng hết hạn
 */
export const stopExpiryCheck = () => {
  if (expiryCheckInterval) {
    clearInterval(expiryCheckInterval);
    expiryCheckInterval = null;
    console.log('[PaymentExpiryService] Stopped expiry check service');
  }
};

/**
 * Khởi động service khi app load
 */
if (typeof window !== 'undefined') {
  // Bắt đầu kiểm tra khi service được import
  startExpiryCheck();
  
  // Cleanup khi page unload
  window.addEventListener('beforeunload', () => {
    stopExpiryCheck();
  });
}

