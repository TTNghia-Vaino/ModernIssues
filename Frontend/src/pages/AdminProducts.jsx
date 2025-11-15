import React, { useState, useEffect } from 'react';
import * as productService from '../services/productService';
import { getCategories } from '../services/categoryService';
import { useAuth } from '../context/AuthContext';
import './AdminProducts.css';

const AdminProducts = () => {
  const { isInTokenGracePeriod } = useAuth();
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  
  const [notification, setNotification] = useState({ show: false, message: '', type: '' });
  const [showModal, setShowModal] = useState(false);
  const [editingProduct, setEditingProduct] = useState(null);
  const [loading, setLoading] = useState(false);
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

  // Load products and categories from API on mount, but delay if in grace period
  useEffect(() => {
    let cancelled = false;
    
    const attemptLoad = async () => {
      // If in grace period, wait for it to end
      if (isInTokenGracePeriod) {
        console.log('[AdminProducts] Waiting for token grace period to end before loading products');
        // Wait for grace period to end (5 seconds) plus a small buffer (1 second)
        await new Promise(resolve => setTimeout(resolve, 6000));
        if (cancelled) return;
      }
      
      if (!cancelled) {
        loadProducts();
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
      const apiCategories = await getCategories();
      // Flatten the tree structure for dropdown
      const flattenCategories = (cats, result = []) => {
        if (!Array.isArray(cats)) return result;
        cats.forEach(cat => {
          result.push({
            id: cat.id,
            name: cat.name,
            description: cat.description || ''
          });
          if (cat.children && Array.isArray(cat.children)) {
            flattenCategories(cat.children, result);
          }
        });
        return result;
      };
      const flattened = flattenCategories(apiCategories);
      setCategories(flattened);
    } catch (error) {
      console.error('[AdminProducts] Failed to load categories:', error);
      // Keep empty array, show error notification if needed
    }
  };

  const loadProducts = async () => {
    try {
      setLoading(true);
      // Use listProducts to get ALL products (admin view)
      const response = await productService.listProducts({ page: 1, limit: 1000 });
      
      // Handle different response formats
      let productsArray = [];
      if (response && typeof response === 'object') {
        // Handle pagination response: { totalCount, currentPage, limit, data: [...] }
        if (response.data && Array.isArray(response.data)) {
          productsArray = response.data;
        } else if (Array.isArray(response)) {
          productsArray = response;
        } else if (response.items) {
          productsArray = response.items;
        }
      } else if (Array.isArray(response)) {
        productsArray = response;
      }
      
      setProducts(productsArray);
    } catch (error) {
      console.error('[AdminProducts] Error loading products:', error);
      
      // Handle 401 Unauthorized specifically
      if (error.status === 401 || error.isUnauthorized) {
        // Only redirect if not in grace period
        if (!isInTokenGracePeriod) {
          showNotification('Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.', 'error');
          setTimeout(() => {
            window.location.href = '/login?redirect=/admin/products';
          }, 2000);
        } else {
          console.log('[AdminProducts] Ignoring 401 during grace period, will retry later');
        }
        return;
      }
      
      showNotification('Lỗi khi tải danh sách sản phẩm: ' + (error.message || 'Unknown error'), 'error');
      setProducts([]);
    } finally {
      setLoading(false);
    }
  };

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
      name: product.name || product.productName || '',
      category: product.categoryId || product.category || '',
      price: product.price || '',
      originalPrice: product.onPrice || product.originalPrice || product.price || '',
      image: product.imageUrl || product.image || '',
      description: product.description || '',
      stock: product.stock || 0,
      specs: { ...product.specs } || {},
      status: product.status || 'active',
      badge: product.badge || '',
      featured: product.featured || false
    });
    setErrors({});
    setShowModal(true);
  };

  const handleDelete = async (id) => {
    if (window.confirm('Bạn có chắc chắn muốn xóa sản phẩm này?')) {
      try {
        setLoading(true);
        await productService.deleteProduct(id);
        setProducts(products.filter(prod => prod.id !== id));
        showNotification('Xóa sản phẩm thành công!');
        // Also update localStorage
        const updatedProducts = products.filter(prod => prod.id !== id);
        localStorage.setItem('adminProducts', JSON.stringify(updatedProducts));
      } catch (error) {
        console.error('Error deleting product:', error);
        showNotification('Lỗi khi xóa sản phẩm: ' + error.message, 'error');
      } finally {
        setLoading(false);
      }
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

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }
    
    try {
      setLoading(true);
      // Calculate discount
      const discount = Math.round(((formData.originalPrice - formData.price) / formData.originalPrice) * 100);
      
      const productData = {
        ...formData,
        discount,
        price: Number(formData.price),
        originalPrice: Number(formData.originalPrice),
        stock: Number(formData.stock)
      };
      
      // Map formData to API format
      const apiProductData = {
        productName: productData.name,
        description: productData.description || '',
        price: productData.price,
        categoryId: typeof productData.category === 'number' ? productData.category : parseInt(productData.category) || 1, // Default to 1 if not numeric
        stock: productData.stock || 0,
        warrantyPeriod: productData.warrantyPeriod || 12, // Default 12 months
        currentImageUrl: productData.image || productData.imageUrl || null
      };
      
      // Handle image file if provided
      let imageFile = null;
      if (productData.imageFile instanceof File) {
        imageFile = productData.imageFile;
      }

      if (editingProduct) {
        // Update product via API
        try {
          const updatedProduct = await productService.updateProduct(editingProduct.id, apiProductData, imageFile);
          
          // Map API response back to local format
          const mappedProduct = {
            id: updatedProduct.productId || updatedProduct.id || editingProduct.id,
            name: updatedProduct.productName || updatedProduct.name,
            category: updatedProduct.categoryId || updatedProduct.category,
            price: updatedProduct.price,
            originalPrice: updatedProduct.onPrice || updatedProduct.originalPrice || updatedProduct.price,
            image: updatedProduct.imageUrl || updatedProduct.image || productData.image,
            description: updatedProduct.description,
            stock: updatedProduct.stock,
            ...updatedProduct
          };
          
          setProducts(products.map(prod => 
            prod.id === editingProduct.id ? mappedProduct : prod
          ));
          showNotification('Cập nhật sản phẩm thành công!');
          // Update localStorage
          const updatedProducts = products.map(prod => 
            prod.id === editingProduct.id ? mappedProduct : prod
          );
          localStorage.setItem('adminProducts', JSON.stringify(updatedProducts));
        } catch (apiError) {
          console.error('[AdminProducts] API update failed:', apiError);
          // Fallback to local update
          setProducts(products.map(prod => 
            prod.id === editingProduct.id 
              ? { ...productData, id: prod.id }
              : prod
          ));
          showNotification('Cập nhật sản phẩm thành công! (local)');
        }
      } else {
        // Create new product via API
        console.log('[AdminProducts] Attempting to create product via API...');
        console.log('[AdminProducts] API Product Data:', apiProductData);
        console.log('[AdminProducts] Has Image File:', !!imageFile);
        
        try {
          const newProduct = await productService.createProduct(apiProductData, imageFile);
          
          console.log('[AdminProducts] ✅ API create product SUCCESS!');
          console.log('[AdminProducts] API Response:', newProduct);
          
          // Map API response back to local format
          const mappedProduct = {
            id: newProduct.productId || newProduct.id || (products.length > 0 ? Math.max(...products.map(p => p.id)) + 1 : 1),
            name: newProduct.productName || newProduct.name,
            category: newProduct.categoryId || newProduct.category,
            price: newProduct.price,
            originalPrice: newProduct.onPrice || newProduct.originalPrice || newProduct.price,
            image: newProduct.imageUrl || newProduct.image || productData.image,
            description: newProduct.description,
            stock: newProduct.stock,
            ...newProduct
          };
          
          console.log('[AdminProducts] Mapped Product:', mappedProduct);
          setProducts([...products, mappedProduct]);
          showNotification('Thêm sản phẩm mới thành công! (Đã lưu vào database)');
          
          // Update localStorage
          const updatedProducts = [...products, mappedProduct];
          localStorage.setItem('adminProducts', JSON.stringify(updatedProducts));
        } catch (apiError) {
          console.error('[AdminProducts] ❌ API create product FAILED!');
          console.error('[AdminProducts] Error Details:', {
            message: apiError.message,
            status: apiError.status,
            data: apiError.data,
            stack: apiError.stack
          });
          
          // Fallback to local create
          console.warn('[AdminProducts] Falling back to local storage (NOT saved to database)');
          const newProduct = {
            id: products.length > 0 ? Math.max(...products.map(p => p.id)) + 1 : 1,
            ...productData
          };
          setProducts([...products, newProduct]);
          showNotification('Thêm sản phẩm mới thành công! (Chỉ lưu local - CHƯA lưu vào database)', 'error');
        }
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
    } catch (error) {
      console.error('Error saving product:', error);
      showNotification('Lỗi khi lưu sản phẩm: ' + error.message, 'error');
    } finally {
      setLoading(false);
    }
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
    const matchesSearch = (product.name || product.productName || '').toLowerCase().includes(searchTerm.toLowerCase());
    // Handle category matching - can be id or name
    const productCategoryId = product.categoryId || product.category;
    const matchesCategory = filterCategory === 'all' || 
      (typeof productCategoryId === 'number' && productCategoryId === parseInt(filterCategory)) ||
      (productCategoryId && productCategoryId.toString() === filterCategory);
    const matchesStatus = filterStatus === 'all' || (product.status === filterStatus);
    
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
              <option key={cat.id} value={cat.id}>{cat.name}</option>
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
            <div className="col-category">
              {(() => {
                const categoryId = product.categoryId || product.category;
                const categoryObj = categories.find(cat => cat.id === categoryId || cat.id === parseInt(categoryId));
                return categoryObj ? categoryObj.name : (categoryId || 'N/A');
              })()}
            </div>
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
                      <option key={cat.id} value={cat.id}>{cat.name}</option>
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


