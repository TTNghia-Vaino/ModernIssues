import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { getCategories, createCategory, updateCategory, deleteCategory } from '../services/categoryService';
import './AdminCategories.css';

const AdminCategories = () => {
  const { isInTokenGracePeriod } = useAuth();
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [notification, setNotification] = useState({ show: false, message: '', type: '' });

  const [showModal, setShowModal] = useState(false);
  const [editingCategory, setEditingCategory] = useState(null);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    status: 'active',
    parentId: null
  });
  const [errors, setErrors] = useState({});
  const [openDropdownId, setOpenDropdownId] = useState(null);
  
  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (!e.target.closest('.actions-dropdown')) {
        setOpenDropdownId(null);
      }
    };
    
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Load categories from API, but delay if in grace period
  useEffect(() => {
    let cancelled = false;
    
    const attemptLoad = async () => {
      // If in grace period, wait for it to end
      if (isInTokenGracePeriod) {
        console.log('[AdminCategories] Waiting for token grace period to end before loading categories');
        await new Promise(resolve => setTimeout(resolve, 6000));
        if (cancelled) return;
      }
      
      if (!cancelled) {
        loadCategories();
      }
    };
    
    attemptLoad();
    
    return () => {
      cancelled = true;
    };
  }, []); // Only run on mount

  const loadCategories = async () => {
    try {
      setLoading(true);
      const apiCategories = await getCategories();
      console.log('[AdminCategories] Raw API response:', apiCategories);
      
      // Map API response to component format
      if (Array.isArray(apiCategories)) {
        const mapped = apiCategories.map(cat => ({
          id: cat.categoryId || cat.id,
          name: cat.categoryName || cat.name || 'Chưa có tên',
          description: cat.description || '',
          status: cat.status || 'active',
          productCount: cat.productCount || 0,
          parentId: cat.parentId || null,
          parentName: cat.parentName || null,
          createdAt: cat.createdAt,
          updatedAt: cat.updatedAt
        }));
        console.log('[AdminCategories] Mapped categories:', mapped);
        setCategories(mapped);
      } else {
        console.warn('[AdminCategories] API response is not an array:', apiCategories);
        setCategories([]);
      }
    } catch (error) {
      console.error('[AdminCategories] Failed to load categories:', error);
      showNotification('Không thể tải danh sách danh mục. Vui lòng thử lại.', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleAddNew = () => {
    setEditingCategory(null);
    setFormData({ name: '', description: '', status: 'active', parentId: null });
    setErrors({});
    setShowModal(true);
  };

  const handleEdit = (category) => {
    setEditingCategory(category);
    setFormData({
      name: category.name,
      description: category.description || '',
      status: category.status || 'active',
      parentId: category.parentId || null
    });
    setErrors({});
    setShowModal(true);
    setOpenDropdownId(null); // Close dropdown
  };

  const toggleDropdown = (categoryId) => {
    setOpenDropdownId(openDropdownId === categoryId ? null : categoryId);
  };

  const showNotification = (message, type = 'success') => {
    setNotification({ show: true, message, type });
    setTimeout(() => {
      setNotification({ show: false, message: '', type: '' });
    }, 3000);
  };

  const handleDelete = async (id) => {
    setOpenDropdownId(null); // Close dropdown
    if (window.confirm('Bạn có chắc chắn muốn xóa danh mục này? (Soft delete)')) {
      try {
        await deleteCategory(id);
        showNotification('Xóa danh mục thành công!', 'success');
        loadCategories(); // Reload categories
      } catch (error) {
        console.error('[AdminCategories] Failed to delete category:', error);
        showNotification('Không thể xóa danh mục. Vui lòng thử lại.', 'error');
      }
    }
  };

  const validateForm = () => {
    const newErrors = {};
    
    if (!formData.name.trim()) {
      newErrors.name = 'Vui lòng nhập tên danh mục';
    } else if (formData.name.trim().length < 2) {
      newErrors.name = 'Tên danh mục phải có ít nhất 2 ký tự';
    }
    
    if (!formData.description.trim()) {
      newErrors.description = 'Vui lòng nhập mô tả';
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
      if (editingCategory) {
        // Cập nhật danh mục
        await updateCategory(editingCategory.id, {
          name: formData.name.trim(),
          description: formData.description.trim(),
          status: formData.status,
          parentId: formData.parentId || null
        });
        showNotification('Cập nhật danh mục thành công!', 'success');
      } else {
        // Thêm danh mục mới
        await createCategory({
          name: formData.name.trim(),
          description: formData.description.trim(),
          status: formData.status,
          parentId: formData.parentId || null
        });
        showNotification('Thêm danh mục mới thành công!', 'success');
      }
      
      setShowModal(false);
      setFormData({ name: '', description: '', status: 'active', parentId: null });
      setErrors({});
      loadCategories(); // Reload categories
    } catch (error) {
      console.error('[AdminCategories] Failed to save category:', error);
      const errorMessage = error.data?.message || error.message || 'Có lỗi xảy ra. Vui lòng thử lại.';
      showNotification(errorMessage, 'error');
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

  // Pagination calculation
  const totalPages = Math.ceil(categories.length / pageSize);
  const startIndex = (currentPage - 1) * pageSize;
  const endIndex = startIndex + pageSize;
  const paginatedCategories = categories.slice(startIndex, endIndex);

  // Reset to page 1 when categories change
  useEffect(() => {
    setCurrentPage(1);
  }, [categories.length]);

  if (loading) {
    return (
      <div className="admin-categories">
        <div className="page-header">
          <h2>Quản lý danh mục</h2>
        </div>
        <div style={{ textAlign: 'center', padding: '40px' }}>Đang tải danh mục...</div>
      </div>
    );
  }

  return (
    <div className="admin-categories">
      {notification.show && (
        <div className={`notification ${notification.type}`}>
          {notification.message}
        </div>
      )}
      
      <div className="page-header">
        <h2>Quản lý danh mục</h2>
        <button className="add-btn" onClick={handleAddNew}>
          ➕ Thêm danh mục mới
        </button>
      </div>

      <div className="categories-table">
        <div className="table-header">
          <div className="col-id">ID</div>
          <div className="col-name">Tên danh mục</div>
          <div className="col-parent">Danh mục cha</div>
          <div className="col-description">Mô tả</div>
          <div className="col-count">Số sản phẩm</div>
          <div className="col-status">Trạng thái</div>
          <div className="col-actions">Thao tác</div>
        </div>

        {paginatedCategories.map((category) => (
          <div key={category.id} className="table-row">
            <div className="col-id">{category.id}</div>
            <div 
              className="col-name"
              data-full-name={category.name}
              title={category.name}
            >
              {category.name}
            </div>
            <div 
              className="col-parent"
              data-full-parent={category.parentName || 'Danh mục gốc'}
              title={category.parentName || 'Danh mục gốc'}
            >
              {category.parentName ? (
                <span style={{ color: '#666', fontSize: '0.9em' }}>
                  {category.parentName}
                </span>
              ) : (
                <span style={{ color: '#999', fontSize: '0.85em', fontStyle: 'italic' }}>
                  Danh mục gốc
                </span>
              )}
            </div>
            <div 
              className="col-description"
              data-full-description={category.description || '-'}
              title={category.description || '-'}
            >
              {category.description || '-'}
            </div>
            <div className="col-count">{category.productCount}</div>
            <div className="col-status">
              <span className={`status-badge ${getStatusClass(category.status)}`}>
                {getStatusText(category.status)}
              </span>
            </div>
            <div className="col-actions">
              <div className="actions-dropdown">
                <button 
                  className="actions-toggle-btn"
                  onClick={() => toggleDropdown(category.id)}
                  aria-label="Thao tác"
                >
                  ⋮
                </button>
                
                {openDropdownId === category.id && (
                  <div className="dropdown-menu">
                    <button 
                      className="dropdown-item edit-item"
                      onClick={() => handleEdit(category)}
                    >
                      <span className="item-icon">✏️</span>
                      <span>Chỉnh sửa</span>
                    </button>
                    <button 
                      className="dropdown-item delete-item"
                      onClick={() => handleDelete(category.id)}
                    >
                      <span className="item-icon">🗑️</span>
                      <span>Xóa</span>
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Pagination Controls */}
      {categories.length > 0 && (
        <div className="pagination-controls">
          <div className="pagination-info">
            Hiển thị {startIndex + 1}-{Math.min(endIndex, categories.length)} / {categories.length} danh mục
          </div>
          
          <div className="pagination-buttons">
            <button 
              className="pg-btn"
              onClick={() => setCurrentPage(1)}
              disabled={currentPage === 1}
            >
              «
            </button>
            <button 
              className="pg-btn"
              onClick={() => setCurrentPage(currentPage - 1)}
              disabled={currentPage === 1}
            >
              ‹
            </button>
            
            <span className="page-indicator">
              Trang {currentPage} / {totalPages}
            </span>
            
            <button 
              className="pg-btn"
              onClick={() => setCurrentPage(currentPage + 1)}
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
              <h3>{editingCategory ? 'Chỉnh sửa danh mục' : 'Thêm danh mục mới'}</h3>
              <button 
                className="close-btn"
                onClick={() => setShowModal(false)}
              >
                ✕
              </button>
            </div>
            
            <form onSubmit={handleSubmit} className="modal-form">
              <div className="form-group">
                <label htmlFor="name">Tên danh mục: <span style={{ color: 'red' }}>*</span></label>
                <input
                  type="text"
                  id="name"
                  name="name"
                  value={formData.name}
                  onChange={handleInputChange}
                  placeholder="Nhập tên danh mục"
                  className={errors.name ? 'error' : ''}
                />
                {errors.name && <span className="error-message">{errors.name}</span>}
              </div>
              
              <div className="form-group">
                <label htmlFor="description">Mô tả: <span style={{ color: 'red' }}>*</span></label>
                <textarea
                  id="description"
                  name="description"
                  value={formData.description}
                  onChange={handleInputChange}
                  rows="3"
                  placeholder="Nhập mô tả danh mục"
                  className={errors.description ? 'error' : ''}
                />
                {errors.description && <span className="error-message">{errors.description}</span>}
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
              
              <div className="form-group">
                <label htmlFor="parentId">Danh mục cha (tùy chọn):</label>
                <select
                  id="parentId"
                  name="parentId"
                  value={formData.parentId || ''}
                  onChange={(e) => {
                    const value = e.target.value;
                    setFormData({
                      ...formData,
                      parentId: value === '' ? null : parseInt(value)
                    });
                  }}
                >
                  <option value="">Không có (danh mục gốc)</option>
                  {categories
                    .filter(cat => !editingCategory || cat.id !== editingCategory.id)
                    .map(cat => (
                      <option key={cat.id} value={cat.id}>
                        {cat.name}
                      </option>
                    ))}
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
                  {editingCategory ? 'Cập nhật' : 'Thêm mới'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminCategories;