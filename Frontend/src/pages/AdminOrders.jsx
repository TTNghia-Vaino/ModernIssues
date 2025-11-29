import React, { useState, useEffect } from 'react';
import * as orderService from '../services/orderService';
import { useNotification } from '../context/NotificationContext';
import { useAuth } from '../context/AuthContext';
import {
  AdminPageHeader,
  AdminFiltersBar,
  AdminDataTable,
  AdminPagination,
  AdminLoadingOverlay,
  AdminModal
} from '../components/admin';
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
  
  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

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

  // Pagination calculation
  const totalPages = Math.ceil(filteredOrders.length / pageSize);
  const startIndex = (currentPage - 1) * pageSize;
  const endIndex = startIndex + pageSize;
  const paginatedOrders = filteredOrders.slice(startIndex, endIndex);

  // Reset to page 1 when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, filterStatus, filteredOrders.length]);

  // Table columns config
  const tableColumns = [
    { key: 'id', label: 'MÃ ĐƠN', className: 'col-id' },
    { key: 'customer', label: 'KHÁCH HÀNG', className: 'col-customer' },
    { key: 'total', label: 'TỔNG TIỀN', className: 'col-total' },
    { key: 'payment', label: 'PHƯƠNG THỨC THANH TOÁN', className: 'col-payment' },
    { key: 'status', label: 'TRẠNG THÁI', className: 'col-status' },
    { key: 'date', label: 'NGÀY ĐẶT', className: 'col-date' },
    { key: 'actions', label: 'THAO TÁC', className: 'col-actions' }
  ];

  // Render custom order row
  const renderOrderRow = (order) => {
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
  };

  // Filter options
  const statusFilterOptions = [
    { value: 'all', label: 'Tất cả trạng thái' },
    { value: 'pending', label: 'Chờ xác nhận' },
    { value: 'processing', label: 'Đang xử lý' },
    { value: 'delivered', label: 'Đã giao' },
    { value: 'cancelled', label: 'Đã hủy' }
  ];

  return (
    <div className="admin-orders">
      <AdminLoadingOverlay 
        loading={loading} 
        hasData={orders.length > 0}
        message="Đang tải danh sách đơn hàng..."
      >
        <AdminPageHeader
          title="Quản lý đơn hàng"
          subtitle="Quản lý và theo dõi đơn hàng"
          showAddButton={false}
        />

        <AdminFiltersBar
          searchValue={searchTerm}
          onSearchChange={setSearchTerm}
          searchPlaceholder="🔍 Tìm kiếm theo mã đơn hàng, tên khách hàng hoặc email..."
          filters={[
            {
              key: 'status',
              value: filterStatus,
              onChange: setFilterStatus,
              options: statusFilterOptions
            }
          ]}
        />

        <AdminDataTable
          columns={tableColumns}
          data={paginatedOrders}
          renderRow={renderOrderRow}
          loading={loading}
          totalItems={orders.length}
          emptyMessage="Chưa có đơn hàng nào."
          noResultsMessage="Không tìm thấy đơn hàng nào phù hợp với bộ lọc."
          tableClassName="orders-table"
        />

        {filteredOrders.length > 0 && (
          <AdminPagination
            currentPage={currentPage}
            totalPages={totalPages}
            pageSize={pageSize}
            totalItems={filteredOrders.length}
            startIndex={startIndex}
            endIndex={endIndex}
            onPageChange={setCurrentPage}
            onPageSizeChange={(size) => {
              setPageSize(size);
              setCurrentPage(1);
            }}
            pageSizeOptions={[10, 20, 50]}
            itemName="đơn hàng"
          />
        )}
      </AdminLoadingOverlay>

      {/* Modal */}
      <AdminModal
        open={showModal && !!selectedOrder}
        onOpenChange={setShowModal}
        title={`Chi tiết đơn hàng ${selectedOrder?.id || ''}`}
        description="Xem thông tin chi tiết đơn hàng"
        size="4xl"
        className="order-details"
        footer={null}
      >
        {selectedOrder && (
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
        )}
      </AdminModal>
    </div>
  );
};

export default AdminOrders;

