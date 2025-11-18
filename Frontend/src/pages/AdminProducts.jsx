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
  const [imageFile, setImageFile] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterCategory, setFilterCategory] = useState('all');
  const [filterStatus, setFilterStatus] = useState('all');
  const [dropdownOpen, setDropdownOpen] = useState(null);
  
  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

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
        loadCategories(); // Load categories first
        loadProducts();
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

  const loadCategories = async () => {
    try {
      const apiCategories = await getCategories();
      console.log('[AdminProducts] Raw categories from API:', apiCategories);
      
      // Flatten the tree structure for dropdown
      const flattenCategories = (cats, result = [], level = 0) => {
        if (!Array.isArray(cats)) return result;
        cats.forEach(cat => {
          // Map API response format to component format
          const categoryId = cat.categoryId || cat.id;
          const categoryName = cat.categoryName || cat.name || 'Chưa có tên';
          
          result.push({
            id: categoryId,
            name: level > 0 ? '  '.repeat(level) + '└─ ' + categoryName : categoryName,
            categoryId: categoryId,
            categoryName: categoryName,
            description: cat.description || '',
            parentId: cat.parentId || null
          });
          
          if (cat.children && Array.isArray(cat.children)) {
            flattenCategories(cat.children, result, level + 1);
          }
        });
        return result;
      };
      
      const flattened = flattenCategories(apiCategories);
      console.log('[AdminProducts] Flattened categories:', flattened);
      setCategories(flattened);
    } catch (error) {
      console.error('[AdminProducts] Failed to load categories:', error);
      setCategories([]);
      // Keep empty array, show error notification if needed
    }
  };

  const loadProducts = async () => {
    try {
      setLoading(true);
      // Use getAllListProducts to get ALL products including disabled (admin view)
      const productsArray = await productService.getAllListProducts();
      
      console.log('[AdminProducts] API Response (GetAllListProducts):', productsArray);
      console.log('[AdminProducts] Products count:', productsArray.length);
      
      // Map API fields to component format
      const { getBaseURL } = await import('../config/api');
      const baseUrl = getBaseURL() || 'http://35.232.61.38:5000'; // Fallback to server URL if using proxy
      // Remove v1 from base URL if present
      const cleanBaseUrl = baseUrl.replace(/\/v1$/, '');
      
      const mappedProducts = productsArray.map(product => {
        // Build full image URL if imageUrl is just filename
        let fullImageUrl = product.imageUrl || product.image;
        if (fullImageUrl && !fullImageUrl.startsWith('http') && !fullImageUrl.startsWith('data:') && !fullImageUrl.startsWith('/')) {
          // If imageUrl is just filename, construct full URL from wwwroot/Uploads/Images
          fullImageUrl = `${cleanBaseUrl}/Uploads/Images/${fullImageUrl}`;
        }
        
        return {
          id: product.productId || product.id,
          name: product.productName || product.name,
          productName: product.productName || product.name,
          category: product.categoryId || product.category,
          categoryId: product.categoryId || product.category,
          categoryName: product.categoryName || product.categoryName,
          price: product.price || 0,
          originalPrice: product.onPrices || product.onPrice || product.price || 0,
          onPrice: product.onPrices || product.onPrice,
          discount: (product.onPrices || product.onPrice) > 0 && product.price 
            ? Math.round((((product.onPrices || product.onPrice) - product.price) / (product.onPrices || product.onPrice)) * 100) 
            : 0,
          image: fullImageUrl,
          imageUrl: fullImageUrl,
          description: product.description || '',
          stock: product.stock || 0,
          warrantyPeriod: product.warrantyPeriod || 12,
          status: (product.stock || 0) > 0 ? 'active' : 'inactive',
          isDisabled: product.isDisabled === true || product.isDisabled === 'true' || product.is_disabled === true,
          badge: product.badge || '',
          featured: product.featured || false,
          specs: product.specs || {}
        };
      });
      
      console.log('[AdminProducts] Mapped products:', mappedProducts);
      setProducts(mappedProducts);
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
    setImageFile(null);
    setImagePreview(null);
    setErrors({});
    setShowModal(true);
  };

  const handleEdit = async (product) => {
    setEditingProduct(product);
    
    // Build full image URL for preview
    let previewImageUrl = product.imageUrl || product.image || null;
    if (previewImageUrl && !previewImageUrl.startsWith('http') && !previewImageUrl.startsWith('data:') && !previewImageUrl.startsWith('/')) {
      const { getBaseURL } = await import('../config/api');
      const baseUrl = getBaseURL() || 'http://35.232.61.38:5000';
      const cleanBaseUrl = baseUrl.replace(/\/v1$/, '');
      previewImageUrl = `${cleanBaseUrl}/Uploads/Images/${previewImageUrl}`;
    }
    
    setFormData({
      ...product,
      name: product.name || product.productName || '',
      category: product.categoryId || product.category || '',
      price: product.price || '',
      originalPrice: product.onPrices || product.onPrice || product.originalPrice || product.price || '',
      image: previewImageUrl || '',
      description: product.description || '',
      stock: product.stock || 0,
      warrantyPeriod: product.warrantyPeriod || 12,
      specs: { ...product.specs } || {},
      status: product.status || 'active',
      badge: product.badge || '',
      featured: product.featured || false
    });
    setImageFile(null);
    setImagePreview(previewImageUrl);
    setErrors({});
    setShowModal(true);
  };

  const handleDisable = async (id) => {
    if (window.confirm('Bạn có chắc chắn muốn ngừng bán sản phẩm này?')) {
      try {
        setLoading(true);
        const product = products.find(p => p.id === id);
        if (!product) {
          throw new Error('Không tìm thấy sản phẩm');
        }
        
        // Use DELETE API to soft delete (set is_disabled = true)
        // DELETE /v1/Product/{id} - Vô hiệu hóa sản phẩm (soft delete)
        console.log('[AdminProducts.handleDisable] Soft deleting product:', id);
        await productService.deleteProduct(id);
        console.log('[AdminProducts.handleDisable] Product soft deleted successfully');
        
        // Reload products to sync with backend
        await loadProducts();
        showNotification('Ngừng bán sản phẩm thành công!');
      } catch (error) {
        console.error('[AdminProducts.handleDisable] Error disabling product:', error);
        showNotification('Lỗi khi ngừng bán sản phẩm: ' + error.message, 'error');
      } finally {
        setLoading(false);
      }
    }
  };

  const handleActivate = async (id) => {
    if (window.confirm('Bạn có chắc chắn muốn kích hoạt lại sản phẩm này?')) {
      try {
        setLoading(true);
        const product = products.find(p => p.id === id);
        if (!product) {
          throw new Error('Không tìm thấy sản phẩm');
        }
        
        // Update product with isDisabled = false
        const updateData = {
          productName: product.productName || product.name,
          description: product.description || '',
          price: product.price || 0,
          categoryId: product.categoryId || product.category,
          stock: product.stock || 0,
          warrantyPeriod: product.warrantyPeriod || 12,
          isDisabled: false, // Set to false to activate product
          currentImageUrl: product.imageUrl || product.image
        };
        
        console.log('[AdminProducts.handleActivate] Updating product:', id, 'with data:', updateData);
        await productService.updateProduct(id, updateData, null);
        console.log('[AdminProducts.handleActivate] Product updated successfully');
        
        // Reload products to sync with backend
        await loadProducts();
        showNotification('Kích hoạt sản phẩm thành công!');
      } catch (error) {
        console.error('[AdminProducts.handleActivate] Error activating product:', error);
        showNotification('Lỗi khi kích hoạt sản phẩm: ' + error.message, 'error');
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
      
      // Map formData to API format - chỉ gửi các field API yêu cầu
      const categoryId = Number(productData.category);
      if (!categoryId || categoryId <= 0) {
        showNotification('Vui lòng chọn danh mục sản phẩm', 'error');
        return;
      }
      
      const apiProductData = {
        productName: productData.name || 'Untitled Product',
        description: productData.description || 'No description',
        price: Number(productData.price) || 0,
        categoryId: categoryId,
        stock: Number(productData.stock) || 0,
        warrantyPeriod: Number(productData.warrantyPeriod) || 12
      };
      
      if (editingProduct) {
        // Update product via API
        try {
          // Include current image URL if not uploading new image
          if (!imageFile && formData.image) {
            apiProductData.currentImageUrl = formData.image;
          }
          const updatedProduct = await productService.updateProduct(editingProduct.id, apiProductData, imageFile || null);
          
          console.log('[AdminProducts] ✅ API update product SUCCESS!');
          console.log('[AdminProducts] API Response:', updatedProduct);
          
          // Map API response back to local format
          // Response format: { productId, onPrices, categoryName, isDisabled, categoryId, productName, description, price, stock, warrantyPeriod, imageUrl }
          
          // Build full image URL if imageUrl is just filename
          let fullImageUrl = updatedProduct.imageUrl || updatedProduct.image || productData.image;
          if (fullImageUrl && !fullImageUrl.startsWith('http') && !fullImageUrl.startsWith('data:') && !fullImageUrl.startsWith('/')) {
            // If imageUrl is just filename, construct full URL from wwwroot/Uploads/Images
            const { getBaseURL } = await import('../config/api');
            const baseUrl = getBaseURL() || 'http://35.232.61.38:5000'; // Fallback to server URL if using proxy
            // Remove v1 from base URL if present, then add Uploads/Images path
            const cleanBaseUrl = baseUrl.replace(/\/v1$/, '');
            fullImageUrl = `${cleanBaseUrl}/Uploads/Images/${fullImageUrl}`;
          }
          
          const mappedProduct = {
            id: updatedProduct.productId || updatedProduct.id || editingProduct.id,
            productId: updatedProduct.productId || updatedProduct.id,
            name: updatedProduct.productName || updatedProduct.name,
            productName: updatedProduct.productName || updatedProduct.name,
            category: updatedProduct.categoryId || updatedProduct.category,
            categoryId: updatedProduct.categoryId,
            categoryName: updatedProduct.categoryName,
            price: updatedProduct.price,
            originalPrice: updatedProduct.onPrices || updatedProduct.onPrice || updatedProduct.originalPrice || updatedProduct.price,
            onPrices: updatedProduct.onPrices || 0,
            image: fullImageUrl,
            imageUrl: fullImageUrl,
            description: updatedProduct.description,
            stock: updatedProduct.stock,
            warrantyPeriod: updatedProduct.warrantyPeriod || 12,
            isDisabled: updatedProduct.isDisabled || false,
            statusText: updatedProduct.statusText,
            statusColor: updatedProduct.statusColor,
            ...updatedProduct
          };
          
          console.log('[AdminProducts] Mapped Product:', mappedProduct);
          console.log('[AdminProducts] Image URL:', fullImageUrl);
          
          // Update formData and imagePreview with new image
          setFormData(prev => ({
            ...prev,
            image: fullImageUrl
          }));
          setImagePreview(fullImageUrl);
          setImageFile(null); // Clear uploaded file after success
          
          // Reload products list to get the latest data from server
          await loadProducts();
          showNotification('Cập nhật sản phẩm thành công!');
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
          const newProduct = await productService.createProduct(apiProductData, imageFile || null);
          
          console.log('[AdminProducts] ✅ API create product SUCCESS!');
          console.log('[AdminProducts] API Response:', newProduct);
          
          // Map API response back to local format
          // Build full image URL if imageUrl is just filename
          let fullImageUrl = newProduct.imageUrl || newProduct.image || productData.image;
          if (fullImageUrl && !fullImageUrl.startsWith('http') && !fullImageUrl.startsWith('data:') && !fullImageUrl.startsWith('/')) {
            // If imageUrl is just filename, construct full URL from wwwroot/Uploads/Images
            const { getBaseURL } = await import('../config/api');
            const baseUrl = getBaseURL() || 'http://35.232.61.38:5000'; // Fallback to server URL if using proxy
            // Remove v1 from base URL if present, then add Uploads/Images path
            const cleanBaseUrl = baseUrl.replace(/\/v1$/, '');
            fullImageUrl = `${cleanBaseUrl}/Uploads/Images/${fullImageUrl}`;
          }
          
          const mappedProduct = {
            id: newProduct.productId || newProduct.id || (products.length > 0 ? Math.max(...products.map(p => p.id)) + 1 : 1),
            name: newProduct.productName || newProduct.name,
            category: newProduct.categoryId || newProduct.category,
            price: newProduct.price,
            originalPrice: newProduct.onPrices || newProduct.onPrice || newProduct.originalPrice || newProduct.price,
            image: fullImageUrl,
            imageUrl: fullImageUrl,
            description: newProduct.description,
            stock: newProduct.stock,
            ...newProduct
          };
          
          console.log('[AdminProducts] Mapped Product:', mappedProduct);
          console.log('[AdminProducts] Image URL:', fullImageUrl);
          
          // Clear form after successful create
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
            warrantyPeriod: 12,
            status: 'active',
            badge: '',
            featured: false
          });
          setImageFile(null);
          setImagePreview(null);
          
          // Reload products list to get the latest data from server
          await loadProducts();
          showNotification('Thêm sản phẩm mới thành công!');
          setShowModal(false);
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
      setImageFile(null);
      setImagePreview(null);
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

  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      // Validate file type
      if (!file.type.startsWith('image/')) {
        setErrors({ ...errors, image: 'Vui lòng chọn file ảnh hợp lệ' });
        return;
      }
      
      // Validate file size (max 5MB)
      if (file.size > 5 * 1024 * 1024) {
        setErrors({ ...errors, image: 'Kích thước ảnh không được vượt quá 5MB' });
        return;
      }
      
      setImageFile(file);
      setErrors({ ...errors, image: null });
      
      // Create preview
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreview(reader.result);
      };
      reader.readAsDataURL(file);
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
    let matchesCategory = true;
    if (filterCategory !== 'all') {
      const filterCategoryId = parseInt(filterCategory);
      matchesCategory = 
        (typeof productCategoryId === 'number' && productCategoryId === filterCategoryId) ||
        (productCategoryId && productCategoryId.toString() === filterCategory);
    }
    
    // Filter by is_disable: active = false, inactive = true
    let matchesStatus = true;
    if (filterStatus === 'active') {
      matchesStatus = !product.isDisabled;
    } else if (filterStatus === 'inactive') {
      matchesStatus = product.isDisabled === true;
    }
    
    return matchesSearch && matchesCategory && matchesStatus;
  });

  // Pagination calculation
  const totalPages = Math.ceil(filteredProducts.length / pageSize);
  const startIndex = (currentPage - 1) * pageSize;
  const endIndex = startIndex + pageSize;
  const paginatedProducts = filteredProducts.slice(startIndex, endIndex);

  // Reset to page 1 when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, filterCategory, filterStatus]);

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
            disabled={categories.length === 0}
          >
            <option value="all">Tất cả danh mục</option>
            {categories.length > 0 ? (
              categories.map(cat => (
                <option key={cat.id || cat.categoryId} value={cat.id || cat.categoryId}>
                  {cat.categoryName || cat.name || 'Chưa có tên'}
                </option>
              ))
            ) : (
              <option value="">Đang tải danh mục...</option>
            )}
          </select>
          
          <select 
            value={filterStatus} 
            onChange={(e) => setFilterStatus(e.target.value)}
          >
            <option value="all">Tất cả trạng thái</option>
            <option value="active">Hoạt động</option>
            <option value="inactive">Ngừng hoạt động</option>
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

        {paginatedProducts.map((product) => (
          <div key={product.id} className="table-row">
            <div className="col-image">
              <img src={product.image} alt={product.name} />
            </div>
            <div className="col-name">
              <div 
                className="product-name" 
                data-full-name={product.name}
                title={product.name}
              >
                {product.name}
              </div>
              {product.badge && <span className="product-badge">{product.badge}</span>}
              {product.featured && <span className="featured-badge">⭐ Nổi bật</span>}
            </div>
            <div 
              className="col-category"
              data-full-category={product.categoryName || 'Chưa phân loại'}
              title={product.categoryName || 'Chưa phân loại'}
            >
              {product.categoryName || 'Chưa phân loại'}
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
              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', alignItems: 'flex-start' }}>
                <span className={`status-badge ${product.isDisabled ? 'status-disabled' : 'status-active'}`}>
                  {product.isDisabled ? 'Ngừng bán' : 'Hoạt động'}
                </span>
                {product.stock === 0 && (
                  <span className="status-badge status-out-of-stock">
                    Hết hàng
                  </span>
                )}
              </div>
            </div>
            <div className="col-actions">
              <div style={{ position: 'relative' }}>
                <button
                  className="btn-menu"
                  title="Tùy chọn"
                  onClick={(e) => {
                    e.stopPropagation();
                    setDropdownOpen(dropdownOpen === product.id ? null : product.id);
                  }}
                >
                  ⋮
                </button>
                {dropdownOpen === product.id && (
                  <div className="dropdown-menu" onClick={(e) => e.stopPropagation()}>
                    <button
                      className="dropdown-item edit"
                      onClick={() => {
                        handleEdit(product);
                        setDropdownOpen(null);
                      }}
                    >
                      ✏️ Chỉnh sửa
                    </button>
                    <button
                      className="dropdown-item delete"
                      onClick={() => {
                        if (product.isDisabled) {
                          handleActivate(product.id);
                        } else {
                          handleDisable(product.id);
                        }
                        setDropdownOpen(null);
                      }}
                    >
                      {product.isDisabled ? '✅ Kích hoạt' : '🗑️ Ngừng bán'}
                    </button>
                  </div>
                )}
              </div>
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
          <div className="modal-content modal-large product-form-modal">
            <div className="modal-header product-form-header">
              <div>
                <h3 className="product-form-title">{editingProduct ? 'Chỉnh sửa sản phẩm' : 'Thêm sản phẩm mới'}</h3>
                <p className="product-form-description">
                  {editingProduct ? 'Cập nhật thông tin sản phẩm' : 'Điền thông tin sản phẩm mới'}
                </p>
              </div>
              <button 
                className="close-btn"
                onClick={() => setShowModal(false)}
              >
                ✕
              </button>
            </div>
            
            <form onSubmit={handleSubmit} className="modal-form product-form-content">
              <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
                {/* Thông tin sản phẩm */}
                <div className="form-section">
                  <h3 className="form-section-title">Thông tin sản phẩm</h3>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '20px' }}>
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
                    disabled={categories.length === 0}
                  >
                    <option value="">{categories.length > 0 ? 'Chọn danh mục' : 'Đang tải danh mục...'}</option>
                    {categories.length > 0 && categories.map(cat => (
                      <option key={cat.id || cat.categoryId} value={cat.id || cat.categoryId}>
                        {cat.categoryName || cat.name || 'Chưa có tên'}
                      </option>
                    ))}
                  </select>
                  {errors.category && <span className="error-message">{errors.category}</span>}
                  {categories.length === 0 && (
                    <span style={{ fontSize: '12px', color: '#666', marginTop: '4px', display: 'block' }}>
                      Đang tải danh sách danh mục...
                    </span>
                  )}
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
                </div>

                {/* Hình ảnh và mô tả */}
                <div className="form-section">
                  <h3 className="form-section-title">Hình ảnh và mô tả</h3>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '20px' }}>
                    <div className="form-group" style={{ gridColumn: '1 / -1' }}>
                      <label htmlFor="image">Hình ảnh sản phẩm:</label>
                      <input
                        type="file"
                        id="image"
                        name="image"
                        accept="image/*"
                        onChange={handleImageChange}
                        className={errors.image ? 'error' : ''}
                      />
                      {errors.image && <span className="error-message">{errors.image}</span>}
                      {imagePreview && (
                        <div style={{ marginTop: '10px' }}>
                          <img 
                            src={imagePreview} 
                            alt="Preview" 
                            style={{ 
                              width: '150px', 
                              height: '150px', 
                              objectFit: 'cover', 
                              borderRadius: '8px',
                              border: '2px solid #e0e0e0'
                            }} 
                          />
                        </div>
                      )}
                      {!imagePreview && editingProduct && formData.image && (
                        <div style={{ marginTop: '10px' }}>
                          <p style={{ fontSize: '12px', color: '#666', marginBottom: '5px' }}>Ảnh hiện tại:</p>
                          <img 
                            src={formData.image} 
                            alt="Current" 
                            style={{ 
                              width: '150px', 
                              height: '150px', 
                              objectFit: 'cover', 
                              borderRadius: '8px',
                              border: '2px solid #e0e0e0'
                            }}
                            onError={(e) => {
                              e.target.style.display = 'none';
                            }}
                          />
                        </div>
                      )}
                      <p style={{ fontSize: '12px', color: '#666', marginTop: '5px' }}>
                        {editingProduct ? 'Chọn ảnh mới để thay thế ảnh hiện tại (tùy chọn)' : 'Chọn ảnh từ máy tính (tối đa 5MB)'}
                      </p>
                    </div>

                    <div className="form-group" style={{ gridColumn: '1 / -1' }}>
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
                  </div>
                </div>

                {/* Thông số kỹ thuật */}
                <div className="form-section">
                  <h3 className="form-section-title">Thông số kỹ thuật</h3>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '20px' }}>
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

                {/* Cấu hình khác */}
                <div className="form-section">
                  <h3 className="form-section-title">Cấu hình khác</h3>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '20px' }}>
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
                  </div>
                </div>
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

      {/* Pagination Controls */}
      {filteredProducts.length > 0 && (
        <div className="pagination-bar">
          <div className="pagination-info">
            Hiển thị {startIndex + 1}-{Math.min(endIndex, filteredProducts.length)} / {filteredProducts.length} sản phẩm
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
    </div>
  );
};

export default AdminProducts;


