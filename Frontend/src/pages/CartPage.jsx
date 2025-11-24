import React, { useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useCart } from '../context/CartContext';
import './CartPage.css';

const formatPrice = v => v.toLocaleString('vi-VN') + '₫';

const CartPage = () => {
  const { items, updateQuantity, removeItem, clearCart, totalCount, totalPrice } = useCart();
  const navigate = useNavigate();
  const location = useLocation();

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
        <div className="breadcrumbs">
          <div className="container">
            <span>Trang chủ / Giỏ hàng</span>
          </div>
        </div>
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
      <div className="breadcrumbs">
        <div className="container">
          <span>Trang chủ / Giỏ hàng</span>
        </div>
      </div>
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
                  {item.image && (
                    <img src={item.image} alt={item.name} className="cart-item-image" />
                  )}
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
                  <button onClick={()=>removeItem(productId, itemCartId)} className="cart-remove" title="Xóa">✕</button>
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
              <button onClick={clearCart} className="clear-btn">Xóa giỏ hàng</button>
            </div>
          </aside>
        </div>
      </div>
    </>
  );
};

export default CartPage;


