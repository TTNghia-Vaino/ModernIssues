import React, { useState, useEffect } from 'react';
import * as userService from '../services/userService';
import { useAuth } from '../context/AuthContext';
import './AdminUsers.css';

const AdminUsers = () => {
  const { isInTokenGracePeriod } = useAuth();
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(false);

  const [showModal, setShowModal] = useState(false);
  const [editingUser, setEditingUser] = useState(null);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    role: 'customer',
    status: 'active'
  });
  const [errors, setErrors] = useState({});
  const [notification, setNotification] = useState({ show: false, message: '', type: '' });

  const [searchTerm, setSearchTerm] = useState('');
  const [filterRole, setFilterRole] = useState('all');
  const [filterStatus, setFilterStatus] = useState('all');

  // Load users from API on mount, but delay if in grace period
  useEffect(() => {
    let cancelled = false;
    
    const attemptLoad = async () => {
      // If in grace period, wait for it to end
      if (isInTokenGracePeriod) {
        console.log('[AdminUsers] Waiting for token grace period to end before loading users');
        // Wait for grace period to end (5 seconds) plus a small buffer (1 second)
        await new Promise(resolve => setTimeout(resolve, 6000));
        if (cancelled) return;
      }
      
      if (!cancelled) {
        loadUsers();
      }
    };
    
    attemptLoad();
    
    return () => {
      cancelled = true;
    };
  }, []); // Only run on mount

  const loadUsers = async () => {
    try {
      setLoading(true);
      const usersData = await userService.listUsers();
      const usersArray = Array.isArray(usersData) ? usersData : (usersData.data || usersData.items || []);
      setUsers(usersArray);
    } catch (error) {
      console.error('Error loading users:', error);
      
      // Handle 401 Unauthorized specifically
      if (error.status === 401 || error.isUnauthorized) {
        // Only redirect if not in grace period
        if (!isInTokenGracePeriod) {
          showNotification('Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.', 'error');
          // Redirect to login after a short delay
          setTimeout(() => {
            window.location.href = '/login?redirect=/admin/users';
          }, 2000);
        } else {
          console.log('[AdminUsers] Ignoring 401 during grace period, will retry later');
        }
        return;
      }
      
      showNotification('Lỗi khi tải danh sách người dùng: ' + (error.message || 'Lỗi không xác định'), 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleAddNew = () => {
    setEditingUser(null);
    setFormData({ name: '', email: '', phone: '', role: 'customer', status: 'active' });
    setErrors({});
    setShowModal(true);
  };

  const handleEdit = (user) => {
    setEditingUser(user);
    setFormData({
      name: user.name,
      email: user.email,
      phone: user.phone,
      role: user.role,
      status: user.status
    });
    setErrors({});
    setShowModal(true);
  };

  const showNotification = (message, type = 'success') => {
    setNotification({ show: true, message, type });
    setTimeout(() => {
      setNotification({ show: false, message: '', type: '' });
    }, 3000);
  };

  const handleDelete = async (id) => {
    if (window.confirm('Bạn có chắc chắn muốn vô hiệu hóa người dùng này? (Soft delete)')) {
      try {
        setLoading(true);
        await userService.deleteUser(id);
        setUsers(users.map(user => 
          user.id === id ? { ...user, status: 'inactive' } : user
        ));
        showNotification('Vô hiệu hóa người dùng thành công!');
      } catch (error) {
        console.error('Error deleting user:', error);
        showNotification('Lỗi khi vô hiệu hóa người dùng: ' + error.message, 'error');
      } finally {
        setLoading(false);
      }
    }
  };

  const handleActivate = async (id) => {
    if (window.confirm('Bạn có chắc chắn muốn kích hoạt lại người dùng này?')) {
      try {
        setLoading(true);
        await userService.activateUser(id);
        setUsers(users.map(user => 
          user.id === id ? { ...user, status: 'active' } : user
        ));
        showNotification('Kích hoạt người dùng thành công!');
      } catch (error) {
        console.error('Error activating user:', error);
        showNotification('Lỗi khi kích hoạt người dùng: ' + error.message, 'error');
      } finally {
        setLoading(false);
      }
    }
  };

  const validateForm = () => {
    const newErrors = {};
    
    if (!formData.name.trim()) {
      newErrors.name = 'Vui lòng nhập họ và tên';
    } else if (formData.name.trim().length < 2) {
      newErrors.name = 'Họ và tên phải có ít nhất 2 ký tự';
    }
    
    if (!formData.email.trim()) {
      newErrors.email = 'Vui lòng nhập email';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = 'Email không hợp lệ';
    }
    
    if (!formData.phone.trim()) {
      newErrors.phone = 'Vui lòng nhập số điện thoại';
    } else if (!/^[0-9]{10,11}$/.test(formData.phone.replace(/\s/g, ''))) {
      newErrors.phone = 'Số điện thoại phải có 10-11 chữ số';
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }
    
    try {
      setLoading(true);
      
      if (editingUser) {
        // Update user via API
        // Format according to Swagger: { Phone, Address, Email, Avatar }
        const updateData = {
          Phone: formData.phone,
          Email: formData.email,
          Address: editingUser.address || '', // Keep existing address if not provided
          Avatar: editingUser.avatar || '' // Keep existing avatar if not provided
        };
        
        try {
          const updatedUser = await userService.updateUser(editingUser.id, updateData);
          
          // Map API response back to local format
          const mappedUser = {
            ...editingUser,
            ...formData,
            phone: updatedUser.phone || updatedUser.Phone || formData.phone,
            email: updatedUser.email || updatedUser.Email || formData.email,
            name: updatedUser.name || updatedUser.fullName || editingUser.name,
            address: updatedUser.address || updatedUser.Address || editingUser.address,
            avatar: updatedUser.avatar || updatedUser.Avatar || editingUser.avatar
          };
          
          setUsers(users.map(user => 
            user.id === editingUser.id ? mappedUser : user
          ));
          showNotification('Cập nhật người dùng thành công!');
        } catch (apiError) {
          console.error('API update failed:', apiError);
          showNotification('Lỗi khi cập nhật người dùng: ' + (apiError.message || 'Unknown error'), 'error');
        }
      } else {
        // Note: Creating users should be done via register endpoint
        // This is just for admin UI, might need to adjust based on API
        showNotification('Vui lòng sử dụng chức năng đăng ký để tạo người dùng mới', 'error');
      }
      
      setShowModal(false);
      setFormData({ name: '', email: '', phone: '', role: 'customer', status: 'active' });
      setErrors({});
    } catch (error) {
      console.error('Error saving user:', error);
      showNotification('Lỗi khi lưu người dùng: ' + error.message, 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  const getStatusClass = (status) => {
    return status === 'active' ? 'status-active' : 'status-inactive';
  };

  const getStatusText = (status) => {
    return status === 'active' ? 'Hoạt động' : 'Không hoạt động';
  };

  const getRoleText = (role) => {
    return role === 'admin' ? 'Quản trị viên' : 'Khách hàng';
  };

  // Lọc dữ liệu
  const filteredUsers = users.filter(user => {
    const matchesSearch = user.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         user.email.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesRole = filterRole === 'all' || user.role === filterRole;
    const matchesStatus = filterStatus === 'all' || user.status === filterStatus;
    
    return matchesSearch && matchesRole && matchesStatus;
  });

  return (
    <div className="admin-users">
      {notification.show && (
        <div className={`notification ${notification.type}`}>
          {notification.message}
        </div>
      )}
      
      <div className="page-header">
        <h2>Quản lý người dùng</h2>
        <button className="add-btn" onClick={handleAddNew}>
          ➕ Thêm người dùng mới
        </button>
      </div>

      {/* Filters */}
      <div className="filters-section">
        <div className="search-box">
          <input
            type="text"
            placeholder="Tìm kiếm theo tên hoặc email..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        
        <div className="filter-controls">
          <select 
            value={filterRole} 
            onChange={(e) => setFilterRole(e.target.value)}
          >
            <option value="all">Tất cả vai trò</option>
            <option value="customer">Khách hàng</option>
            <option value="admin">Quản trị viên</option>
          </select>
          
          <select 
            value={filterStatus} 
            onChange={(e) => setFilterStatus(e.target.value)}
          >
            <option value="all">Tất cả trạng thái</option>
            <option value="active">Hoạt động</option>
            <option value="inactive">Không hoạt động</option>
          </select>
        </div>
      </div>

      <div className="users-table">
        <div className="table-header">
          <div className="col-id">ID</div>
          <div className="col-name">Tên</div>
          <div className="col-email">Email</div>
          <div className="col-phone">Số điện thoại</div>
          <div className="col-role">Vai trò</div>
          <div className="col-status">Trạng thái</div>
          <div className="col-orders">Đơn hàng</div>
          <div className="col-spent">Tổng chi</div>
          <div className="col-actions">Thao tác</div>
        </div>

        {filteredUsers.map((user) => (
          <div key={user.id} className="table-row">
            <div className="col-id">{user.id}</div>
            <div className="col-name">{user.name}</div>
            <div className="col-email">{user.email}</div>
            <div className="col-phone">{user.phone}</div>
            <div className="col-role">
              <span className={`role-badge ${user.role === 'admin' ? 'role-admin' : 'role-customer'}`}>
                {getRoleText(user.role)}
              </span>
            </div>
            <div className="col-status">
              <span className={`status-badge ${getStatusClass(user.status)}`}>
                {getStatusText(user.status)}
              </span>
            </div>
            <div className="col-orders">{user.orderCount}</div>
            <div className="col-spent">{user.totalSpent.toLocaleString()} VNĐ</div>
            <div className="col-actions">
              <button 
                className="edit-btn"
                onClick={() => handleEdit(user)}
                title="Chỉnh sửa"
              >
                ✏️
              </button>
              {user.status === 'active' ? (
                <button 
                  className="delete-btn"
                  onClick={() => handleDelete(user.id)}
                  title="Vô hiệu hóa"
                >
                  🗑️
                </button>
              ) : (
                <button 
                  className="activate-btn"
                  onClick={() => handleActivate(user.id)}
                  title="Kích hoạt"
                  style={{ backgroundColor: '#2ecc71', color: 'white' }}
                >
                  ✓
                </button>
              )}
            </div>
          </div>
        ))}
      </div>

      {filteredUsers.length === 0 && (
        <div className="no-results">
          <p>Không tìm thấy người dùng nào phù hợp với bộ lọc.</p>
        </div>
      )}

      {/* Modal */}
      {showModal && (
        <div className="modal-overlay">
          <div className="modal-content">
            <div className="modal-header">
              <h3>{editingUser ? 'Chỉnh sửa người dùng' : 'Thêm người dùng mới'}</h3>
              <button 
                className="close-btn"
                onClick={() => setShowModal(false)}
              >
                ✕
              </button>
            </div>
            
            <form onSubmit={handleSubmit} className="modal-form">
              <div className="form-group">
                <label htmlFor="name">Họ và tên: <span style={{ color: 'red' }}>*</span></label>
                <input
                  type="text"
                  id="name"
                  name="name"
                  value={formData.name}
                  onChange={handleInputChange}
                  placeholder="Nhập họ và tên"
                  className={errors.name ? 'error' : ''}
                />
                {errors.name && <span className="error-message">{errors.name}</span>}
              </div>
              
              <div className="form-group">
                <label htmlFor="email">Email: <span style={{ color: 'red' }}>*</span></label>
                <input
                  type="email"
                  id="email"
                  name="email"
                  value={formData.email}
                  onChange={handleInputChange}
                  placeholder="Nhập email"
                  className={errors.email ? 'error' : ''}
                />
                {errors.email && <span className="error-message">{errors.email}</span>}
              </div>
              
              <div className="form-group">
                <label htmlFor="phone">Số điện thoại: <span style={{ color: 'red' }}>*</span></label>
                <input
                  type="tel"
                  id="phone"
                  name="phone"
                  value={formData.phone}
                  onChange={handleInputChange}
                  placeholder="Nhập số điện thoại (10-11 số)"
                  className={errors.phone ? 'error' : ''}
                />
                {errors.phone && <span className="error-message">{errors.phone}</span>}
              </div>
              
              <div className="form-group">
                <label htmlFor="role">Vai trò:</label>
                <select
                  id="role"
                  name="role"
                  value={formData.role}
                  onChange={handleInputChange}
                >
                  <option value="customer">Khách hàng</option>
                  <option value="admin">Quản trị viên</option>
                </select>
              </div>
              
              <div className="form-group">
                <label htmlFor="status">Trạng thái:</label>
                <select
                  id="status"
                  name="status"
                  value={formData.status}
                  onChange={handleInputChange}
                >
                  <option value="active">Hoạt động</option>
                  <option value="inactive">Không hoạt động</option>
                </select>
              </div>
              
              <div className="modal-actions">
                <button 
                  type="button" 
                  className="cancel-btn"
                  onClick={() => {
                    setShowModal(false);
                    setErrors({});
                  }}
                >
                  Hủy
                </button>
                <button type="submit" className="save-btn">
                  {editingUser ? 'Cập nhật' : 'Thêm mới'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminUsers;
