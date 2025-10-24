import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate, useLocation } from 'react-router-dom';
import './AdminLayout.css';

const AdminLayout = ({ children }) => {
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  const menuItems = [
    { 
      path: '/admin/dashboard', 
      label: 'Dashboard', 
      icon: '📊',
      description: 'Tổng quan hệ thống'
    },
    { 
      path: '/admin/categories', 
      label: 'Danh mục', 
      icon: '📁',
      description: 'Quản lý danh mục sản phẩm'
    },
    { 
      path: '/admin/users', 
      label: 'Người dùng', 
      icon: '👥',
      description: 'Quản lý tài khoản người dùng'
    },
    { 
      path: '/admin/orders', 
      label: 'Đơn hàng', 
      icon: '📦',
      description: 'Quản lý đơn hàng và giao dịch'
    },
  ];

  const isActiveRoute = (path) => {
    return location.pathname === path;
  };

  return (
    <div className="admin-layout">
      {/* Sidebar */}
      <div className={`admin-sidebar ${sidebarOpen ? 'open' : 'closed'}`}>
        <div className="admin-sidebar-header">
          <div className="logo-section">
            <div className="admin-logo">
              <span className="logo-icon">⚡</span>
              {sidebarOpen && <span className="logo-text">Admin</span>}
            </div>
          </div>
          <button 
            className="sidebar-toggle"
            onClick={() => setSidebarOpen(!sidebarOpen)}
            aria-label={sidebarOpen ? 'Thu gọn sidebar' : 'Mở rộng sidebar'}
          >
            <span className="toggle-icon">{sidebarOpen ? '◀' : '▶'}</span>
          </button>
        </div>
        
        <nav className="admin-nav">
          {menuItems.map((item) => (
            <button
              key={item.path}
              className={`admin-nav-item ${isActiveRoute(item.path) ? 'active' : ''}`}
              onClick={() => navigate(item.path)}
              title={sidebarOpen ? item.description : item.label}
            >
              <span className="nav-icon">{item.icon}</span>
              {sidebarOpen && (
                <div className="nav-content">
                  <span className="nav-label">{item.label}</span>
                  <span className="nav-description">{item.description}</span>
                </div>
              )}
            </button>
          ))}
        </nav>
        
        <div className="admin-sidebar-footer">
          <div className="admin-user-info">
            <div className="user-avatar">
              <span className="avatar-text">{user?.name?.charAt(0) || 'A'}</span>
            </div>
            {sidebarOpen && (
              <div className="user-details">
                <div className="user-name">{user?.name || 'Administrator'}</div>
                <div className="user-role">Quản trị viên</div>
                <div className="user-status">
                  <span className="status-dot"></span>
                  Đang hoạt động
                </div>
              </div>
            )}
          </div>
          <button 
            className="logout-btn" 
            onClick={handleLogout}
            title="Đăng xuất"
          >
            <span className="logout-icon">🚪</span>
            {sidebarOpen && <span className="logout-text">Đăng xuất</span>}
          </button>
        </div>
      </div>

      {/* Main Content */}
      <div className="admin-main">
        <div className="admin-header">
          <div className="header-left">
            <h1>Quản trị hệ thống</h1>
            <p className="header-subtitle">Chào mừng trở lại, {user?.name || 'Admin'}!</p>
          </div>
          <div className="admin-actions">
            <button 
              className="action-btn secondary"
              onClick={() => navigate('/')}
              title="Về trang chủ"
            >
              <span className="btn-icon">🏠</span>
              <span className="btn-text">Về trang chủ</span>
            </button>
          </div>
        </div>
        
        <div className="admin-content">
          {children}
        </div>
      </div>
    </div>
  );
};

export default AdminLayout;
