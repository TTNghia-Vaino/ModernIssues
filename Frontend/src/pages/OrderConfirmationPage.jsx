import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useCart } from '../context/CartContext';
import './OrderConfirmationPage.css';

const formatPrice = (price) => price.toLocaleString('vi-VN') + '₫';

const OrderConfirmationPage = () => {
  const navigate = useNavigate();
  const { clearCart } = useCart();

  const [orderData, setOrderData] = useState(null);

  useEffect(() => {
    // Get order data from localStorage
    const savedOrder = localStorage.getItem('lastOrder');
    if (savedOrder) {
      try {
        const order = JSON.parse(savedOrder);
        
        // Normalize order data structure to handle different API response formats
        const normalizedOrder = {
          orderId: order.orderId || order.id || order.order_id || 'N/A',
          email: order.email || order.customerEmail || '',
          fullName: order.fullName || order.customerName || order.name || '',
          phone: order.phone || order.customerPhone || '',
          province: order.province || '',
          district: order.district || '',
          ward: order.ward || '',
          address: order.address || order.shippingAddress || '',
          note: order.note || '',
          paymentMethod: order.paymentMethod || order.payment_method || 'cod',
          items: order.items || order.orderItems || [],
          totalPrice: order.totalPrice || order.total || order.amount || 0
        };
        
        setOrderData(normalizedOrder);
        // Clear cart after successful order
        clearCart();
      } catch (error) {
        console.error('[OrderConfirmationPage] Error parsing order data:', error);
        navigate('/');
      }
    } else {
      // If no order data, redirect to home
      navigate('/');
    }
  }, [clearCart, navigate]);


  const handlePrint = () => {
    window.print();
  };


  // ========================================
  // RENDER HELPERS
  // ========================================

  if (!orderData) {
    return (
      <div className="order-confirmation-container">
        <div className="loading">Đang tải...</div>
      </div>
    );
  }

  return (
    <div className="order-confirmation-container">
      <div className="container">
        {/* Header with logo and success message */}
        <div className="confirmation-header">
          <div className="logo-section">
            <div className="logo">TechZone</div>
          </div>
          
          <div className="success-section">
            <div className="success-icon">✓</div>
            <div className="success-content">
              <h1>Cảm ơn bạn đã đặt hàng</h1>
              <p className="confirmation-message">
                Một email xác nhận đã được gửi tới {orderData.email}. 
                Xin vui lòng kiểm tra email của bạn
              </p>
            </div>
          </div>
        </div>

        {/* Main content - Two columns */}
        <div className="confirmation-content">
          {/* Left column - Customer and shipping details */}
          <div className="confirmation-left">
            <div className="info-section">
              <h3>Thông tin mua hàng</h3>
              <div className="info-item">
                <span className="label">Họ tên:</span>
                <span className="value">{orderData.fullName}</span>
              </div>
              <div className="info-item">
                <span className="label">Email:</span>
                <span className="value">{orderData.email}</span>
              </div>
              <div className="info-item">
                <span className="label">Số điện thoại:</span>
                <span className="value">{orderData.phone}</span>
              </div>
            </div>

            <div className="info-section">
              <h3>Phương thức thanh toán</h3>
              <div className="info-item">
                <span className="value">
                  {orderData.paymentMethod === 'cod' ? 'Thanh toán khi giao hàng (COD)' :
                   orderData.paymentMethod === 'vietqr' ? 'Chuyển khoản qua ngân hàng (VietQR)' :
                   orderData.paymentMethod === 'payoo' ? 'Payoo - Thanh toán online' :
                   orderData.paymentMethod === 'fundiin' ? 'Fundiin - Mua trả sau 0% lãi' :
                   'Phương thức thanh toán khác'}
                </span>
              </div>
            </div>

            <div className="info-section">
              <h3>Địa chỉ nhận hàng</h3>
              <div className="info-item">
                <span className="label">Họ tên:</span>
                <span className="value">{orderData.fullName}</span>
              </div>
              <div className="info-item">
                <span className="label">Ghi chú:</span>
                <span className="value">{orderData.note || 'Không có ghi chú'}</span>
              </div>
              <div className="info-item">
                <span className="label">Địa chỉ:</span>
                <span className="value">
                  {orderData.address}, {orderData.ward}, {orderData.district}, {orderData.province}
                </span>
              </div>
              <div className="info-item">
                <span className="label">Số điện thoại:</span>
                <span className="value">{orderData.phone}</span>
              </div>
            </div>

            <div className="info-section">
              <h3>Phương thức vận chuyển</h3>
              <div className="info-item">
                <span className="value">GIAO NHANH 8-16 tiếng (Trong giờ hành chính)</span>
              </div>
              <div className="info-item">
                <span className="value">Giao từ thứ 2 đến thứ 7</span>
              </div>
            </div>
          </div>

          {/* Right column - Order summary */}
          <div className="confirmation-right">
            <div className="order-summary">
              <h3>Đơn hàng {orderData.orderId} ({orderData.items?.length || 0})</h3>
              
              <div className="order-items">
                {orderData.items && orderData.items.length > 0 ? (
                  orderData.items.map((item, index) => (
                    <div key={index} className="order-item">
                      <div className="item-image">
                        {item.image ? (
                          <img 
                            src={item.image} 
                            alt={item.name || item.productName} 
                            className="item-thumbnail"
                            onError={(event) => {
                              if (event.currentTarget.dataset.fallbackApplied === 'true') {
                                return;
                              }
                              event.currentTarget.dataset.fallbackApplied = 'true';
                              event.currentTarget.src = 'https://via.placeholder.com/100?text=No+Image';
                            }}
                          />
                        ) : (
                          <div className="item-thumbnail"></div>
                        )}
                      </div>
                      <div className="item-quantity">
                        <div className="quantity-circle">{item.quantity || 1}</div>
                      </div>
                      <div className="item-details">
                        <div className="item-name">{item.name || item.productName || 'Sản phẩm'}</div>
                        {(item.variant || item.capacity) && (
                          <div className="item-variant">{item.variant || item.capacity}</div>
                        )}
                        <div className="item-price">
                          {formatPrice(typeof item.price === 'number' ? item.price : (item.price || 0))}
                        </div>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="no-items">Không có sản phẩm trong đơn hàng</div>
                )}
              </div>

              <div className="order-totals">
                <div className="total-row">
                  <span>Tạm tính</span>
                  <span>{formatPrice(typeof orderData.totalPrice === 'number' ? orderData.totalPrice : 0)}</span>
                </div>
                <div className="total-row">
                  <span>Phí vận chuyển</span>
                  <span>Miễn phí</span>
                </div>
                <div className="total-row final-total">
                  <span>Tổng cộng</span>
                  <span>{formatPrice(typeof orderData.totalPrice === 'number' ? orderData.totalPrice : 0)}</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Action buttons */}
        <div className="confirmation-actions">
          <Link to="/products" className="action-btn continue-shopping">
            Tiếp tục mua hàng
          </Link>
          <button onClick={handlePrint} className="action-btn print-btn">
            <span className="print-icon">🖨️</span>
            In
          </button>
        </div>
      </div>
    </div>
  );
};

export default OrderConfirmationPage;