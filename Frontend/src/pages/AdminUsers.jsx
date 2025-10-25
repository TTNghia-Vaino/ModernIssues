import React, { useState } from 'react';
import './AdminUsers.css';

const AdminUsers = () => {
  const [users, setUsers] = useState([
    { 
      id: 1, 
      name: 'Nguyễn Văn A', 
      email: 'nguyenvana@email.com', 
      phone: '0123456789', 
      role: 'customer', 
      status: 'active', 
      joinDate: '2024-01-10',
      orderCount: 5,
      totalSpent: 2500000
    },
    { 
      id: 2, 
      name: 'Trần Thị B', 
      email: 'tranthib@email.com', 
      phone: '0987654321', 
      role: 'customer', 
      status: 'active', 
      joinDate: '2024-01-12',
      orderCount: 3,
      totalSpent: 1800000
    },
    { 
      id: 3, 
      name: 'Lê Văn C', 
      email: 'levanc@email.com', 
      phone: '0369258147', 
      role: 'customer', 
      status: 'inactive', 
      joinDate: '2024-01-08',
      orderCount: 1,
      totalSpent: 500000
    },
    { 
      id: 4, 
      name: 'Phạm Thị D', 
      email: 'phamthid@email.com', 
      phone: '0741852963', 
      role: 'customer', 
      status: 'active', 
      joinDate: '2024-01-15',
      orderCount: 8,
      totalSpent: 4200000
    }
  ]);

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

  const handleDelete = (id) => {
    if (window.confirm('Bạn có chắc chắn muốn xóa người dùng này?')) {
      setUsers(users.filter(user => user.id !== id));
      showNotification('Xóa người dùng thành công!');
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

  const handleSubmit = (e) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }
    
    if (editingUser) {
      // Cập nhật người dùng
      setUsers(users.map(user => 
        user.id === editingUser.id 
          ? { ...user, ...formData }
          : user
      ));
      showNotification('Cập nhật người dùng thành công!');
    } else {
      // Thêm người dùng mới
      const newUser = {
        id: Math.max(...users.map(u => u.id)) + 1,
        ...formData,
        joinDate: new Date().toISOString().split('T')[0],
        orderCount: 0,
        totalSpent: 0
      };
      setUsers([...users, newUser]);
      showNotification('Thêm người dùng mới thành công!');
    }
    
    setShowModal(false);
    setFormData({ name: '', email: '', phone: '', role: 'customer', status: 'active' });
    setErrors({});
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
              >
                ✏️
              </button>
              <button 
                className="delete-btn"
                onClick={() => handleDelete(user.id)}
              >
                🗑️
              </button>
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
