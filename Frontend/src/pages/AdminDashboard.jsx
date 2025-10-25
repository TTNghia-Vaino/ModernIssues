import React from 'react';
import './AdminDashboard.css';

const AdminDashboard = () => {
  const stats = [
    { 
      title: 'Tổng sản phẩm', 
      value: '156', 
      icon: '📦', 
      color: '#3498db',
      change: '+12%',
      changeType: 'positive'
    },
    { 
      title: 'Đơn hàng hôm nay', 
      value: '23', 
      icon: '📋', 
      color: '#2ecc71',
      change: '+8%',
      changeType: 'positive'
    },
    { 
      title: 'Người dùng mới', 
      value: '8', 
      icon: '👥', 
      color: '#f39c12',
      change: '+15%',
      changeType: 'positive'
    },
    { 
      title: 'Doanh thu tháng', 
      value: '12.5M', 
      icon: '💰', 
      color: '#e74c3c',
      change: '+22%',
      changeType: 'positive'
    }
  ];

  const recentOrders = [
    { id: 'ORD-001', customer: 'Nguyễn Văn A', amount: '1,250,000', status: 'Đã giao', date: '2024-01-15' },
    { id: 'ORD-002', customer: 'Trần Thị B', amount: '850,000', status: 'Đang xử lý', date: '2024-01-15' },
    { id: 'ORD-003', customer: 'Lê Văn C', amount: '2,100,000', status: 'Đã giao', date: '2024-01-14' },
    { id: 'ORD-004', customer: 'Phạm Thị D', amount: '650,000', status: 'Chờ xác nhận', date: '2024-01-14' }
  ];

  const getStatusClass = (status) => {
    switch (status) {
      case 'Đã giao': return 'status-delivered';
      case 'Đang xử lý': return 'status-processing';
      case 'Chờ xác nhận': return 'status-pending';
      default: return 'status-default';
    }
  };

  return (
    <div className="admin-dashboard">
      <div className="dashboard-header">
        <h2>Dashboard</h2>
        <p>Chào mừng trở lại, Admin!</p>
      </div>

      {/* Stats Cards */}
      <div className="stats-grid">
        {stats.map((stat, index) => (
          <div key={index} className="stat-card">
            <div className="stat-header">
              <div className="stat-icon" style={{ backgroundColor: stat.color }}>
                {stat.icon}
              </div>
              <div className={`stat-change ${stat.changeType}`}>
                {stat.change}
              </div>
            </div>
            <div className="stat-content">
              <div className="stat-value">{stat.value}</div>
              <div className="stat-title">{stat.title}</div>
            </div>
            <div className="stat-trend">
              <span className="trend-icon">📈</span>
              <span className="trend-text">So với tháng trước</span>
            </div>
          </div>
        ))}
      </div>

      {/* Recent Orders */}
      <div className="dashboard-section">
        <div className="section-header">
          <h3>Đơn hàng gần đây</h3>
          <button className="view-all-btn">Xem tất cả</button>
        </div>
        
        <div className="orders-table">
          <div className="table-header">
            <div className="col-id">Mã đơn hàng</div>
            <div className="col-customer">Khách hàng</div>
            <div className="col-amount">Số tiền</div>
            <div className="col-status">Trạng thái</div>
            <div className="col-date">Ngày</div>
          </div>
          
          {recentOrders.map((order) => (
            <div key={order.id} className="table-row">
              <div className="col-id">{order.id}</div>
              <div className="col-customer">{order.customer}</div>
              <div className="col-amount">{order.amount} VNĐ</div>
              <div className="col-status">
                <span className={`status-badge ${getStatusClass(order.status)}`}>
                  {order.status}
                </span>
              </div>
              <div className="col-date">{order.date}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Quick Actions */}
      <div className="dashboard-section">
        <h3>Thao tác nhanh</h3>
        <div className="quick-actions">
          <button className="action-btn primary">
            <span className="action-icon">➕</span>
            Thêm sản phẩm mới
          </button>
          <button className="action-btn secondary">
            <span className="action-icon">📊</span>
            Xem báo cáo
          </button>
          <button className="action-btn secondary">
            <span className="action-icon">⚙️</span>
            Cài đặt hệ thống
          </button>
        </div>
      </div>
    </div>
  );
};

export default AdminDashboard;