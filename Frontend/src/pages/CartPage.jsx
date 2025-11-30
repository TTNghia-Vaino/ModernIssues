import React, { useEffect, useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useCart } from '../context/CartContext';
import * as productService from '../services/productService';
import { transformProduct } from '../utils/productUtils';
import { handleProductImageError, getPlaceholderImage } from '../utils/imageUtils';
import ConfirmationDialog from '../components/ConfirmationDialog';
import { useNotification } from '../context/NotificationContext';
import './CartPage.css';

const formatPrice = v => v.toLocaleString('vi-VN') + '₫';
const placeholderImage = getPlaceholderImage('product');

const CartPage = () => {
  const { items, updateQuantity, removeItem, clearCart, totalCount, totalPrice } = useCart();
  const navigate = useNavigate();
  const location = useLocation();
  const { success, error } = useNotification();
  const [productImages, setProductImages] = useState({}); // Cache for product images
  const [showClearDialog, setShowClearDialog] = useState(false);

  // Fetch product images for items that don't have images
  useEffect(() => {
    const fetchMissingImages = async () => {
      const itemsToFetch = items.filter(item => {
        const productId = item.productId || item.id;
        return !item.image && productId && !productImages[productId];
      });

      if (itemsToFetch.length === 0) return;

      // Fetch images for items without images
      const fetchPromises = itemsToFetch.map(async (item) => {
        const productId = item.productId || item.id;
        if (!productId) return;

        try {
          const productData = await productService.getProductById(productId);
          const transformedProduct = transformProduct(productData);
          if (transformedProduct?.image) {
            setProductImages(prev => {
              // Only update if not already set
              if (prev[productId]) return prev;
              return {
                ...prev,
                [productId]: transformedProduct.image
              };
            });
          }
        } catch (err) {
          console.warn(`[CartPage] Failed to fetch image for product ${productId}:`, err);
        }
      });

      await Promise.all(fetchPromises);
    };

    fetchMissingImages();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [items]);

  const handleImageError = handleProductImageError;

  const getItemImage = (item) => {
    const productId = item.productId || item.id;
    return item.image || productImages[productId] || placeholderImage;
  };

  // Scroll to top when navigating to cart page
  useEffect(() => {
    // Scroll immediately first
    window.scrollTo(0, 0);
    document.documentElement.scrollTop = 0;
    document.body.scrollTop = 0;
    
    // Then smooth scroll after a brief delay to ensure it works
    const timer = setTimeout(() => {
      window.scrollTo({
        top: 0,
        left: 0,
        behavior: 'smooth'
      });
      document.documentElement.scrollTop = 0;
      document.body.scrollTop = 0;
    }, 100);
    
    // Also scroll after items are loaded/updated
    const scrollTimer = setTimeout(() => {
      window.scrollTo({
        top: 0,
        left: 0,
        behavior: 'instant'
      });
    }, 200);
    
    return () => {
      clearTimeout(timer);
      clearTimeout(scrollTimer);
    };
  }, [location.pathname, items.length]);

  if (items.length === 0) {
    return (
      <>
        <div className="container cart-container">
          <h2 className="cart-title">Giỏ hàng</h2>
          <div className="cart-empty-state">
            <div className="cart-empty-content">
              <div className="cart-empty-icon">🛒</div>
              <p className="cart-empty-text">Giỏ hàng của bạn đang trống</p>
              <p className="cart-empty-subtitle">Hãy khám phá những sản phẩm tuyệt vời của chúng tôi</p>
              <Link to="/" className="cart-empty-btn">
                Tiếp tục mua sắm
              </Link>
            </div>
          </div>
        </div>
      </>
    );
  }

  return (
    <>
      <div className="container cart-container">
        <h2 className="cart-title">Giỏ hàng</h2>
        <div className="cart-grid">
          <div className="cart-list">
            {items.map(item => {
              // Lấy productId từ item (có thể là id hoặc productId)
              const productId = item.productId || item.id;
              // Lấy cartId từ item nếu có (để hỗ trợ trường hợp mỗi item có cartId riêng)
              const itemCartId = item.cartId || null;
              
              return (
                <div key={`${productId}-${item.capacity || 'default'}`} className="cart-item">
                  <img 
                    src={getItemImage(item)} 
                    alt={item.name || 'Sản phẩm'} 
                    className="cart-item-image"
                    onError={handleImageError}
                  />
                  <div>
                    <Link to={`/products/${productId}`} className="cart-item-link">
                      {item.name}
                      {item.capacity && <span style={{fontSize: '12px', color: '#9ca3af', marginLeft: '6px'}}>({item.capacity})</span>}
                    </Link>
                    <div className="cart-price">{formatPrice(item.price)}</div>
                  </div>
                  <input 
                    type="number" 
                    min={1} 
                    value={item.quantity} 
                    onChange={e=>updateQuantity(productId, e.target.value, itemCartId)} 
                    className="cart-qty" 
                  />
                  <button 
                    onClick={async () => {
                      try {
                        console.log('[CartPage] Removing item:', { productId, itemCartId, capacity: item.capacity });
                        await removeItem(productId, itemCartId, item.capacity);
                        console.log('[CartPage] Item removed successfully');
                        success('Đã xóa sản phẩm khỏi giỏ hàng');
                      } catch (err) {
                        console.error('[CartPage] Failed to remove item:', err);
                        error(err.message || 'Không thể xóa sản phẩm. Vui lòng thử lại.');
                      }
                    }} 
                    className="cart-remove" 
                    title="Xóa"
                  >
                    ✕
                  </button>
                </div>
              );
            })}
            <div className="order-note-section">
              <label htmlFor="order-note" className="order-note-label">Ghi chú đơn hàng</label>
              <textarea id="order-note" rows={3} className="order-note" placeholder="Nhập ghi chú..." />
            </div>
          </div>
          <aside className="cart-summary">
            <div className="summary-grid">
              <div className="summary-row">
                <span>Tổng số lượng:</span>
                <strong>{totalCount} sản phẩm</strong>
              </div>
              <hr style={{margin: '8px 0', border: 'none', borderTop: '1px solid #e5e7eb'}} />
              <div className="summary-row" style={{fontSize: '16px'}}>
                <span>Tạm tính:</span>
                <strong className="summary-total">{formatPrice(totalPrice)}</strong>
              </div>
              <button className="pay-btn" onClick={() => navigate('/checkout')}>Thanh toán ngay</button>
              <button 
                onClick={() => setShowClearDialog(true)} 
                className="clear-btn"
              >
                Xóa giỏ hàng
              </button>
            </div>
          </aside>
        </div>
      </div>
      <ConfirmationDialog
        open={showClearDialog}
        onOpenChange={setShowClearDialog}
        title="Xóa giỏ hàng"
        message="Bạn có chắc chắn muốn xóa toàn bộ giỏ hàng? Hành động này không thể hoàn tác."
        confirmText="Xóa"
        cancelText="Hủy"
        variant="danger"
        onConfirm={async () => {
          try {
            console.log('[CartPage] Clearing cart');
            await clearCart();
            console.log('[CartPage] Cart cleared successfully');
            success('Đã xóa toàn bộ giỏ hàng');
          } catch (err) {
            console.error('[CartPage] Failed to clear cart:', err);
            error(err.message || 'Không thể xóa giỏ hàng. Vui lòng thử lại.');
          }
        }}
      />
    </>
  );
};

export default CartPage;


