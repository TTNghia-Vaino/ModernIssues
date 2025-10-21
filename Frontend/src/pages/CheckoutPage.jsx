import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useCart } from '../context/CartContext';
import './CheckoutPage.css';

// ========================================
// UTILITY FUNCTIONS
// ========================================

const formatPrice = (price) => price.toLocaleString('vi-VN') + '₫';

// ========================================
// MAIN COMPONENT
// ========================================

const CheckoutPage = () => {
  const navigate = useNavigate();
  const { items, totalCount, totalPrice } = useCart();
  
  // ========================================
  // STATE MANAGEMENT
  // ========================================
  
  const [formData, setFormData] = useState({
    email: '',
    fullName: '',
    phone: '',
    province: '',
    district: '',
    ward: '',
    address: '',
    note: ''
  });
  const [paymentMethod, setPaymentMethod] = useState('vietqr');

  // ========================================
  // EVENT HANDLERS
  // ========================================

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    
    // Validate form
    if (!formData.email || !formData.fullName || !formData.phone || 
        !formData.province || !formData.district || !formData.ward || !formData.address) {
      alert('Vui lòng điền đầy đủ thông tin bắt buộc');
      return;
    }

    // Create order data
    const orderData = {
      orderId: Math.floor(100000 + Math.random() * 900000).toString(),
      ...formData,
      paymentMethod,
      items,
      totalPrice,
      orderDate: new Date().toISOString()
    };

    // Save order data to localStorage (temporary storage)
    localStorage.setItem('lastOrder', JSON.stringify(orderData));

    // Navigate to confirmation page
    navigate('/order-confirmation');
  };

  // ========================================
  // RENDER HELPERS
  // ========================================

  if (items.length === 0) {
    return (
      <div className="checkout-container">
        <div className="breadcrumbs">
          <div className="container">
            <span>Trang chủ / Giỏ hàng / Thanh toán</span>
          </div>
        </div>
        <div className="checkout-empty">
          <p>Giỏ hàng trống.</p>
          <Link to="/products">Tiếp tục mua sắm</Link>
        </div>
      </div>
    );
  }

  return (
    <div className="checkout-container">
      <div className="breadcrumbs">
        <div className="container">
          <span>Trang chủ / Giỏ hàng / Thanh toán</span>
        </div>
      </div>
      
      <div className="container checkout-main">
        <div className="checkout-grid">
          {/* Left: Shipping Information */}
          <div className="checkout-section">
            <div className="section-header">
              <h2>Thông tin nhận hàng</h2>
              <Link to="/login" className="login-link">Đăng nhập</Link>
            </div>
            
            <form id="shipping-form" onSubmit={handleSubmit} className="shipping-form">
              <div className="form-group">
                <label htmlFor="email">Email *</label>
                <input
                  type="email"
                  id="email"
                  name="email"
                  value={formData.email}
                  onChange={handleInputChange}
                  required
                />
              </div>

              <div className="form-group">
                <label htmlFor="fullName">Họ và tên *</label>
                <input
                  type="text"
                  id="fullName"
                  name="fullName"
                  value={formData.fullName}
                  onChange={handleInputChange}
                  required
                />
              </div>

              <div className="form-group">
                <label htmlFor="phone">Số điện thoại *</label>
                <div className="phone-input">
                  <select className="country-code">
                    <option value="+84">🇻🇳 +84</option>
                  </select>
                  <input
                    type="tel"
                    id="phone"
                    name="phone"
                    value={formData.phone}
                    onChange={handleInputChange}
                    required
                  />
                </div>
              </div>

              <div className="form-group">
                <label htmlFor="province">Tỉnh thành *</label>
                <select
                  id="province"
                  name="province"
                  value={formData.province}
                  onChange={handleInputChange}
                  required
                >
                  <option value="">---</option>
                  <option value="hcm">TP. Hồ Chí Minh</option>
                  <option value="hn">Hà Nội</option>
                  <option value="dn">Đà Nẵng</option>
                </select>
              </div>

              <div className="form-group">
                <label htmlFor="district">Quận huyện *</label>
                <select
                  id="district"
                  name="district"
                  value={formData.district}
                  onChange={handleInputChange}
                  required
                  disabled={!formData.province}
                >
                  <option value="">---</option>
                  {formData.province && (
                    <>
                      <option value="q1">Quận 1</option>
                      <option value="q2">Quận 2</option>
                      <option value="q3">Quận 3</option>
                    </>
                  )}
                </select>
              </div>

              <div className="form-group">
                <label htmlFor="ward">Phường xã *</label>
                <select
                  id="ward"
                  name="ward"
                  value={formData.ward}
                  onChange={handleInputChange}
                  required
                  disabled={!formData.district}
                >
                  <option value="">---</option>
                  {formData.district && (
                    <>
                      <option value="p1">Phường 1</option>
                      <option value="p2">Phường 2</option>
                      <option value="p3">Phường 3</option>
                    </>
                  )}
                </select>
              </div>

              <div className="form-group">
                <label htmlFor="address">Số nhà, tên đường *</label>
                <input
                  type="text"
                  id="address"
                  name="address"
                  value={formData.address}
                  onChange={handleInputChange}
                  required
                />
              </div>

              <div className="form-group">
                <label htmlFor="note">Ghi chú (tùy chọn)</label>
                <textarea
                  id="note"
                  name="note"
                  value={formData.note}
                  onChange={handleInputChange}
                  rows={3}
                />
              </div>
            </form>
          </div>

          {/* Middle: Shipping & Payment */}
          <div className="checkout-section">
            <div className="shipping-section">
              <h3>Vận chuyển</h3>
              <div className="shipping-banner">
                Vui lòng nhập thông tin giao hàng
              </div>
            </div>

            <div className="payment-section">
              <h3>Thanh toán</h3>
              <div className="payment-options">
                <label className="payment-option">
                  <input
                    type="radio"
                    name="payment"
                    value="vietqr"
                    checked={paymentMethod === 'vietqr'}
                    onChange={(e) => setPaymentMethod(e.target.value)}
                  />
                  <div className="payment-content">
                    <div className="payment-title">Chuyển khoản qua ngân hàng (VietQR)</div>
                    <div className="payment-subtitle">(Miễn phí thanh toán)</div>
                  </div>
                  <div className="payment-logo">
                    <div className="vietqr-logo">VIETQR™</div>
                  </div>
                </label>

                <label className="payment-option">
                  <input
                    type="radio"
                    name="payment"
                    value="payoo"
                    checked={paymentMethod === 'payoo'}
                    onChange={(e) => setPaymentMethod(e.target.value)}
                  />
                  <div className="payment-content">
                    <div className="payment-title">Payoo - Thanh toán online, trả góp 0% lãi suất qua thẻ Visa, Master, JCB, Amex</div>
                    <div className="payment-subtitle">(Miễn phí thanh toán)</div>
                  </div>
                  <div className="payment-logo">
                    <div className="card-logos">
                      <span>Visa</span>
                      <span>Mastercard</span>
                      <span>JCB</span>
                      <span>Amex</span>
                    </div>
                  </div>
                </label>

                <label className="payment-option">
                  <input
                    type="radio"
                    name="payment"
                    value="cod"
                    checked={paymentMethod === 'cod'}
                    onChange={(e) => setPaymentMethod(e.target.value)}
                  />
                  <div className="payment-content">
                    <div className="payment-title">Thanh toán khi giao hàng (COD)</div>
                  </div>
                  <div className="payment-logo">
                    <div className="cod-icon">💰🚚</div>
                  </div>
                </label>

                <label className="payment-option">
                  <input
                    type="radio"
                    name="payment"
                    value="fundiin"
                    checked={paymentMethod === 'fundiin'}
                    onChange={(e) => setPaymentMethod(e.target.value)}
                  />
                  <div className="payment-content">
                    <div className="payment-title">Fundiin - Mua trả sau 0% lãi</div>
                    <div className="fundiin-badge">Giảm đến 50K</div>
                  </div>
                  <div className="payment-logo">
                    <div className="fundiin-logo">Fundiin</div>
                  </div>
                </label>
              </div>
            </div>
          </div>

          {/* Right: Order Summary */}
          <div className="checkout-section order-summary">
            <div className="summary-items">
              {items.map(item => (
                <div key={item.id} className="summary-item">
                  <div className="item-image"></div>
                  <div className="item-details">
                    <div className="item-name">{item.name}</div>
                    <div className="item-price">{formatPrice(item.price)}</div>
                  </div>
                </div>
              ))}
            </div>

            <div className="discount-section">
              <input type="text" placeholder="Nhập mã giảm giá" className="discount-input" />
              <button className="apply-btn">Áp dụng</button>
            </div>

            <div className="price-summary">
              <div className="price-row">
                <span>Tạm tính</span>
                <span>{formatPrice(totalPrice)}</span>
              </div>
              <div className="price-row">
                <span>Phí vận chuyển</span>
                <span>-</span>
              </div>
              <div className="price-row total">
                <span>Tổng cộng</span>
                <span>{formatPrice(totalPrice)}</span>
              </div>
            </div>

            <div className="checkout-actions">
              <Link to="/cart" className="back-link">← Quay về giỏ hàng</Link>
              <button type="submit" form="shipping-form" className="place-order-btn">
                ĐẶT HÀNG
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CheckoutPage;
