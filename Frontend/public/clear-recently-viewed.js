// Script để xóa dữ liệu sản phẩm đã xem trong localStorage
// Chạy script này trong browser console: 
// Mở Developer Tools (F12) > Console > Paste và chạy:

(function() {
  try {
    // Xóa dữ liệu cũ
    localStorage.removeItem('recentlyViewedProducts');
    console.log('✅ Đã xóa dữ liệu sản phẩm đã xem trong localStorage');
    console.log('📝 Bây giờ bạn có thể xem lại các sản phẩm để lưu dữ liệu mới');
    
    // Dispatch event để refresh component
    window.dispatchEvent(new Event('recentlyViewedUpdated'));
    
    // Reload trang để áp dụng thay đổi
    window.location.reload();
  } catch (error) {
    console.error('❌ Lỗi khi xóa dữ liệu:', error);
  }
})();

