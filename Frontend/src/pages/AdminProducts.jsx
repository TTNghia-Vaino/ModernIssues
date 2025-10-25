import React, { useState, useEffect } from 'react';
import './AdminProducts.css';

const AdminProducts = () => {
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([
    { id: 1, name: 'Laptop' },
    { id: 2, name: 'Mini PC' },
    { id: 3, name: 'Điện thoại' },
    { id: 4, name: 'Phụ kiện' },
    { id: 5, name: 'Đồng hồ' }
  ]);
  
  const [notification, setNotification] = useState({ show: false, message: '', type: '' });
  const [showModal, setShowModal] = useState(false);
  const [editingProduct, setEditingProduct] = useState(null);
  const [formData, setFormData] = useState({
    name: '',
    category: '',
    price: '',
    originalPrice: '',
    discount: 0,
    image: '',
    description: '',
    specs: {
      cpu: '',
      ram: '',
      storage: '',
      display: '',
      gpu: '',
      os: ''
    },
    stock: 0,
    status: 'active',
    badge: '',
    featured: false
  });
  const [errors, setErrors] = useState({});
  const [searchTerm, setSearchTerm] = useState('');
  const [filterCategory, setFilterCategory] = useState('all');
  const [filterStatus, setFilterStatus] = useState('all');

  // Load products from localStorage on mount
  useEffect(() => {
    const savedProducts = localStorage.getItem('adminProducts');
    if (savedProducts) {
      setProducts(JSON.parse(savedProducts));
    } else {
      // Sample data
      const sampleProducts = [
        {
          id: 1,
          name: 'Laptop Dell XPS 13',
          category: 'Laptop',
          price: 25000000,
          originalPrice: 28000000,
          discount: 11,
          image: 'https://via.placeholder.com/200',
          description: 'Laptop cao cấp cho doanh nhân',
          specs: {
            cpu: 'Intel Core i7-1165G7',
            ram: '16GB',
            storage: '512GB SSD',
            display: '13.3" FHD',
            gpu: 'Intel Iris Xe',
            os: 'Windows 11'
          },
          stock: 15,
          status: 'active',
          badge: 'Bán chạy',
          featured: true
        },
        {
          id: 2,
          name: 'PC ST Văn Phòng R5-4650G',
          category: 'Mini PC',
          price: 7120000,
          originalPrice: 7590000,
          discount: 6,
          image: 'https://via.placeholder.com/200',
          description: 'PC văn phòng hiệu suất cao',
          specs: {
            cpu: 'AMD Ryzen 5 4650G',
            ram: '8GB',
            storage: '500GB NVMe',
            gpu: 'Radeon Graphics',
            os: 'Windows 11 Pro'
          },
          stock: 20,
          status: 'active',
          badge: 'PC Văn Phòng',
          featured: false
        }
      ];
      setProducts(sampleProducts);
      localStorage.setItem('adminProducts', JSON.stringify(sampleProducts));
    }
  }, []);

  // Save products to localStorage whenever they change
  useEffect(() => {
    if (products.length > 0) {
      localStorage.setItem('adminProducts', JSON.stringify(products));
    }
  }, [products]);

  const showNotification = (message, type = 'success') => {
    setNotification({ show: true, message, type });
    setTimeout(() => {
      setNotification({ show: false, message: '', type: '' });
    }, 3000);
  };

  const handleAddNew = () => {
    setEditingProduct(null);
    setFormData({
      name: '',
      category: '',
      price: '',
      originalPrice: '',
      discount: 0,
      image: '',
      description: '',
      specs: {
        cpu: '',
        ram: '',
        storage: '',
        display: '',
        gpu: '',
        os: ''
      },
      stock: 0,
      status: 'active',
      badge: '',
      featured: false
    });
    setErrors({});
    setShowModal(true);
  };

  const handleEdit = (product) => {
    setEditingProduct(product);
    setFormData({
      ...product,
      specs: { ...product.specs }
    });
    setErrors({});
    setShowModal(true);
  };

  const handleDelete = (id) => {
    if (window.confirm('Bạn có chắc chắn muốn xóa sản phẩm này?')) {
      setProducts(products.filter(prod => prod.id !== id));
      showNotification('Xóa sản phẩm thành công!');
    }
  };

  const validateForm = () => {
    const newErrors = {};
    
    if (!formData.name.trim()) {
      newErrors.name = 'Vui lòng nhập tên sản phẩm';
    }
    
    if (!formData.category) {
      newErrors.category = 'Vui lòng chọn danh mục';
    }
    
    if (!formData.price || formData.price <= 0) {
      newErrors.price = 'Vui lòng nhập giá hợp lệ';
    }
    
    if (!formData.originalPrice || formData.originalPrice <= 0) {
      newErrors.originalPrice = 'Vui lòng nhập giá gốc hợp lệ';
    }
    
    if (formData.stock < 0) {
      newErrors.stock = 'Số lượng không được âm';
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }
    
    // Calculate discount
    const discount = Math.round(((formData.originalPrice - formData.price) / formData.originalPrice) * 100);
    
    if (editingProduct) {
      // Update product
      setProducts(products.map(prod => 
        prod.id === editingProduct.id 
          ? { ...formData, id: prod.id, discount }
          : prod
      ));
      showNotification('Cập nhật sản phẩm thành công!');
    } else {
      // Add new product
      const newProduct = {
        id: products.length > 0 ? Math.max(...products.map(p => p.id)) + 1 : 1,
        ...formData,
        discount
      };
      setProducts([...products, newProduct]);
      showNotification('Thêm sản phẩm mới thành công!');
    }
    
    setShowModal(false);
    setFormData({
      name: '',
      category: '',
      price: '',
      originalPrice: '',
      discount: 0,
      image: '',
      description: '',
      specs: {
        cpu: '',
        ram: '',
        storage: '',
        display: '',
        gpu: '',
        os: ''
      },
      stock: 0,
      status: 'active',
      badge: '',
      featured: false
    });
    setErrors({});
  };

  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    
    if (name.startsWith('specs.')) {
      const specKey = name.split('.')[1];
      setFormData({
        ...formData,
        specs: {
          ...formData.specs,
          [specKey]: value
        }
      });
    } else {
      setFormData({
        ...formData,
        [name]: type === 'checkbox' ? checked : value
      });
    }
  };

  const formatPrice = (price) => {
    return new Intl.NumberFormat('vi-VN', {
      style: 'currency',
      currency: 'VND'
    }).format(price);
  };

  // Filter products
  const filteredProducts = products.filter(product => {
    const matchesSearch = product.name.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = filterCategory === 'all' || product.category === filterCategory;
    const matchesStatus = filterStatus === 'all' || product.status === filterStatus;
    
    return matchesSearch && matchesCategory && matchesStatus;
  });

  return (
    <div className="admin-products">
      {notification.show && (
        <div className={`notification ${notification.type}`}>
          {notification.message}
        </div>
      )}
      
      <div className="page-header">
        <h2>Quản lý sản phẩm</h2>
        <button className="add-btn" onClick={handleAddNew}>
          ➕ Thêm sản phẩm mới
        </button>
      </div>

      {/* Filters */}
      <div className="filters-section">
        <div className="search-box">
          <input
            type="text"
            placeholder="Tìm kiếm sản phẩm..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        
        <div className="filter-controls">
          <select 
            value={filterCategory} 
            onChange={(e) => setFilterCategory(e.target.value)}
          >
            <option value="all">Tất cả danh mục</option>
            {categories.map(cat => (
              <option key={cat.id} value={cat.name}>{cat.name}</option>
            ))}
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

      <div className="products-table">
        <div className="table-header">
          <div className="col-image">Hình ảnh</div>
          <div className="col-name">Tên sản phẩm</div>
          <div className="col-category">Danh mục</div>
          <div className="col-price">Giá bán</div>
          <div className="col-stock">Tồn kho</div>
          <div className="col-status">Trạng thái</div>
          <div className="col-actions">Thao tác</div>
        </div>

        {filteredProducts.map((product) => (
          <div key={product.id} className="table-row">
            <div className="col-image">
              <img src={product.image} alt={product.name} />
            </div>
            <div className="col-name">
              <div className="product-name">{product.name}</div>
              {product.badge && <span className="product-badge">{product.badge}</span>}
              {product.featured && <span className="featured-badge">⭐ Nổi bật</span>}
            </div>
            <div className="col-category">{product.category}</div>
            <div className="col-price">
              <div className="price-current">{formatPrice(product.price)}</div>
              {product.discount > 0 && (
                <>
                  <div className="price-original">{formatPrice(product.originalPrice)}</div>
                  <div className="discount-badge">-{product.discount}%</div>
                </>
              )}
            </div>
            <div className="col-stock">
              <span className={product.stock > 10 ? 'stock-good' : product.stock > 0 ? 'stock-low' : 'stock-out'}>
                {product.stock} sản phẩm
              </span>
            </div>
            <div className="col-status">
              <span className={`status-badge ${product.status === 'active' ? 'status-active' : 'status-inactive'}`}>
                {product.status === 'active' ? 'Hoạt động' : 'Không hoạt động'}
              </span>
            </div>
            <div className="col-actions">
              <button 
                className="edit-btn"
                onClick={() => handleEdit(product)}
              >
                ✏️
              </button>
              <button 
                className="delete-btn"
                onClick={() => handleDelete(product.id)}
              >
                🗑️
              </button>
            </div>
          </div>
        ))}

        {filteredProducts.length === 0 && (
          <div className="no-data">
            Không tìm thấy sản phẩm nào
          </div>
        )}
      </div>

      {/* Modal */}
      {showModal && (
        <div className="modal-overlay">
          <div className="modal-content modal-large">
            <div className="modal-header">
              <h3>{editingProduct ? 'Chỉnh sửa sản phẩm' : 'Thêm sản phẩm mới'}</h3>
              <button 
                className="close-btn"
                onClick={() => setShowModal(false)}
              >
                ✕
              </button>
            </div>
            
            <form onSubmit={handleSubmit} className="modal-form">
              <div className="form-row">
                <div className="form-group">
                  <label htmlFor="name">Tên sản phẩm: <span className="required">*</span></label>
                  <input
                    type="text"
                    id="name"
                    name="name"
                    value={formData.name}
                    onChange={handleInputChange}
                    placeholder="Nhập tên sản phẩm"
                    className={errors.name ? 'error' : ''}
                  />
                  {errors.name && <span className="error-message">{errors.name}</span>}
                </div>
                
                <div className="form-group">
                  <label htmlFor="category">Danh mục: <span className="required">*</span></label>
                  <select
                    id="category"
                    name="category"
                    value={formData.category}
                    onChange={handleInputChange}
                    className={errors.category ? 'error' : ''}
                  >
                    <option value="">Chọn danh mục</option>
                    {categories.map(cat => (
                      <option key={cat.id} value={cat.name}>{cat.name}</option>
                    ))}
                  </select>
                  {errors.category && <span className="error-message">{errors.category}</span>}
                </div>
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label htmlFor="price">Giá bán: <span className="required">*</span></label>
                  <input
                    type="number"
                    id="price"
                    name="price"
                    value={formData.price}
                    onChange={handleInputChange}
                    placeholder="Nhập giá bán"
                    className={errors.price ? 'error' : ''}
                  />
                  {errors.price && <span className="error-message">{errors.price}</span>}
                </div>
                
                <div className="form-group">
                  <label htmlFor="originalPrice">Giá gốc: <span className="required">*</span></label>
                  <input
                    type="number"
                    id="originalPrice"
                    name="originalPrice"
                    value={formData.originalPrice}
                    onChange={handleInputChange}
                    placeholder="Nhập giá gốc"
                    className={errors.originalPrice ? 'error' : ''}
                  />
                  {errors.originalPrice && <span className="error-message">{errors.originalPrice}</span>}
                </div>
                
                <div className="form-group">
                  <label htmlFor="stock">Tồn kho:</label>
                  <input
                    type="number"
                    id="stock"
                    name="stock"
                    value={formData.stock}
                    onChange={handleInputChange}
                    placeholder="Số lượng"
                    className={errors.stock ? 'error' : ''}
                  />
                  {errors.stock && <span className="error-message">{errors.stock}</span>}
                </div>
              </div>

              <div className="form-group">
                <label htmlFor="image">URL Hình ảnh:</label>
                <input
                  type="text"
                  id="image"
                  name="image"
                  value={formData.image}
                  onChange={handleInputChange}
                  placeholder="https://example.com/image.jpg"
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
                  placeholder="Nhập mô tả sản phẩm"
                />
              </div>

              <div className="specs-section">
                <h4>Thông số kỹ thuật</h4>
                <div className="form-row">
                  <div className="form-group">
                    <label htmlFor="specs.cpu">CPU:</label>
                    <input
                      type="text"
                      id="specs.cpu"
                      name="specs.cpu"
                      value={formData.specs.cpu}
                      onChange={handleInputChange}
                      placeholder="Intel Core i5, AMD Ryzen 5..."
                    />
                  </div>
                  
                  <div className="form-group">
                    <label htmlFor="specs.ram">RAM:</label>
                    <input
                      type="text"
                      id="specs.ram"
                      name="specs.ram"
                      value={formData.specs.ram}
                      onChange={handleInputChange}
                      placeholder="8GB, 16GB..."
                    />
                  </div>
                  
                  <div className="form-group">
                    <label htmlFor="specs.storage">Ổ cứng:</label>
                    <input
                      type="text"
                      id="specs.storage"
                      name="specs.storage"
                      value={formData.specs.storage}
                      onChange={handleInputChange}
                      placeholder="512GB SSD, 1TB HDD..."
                    />
                  </div>
                </div>

                <div className="form-row">
                  <div className="form-group">
                    <label htmlFor="specs.display">Màn hình:</label>
                    <input
                      type="text"
                      id="specs.display"
                      name="specs.display"
                      value={formData.specs.display}
                      onChange={handleInputChange}
                      placeholder="15.6 FHD, 13.3 2K..."
                    />
                  </div>
                  
                  <div className="form-group">
                    <label htmlFor="specs.gpu">GPU:</label>
                    <input
                      type="text"
                      id="specs.gpu"
                      name="specs.gpu"
                      value={formData.specs.gpu}
                      onChange={handleInputChange}
                      placeholder="RTX 3060, Intel Iris Xe..."
                    />
                  </div>
                  
                  <div className="form-group">
                    <label htmlFor="specs.os">Hệ điều hành:</label>
                    <input
                      type="text"
                      id="specs.os"
                      name="specs.os"
                      value={formData.specs.os}
                      onChange={handleInputChange}
                      placeholder="Windows 11, macOS..."
                    />
                  </div>
                </div>
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label htmlFor="badge">Badge:</label>
                  <input
                    type="text"
                    id="badge"
                    name="badge"
                    value={formData.badge}
                    onChange={handleInputChange}
                    placeholder="Bán chạy, PC Văn Phòng..."
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
              </div>

              <div className="form-group checkbox-group">
                <label>
                  <input
                    type="checkbox"
                    name="featured"
                    checked={formData.featured}
                    onChange={handleInputChange}
                  />
                  <span>Sản phẩm nổi bật</span>
                </label>
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
                  {editingProduct ? 'Cập nhật' : 'Thêm mới'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminProducts;


