import React, { useState, useEffect } from 'react';
import * as orderService from '../services/orderService';
import { useNotification } from '../context/NotificationContext';
import { useAuth } from '../context/AuthContext';
import './AdminOrders.css';

const AdminOrders = () => {
  const { error: showError } = useNotification();
  const { isInTokenGracePeriod } = useAuth();
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(false);

  const [showModal, setShowModal] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');

  // Load orders from API on mount, but delay if in grace period
  useEffect(() => {
    let cancelled = false;
    
    const attemptLoad = async () => {
      // If in grace period, wait for it to end
      if (isInTokenGracePeriod) {
        console.log('[AdminOrders] Waiting for token grace period to end before loading orders');
        // Wait for grace period to end (5 seconds) plus a small buffer (1 second)
        await new Promise(resolve => setTimeout(resolve, 6000));
        if (cancelled) return;
      }
      
      if (!cancelled) {
        loadOrders();
      }
    };
    
    attemptLoad();
    
    return () => {
      cancelled = true;
    };
  }, []); // Only run on mount

  const loadOrders = async () => {
    try {
      setLoading(true);
      const ordersData = await orderService.getOrders();
      
      // Handle different response formats
      let ordersArray = [];
      if (Array.isArray(ordersData)) {
        // Check if it's array of strings (from Swagger example) or array of objects
        if (ordersData.length > 0 && typeof ordersData[0] === 'string') {
          // If backend returns array of strings (order IDs), we need to fetch each order
          console.warn('[AdminOrders] API returned array of strings, expected array of order objects');
          // For now, set empty array - backend should return full order objects
          ordersArray = [];
        } else {
          ordersArray = ordersData;
        }
      } else if (ordersData && typeof ordersData === 'object') {
        ordersArray = ordersData.data || ordersData.items || ordersData.orders || [];
      }
      
      setOrders(ordersArray);
    } catch (error) {
      console.error('[AdminOrders] Error loading orders:', error);
      // Show user-friendly error message
      if (error.status === 401 || error.isUnauthorized) {
        // Only redirect if not in grace period
        if (!isInTokenGracePeriod) {
          showError('Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.');
          setTimeout(() => {
            window.location.href = '/login?redirect=/admin/orders';
          }, 2000);
        } else {
          console.log('[AdminOrders] Ignoring 401 during grace period, will retry later');
        }
        return;
      } else {
        console.error('Failed to load orders:', error.message || error);
      }
      setOrders([]);
    } finally {
      setLoading(false);
    }
  };

  const handleViewDetails = (order) => {
    setSelectedOrder(order);
    setShowModal(true);
  };

  const handleStatusChange = async (orderId, newStatus) => {
    // Save original orders for rollback on error
    const originalOrders = [...orders];
    
    try {
      setLoading(true);
      
      // Update local state optimistically
      setOrders(orders.map(order => {
        const currentOrderId = order.id || order.orderId;
        return currentOrderId === orderId 
          ? { ...order, status: newStatus }
          : order;
      }));
      
      // Call API to update order status
      await orderService.updateOrderStatus(orderId, newStatus);
      console.log(`[AdminOrders] Order ${orderId} status changed to ${newStatus}`);
    } catch (error) {
      console.error('[AdminOrders] Error updating order status:', error);
      // Revert optimistic update on error
      setOrders(originalOrders);
      showError(`Lỗi khi cập nhật trạng thái đơn hàng: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const getStatusClass = (status) => {
    switch (status) {
      case 'delivered': return 'status-delivered';
      case 'processing': return 'status-processing';
      case 'pending': return 'status-pending';
      case 'cancelled': return 'status-cancelled';
      default: return 'status-default';
    }
  };

  const getStatusText = (status) => {
    switch (status) {
      case 'delivered': return 'Đã giao';
      case 'processing': return 'Đang xử lý';
      case 'pending': return 'Chờ xác nhận';
      case 'cancelled': return 'Đã hủy';
      default: return 'Không xác định';
    }
  };

  const getPaymentMethodText = (method) => {
    switch (method) {
      case 'credit_card': return 'Thẻ tín dụng';
      case 'bank_transfer': return 'Chuyển khoản';
      case 'cash': return 'Tiền mặt';
      default: return method;
    }
  };

  // Lọc dữ liệu
  const filteredOrders = orders.filter(order => {
    if (!order || typeof order !== 'object') return false;
    
    const orderId = String(order.id || order.orderId || '');
    const customerName = String(order.customerName || order.fullName || order.name || '');
    const customerEmail = String(order.customerEmail || order.email || '');
    
    const matchesSearch = orderId.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         customerName.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         customerEmail.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = filterStatus === 'all' || (order.status === filterStatus);
    
    return matchesSearch && matchesStatus;
  });

  return (
    <div className="admin-orders">
      <div className="page-header">
        <h2>Quản lý đơn hàng</h2>
      </div>

      {/* Filters */}
      <div className="filters-section">
        <div className="search-box">
          <input
            type="text"
            placeholder="Tìm kiếm theo mã đơn hàng, tên khách hàng hoặc email..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        
        <div className="filter-controls">
          <select 
            value={filterStatus} 
            onChange={(e) => setFilterStatus(e.target.value)}
          >
            <option value="all">Tất cả trạng thái</option>
            <option value="pending">Chờ xác nhận</option>
            <option value="processing">Đang xử lý</option>
            <option value="delivered">Đã giao</option>
            <option value="cancelled">Đã hủy</option>
          </select>
        </div>
      </div>

      <div className="orders-table">
        <div className="table-header">
          <div className="col-id">Mã đơn hàng</div>
          <div className="col-customer">Khách hàng</div>
          <div className="col-items">Sản phẩm</div>
          <div className="col-total">Tổng tiền</div>
          <div className="col-status">Trạng thái</div>
          <div className="col-date">Ngày đặt</div>
          <div className="col-actions">Thao tác</div>
        </div>

        {filteredOrders.map((order) => {
          const orderId = order.id || order.orderId || 'N/A';
          const customerName = order.customerName || order.fullName || order.name || 'N/A';
          const customerEmail = order.customerEmail || order.email || 'N/A';
          const items = order.items || order.orderItems || [];
          const total = order.total || order.totalPrice || order.amount || 0;
          const orderDate = order.orderDate || order.createdAt || order.date || 'N/A';
          const status = order.status || 'pending';
          
          return (
            <div key={orderId} className="table-row">
              <div className="col-id">{orderId}</div>
              <div className="col-customer">
                <div className="customer-name">{customerName}</div>
                <div className="customer-email">{customerEmail}</div>
              </div>
              <div className="col-items">
                {items.length > 0 ? (
                  items.map((item, index) => (
                    <div key={index} className="item-info">
                      {item.name || item.productName} x{item.quantity || 1}
                    </div>
                  ))
                ) : (
                  <div className="item-info">Không có sản phẩm</div>
                )}
              </div>
              <div className="col-total">{typeof total === 'number' ? total.toLocaleString() : total} VNĐ</div>
              <div className="col-status">
                <span className={`status-badge ${getStatusClass(status)}`}>
                  {getStatusText(status)}
                </span>
              </div>
              <div className="col-date">{orderDate}</div>
              <div className="col-actions">
                <button 
                  className="view-btn"
                  onClick={() => handleViewDetails(order)}
                >
                  👁️
                </button>
                <select 
                  className="status-select"
                  value={status}
                  onChange={(e) => handleStatusChange(orderId, e.target.value)}
                >
                  <option value="pending">Chờ xác nhận</option>
                  <option value="processing">Đang xử lý</option>
                  <option value="delivered">Đã giao</option>
                  <option value="cancelled">Đã hủy</option>
                </select>
              </div>
            </div>
          );
        })}
      </div>

      {filteredOrders.length === 0 && (
        <div className="no-results">
          <p>Không tìm thấy đơn hàng nào phù hợp với bộ lọc.</p>
        </div>
      )}

      {/* Modal */}
      {showModal && selectedOrder && (
        <div className="modal-overlay">
          <div className="modal-content order-details">
            <div className="modal-header">
              <h3>Chi tiết đơn hàng {selectedOrder.id}</h3>
              <button 
                className="close-btn"
                onClick={() => setShowModal(false)}
              >
                ✕
              </button>
            </div>
            
            <div className="order-details-content">
              <div className="details-section">
                <h4>Thông tin khách hàng</h4>
                <div className="detail-grid">
                  <div className="detail-item">
                    <label>Tên:</label>
                    <span>{selectedOrder.customerName || selectedOrder.fullName || selectedOrder.name || 'N/A'}</span>
                  </div>
                  <div className="detail-item">
                    <label>Email:</label>
                    <span>{selectedOrder.customerEmail || selectedOrder.email || 'N/A'}</span>
                  </div>
                  <div className="detail-item">
                    <label>Số điện thoại:</label>
                    <span>{selectedOrder.customerPhone || selectedOrder.phone || 'N/A'}</span>
                  </div>
                  <div className="detail-item">
                    <label>Địa chỉ giao hàng:</label>
                    <span>
                      {selectedOrder.shippingAddress || 
                       (selectedOrder.address ? 
                         `${selectedOrder.address}, ${selectedOrder.ward || ''}, ${selectedOrder.district || ''}, ${selectedOrder.province || ''}`.replace(/^,\s*|,\s*$/g, '') 
                         : 'N/A')}
                    </span>
                  </div>
                </div>
              </div>

              <div className="details-section">
                <h4>Sản phẩm</h4>
                <div className="items-list">
                  {(selectedOrder.items || selectedOrder.orderItems || []).map((item, index) => (
                    <div key={index} className="item-row">
                      <div className="item-name">{item.name || item.productName || 'Sản phẩm'}</div>
                      <div className="item-quantity">x{item.quantity || 1}</div>
                      <div className="item-price">
                        {typeof item.price === 'number' ? item.price.toLocaleString() : item.price || '0'} VNĐ
                      </div>
                    </div>
                  ))}
                </div>
                <div className="total-row">
                  <strong>
                    Tổng cộng: {
                      typeof selectedOrder.total === 'number' 
                        ? selectedOrder.total.toLocaleString() 
                        : (selectedOrder.totalPrice || selectedOrder.amount || 0).toLocaleString()
                    } VNĐ
                  </strong>
                </div>
              </div>

              <div className="details-section">
                <h4>Thông tin đơn hàng</h4>
                <div className="detail-grid">
                  <div className="detail-item">
                    <label>Trạng thái:</label>
                    <span className={`status-badge ${getStatusClass(selectedOrder.status || 'pending')}`}>
                      {getStatusText(selectedOrder.status || 'pending')}
                    </span>
                  </div>
                  <div className="detail-item">
                    <label>Phương thức thanh toán:</label>
                    <span>{getPaymentMethodText(selectedOrder.paymentMethod || selectedOrder.paymentMethod)}</span>
                  </div>
                  <div className="detail-item">
                    <label>Ngày đặt hàng:</label>
                    <span>{selectedOrder.orderDate || selectedOrder.createdAt || selectedOrder.date || 'N/A'}</span>
                  </div>
                  {selectedOrder.deliveryDate && (
                    <div className="detail-item">
                      <label>Ngày giao hàng:</label>
                      <span>{selectedOrder.deliveryDate}</span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminOrders;

