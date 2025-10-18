import React from 'react';
import { Link } from 'react-router-dom';
import { useCart } from '../context/CartContext';
import './CartPage.css';

const formatPrice = v => v.toLocaleString('vi-VN') + '₫';

const CartPage = () => {
  const { items, updateQuantity, removeItem, clearCart, totalCount, totalPrice } = useCart();

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
        <p>Giỏ hàng trống.</p>
        <Link to="/products">Tiếp tục mua sắm</Link>
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
            {items.map(item => (
              <div key={item.id} className="cart-item">
                <Link to={`/products/${item.id}`} className="cart-item-link">{item.name}</Link>
                <div className="cart-price">{formatPrice(item.price)}</div>
                <input type="number" min={1} value={item.quantity} onChange={e=>updateQuantity(item.id, e.target.value)} className="cart-qty" />
                <button onClick={()=>removeItem(item.id)} className="cart-remove" title="Xóa">✕</button>
              </div>
            ))}
            <div className="order-note-section">
              <label htmlFor="order-note" className="order-note-label">Ghi chú đơn hàng</label>
              <textarea id="order-note" rows={3} className="order-note" placeholder="Nhập ghi chú..." />
            </div>
          </div>
          <aside className="cart-summary">
            <div className="summary-grid">
              <div className="summary-row">
                <span>Tổng số lượng</span>
                <strong>{totalCount}</strong>
              </div>
              <div className="summary-row">
                <span>Tạm tính</span>
                <strong className="summary-total">{formatPrice(totalPrice)}</strong>
              </div>
              <button className="pay-btn">Thanh toán</button>
              <button onClick={clearCart} className="clear-btn">Xóa giỏ hàng</button>
            </div>
          </aside>
        </div>
      </div>
    </>
  );
};

export default CartPage;


