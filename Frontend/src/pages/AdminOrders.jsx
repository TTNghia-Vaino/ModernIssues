import React, { useState, useEffect } from 'react';
import * as orderService from '../services/orderService';
import { useNotification } from '../context/NotificationContext';
import { useAuth } from '../context/AuthContext';
import './AdminOrders.css';

const AdminOrders = () => {
  const { error: showError, success: showSuccess } = useNotification();
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
      console.log('[AdminOrders] Loading orders from API...');
      const ordersData = await orderService.getOrders();
      
      console.log('[AdminOrders] Raw API response:', ordersData);
      
      // Handle different response formats
      let ordersArray = [];
      
      // Ensure we have an array
      const rawArray = Array.isArray(ordersData) 
        ? ordersData 
        : (ordersData?.data || ordersData?.items || ordersData?.orders || []);
      
      // Map API response format to frontend format
      // API format: { order_id, customer_name, order_date, status, total_amount, types, types_display }
      ordersArray = rawArray.map(order => ({
        // IDs
        id: order.order_id,
        orderId: order.order_id,
        
        // Dates
        orderDate: order.order_date,
        date: order.order_date,
        createdAt: order.order_date,
        
        // Status
        status: order.status || 'pending',
        
        // Amount
        total: order.total_amount || 0,
        totalPrice: order.total_amount || 0,
        amount: order.total_amount || 0,
        
        // Customer info
        customerName: order.customer_name || '',
        fullName: order.customer_name || '',
        
        // Payment
        paymentMethod: order.types || 'COD',
        paymentMethodDisplay: order.types_display || 'Thanh toán khi nhận hàng',
        types: order.types,
        typesDisplay: order.types_display,
        
        // Keep original data for reference
        ...order
      }));
      
      console.log('[AdminOrders] Parsed orders array:', ordersArray.length, 'orders');
      if (ordersArray.length > 0) {
        console.log('[AdminOrders] First order sample:', ordersArray[0]);
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
        showError('Lỗi khi tải danh sách đơn hàng: ' + (error.message || 'Lỗi không xác định'));
      }
      setOrders([]);
    } finally {
      setLoading(false);
    }
  };

  const handleViewDetails = async (order) => {
    try {
      setLoading(true);
      const orderId = order.id || order.orderId;
      console.log('[AdminOrders] Loading order details for order:', orderId);
      
      // Fetch full order details from API
      const orderDetails = await orderService.getOrderDetails(orderId);
      
      console.log('[AdminOrders] Order details response:', orderDetails);
      
      // Extract order and order_details from response
      // API format: { order: {...}, order_details: [...] }
      const orderInfo = orderDetails.order || {};
      const orderDetailsArray = orderDetails.order_details || [];
      
      // Map order details items
      // API format: { product_id, product_name, price_at_purchase, quantity, image_url }
      const mappedItems = orderDetailsArray.map(item => ({
        id: item.product_id,
        productId: item.product_id,
        name: item.product_name,
        productName: item.product_name,
        price: item.price_at_purchase || 0,
        priceAtPurchase: item.price_at_purchase || 0,
        quantity: item.quantity || 1,
        image: item.image_url || '/placeholder.png',
        imageUrl: item.image_url || '/placeholder.png'
      }));
      
      // Merge order info with existing order data
      const mappedOrder = {
        ...order,
        // Order info from API
        order: orderInfo,
        orderDetails: orderDetailsArray,
        items: mappedItems,
        orderItems: mappedItems,
        
        // Update fields from API
        // API order format: { order_id, user_id, customer_name, phone, address, email, order_date, status, total_amount, types, types_display }
        id: orderInfo.order_id || order.id,
        orderId: orderInfo.order_id || order.orderId,
        userId: orderInfo.user_id,
        status: orderInfo.status || order.status,
        total: orderInfo.total_amount || order.total,
        totalPrice: orderInfo.total_amount || order.total,
        amount: orderInfo.total_amount || order.total,
        customerName: orderInfo.customer_name || order.customerName,
        fullName: orderInfo.customer_name || order.fullName,
        customerEmail: orderInfo.email || order.customerEmail,
        email: orderInfo.email || order.email,
        customerPhone: orderInfo.phone || order.customerPhone,
        phone: orderInfo.phone || order.phone,
        shippingAddress: orderInfo.address || order.shippingAddress,
        address: orderInfo.address || order.address,
        paymentMethod: orderInfo.types || order.paymentMethod,
        paymentMethodDisplay: orderInfo.types_display || order.paymentMethodDisplay,
        types: orderInfo.types,
        typesDisplay: orderInfo.types_display,
        orderDate: orderInfo.order_date || order.orderDate,
        createdAt: orderInfo.order_date || order.createdAt
      };
      
      console.log('[AdminOrders] Mapped order details:', mappedOrder);
      setSelectedOrder(mappedOrder);
      setShowModal(true);
    } catch (error) {
      console.error('[AdminOrders] Error loading order details:', error);
      showError('Lỗi khi tải chi tiết đơn hàng: ' + (error.message || 'Lỗi không xác định'));
    } finally {
      setLoading(false);
    }
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
      showSuccess(`Cập nhật trạng thái đơn hàng #${orderId} thành công!`);
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
    // Handle both types field and paymentMethod field
    if (typeof method === 'object' && method !== null) {
      return method.types_display || method.typesDisplay || method.types || 'N/A';
    }
    
    switch (method) {
      case 'COD': return 'Thanh toán khi nhận hàng';
      case 'credit_card': return 'Thẻ tín dụng';
      case 'bank_transfer': return 'Chuyển khoản';
      case 'cash': return 'Tiền mặt';
      default: return method || 'N/A';
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    try {
      const date = new Date(dateString);
      return date.toLocaleString('vi-VN', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch (error) {
      return dateString;
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
      {loading && orders.length === 0 && (
        <div className="loading-overlay">
          <div className="loading-spinner">
            <div className="spinner"></div>
            <p>Đang tải danh sách đơn hàng...</p>
          </div>
        </div>
      )}
      
      <div className="page-header">
        <div className="page-titles">
          <h2>Quản lý đơn hàng</h2>
          <p className="page-sub">Quản lý và theo dõi đơn hàng</p>
        </div>
      </div>

      {/* Thanh bộ lọc dạng bar */}
      <div className="filters-bar">
        <div className="filter-item search">
          <input
            type="text"
            placeholder="🔍 Tìm kiếm theo mã đơn hàng, tên khách hàng hoặc email..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <div className="filter-item">
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

      <div className="data-table-container">
        {loading && orders.length > 0 ? (
          <div className="loading-overlay-inline">
            <div className="spinner"></div>
            <p>Đang cập nhật...</p>
          </div>
        ) : filteredOrders.length > 0 ? (
          <div className="data-table">
            <div className="orders-table">
              <div className="table-header">
                <div className="col-id">Mã đơn hàng</div>
                <div className="col-customer">Khách hàng</div>
                <div className="col-total">Tổng tiền</div>
                <div className="col-payment">Phương thức thanh toán</div>
                <div className="col-status">Trạng thái</div>
                <div className="col-date">Ngày đặt</div>
                <div className="col-actions">Thao tác</div>
              </div>
              {filteredOrders.map((order) => {
                const orderId = order.id || order.orderId || 'N/A';
                const customerName = order.customerName || order.fullName || order.name || 'Khách hàng';
                const total = order.total || order.totalPrice || order.amount || 0;
                const orderDate = formatDate(order.orderDate || order.createdAt || order.date);
                const status = order.status || 'pending';
                
                return (
                  <div 
                    key={orderId} 
                    className="table-row"
                    onClick={() => handleViewDetails(order)}
                    style={{ cursor: 'pointer' }}
                  >
                    <div className="col-id">
                      <span className="id-badge">{orderId}</span>
                    </div>
                    <div className="col-customer">
                      <div className="customer-name">{customerName}</div>
                    </div>
                    <div className="col-total">{typeof total === 'number' ? total.toLocaleString() : total} VNĐ</div>
                    <div className="col-payment">
                      {getPaymentMethodText(order.paymentMethodDisplay || order.typesDisplay || order.paymentMethod || order.types)}
                    </div>
                    <div className="col-status">
                      <span className={`status-badge ${getStatusClass(status)}`}>
                        {getStatusText(status)}
                      </span>
                    </div>
                    <div className="col-date">{orderDate}</div>
                    <div className="col-actions" onClick={(e) => e.stopPropagation()}>
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
          </div>
        ) : (
          <div className="no-results">
            <p>{orders.length === 0 ? 'Chưa có đơn hàng nào.' : 'Không tìm thấy đơn hàng nào phù hợp với bộ lọc.'}</p>
          </div>
        )}
      </div>

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
                  {(selectedOrder.items || selectedOrder.orderItems || selectedOrder.orderDetails || []).map((item, index) => (
                    <div key={index} className="item-row">
                      <img 
                        src={item.image || item.imageUrl || '/placeholder.png'} 
                        alt={item.name || item.productName || 'Product'} 
                        className="item-image"
                        onError={(e) => { e.target.src = '/placeholder.png' }}
                      />
                      <div className="item-info">
                        <div className="item-name">{item.name || item.productName || 'Sản phẩm'}</div>
                        <div className="item-meta">
                          <span className="item-quantity">SL: {item.quantity || 1}</span>
                        </div>
                      </div>
                      <div className="item-total">
                        {((item.price || item.priceAtPurchase || 0) * (item.quantity || 1)).toLocaleString()} VNĐ
                      </div>
                    </div>
                  ))}
                </div>
                <div className="total-row">
                  <strong>
                    Tổng cộng: {
                      typeof selectedOrder.total === 'number' 
                        ? selectedOrder.total.toLocaleString() 
                        : (selectedOrder.totalPrice || selectedOrder.amount || 
                           (selectedOrder.order && selectedOrder.order.total_amount) || 0).toLocaleString()
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
                    <span>{getPaymentMethodText(selectedOrder.paymentMethodDisplay || selectedOrder.typesDisplay || selectedOrder.paymentMethod || selectedOrder.types)}</span>
                  </div>
                  <div className="detail-item">
                    <label>Ngày đặt hàng:</label>
                    <span>{formatDate(selectedOrder.orderDate || selectedOrder.createdAt || selectedOrder.date)}</span>
                  </div>
                  {selectedOrder.deliveryDate && (
                    <div className="detail-item">
                      <label>Ngày giao hàng:</label>
                      <span>{formatDate(selectedOrder.deliveryDate)}</span>
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

