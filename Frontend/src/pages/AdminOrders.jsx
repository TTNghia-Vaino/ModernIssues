import React, { useState } from 'react';
import './AdminOrders.css';

const AdminOrders = () => {
  const [orders, setOrders] = useState([
    {
      id: 'ORD-001',
      customerName: 'Nguyễn Văn A',
      customerEmail: 'nguyenvana@email.com',
      customerPhone: '0123456789',
      items: [
        { name: 'iPhone 15 Pro', quantity: 1, price: 25000000 },
        { name: 'AirPods Pro', quantity: 1, price: 5000000 }
      ],
      total: 30000000,
      status: 'delivered',
      paymentMethod: 'credit_card',
      shippingAddress: '123 Đường ABC, Quận 1, TP.HCM',
      orderDate: '2024-01-15',
      deliveryDate: '2024-01-17'
    },
    {
      id: 'ORD-002',
      customerName: 'Trần Thị B',
      customerEmail: 'tranthib@email.com',
      customerPhone: '0987654321',
      items: [
        { name: 'MacBook Pro M3', quantity: 1, price: 45000000 }
      ],
      total: 45000000,
      status: 'processing',
      paymentMethod: 'bank_transfer',
      shippingAddress: '456 Đường XYZ, Quận 2, TP.HCM',
      orderDate: '2024-01-16',
      deliveryDate: null
    },
    {
      id: 'ORD-003',
      customerName: 'Lê Văn C',
      customerEmail: 'levanc@email.com',
      customerPhone: '0369258147',
      items: [
        { name: 'Samsung Galaxy S24', quantity: 1, price: 20000000 },
        { name: 'AirPods Pro', quantity: 1, price: 5000000 }
      ],
      total: 25000000,
      status: 'pending',
      paymentMethod: 'cash',
      shippingAddress: '789 Đường DEF, Quận 3, TP.HCM',
      orderDate: '2024-01-17',
      deliveryDate: null
    },
    {
      id: 'ORD-004',
      customerName: 'Phạm Thị D',
      customerEmail: 'phamthid@email.com',
      customerPhone: '0741852963',
      items: [
        { name: 'iPad Pro', quantity: 1, price: 18000000 }
      ],
      total: 18000000,
      status: 'cancelled',
      paymentMethod: 'credit_card',
      shippingAddress: '321 Đường GHI, Quận 4, TP.HCM',
      orderDate: '2024-01-18',
      deliveryDate: null
    }
  ]);

  const [showModal, setShowModal] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');

  const handleViewDetails = (order) => {
    setSelectedOrder(order);
    setShowModal(true);
  };

  const handleStatusChange = (orderId, newStatus) => {
    setOrders(orders.map(order => 
      order.id === orderId 
        ? { ...order, status: newStatus }
        : order
    ));
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
    const matchesSearch = order.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         order.customerName.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         order.customerEmail.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = filterStatus === 'all' || order.status === filterStatus;
    
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

        {filteredOrders.map((order) => (
          <div key={order.id} className="table-row">
            <div className="col-id">{order.id}</div>
            <div className="col-customer">
              <div className="customer-name">{order.customerName}</div>
              <div className="customer-email">{order.customerEmail}</div>
            </div>
            <div className="col-items">
              {order.items.map((item, index) => (
                <div key={index} className="item-info">
                  {item.name} x{item.quantity}
                </div>
              ))}
            </div>
            <div className="col-total">{order.total.toLocaleString()} VNĐ</div>
            <div className="col-status">
              <span className={`status-badge ${getStatusClass(order.status)}`}>
                {getStatusText(order.status)}
              </span>
            </div>
            <div className="col-date">{order.orderDate}</div>
            <div className="col-actions">
              <button 
                className="view-btn"
                onClick={() => handleViewDetails(order)}
              >
                👁️
              </button>
              <select 
                className="status-select"
                value={order.status}
                onChange={(e) => handleStatusChange(order.id, e.target.value)}
              >
                <option value="pending">Chờ xác nhận</option>
                <option value="processing">Đang xử lý</option>
                <option value="delivered">Đã giao</option>
                <option value="cancelled">Đã hủy</option>
              </select>
            </div>
          </div>
        ))}
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
                    <span>{selectedOrder.customerName}</span>
                  </div>
                  <div className="detail-item">
                    <label>Email:</label>
                    <span>{selectedOrder.customerEmail}</span>
                  </div>
                  <div className="detail-item">
                    <label>Số điện thoại:</label>
                    <span>{selectedOrder.customerPhone}</span>
                  </div>
                  <div className="detail-item">
                    <label>Địa chỉ giao hàng:</label>
                    <span>{selectedOrder.shippingAddress}</span>
                  </div>
                </div>
              </div>

              <div className="details-section">
                <h4>Sản phẩm</h4>
                <div className="items-list">
                  {selectedOrder.items.map((item, index) => (
                    <div key={index} className="item-row">
                      <div className="item-name">{item.name}</div>
                      <div className="item-quantity">x{item.quantity}</div>
                      <div className="item-price">{item.price.toLocaleString()} VNĐ</div>
                    </div>
                  ))}
                </div>
                <div className="total-row">
                  <strong>Tổng cộng: {selectedOrder.total.toLocaleString()} VNĐ</strong>
                </div>
              </div>

              <div className="details-section">
                <h4>Thông tin đơn hàng</h4>
                <div className="detail-grid">
                  <div className="detail-item">
                    <label>Trạng thái:</label>
                    <span className={`status-badge ${getStatusClass(selectedOrder.status)}`}>
                      {getStatusText(selectedOrder.status)}
                    </span>
                  </div>
                  <div className="detail-item">
                    <label>Phương thức thanh toán:</label>
                    <span>{getPaymentMethodText(selectedOrder.paymentMethod)}</span>
                  </div>
                  <div className="detail-item">
                    <label>Ngày đặt hàng:</label>
                    <span>{selectedOrder.orderDate}</span>
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

