import React, { useState, useEffect } from 'react';
import * as userService from '../services/userService';
import { useAuth } from '../context/AuthContext';
import { Edit, Trash2 } from 'lucide-react';
import {
  AdminPageHeader,
  AdminFiltersBar,
  AdminDataTable,
  AdminPagination,
  AdminActionDropdown,
  AdminLoadingOverlay,
  AdminModal
} from '../components/admin';
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
    password: '',
    address: '',
    role: 'customer',
    status: 'active'
  });
  const [avatarFile, setAvatarFile] = useState(null);
  const [avatarPreview, setAvatarPreview] = useState(null);
  const [errors, setErrors] = useState({});
  const [notification, setNotification] = useState({ show: false, message: '', type: '' });

  const [searchTerm, setSearchTerm] = useState('');
  const [filterRole, setFilterRole] = useState('all');
  const [filterStatus, setFilterStatus] = useState('all');
  const [loadingUsers, setLoadingUsers] = useState({});
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
    setFormData({ name: '', email: '', phone: '', password: '', address: '', role: 'customer', status: 'active' });
    setAvatarFile(null);
    setAvatarPreview(null);
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
    
    // Password required only when creating new user
    if (!editingUser && !formData.password.trim()) {
      newErrors.password = 'Vui lòng nhập mật khẩu';
    } else if (!editingUser && formData.password.length < 6) {
      newErrors.password = 'Mật khẩu phải có ít nhất 6 ký tự';
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
        // Create new user via register endpoint with avatar upload
        try {
          const registerData = {
            username: formData.name.trim(),
            name: formData.name.trim(),
            email: formData.email.trim(),
            phone: formData.phone.trim().replace(/\s/g, ''),
            password: formData.password,
            ...(formData.address && { address: formData.address.trim() })
          };
          
          const newUser = await userService.registerWithAvatar(registerData, avatarFile);
          
          // Map API response to local format
          const mappedUser = {
            id: newUser.userId || newUser.id,
            userId: newUser.userId || newUser.id,
            username: newUser.username || formData.name,
            name: newUser.username || formData.name,
            email: newUser.email || formData.email,
            phone: newUser.phone || formData.phone,
            address: newUser.address || formData.address || '',
            avatar: newUser.avatarUrl || newUser.avatar || '',
            role: newUser.role || formData.role,
            isDisabled: newUser.isDisabled === true
          };
          
          // Reload users list to get the latest data from server
          await loadUsers();
          showNotification('Thêm người dùng mới thành công!');
        } catch (apiError) {
          console.error('API register failed:', apiError);
          showNotification('Lỗi khi thêm người dùng: ' + (apiError.message || 'Unknown error'), 'error');
        }
      }
      
      setShowModal(false);
      setFormData({ name: '', email: '', phone: '', password: '', address: '', role: 'customer', status: 'active' });
      setAvatarFile(null);
      setAvatarPreview(null);
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

  const handleAvatarChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      // Validate file type
      if (!file.type.startsWith('image/')) {
        setErrors({ ...errors, avatar: 'Vui lòng chọn file ảnh hợp lệ' });
        return;
      }
      
      // Validate file size (max 5MB)
      if (file.size > 5 * 1024 * 1024) {
        setErrors({ ...errors, avatar: 'Kích thước ảnh không được vượt quá 5MB' });
        return;
      }
      
      setAvatarFile(file);
      setErrors({ ...errors, avatar: null });
      
      // Create preview
      const reader = new FileReader();
      reader.onloadend = () => {
        setAvatarPreview(reader.result);
      };
      reader.readAsDataURL(file);
    }
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
    // Khi filterStatus === 'all' thì hiển thị tất cả (cả true và false)
    let matchesStatus = true;
    if (filterStatus === 'active') {
      // Chỉ hiển thị người dùng hoạt động (isDisabled = false)
      matchesStatus = user.isDisabled === false;
    } else if (filterStatus === 'inactive') {
      // Chỉ hiển thị người dùng bị vô hiệu hóa (isDisabled = true)
      matchesStatus = user.isDisabled === true;
    }
    // Nếu filterStatus === 'all' thì matchesStatus = true (hiển thị tất cả)
    
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

  // Table columns config
  const tableColumns = [
    { key: 'id', label: 'ID', className: 'col-id' },
    { key: 'user', label: 'NGƯỜI DÙNG', className: 'col-user' },
    { key: 'role', label: 'VAI TRÒ', className: 'col-role' },
    { key: 'status', label: 'TRẠNG THÁI', className: 'col-status' },
    { key: 'date', label: 'NGÀY TẠO', className: 'col-date' },
    { key: 'actions', label: 'THAO TÁC', className: 'col-actions' }
  ];

  // Render custom user row
  const renderUserRow = (user) => (
    <div key={user.userId || user.id} className="table-row">
      <div className="col-id">
        <span className="id-badge">{user.userId || user.id}</span>
      </div>
      <div 
        className="col-user"
        data-full-name={user.username || user.name}
        data-full-email={user.email}
        title={`${user.username || user.name} - ${user.email}`}
      >
        <div className="user-cell">
          <div className="avatar-badge">
            {(user.username || user.name || 'U').charAt(0).toUpperCase()}
          </div>
          <div className="user-details">
            <p className="user-name">{user.username || user.name}</p>
            <p className="user-email">{user.email}</p>
          </div>
        </div>
      </div>
      <div className="col-role">
        <span className={`role-badge ${user.role === 'admin' ? 'role-admin' : 'role-customer'}`}>
          {getRoleText(user.role)}
        </span>
      </div>
      <div className="col-status">
        <div className={`status-indicator ${user.isDisabled ? 'status-inactive' : 'status-active'}`}>
          <span className={`status-dot ${user.isDisabled ? 'status-inactive' : 'status-active'}`}></span>
          <span className="status-text">{getStatusText(user.isDisabled ? 'inactive' : 'active')}</span>
        </div>
      </div>
      <div className="col-date">
        {new Date().toLocaleDateString('vi-VN')}
      </div>
      <div className="col-actions">
        <AdminActionDropdown
          actions={[
            {
              label: 'Chỉnh sửa',
              icon: Edit,
              onClick: () => handleEdit(user)
            },
            {
              label: !user.isDisabled ? '🗑️ Vô hiệu hóa' : '✅ Kích hoạt',
              icon: Trash2,
              onClick: () => {
                if (!user.isDisabled) {
                  handleDelete(user.userId || user.id);
                } else {
                  handleActivate(user.userId || user.id);
                }
              }
            }
          ]}
        />
      </div>
    </div>
  );

  // Filter options
  const roleFilterOptions = [
    { value: 'all', label: 'Tất cả vai trò' },
    { value: 'customer', label: 'Khách hàng' },
    { value: 'admin', label: 'Quản trị viên' }
  ];

  const statusFilterOptions = [
    { value: 'all', label: 'Tất cả trạng thái' },
    { value: 'active', label: 'Hoạt động' },
    { value: 'inactive', label: 'Không hoạt động' }
  ];

  return (
    <div className="admin-users">
      {notification.show && (
        <div className={`notification ${notification.type}`}>
          {notification.message}
        </div>
      )}
      
      <AdminLoadingOverlay 
        loading={loading} 
        hasData={users.length > 0}
        message="Đang tải danh sách người dùng..."
      >
        <AdminPageHeader
          title="Quản lý người dùng"
          subtitle="Quản lý tài khoản người dùng"
          onAdd={handleAddNew}
          addButtonText="➕ Thêm người dùng mới"
        />

        <AdminFiltersBar
          searchValue={searchTerm}
          onSearchChange={setSearchTerm}
          searchPlaceholder="🔍 Tìm kiếm theo tên hoặc email..."
          filters={[
            {
              key: 'role',
              value: filterRole,
              onChange: setFilterRole,
              options: roleFilterOptions
            },
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
          data={paginatedUsers}
          renderRow={renderUserRow}
          loading={loading}
          totalItems={users.length}
          emptyMessage="Chưa có người dùng nào"
          noResultsMessage="Không tìm thấy người dùng nào phù hợp với bộ lọc."
          tableClassName="users-table"
        />

        {filteredUsers.length > 0 && (
          <AdminPagination
            currentPage={currentPage}
            totalPages={totalPages}
            pageSize={pageSize}
            totalItems={filteredUsers.length}
            startIndex={startIndex}
            endIndex={endIndex}
            onPageChange={setCurrentPage}
            onPageSizeChange={(size) => {
              setPageSize(size);
              setCurrentPage(1);
            }}
            pageSizeOptions={[10, 20, 50]}
            itemName="người dùng"
          />
        )}
      </AdminLoadingOverlay>

      {/* Modal */}
      <AdminModal
        open={showModal}
        onOpenChange={(open) => {
          setShowModal(open);
          if (!open) setErrors({});
        }}
        title={editingUser ? 'Chỉnh sửa người dùng' : 'Thêm người dùng mới'}
        description={editingUser ? 'Cập nhật thông tin người dùng' : 'Điền thông tin người dùng mới'}
        onSubmit={handleSubmit}
        submitLabel={editingUser ? 'Cập nhật' : 'Thêm mới'}
        size="4xl"
        className="user-form-modal"
        footer={
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
            <button type="submit" className="save-btn" form="user-form">
              {editingUser ? 'Cập nhật' : 'Thêm mới'}
            </button>
          </div>
        }
      >
            <form id="user-form" onSubmit={handleSubmit} className="modal-form user-form-content">
              <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
                {/* Thông tin cơ bản */}
                <div className="form-section">
                  <h3 className="form-section-title">Thông tin cơ bản</h3>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '20px' }}>
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
                      <label htmlFor="address">Địa chỉ:</label>
                      <input
                        type="text"
                        id="address"
                        name="address"
                        value={formData.address}
                        onChange={handleInputChange}
                        placeholder="Nhập địa chỉ (tùy chọn)"
                      />
                    </div>
                  </div>
                </div>

                {/* Thông tin đăng nhập */}
                {!editingUser && (
                  <div className="form-section">
                    <h3 className="form-section-title">Thông tin đăng nhập</h3>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '20px' }}>
                      <div className="form-group">
                        <label htmlFor="password">Mật khẩu: <span style={{ color: 'red' }}>*</span></label>
                        <input
                          type="password"
                          id="password"
                          name="password"
                          value={formData.password}
                          onChange={handleInputChange}
                          placeholder="Nhập mật khẩu (tối thiểu 6 ký tự)"
                          className={errors.password ? 'error' : ''}
                        />
                        {errors.password && <span className="error-message">{errors.password}</span>}
                      </div>
                      
                      <div className="form-group">
                        <label htmlFor="avatar">Ảnh đại diện:</label>
                        <input
                          type="file"
                          id="avatar"
                          name="avatar"
                          accept="image/*"
                          onChange={handleAvatarChange}
                          className={errors.avatar ? 'error' : ''}
                        />
                        {errors.avatar && <span className="error-message">{errors.avatar}</span>}
                        {avatarPreview && (
                          <div style={{ marginTop: '10px' }}>
                            <img 
                              src={avatarPreview} 
                              alt="Preview" 
                              style={{ 
                                width: '100px', 
                                height: '100px', 
                                objectFit: 'cover', 
                                borderRadius: '8px',
                                border: '2px solid #e0e0e0'
                              }} 
                            />
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                )}

                {/* Vai trò và trạng thái */}
                <div className="form-section">
                  <h3 className="form-section-title">Vai trò và trạng thái</h3>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '20px' }}>
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
                  </div>
                </div>
              </div>
            </form>
      </AdminModal>
    </div>
  );
};

export default AdminUsers;
