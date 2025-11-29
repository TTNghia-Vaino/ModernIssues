import React, { useState, useEffect } from 'react';
import * as productService from '../services/productService';
import { getCategories } from '../services/categoryService';
import { useAuth } from '../context/AuthContext';
import {
  AdminPageHeader,
  AdminFiltersBar,
  AdminDataTable,
  AdminPagination,
  AdminActionDropdown,
  AdminLoadingOverlay,
  AdminModal,
  AdminConfirmModal
} from '../components/admin';
import { AdminIcons, AdminActionLabels } from '../utils/adminConstants';
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
    price: '', // This will be the original price (giá gốc)
    originalPrice: '', // Keep for backward compatibility
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
  const [updatingVector, setUpdatingVector] = useState(null); // Track which product is updating vector
  
  // Confirm modal state
  const [confirmModal, setConfirmModal] = useState({
    open: false,
    title: '',
    message: '',
    onConfirm: null,
    variant: 'default'
  });
  
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
        
        // Logic đơn giản: price từ API = giá gốc, onPrices = giá khuyến mãi (nếu có)
        const originalPriceValue = product.price || 0;  // Giá gốc
        const promotionPriceValue = product.onPrices || product.onPrice || null;  // Giá khuyến mãi
        const hasPromotion = promotionPriceValue && promotionPriceValue > 0 && originalPriceValue > promotionPriceValue;
        // Giá hiện tại = giá khuyến mãi nếu có, nếu không thì = giá gốc
        const currentPriceValue = hasPromotion ? promotionPriceValue : originalPriceValue;
        // Tính % giảm giá: (giá_gốc - giá_sau_km) / giá_gốc * 100
        const discountValue = hasPromotion && originalPriceValue > 0
          ? Math.round(((originalPriceValue - promotionPriceValue) / originalPriceValue) * 100)
          : 0;
        
        return {
          id: product.productId || product.id,
          name: product.productName || product.name,
          productName: product.productName || product.name,
          category: product.categoryId || product.category,
          categoryId: product.categoryId || product.category,
          categoryName: product.categoryName || product.categoryName,
          // Giá hiện tại (giá khuyến mãi nếu có, nếu không thì giá gốc)
          price: currentPriceValue,
          // Giá gốc (chỉ hiển thị khi có khuyến mãi)
          originalPrice: hasPromotion ? originalPriceValue : null,
          // Giá khuyến mãi (để tham khảo)
          onPrice: promotionPriceValue,
          discount: discountValue,
          image: fullImageUrl,
          imageUrl: fullImageUrl,
          description: product.description || '',
          stock: product.stock || 0,
          warrantyPeriod: product.warrantyPeriod || 12,
          status: (product.stock || 0) > 0 ? 'active' : 'inactive',
          // Map isDisabled from API (support both camelCase and snake_case, boolean and string)
          isDisabled: (() => {
            const isDisabledValue = product.isDisabled !== undefined ? product.isDisabled : product.is_disabled;
            if (isDisabledValue === true || isDisabledValue === 'true') return true;
            if (isDisabledValue === false || isDisabledValue === 'false') return false;
            // Default to false if undefined or null
            return false;
          })(),
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
      price: '', // Giá gốc
      originalPrice: '', // Giá gốc
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
      // price từ API là giá gốc, onPrices là giá sau khuyến mãi (nếu có)
      // Khi edit, luôn dùng price làm giá gốc, không dùng onPrices
      price: product.price || product.originalPrice || '',
      originalPrice: product.price || product.originalPrice || '',
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

  const handleDisable = (id) => {
    const product = products.find(p => p.id === id);
    setConfirmModal({
      open: true,
      title: 'Xác nhận ngừng bán',
      message: `Bạn có chắc chắn muốn ngừng bán sản phẩm "${product?.productName || product?.name || id}"?`,
      variant: 'danger',
      onConfirm: async () => {
        try {
          setLoading(true);
          if (!product) {
            throw new Error('Không tìm thấy sản phẩm');
          }
          
          // Use DELETE API to soft delete (set is_disabled = true)
          // DELETE /v1/Product/{id} - Vô hiệu hóa sản phẩm (soft delete)
          console.log('[AdminProducts.handleDisable] Soft deleting product:', id);
          const deleteResponse = await productService.deleteProduct(id);
          console.log('[AdminProducts.handleDisable] Product soft deleted successfully, response:', deleteResponse);
          
          // Update local state immediately for instant UI feedback
          // DELETE API sets is_disabled = true, so we set isDisabled to true
          setProducts(prevProducts => 
            prevProducts.map(p => 
              p.id === id 
                ? { ...p, isDisabled: true } 
                : p
            )
          );
          
          // Don't reload automatically - state is already updated
          // User can manually refresh if needed, or reload will happen on next page load
          showNotification('Ngừng bán sản phẩm thành công!');
        } catch (error) {
          console.error('[AdminProducts.handleDisable] Error disabling product:', error);
          showNotification('Lỗi khi ngừng bán sản phẩm: ' + error.message, 'error');
        } finally {
          setLoading(false);
        }
      }
    });
  };

  const handleActivate = (id) => {
    const product = products.find(p => p.id === id);
    setConfirmModal({
      open: true,
      title: 'Xác nhận kích hoạt',
      message: `Bạn có chắc chắn muốn kích hoạt lại sản phẩm "${product?.productName || product?.name || id}"?`,
      variant: 'default',
      onConfirm: async () => {
        try {
          setLoading(true);
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
          const updatedProduct = await productService.updateProduct(id, updateData, null);
          console.log('[AdminProducts.handleActivate] Product updated successfully, response:', updatedProduct);
          
          // Update local state immediately - we know isDisabled should be false (we're activating)
          // Use the value we sent to API, not response (response may not include isDisabled)
          setProducts(prevProducts => 
            prevProducts.map(p => 
              p.id === id 
                ? { 
                    ...p, 
                    isDisabled: false, // We're activating, so isDisabled = false
                    // Also update other fields from response if available
                    ...(updatedProduct?.productName && { productName: updatedProduct.productName, name: updatedProduct.productName }),
                    ...(updatedProduct?.price !== undefined && { price: updatedProduct.price }),
                    ...(updatedProduct?.stock !== undefined && { stock: updatedProduct.stock })
                  } 
                : p
            )
          );
          
          // Don't reload automatically - state is already updated correctly
          // User can manually refresh if needed, or reload will happen on next page load
          showNotification('Kích hoạt sản phẩm thành công!');
        } catch (error) {
          console.error('[AdminProducts.handleActivate] Error activating product:', error);
          showNotification('Lỗi khi kích hoạt sản phẩm: ' + error.message, 'error');
        } finally {
          setLoading(false);
        }
      }
    });
  };

  const handleUpdateVector = (productId, productName) => {
    setConfirmModal({
      open: true,
      title: 'Xác nhận cập nhật vector',
      message: `Bạn có chắc chắn muốn cập nhật vector cho sản phẩm "${productName}"?\n\nVector được dùng cho hệ thống tìm kiếm và gợi ý sản phẩm.`,
      variant: 'warning',
      onConfirm: async () => {
        try {
          setUpdatingVector(productId);
          console.log('[AdminProducts.handleUpdateVector] Updating vector for product:', productId);
          
          const result = await productService.updateVectorByProductId(productId);
          
          console.log('[AdminProducts.handleUpdateVector] Vector updated successfully:', result);
          showNotification(`Cập nhật vector thành công cho sản phẩm "${productName}"!`);
        } catch (error) {
          console.error('[AdminProducts.handleUpdateVector] Error updating vector:', error);
          showNotification(`Lỗi khi cập nhật vector: ${error.message || 'Unknown error'}`, 'error');
        } finally {
          setUpdatingVector(null);
        }
      }
    });
  };

  const validateForm = () => {
    const newErrors = {};
    
    if (!formData.name.trim()) {
      newErrors.name = 'Vui lòng nhập tên sản phẩm';
    }
    
    if (!formData.category) {
      newErrors.category = 'Vui lòng chọn danh mục';
    }
    
    // Only validate originalPrice (giá gốc)
    // Price will be set from originalPrice when submitting
    const priceToValidate = formData.originalPrice || formData.price;
    if (!priceToValidate || priceToValidate <= 0) {
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
      
      // Get giá gốc from originalPrice or price field
      const originalPriceValue = Number(formData.originalPrice || formData.price || 0);
      
      if (!originalPriceValue || originalPriceValue <= 0) {
        showNotification('Vui lòng nhập giá gốc hợp lệ', 'error');
        setLoading(false);
        return;
      }
      
      const productData = {
        ...formData,
        price: originalPriceValue, // Giá gốc
        originalPrice: originalPriceValue, // Keep for display
        discount: 0, // Discount will be calculated by promotion API
        stock: Number(formData.stock)
      };
      
      // Map formData to API format - chỉ gửi các field API yêu cầu
      const categoryId = Number(productData.category);
      if (!categoryId || categoryId <= 0) {
        showNotification('Vui lòng chọn danh mục sản phẩm', 'error');
        setLoading(false);
        return;
      }
      
      // Send originalPrice as price to API
      // API will store it as price and onPrice (giá gốc)
      // When promotion is applied, UpdatePrices will update price to promotion price
      const apiProductData = {
        productName: productData.name || 'Untitled Product',
        description: productData.description || 'No description',
        price: originalPriceValue, // Giá gốc - API will use this as both price and onPrice initially
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
            originalPrice: updatedProduct.price || updatedProduct.originalPrice,
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
            productName: newProduct.productName || newProduct.name,
            category: newProduct.categoryId || newProduct.category,
            categoryId: newProduct.categoryId || newProduct.category,
            categoryName: newProduct.categoryName || categories.find(c => (c.id || c.categoryId) === (newProduct.categoryId || newProduct.category))?.categoryName || categories.find(c => (c.id || c.categoryId) === (newProduct.categoryId || newProduct.category))?.name || 'Chưa phân loại',
            price: newProduct.price || 0,
            originalPrice: newProduct.price || 0,
            onPrice: newProduct.onPrices || newProduct.onPrice || 0,
            discount: (newProduct.onPrices || newProduct.onPrice) > 0 && newProduct.price > 0
              ? Math.round(((newProduct.price - (newProduct.onPrices || newProduct.onPrice)) / newProduct.price) * 100) 
              : 0,
            image: fullImageUrl,
            imageUrl: fullImageUrl,
            description: newProduct.description || '',
            stock: newProduct.stock || 0,
            warrantyPeriod: newProduct.warrantyPeriod || 12,
            status: (newProduct.stock || 0) > 0 ? 'active' : 'inactive',
            isDisabled: newProduct.isDisabled || false,
            badge: newProduct.badge || '',
            featured: newProduct.featured || false,
            specs: newProduct.specs || {}
          };
          
          console.log('[AdminProducts] Mapped Product:', mappedProduct);
          console.log('[AdminProducts] Image URL:', fullImageUrl);
          
          // Optimistic update: Add to list immediately for better UX
          setProducts(prevProducts => {
            // Check if product already exists (shouldn't happen for new products)
            const exists = prevProducts.find(p => p.id === mappedProduct.id);
            if (exists) {
              // Update existing
              return prevProducts.map(p => p.id === mappedProduct.id ? mappedProduct : p);
            } else {
              // Add new product to the beginning of the list
              return [mappedProduct, ...prevProducts];
            }
          });
          
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
          setErrors({});
          
          // Close modal first for better UX
          setShowModal(false);
          
          // Show success notification
          showNotification('Thêm sản phẩm mới thành công! Sản phẩm đã được lưu vào database.');
          
          // Reload products list in background to ensure sync with server
          // This will update the list with any server-side changes
          try {
            await loadProducts();
            console.log('[AdminProducts] ✅ Products list reloaded successfully after creating new product');
          } catch (reloadError) {
            console.error('[AdminProducts] ⚠️ Failed to reload products list after create, but product was added:', reloadError);
            // Don't show error to user since product was already added optimistically
          }
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

  // Table columns config
  const tableColumns = [
    { key: 'image', label: 'HÌNH ẢNH', className: 'col-image' },
    { key: 'name', label: 'TÊN SẢN PHẨM', className: 'col-name' },
    { key: 'category', label: 'DANH MỤC', className: 'col-category' },
    { key: 'price', label: 'GIÁ BÁN', className: 'col-price' },
    { key: 'stock', label: 'TỒN KHO', className: 'col-stock' },
    { key: 'status', label: 'TRẠNG THÁI', className: 'col-status' },
    { key: 'actions', label: 'THAO TÁC', className: 'col-actions' }
  ];

  // Render custom product row
  const renderProductRow = (product) => (
    <div key={product.id} className="table-row">
      <div className="col-image">
        <img 
          src={product.image || 'https://via.placeholder.com/100?text=No+Image'} 
          alt={product.name}
          onError={(event) => {
            if (event.currentTarget.dataset.fallbackApplied === 'true') {
              return;
            }
            event.currentTarget.dataset.fallbackApplied = 'true';
            event.currentTarget.src = 'https://via.placeholder.com/100?text=No+Image';
          }}
        />
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
        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', alignItems: 'center' }}>
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
        <AdminActionDropdown
          actions={[
            {
              label: AdminActionLabels.edit,
              icon: AdminIcons.edit,
              onClick: () => handleEdit(product)
            },
            {
              label: product.isDisabled ? AdminActionLabels.enable : AdminActionLabels.disable,
              icon: product.isDisabled ? AdminIcons.activate : AdminIcons.deactivate,
              onClick: () => {
                if (product.isDisabled) {
                  handleActivate(product.id || product.productId);
                } else {
                  handleDisable(product.id || product.productId);
                }
              }
            },
            {
              label: updatingVector === (product.id || product.productId) ? 'Đang cập nhật...' : 'Cập nhật Vector',
              icon: AdminIcons.reset,
              onClick: () => handleUpdateVector(product.id || product.productId, product.name || product.productName),
              className: updatingVector === (product.id || product.productId) ? 'opacity-60 cursor-wait' : ''
            }
          ]}
        />
      </div>
    </div>
  );

  // Filter options
  const categoryFilterOptions = [
    { value: 'all', label: 'Tất cả danh mục' },
    ...categories.map(cat => ({
      value: cat.id || cat.categoryId,
      label: cat.categoryName || cat.name || 'Chưa có tên'
    }))
  ];

  const statusFilterOptions = [
    { value: 'all', label: 'Tất cả trạng thái' },
    { value: 'active', label: 'Hoạt động' },
    { value: 'inactive', label: 'Ngừng hoạt động' }
  ];

  return (
    <div className="admin-products">
      {notification.show && (
        <div className={`notification ${notification.type}`}>
          {notification.message}
        </div>
      )}
      
      <AdminLoadingOverlay 
        loading={loading} 
        hasData={products.length > 0}
        message="Đang tải danh sách sản phẩm..."
      >
        <AdminPageHeader
          title="Quản lý sản phẩm"
          onAdd={handleAddNew}
          addButtonText="➕ Thêm sản phẩm mới"
        />

        <AdminFiltersBar
          searchValue={searchTerm}
          onSearchChange={setSearchTerm}
          searchPlaceholder="Tìm kiếm sản phẩm..."
          filters={[
            {
              key: 'category',
              value: filterCategory,
              onChange: setFilterCategory,
              options: categoryFilterOptions,
              disabled: categories.length === 0
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
          data={paginatedProducts}
          renderRow={renderProductRow}
          loading={loading}
          totalItems={products.length}
          emptyMessage="Chưa có sản phẩm nào"
          noResultsMessage="Không tìm thấy sản phẩm nào"
          tableClassName="products-table"
        />
      </AdminLoadingOverlay>

      {/* Modal */}
      <AdminModal
        open={showModal}
        onOpenChange={(open) => {
          setShowModal(open);
          if (!open) setErrors({});
        }}
        title={editingProduct ? 'Chỉnh sửa sản phẩm' : 'Thêm sản phẩm mới'}
        description={editingProduct ? 'Cập nhật thông tin sản phẩm' : 'Điền thông tin sản phẩm mới'}
        onSubmit={handleSubmit}
        submitLabel={editingProduct ? 'Cập nhật' : 'Thêm mới'}
        size="5xl"
        className="product-form-modal"
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
            <button type="submit" className="save-btn" form="product-form">
              {editingProduct ? 'Cập nhật' : 'Thêm mới'}
            </button>
          </div>
        }
      >
            <form id="product-form" onSubmit={handleSubmit} className="modal-form product-form-content">
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
                  <label htmlFor="originalPrice">Giá gốc: <span className="required">*</span></label>
                  <input
                    type="number"
                    id="originalPrice"
                    name="originalPrice"
                    value={formData.originalPrice || formData.price || ''}
                    onChange={(e) => {
                      const value = e.target.value;
                      // Update both originalPrice and price to keep them in sync
                      setFormData(prev => ({
                        ...prev,
                        originalPrice: value,
                        price: value
                      }));
                    }}
                    placeholder="Nhập giá gốc"
                    className={errors.originalPrice ? 'error' : ''}
                  />
                  {errors.originalPrice && <span className="error-message">{errors.originalPrice}</span>}
                  <p style={{ fontSize: '12px', color: '#666', marginTop: '4px' }}>
                    Giá khuyến mãi sẽ được tự động cập nhật khi áp dụng chương trình khuyến mãi
                  </p>
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
            </form>
      </AdminModal>

      {filteredProducts.length > 0 && (
        <AdminPagination
          currentPage={currentPage}
          totalPages={totalPages}
          pageSize={pageSize}
          totalItems={filteredProducts.length}
          startIndex={startIndex}
          endIndex={endIndex}
          onPageChange={setCurrentPage}
          onPageSizeChange={(size) => {
            setPageSize(size);
            setCurrentPage(1);
          }}
          pageSizeOptions={[10, 20, 50]}
          itemName="sản phẩm"
        />
      )}

      {/* Confirm Modal */}
      <AdminConfirmModal
        open={confirmModal.open}
        onOpenChange={(open) => setConfirmModal({ ...confirmModal, open })}
        title={confirmModal.title}
        message={confirmModal.message}
        variant={confirmModal.variant}
        confirmText={confirmModal.variant === 'danger' ? 'Vô hiệu hóa' : confirmModal.variant === 'warning' ? 'Cập nhật' : 'Xác nhận'}
        onConfirm={confirmModal.onConfirm}
      />
    </div>
  );
};

export default AdminProducts;


