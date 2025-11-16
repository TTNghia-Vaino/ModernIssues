import React, { useState, useEffect } from 'react';
import * as userService from '../services/userService';
import { useAuth } from '../context/AuthContext';
import './AdminUsers.css';

const AdminUsers = () => {
  const { isInTokenGracePeriod } = useAuth();
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [totalUsers, setTotalUsers] = useState(0); // Tổng số users từ server

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
  const [loadingUsers, setLoadingUsers] = useState({});
  const [dropdownOpen, setDropdownOpen] = useState(null);
  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10); // mặc định 10 người / trang
  // Checkbox selection state
  const [selectedUsers, setSelectedUsers] = useState(new Set());

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

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = () => {
      setDropdownOpen(null);
    };

    if (dropdownOpen) {
      document.addEventListener('click', handleClickOutside);
    }

    return () => {
      document.removeEventListener('click', handleClickOutside);
    };
  }, [dropdownOpen]);

  const loadUsers = async (page = currentPage, size = pageSize) => {
    try {
      setLoading(true);
      
      // Note: Nếu backend chưa hỗ trợ pagination, API sẽ trả về toàn bộ dữ liệu
      // và chúng ta vẫn filter ở client-side
      const usersData = await userService.listUsers();
      
      // Handle different response formats
      let usersArray = [];
      if (Array.isArray(usersData)) {
        usersArray = usersData;
      } else if (usersData && typeof usersData === 'object') {
        usersArray = usersData.data || usersData.items || usersData.users || [];
      }
      
      setUsers(usersArray || []);
      setTotalUsers(usersArray.length); // Cập nhật tổng số
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
      setUsers([]);
      setTotalUsers(0);
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
      name: user.username || user.name || '',
      email: user.email || '',
      phone: user.phone || '',
      role: user.role || 'customer',
      status: user.isDisabled ? 'inactive' : 'active'
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
        setLoadingUsers(prev => ({ ...prev, [id]: true }));
        console.log('[AdminUsers] Deleting user:', id);
        const response = await userService.deleteUser(id);
        console.log('[AdminUsers] Delete response:', response);
        
        // Reload list from server to ensure sync
        await loadUsers();
        showNotification('Vô hiệu hóa người dùng thành công!');
      } catch (error) {
        console.error('[AdminUsers] Error deleting user:', error);
        
        // If user not found (404), reload list to remove from UI
        if (error.message && error.message.includes('Không tìm thấy người dùng')) {
          showNotification('Người dùng không tồn tại hoặc đã bị xóa. Đang làm mới danh sách...', 'error');
          await loadUsers();
        } else {
          showNotification('Lỗi khi vô hiệu hóa người dùng: ' + error.message, 'error');
        }
      } finally {
        setLoadingUsers(prev => ({ ...prev, [id]: false }));
      }
    }
  };

  const handleActivate = async (id) => {
    if (window.confirm('Bạn có chắc chắn muốn kích hoạt lại người dùng này?')) {
      try {
        setLoadingUsers(prev => ({ ...prev, [id]: true }));
        console.log('[AdminUsers] Activating user:', id);
        const response = await userService.activateUser(id);
        console.log('[AdminUsers] Activate response:', response);
        
        // Reload list from server to ensure sync
        await loadUsers();
        showNotification('Kích hoạt người dùng thành công!');
      } catch (error) {
        console.error('[AdminUsers] Error activating user:', error);
        showNotification('Lỗi khi kích hoạt người dùng: ' + error.message, 'error');
      } finally {
        setLoadingUsers(prev => ({ ...prev, [id]: false }));
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
    return status === 'active' ? 'Hoạt động' : 'Ngừng hoạt động';
  };

  const getRoleText = (role) => {
    return role === 'admin' ? 'Quản trị viên' : 'Khách hàng';
  };

  // Avatar màu sắc theo thiết kế: dùng màu tím thống nhất
  const getAvatarColor = () => 'linear-gradient(135deg, #7c3aed 0%, #6366f1 100%)';

  // Lọc dữ liệu
  const filteredUsers = users.filter(user => {
    if (!user) return false;
    
    // Map backend properties to expected format
    const name = user.username || user.fullName || user.FullName || user.firstName || '';
    const email = user.email || user.Email || user.emailAddress || '';
    const id = user.userId || user.id || '';
    
    if (!name || !email || !id) {
      return false;
    }
    
    const matchesSearch = name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         email.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesRole = filterRole === 'all' || user.role === filterRole;
    
    // Status filter: isDisabled true = vô hiệu hóa, false = hoạt động
    let matchesStatus = true;
    if (filterStatus === 'active') {
      matchesStatus = user.isDisabled === false;
    } else if (filterStatus === 'inactive') {
      matchesStatus = user.isDisabled === true;
    }
    
    return matchesSearch && matchesRole && matchesStatus;
  });

  // Tính toán phân trang
  const totalPages = Math.ceil(filteredUsers.length / pageSize) || 1;
  const startIndex = (currentPage - 1) * pageSize;
  const endIndex = startIndex + pageSize;
  const paginatedUsers = filteredUsers.slice(startIndex, endIndex);

  // Checkbox handlers (after paginatedUsers is defined)
  const handleSelectAll = (e) => {
    if (e.target.checked) {
      const allIds = paginatedUsers.map(u => u.userId || u.id);
      setSelectedUsers(new Set(allIds));
    } else {
      setSelectedUsers(new Set());
    }
  };

  const handleSelectOne = (userId) => {
    const newSelected = new Set(selectedUsers);
    if (newSelected.has(userId)) {
      newSelected.delete(userId);
    } else {
      newSelected.add(userId);
    }
    setSelectedUsers(newSelected);
  };

  const isAllSelected = paginatedUsers.length > 0 && paginatedUsers.every(u => selectedUsers.has(u.userId || u.id));
  const isSomeSelected = paginatedUsers.some(u => selectedUsers.has(u.userId || u.id)) && !isAllSelected;

  // Load lại dữ liệu khi thay đổi trang hoặc kích thước trang
  // (chỉ load nếu không phải lần đầu mount vì đã có useEffect load ban đầu)
  useEffect(() => {
    // Skip nếu users chưa được load lần đầu
    if (users.length > 0 || totalUsers > 0) {
      loadUsers(currentPage, pageSize);
    }
  }, [currentPage]); // Chỉ load khi đổi trang

  // Reset trang khi thay đổi bộ lọc hoặc kích thước trang
  useEffect(() => {
    setCurrentPage(1);
    setSelectedUsers(new Set()); // Clear selection on filter change
  }, [searchTerm, filterRole, filterStatus, pageSize]);

  useEffect(() => {
    if (currentPage > totalPages) {
      setCurrentPage(totalPages);
    }
  }, [totalPages, currentPage]);

  return (
    <div className="admin-users">
      {notification.show && (
        <div className={`notification ${notification.type}`}>
          {notification.message}
        </div>
      )}
      
      {loading && (
        <div className="loading-overlay">
          <div className="loading-spinner">
            <div className="spinner"></div>
            <p>Đang tải danh sách người dùng...</p>
          </div>
        </div>
      )}
      
      <div className="page-header">
        <div className="page-titles">
          <h2>Quản lý người dùng</h2>
          <p className="page-sub">Quản lý tài khoản người dùng</p>
        </div>
        <button className="add-btn" onClick={handleAddNew} disabled={loading}>
          <span className="add-icon">➕</span> Thêm người dùng mới
        </button>
      </div>

      {/* Thanh bộ lọc dạng bar */}
      <div className="filters-bar">
        <div className="filter-item search">
          <input
            type="text"
            placeholder="🔍 Tìm kiếm theo tên hoặc email..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <div className="filter-item">
          <select value={filterRole} onChange={(e) => setFilterRole(e.target.value)}>
            <option value="all">Tất cả vai trò</option>
            <option value="customer">Khách hàng</option>
            <option value="admin">Quản trị viên</option>
          </select>
        </div>
        <div className="filter-item">
          <select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)}>
            <option value="all">Tất cả trạng thái</option>
            <option value="active">Hoạt động</option>
            <option value="inactive">Không hoạt động</option>
          </select>
        </div>
      </div>

      <div className="data-table-container">
        {loading && users.length > 0 ? (
          <div className="loading-overlay-inline">
            <div className="spinner"></div>
            <p>Đang tải trang {currentPage}...</p>
          </div>
        ) : filteredUsers.length > 0 ? (
          <div className="data-table">
            <table className="users-table">
              <thead>
                <tr>
                  <th className="col-checkbox">
                    <input 
                      type="checkbox" 
                      checked={isAllSelected}
                      ref={input => {
                        if (input) input.indeterminate = isSomeSelected;
                      }}
                      onChange={handleSelectAll}
                      aria-label="Select all users"
                    />
                  </th>
                  <th className="col-id">ID</th>
                  <th className="col-user">Người dùng</th>
                  <th className="col-role">Vai trò</th>
                  <th className="col-status">Trạng thái</th>
                  <th className="col-date">Ngày tạo</th>
                  <th className="col-actions">Thao tác</th>
                </tr>
              </thead>
              <tbody>
                {paginatedUsers.map((user) => (
                  <tr key={user.userId || user.id}>
                    <td className="col-checkbox">
                      <input 
                        type="checkbox" 
                        checked={selectedUsers.has(user.userId || user.id)}
                        onChange={() => handleSelectOne(user.userId || user.id)}
                        aria-label={`Select ${user.username || user.name}`}
                      />
                    </td>
                    <td className="col-id">
                      <span className="id-badge">{user.userId || user.id}</span>
                    </td>
                    <td className="col-user">
                      <div className="user-cell">
                        <div className="avatar-badge">
                          {(user.username || user.name || 'U').charAt(0).toUpperCase()}
                        </div>
                        <div className="user-details">
                          <p className="user-name" title={user.username || user.name}>{user.username || user.name}</p>
                          <p className="user-email" title={user.email}>{user.email}</p>
                        </div>
                      </div>
                    </td>
                    <td className="col-role">
                      <span className={`role-badge ${user.role === 'admin' ? 'role-admin' : 'role-customer'}`}>
                        {getRoleText(user.role)}
                      </span>
                    </td>
                    <td className="col-status">
                      <div className={`status-indicator ${user.isDisabled ? 'status-inactive' : 'status-active'}`}>
                        <span className={`status-dot ${user.isDisabled ? 'status-inactive' : 'status-active'}`}></span>
                        <span className="status-text">{getStatusText(user.isDisabled ? 'inactive' : 'active')}</span>
                      </div>
                    </td>
                    <td className="col-date">
                      {new Date().toLocaleDateString('vi-VN')}
                    </td>
                    <td className="col-actions">
                      <div style={{ position: 'relative' }}>
                        <button
                          className="btn-menu"
                          title="Tùy chọn"
                          onClick={(e) => {
                            e.stopPropagation();
                            setDropdownOpen(dropdownOpen === (user.userId || user.id) ? null : (user.userId || user.id));
                          }}
                        >
                          ⋮
                        </button>
                        {dropdownOpen === (user.userId || user.id) && (
                          <div className="dropdown-menu" onClick={(e) => e.stopPropagation()}>
                            <button
                              className="dropdown-item edit"
                              onClick={() => {
                                handleEdit(user);
                                setDropdownOpen(null);
                              }}
                            >
                              ✏️ Chỉnh sửa
                            </button>
                            <button
                              className="dropdown-item delete"
                              onClick={() => {
                                if (!user.isDisabled) {
                                  handleDelete(user.userId || user.id);
                                } else {
                                  handleActivate(user.userId || user.id);
                                }
                                setDropdownOpen(null);
                              }}
                            >
                              {!user.isDisabled ? '🗑️ Vô hiệu hóa' : '✅ Kích hoạt'}
                            </button>
                          </div>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="no-results">
            <p>Không tìm thấy người dùng nào phù hợp với bộ lọc.</p>
          </div>
        )}
      </div>

      {/* Pagination Controls */}
      {filteredUsers.length > 0 && (
        <div className="pagination-bar">
          <div className="pagination-info">
            Hiển thị {startIndex + 1}-{Math.min(endIndex, filteredUsers.length)} / {filteredUsers.length} người dùng
          </div>
          
          <div className="pagination-controls">
            <button 
              className="pg-btn"
              onClick={() => setCurrentPage(1)}
              disabled={currentPage === 1}
            >
              «
            </button>
            <button 
              className="pg-btn"
              onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
              disabled={currentPage === 1}
            >
              ‹
            </button>
            
            <span className="page-indicator">
              Trang {currentPage} / {totalPages}
            </span>
            
            <button 
              className="pg-btn"
              onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
              disabled={currentPage === totalPages}
            >
              ›
            </button>
            <button 
              className="pg-btn"
              onClick={() => setCurrentPage(totalPages)}
              disabled={currentPage === totalPages}
            >
              »
            </button>
          </div>
          
          <div className="page-size-selector">
            <label>Hiển thị: </label>
            <select value={pageSize} onChange={(e) => {
              setPageSize(Number(e.target.value));
              setCurrentPage(1);
            }}>
              <option value={10}>10</option>
              <option value={20}>20</option>
              <option value={50}>50</option>
            </select>
          </div>
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
