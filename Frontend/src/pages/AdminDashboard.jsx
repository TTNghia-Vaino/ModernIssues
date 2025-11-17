import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import * as productService from '../services/productService';
import * as orderService from '../services/orderService';
import * as userService from '../services/userService';
import './AdminDashboard.css';

const AdminDashboard = () => {
  const { isInTokenGracePeriod } = useAuth();
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState([
    { 
      title: 'Tổng sản phẩm', 
      value: '0', 
      icon: '📦', 
      color: '#3498db',
      change: '+0%',
      changeType: 'positive'
    },
    { 
      title: 'Đơn hàng hôm nay', 
      value: '0', 
      icon: '📋', 
      color: '#2ecc71',
      change: '+0%',
      changeType: 'positive'
    },
    { 
      title: 'Người dùng mới', 
      value: '0', 
      icon: '👥', 
      color: '#f39c12',
      change: '+0%',
      changeType: 'positive'
    },
    { 
      title: 'Doanh thu tháng', 
      value: '0', 
      icon: '💰', 
      color: '#e74c3c',
      change: '+0%',
      changeType: 'positive'
    }
  ]);
  const [recentOrders, setRecentOrders] = useState([]);

  useEffect(() => {
    let cancelled = false;
    
    const attemptLoad = async () => {
      // If in grace period, wait for it to end
      if (isInTokenGracePeriod) {
        console.log('[AdminDashboard] Waiting for token grace period to end before loading dashboard data');
        await new Promise(resolve => setTimeout(resolve, 6000));
        if (cancelled) return;
      }
      
      if (!cancelled) {
        loadDashboardData();
      }
    };
    
    attemptLoad();
    
    return () => {
      cancelled = true;
    };
  }, []); // Only run on mount

  const loadDashboardData = async () => {
    try {
      setLoading(true);
      
      // Load all data in parallel
      const [productsResponse, ordersResponse, usersResponse] = await Promise.allSettled([
        productService.listProducts({ page: 1, limit: 1000 }), // Get all products
        orderService.getOrders(),
        userService.listUsers()
      ]);

      // Check for 401 errors in any response
      const hasUnauthorizedError = [productsResponse, ordersResponse, usersResponse].some(
        response => response.status === 'rejected' && (response.reason?.status === 401 || response.reason?.isUnauthorized)
      );

      if (hasUnauthorizedError) {
        // Show error and redirect to login
        setTimeout(() => {
          window.location.href = '/login?redirect=/admin/dashboard';
        }, 1000);
        return;
      }

      // Calculate stats
      const productsData = productsResponse.status === 'fulfilled' 
        ? (productsResponse.value?.data?.data || productsResponse.value?.data || productsResponse.value || [])
        : [];
      const productsArray = Array.isArray(productsData) ? productsData : [];
      const totalProducts = productsArray.length;

      const ordersData = ordersResponse.status === 'fulfilled'
        ? (Array.isArray(ordersResponse.value) ? ordersResponse.value : (ordersResponse.value?.data || []))
        : [];
      const ordersArray = Array.isArray(ordersData) ? ordersData : [];
      
      // Get today's orders
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const todayOrders = ordersArray.filter(order => {
        const orderDate = new Date(order.orderDate || order.createdAt || order.date);
        return orderDate >= today;
      });

      // Get recent orders (last 5)
      const sortedOrders = [...ordersArray]
        .sort((a, b) => {
          const dateA = new Date(a.orderDate || a.createdAt || a.date);
          const dateB = new Date(b.orderDate || b.createdAt || b.date);
          return dateB - dateA;
        })
        .slice(0, 5);
      
      const formattedRecentOrders = sortedOrders.map(order => ({
        id: order.id || order.orderId || 'N/A',
        customer: order.customerName || order.fullName || order.name || 'N/A',
        amount: typeof order.total === 'number' 
          ? order.total.toLocaleString() 
          : (order.totalPrice || order.amount || 0).toLocaleString(),
        status: order.status === 'delivered' ? 'Đã giao' 
          : order.status === 'processing' ? 'Đang xử lý'
          : order.status === 'pending' ? 'Chờ xác nhận'
          : 'Chờ xác nhận',
        date: order.orderDate || order.createdAt || order.date || 'N/A'
      }));

      // Calculate monthly revenue
      const currentMonth = new Date().getMonth();
      const currentYear = new Date().getFullYear();
      const monthlyOrders = ordersArray.filter(order => {
        const orderDate = new Date(order.orderDate || order.createdAt || order.date);
        return orderDate.getMonth() === currentMonth && orderDate.getFullYear() === currentYear;
      });
      const monthlyRevenue = monthlyOrders.reduce((sum, order) => {
        const total = typeof order.total === 'number' 
          ? order.total 
          : (order.totalPrice || order.amount || 0);
        return sum + (Number(total) || 0);
      }, 0);

      // Get new users (this month)
      const usersData = usersResponse.status === 'fulfilled'
        ? (Array.isArray(usersResponse.value) ? usersResponse.value : (usersResponse.value?.data || []))
        : [];
      const usersArray = Array.isArray(usersData) ? usersData : [];
      const newUsersThisMonth = usersArray.filter(user => {
        if (!user.createdAt && !user.createdDate) return false;
        const userDate = new Date(user.createdAt || user.createdDate);
        return userDate.getMonth() === currentMonth && userDate.getFullYear() === currentYear;
      }).length;

      // Update stats
      setStats([
        { 
          title: 'Tổng sản phẩm', 
          value: totalProducts.toString(), 
          icon: '📦', 
          color: '#3498db',
          change: '+0%',
          changeType: 'positive'
        },
        { 
          title: 'Đơn hàng hôm nay', 
          value: todayOrders.length.toString(), 
          icon: '📋', 
          color: '#2ecc71',
          change: '+0%',
          changeType: 'positive'
        },
        { 
          title: 'Người dùng mới', 
          value: newUsersThisMonth.toString(), 
          icon: '👥', 
          color: '#f39c12',
          change: '+0%',
          changeType: 'positive'
        },
        { 
          title: 'Doanh thu tháng', 
          value: formatRevenue(monthlyRevenue), 
          icon: '💰', 
          color: '#e74c3c',
          change: '+0%',
          changeType: 'positive'
        }
      ]);

      setRecentOrders(formattedRecentOrders);
    } catch (error) {
      console.error('[AdminDashboard] Error loading dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatRevenue = (amount) => {
    if (amount >= 1000000000) {
      return (amount / 1000000000).toFixed(1) + 'B';
    } else if (amount >= 1000000) {
      return (amount / 1000000).toFixed(1) + 'M';
    } else if (amount >= 1000) {
      return (amount / 1000).toFixed(1) + 'K';
    }
    return amount.toString();
  };

  const getStatusClass = (status) => {
    switch (status) {
      case 'Đã giao': return 'status-delivered';
      case 'Đang xử lý': return 'status-processing';
      case 'Chờ xác nhận': return 'status-pending';
      default: return 'status-default';
    }
  };

  if (loading) {
    return (
      <div className="admin-dashboard">
        <div className="dashboard-header">
          <h2>Dashboard</h2>
          <p>Chào mừng trở lại, Admin!</p>
        </div>
        <div style={{ textAlign: 'center', padding: '40px' }}>Đang tải dữ liệu...</div>
      </div>
    );
  }

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