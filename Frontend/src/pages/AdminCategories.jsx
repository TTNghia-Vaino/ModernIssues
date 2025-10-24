import React, { useState } from 'react';
import './AdminCategories.css';

const AdminCategories = () => {
  const [categories, setCategories] = useState([
    { id: 1, name: 'Điện thoại', description: 'Điện thoại thông minh', status: 'active', productCount: 45 },
    { id: 2, name: 'Laptop', description: 'Máy tính xách tay', status: 'active', productCount: 32 },
    { id: 3, name: 'Phụ kiện', description: 'Phụ kiện điện tử', status: 'active', productCount: 28 },
    { id: 4, name: 'Đồng hồ', description: 'Đồng hồ thông minh', status: 'inactive', productCount: 15 }
  ]);

  const [showModal, setShowModal] = useState(false);
  const [editingCategory, setEditingCategory] = useState(null);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    status: 'active'
  });

  const handleAddNew = () => {
    setEditingCategory(null);
    setFormData({ name: '', description: '', status: 'active' });
    setShowModal(true);
  };

  const handleEdit = (category) => {
    setEditingCategory(category);
    setFormData({
      name: category.name,
      description: category.description,
      status: category.status
    });
    setShowModal(true);
  };

  const handleDelete = (id) => {
    if (window.confirm('Bạn có chắc chắn muốn xóa danh mục này?')) {
      setCategories(categories.filter(cat => cat.id !== id));
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    
    if (editingCategory) {
      // Cập nhật danh mục
      setCategories(categories.map(cat => 
        cat.id === editingCategory.id 
          ? { ...cat, ...formData }
          : cat
      ));
    } else {
      // Thêm danh mục mới
      const newCategory = {
        id: Math.max(...categories.map(c => c.id)) + 1,
        ...formData,
        productCount: 0
      };
      setCategories([...categories, newCategory]);
    }
    
    setShowModal(false);
    setFormData({ name: '', description: '', status: 'active' });
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

  return (
    <div className="admin-categories">
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
          <div className="col-description">Mô tả</div>
          <div className="col-count">Số sản phẩm</div>
          <div className="col-status">Trạng thái</div>
          <div className="col-actions">Thao tác</div>
        </div>

        {categories.map((category) => (
          <div key={category.id} className="table-row">
            <div className="col-id">{category.id}</div>
            <div className="col-name">{category.name}</div>
            <div className="col-description">{category.description}</div>
            <div className="col-count">{category.productCount}</div>
            <div className="col-status">
              <span className={`status-badge ${getStatusClass(category.status)}`}>
                {getStatusText(category.status)}
              </span>
            </div>
            <div className="col-actions">
              <button 
                className="edit-btn"
                onClick={() => handleEdit(category)}
              >
                ✏️
              </button>
              <button 
                className="delete-btn"
                onClick={() => handleDelete(category.id)}
              >
                🗑️
              </button>
            </div>
          </div>
        ))}
      </div>

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
                <label htmlFor="name">Tên danh mục:</label>
                <input
                  type="text"
                  id="name"
                  name="name"
                  value={formData.name}
                  onChange={handleInputChange}
                  required
                  placeholder="Nhập tên danh mục"
                />
              </div>
              
              <div className="form-group">
                <label htmlFor="description">Mô tả:</label>
                <textarea
                  id="description"
                  name="description"
                  value={formData.description}
                  onChange={handleInputChange}
                  rows="3"
                  placeholder="Nhập mô tả danh mục"
                />
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
                  onClick={() => setShowModal(false)}
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
