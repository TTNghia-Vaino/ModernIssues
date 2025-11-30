import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useCart } from '../context/CartContext';
import { useAuth } from '../context/AuthContext';
import { useNotification } from '../context/NotificationContext';
import * as checkoutService from '../services/checkoutService';
import * as emailService from '../services/emailService';
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
  const { items, totalCount, totalPrice, reloadCart, clearCart } = useCart();
  const { isAuthenticated } = useAuth();
  const { error: showError, warning: showWarning } = useNotification();
  
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
  const [isSubmitting, setIsSubmitting] = useState(false);

  // ========================================
  // EVENT HANDLERS
  // ========================================

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // Validate form
    if (!formData.email || !formData.fullName || !formData.phone || 
        !formData.province || !formData.district || !formData.ward || !formData.address) {
      showWarning('Vui lòng điền đầy đủ thông tin bắt buộc');
      return;
    }

    // Check if cart is empty
    if (items.length === 0) {
      showWarning('Giỏ hàng trống. Vui lòng thêm sản phẩm vào giỏ hàng trước khi đặt hàng.');
      return;
    }

    // Check if user is authenticated (Checkout API requires authentication)
    if (!isAuthenticated) {
      showWarning('Vui lòng đăng nhập để đặt hàng.');
      navigate('/login');
      return;
    }

    try {
      setIsSubmitting(true);
      
      // Prepare checkout data for API
      // Backend API only needs paymentType, cart items are taken from user's current cart
      const checkoutData = {
        paymentMethod: paymentMethod,  // Frontend payment method (vietqr, cod, etc.)
        // Shipping info can be stored in order notes or separate table
        shippingInfo: {
          email: formData.email,
          fullName: formData.fullName,
          phone: formData.phone,
          province: formData.province,
          district: formData.district,
          ward: formData.ward,
          address: formData.address,
          note: formData.note || ''
        }
      };

      // Call Checkout API
      try {
        const createdOrder = await checkoutService.checkout(checkoutData);
        console.log('[CheckoutPage] Order created successfully:', createdOrder);
        
        // Backend returns OrderDto with: orderId, qrUrl, gencode, totalAmount, status, orderDetails, etc.
        const orderData = {
          // Order info from backend
          orderId: createdOrder.orderId || createdOrder.order_id,
          totalPrice: createdOrder.totalAmount || createdOrder.totalAmount || totalPrice,
          totalAmount: createdOrder.totalAmount,
          orderDate: createdOrder.orderDate || createdOrder.orderDate,
          status: createdOrder.status || 'pending',
          paymentType: createdOrder.types || createdOrder.types,
          paymentTypeDisplay: createdOrder.typesDisplay || createdOrder.typesDisplay,
          
          // QR Payment info (only for Transfer/ATM)
          qrUrl: createdOrder.qrUrl || createdOrder.qrCodeUrl,
          gencode: createdOrder.gencode || createdOrder.genCode,
          
          // Order details
          items: createdOrder.orderDetails || createdOrder.orderItems || items.map(item => ({
            name: item.name,
            productName: item.name,
            quantity: item.quantity,
            price: item.price,
            image: item.image
          })),
          
          // Shipping info (from form)
          ...checkoutData.shippingInfo,
          
          // Additional fields from backend
          ...createdOrder
        };
        
        console.log('[CheckoutPage] Normalized order data:', orderData);
        
        // Reload cart from API to sync with backend
        // Backend clears the cart after successful checkout
        try {
          await reloadCart();
        } catch (cartError) {
          console.warn('[CheckoutPage] Failed to reload cart:', cartError);
          // Continue anyway, cart will be reloaded on next page visit
        }
        
        // Determine payment type from backend response or frontend selection
        const isQrPayment = createdOrder.qrUrl && createdOrder.gencode && 
                           (paymentMethod === 'vietqr' || paymentMethod === 'transfer' || paymentMethod === 'atm');
        
        // If payment method requires QR (Transfer/ATM), redirect to QR payment page
        // Otherwise (COD), redirect to confirmation page
        if (isQrPayment) {
          // Save order data to localStorage for QR payment page
          localStorage.setItem('pendingOrder', JSON.stringify(orderData));
          navigate('/qr-payment');
        } else {
          // Save order data to localStorage for confirmation page
          localStorage.setItem('lastOrder', JSON.stringify(orderData));
          // Clear cart after successful order (for non-QR payments)
          clearCart();
          navigate('/order-confirmation');
        }
      } catch (apiError) {
        console.error('[CheckoutPage] Checkout API failed:', apiError);
        
        // Show user-friendly error message
        const errorMessage = apiError.data?.message || 
                            apiError.data?.error || 
                            apiError.message || 
                            'Không thể tạo đơn hàng';
        
        if (apiError.status === 401) {
          showError('Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.');
          setTimeout(() => navigate('/login'), 1500);
        } else if (apiError.status === 400) {
          showError(`Lỗi: ${errorMessage}`);
        } else if (apiError.status === 403) {
          showError('Bạn không có quyền thực hiện thao tác này.');
        } else if (apiError.status === 404) {
          showError('Không tìm thấy tài nguyên. Vui lòng thử lại.');
        } else if (apiError.status >= 500) {
          showError('Lỗi server. Vui lòng thử lại sau.');
        } else {
          showError(`Có lỗi xảy ra khi đặt hàng: ${errorMessage}. Vui lòng thử lại.`);
        }
      }
    } catch (error) {
      console.error('[CheckoutPage] Unexpected error:', error);
      showError('Có lỗi xảy ra khi đặt hàng. Vui lòng thử lại.');
    } finally {
      setIsSubmitting(false);
    }
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
        {/* Progress Steps */}
        <div className="checkout-progress">
          <div className="progress-step completed">
            <div className="step-circle">✓</div>
            <span className="step-label">Giỏ hàng</span>
          </div>
          <div className="progress-line completed"></div>
          <div className="progress-step active">
            <div className="step-circle">2</div>
            <span className="step-label">Thanh toán</span>
          </div>
          <div className="progress-line"></div>
          <div className="progress-step">
            <div className="step-circle">3</div>
            <span className="step-label">Hoàn tất</span>
          </div>
        </div>

        <div className="checkout-grid">
          {/* Left: Shipping Information */}
          <div className="checkout-section">
            <div className="section-header">
              <h2>Thông tin nhận hàng</h2>
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
                  placeholder="example@email.com"
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
                  placeholder="Nguyễn Văn A"
                  required
                />
              </div>

              <div className="form-group">
                <label htmlFor="phone">Số điện thoại *</label>
                <input
                  type="tel"
                  id="phone"
                  name="phone"
                  value={formData.phone}
                  onChange={handleInputChange}
                  placeholder="0901234567"
                  required
                />
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label htmlFor="province">Tỉnh thành *</label>
                  <select
                    id="province"
                    name="province"
                    value={formData.province}
                    onChange={handleInputChange}
                    required
                  >
                    <option value="">Chọn tỉnh thành</option>
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
                    <option value="">Chọn quận huyện</option>
                    {formData.province && (
                      <>
                        <option value="q1">Quận 1</option>
                        <option value="q2">Quận 2</option>
                        <option value="q3">Quận 3</option>
                      </>
                    )}
                  </select>
                </div>
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
                  <option value="">Chọn phường xã</option>
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
                  placeholder="Ví dụ: 123 Đường Nguyễn Huệ"
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
                  placeholder="Ghi chú thêm về đơn hàng..."
                  rows={3}
                />
              </div>
            </form>

            {/* Shipping Section */}
            <div className="shipping-info-box">
              <h3>Vận chuyển</h3>
              <div className="shipping-method">
                <div className="method-icon"></div>
                <div className="method-details">
                  <div className="method-name">Giao hàng tiêu chuẩn</div>
                  <div className="method-time">Dự kiến: 2-3 ngày làm việc</div>
                </div>
                <div className="method-price">Miễn phí</div>
              </div>
            </div>

            {/* Payment Section */}
            <div className="payment-section">
              <h3>Phương thức thanh toán</h3>
              <div className="payment-options">
                <label className="payment-option">
                  <input
                    type="radio"
                    name="payment"
                    value="vietqr"
                    checked={paymentMethod === 'vietqr'}
                    onChange={(e) => setPaymentMethod(e.target.value)}
                  />
                  <div className="payment-icon">
                    <img src="/images/payment/fundiin-payment.svg" alt="VietQR" />
                  </div>
                  <div className="payment-content">
                    <div className="payment-title">Chuyển khoản qua ngân hàng</div>
                    <div className="payment-subtitle">VietQR - Miễn phí thanh toán</div>
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
                  <div className="payment-icon">
                    <img src="/images/payment/cod-payment.svg" alt="COD" />
                  </div>
                  <div className="payment-content">
                    <div className="payment-title">Thanh toán khi nhận hàng</div>
                    <div className="payment-subtitle">Thanh toán trực tiếp khi nhận hàng</div>
                  </div>
                </label>

              </div>
            </div>
          </div>

          {/* Right: Order Summary */}
          <div className="checkout-section order-summary">
            <h3 className="summary-title">Đơn hàng của bạn</h3>
            <div className="summary-items">
              {items.map(item => (
                <div key={`${item.id}-${item.capacity || 'default'}`} className="summary-item">
                  {item.image && (
                    <img src={item.image} alt={item.name} className="item-image" />
                  )}
                  {!item.image && <div className="item-image item-image-placeholder"></div>}
                  <div className="item-details">
                    <div className="item-name">{item.name}</div>
                    {item.capacity && <div className="item-capacity">{item.capacity}</div>}
                    <div className="item-price">{formatPrice(item.price)} × {item.quantity}</div>
                  </div>
                  <div className="item-total">{formatPrice(item.price * item.quantity)}</div>
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
              <button 
                type="submit" 
                form="shipping-form" 
                className="place-order-btn"
                disabled={isSubmitting}
              >
                {isSubmitting ? 'Đang xử lý...' : 'ĐẶT HÀNG'}
              </button>
              <Link to="/cart" className="back-link">← Quay về giỏ hàng</Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CheckoutPage;
