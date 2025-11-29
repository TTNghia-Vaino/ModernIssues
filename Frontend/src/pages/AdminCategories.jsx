import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { getCategoryTreeFull, createCategory, updateCategory, deleteCategory } from '../services/categoryService';
import { getProductCountByCategory, listProducts } from '../services/productService';
import { Edit, CheckCircle, XCircle } from 'lucide-react';
import {
  AdminPageHeader,
  AdminFiltersBar,
  AdminDataTable,
  AdminPagination,
  AdminLoadingOverlay,
  AdminActionDropdown,
  AdminModal
} from '../components/admin';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Textarea } from '../components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import './AdminCategories.css';

const AdminCategories = () => {
  const { isInTokenGracePeriod } = useAuth();
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [notification, setNotification] = useState({ show: false, message: '', type: '' });
  const [expandedCategories, setExpandedCategories] = useState(new Set());
  const [expandedProducts, setExpandedProducts] = useState(new Set()); // Track which categories show products
  const [categoryProducts, setCategoryProducts] = useState({}); // Store products for each category
  const [loadingProducts, setLoadingProducts] = useState(new Set()); // Track loading state
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState('all'); // Filter by isDisabled: 'all', 'active', 'inactive'
  
  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [formData, setFormData] = useState({
    name: '',
    parentId: null
  });

  // Load categories from API
  useEffect(() => {
    let cancelled = false;
    
    const attemptLoad = async () => {
      if (isInTokenGracePeriod) {
        console.log('[AdminCategories] Waiting for token grace period to end');
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
  }, []);


  const loadCategories = async () => {
    try {
      setLoading(true);
      
      // Load categories tree and product counts in parallel
      const [apiCategories, productCounts] = await Promise.all([
        getCategoryTreeFull(),
        getProductCountByCategory().catch(err => {
          console.warn('[AdminCategories] Failed to load product counts:', err);
          return [];
        })
      ]);
      
      // Create a map of category_id to product_count
      const countMap = {};
      if (Array.isArray(productCounts)) {
        productCounts.forEach(item => {
          countMap[item.category_id] = item.product_count;
        });
      }
      
      // Add productCount and level to each category recursively
      // Note: API now returns recursive counts (including products from child categories)
      // But we only show 2 levels: Level 1 (root) and Level 2 (children)
      // Level 3 will be products, not categories
      const addProductCountAndLevel = (cats, level = 1) => {
        return cats.map(cat => {
          const categoryId = cat.categoryId || cat.id;
          // API already calculates recursive count (includes products from all descendants)
          const productCount = countMap[categoryId] !== undefined ? countMap[categoryId] : 0;
          
          // Only process children if level < 2 (stop at level 2)
          // Level 2 categories will show products when expanded, not more categories
          const processedChildren = (cat.children && cat.children.length > 0 && level < 2)
            ? addProductCountAndLevel(cat.children, level + 1)
            : [];
          
          const category = {
            id: categoryId,
            name: cat.categoryName || cat.name || 'Chưa có tên',
            parentId: cat.parentId || null,
            productCount: productCount, // This already includes products from child categories
            level: level,
            isDisabled: cat.isDisabled !== undefined ? cat.isDisabled : false,
            children: processedChildren
          };
          
          return category;
        });
      };
      
      const processedCategories = Array.isArray(apiCategories) 
        ? addProductCountAndLevel(apiCategories)
        : [];
      
      console.log('[AdminCategories] Processed categories:', processedCategories);
      setCategories(processedCategories);
      
      // Reset expanded categories - collapse all by default
      setExpandedCategories(new Set());
      setExpandedProducts(new Set());
    } catch (error) {
      console.error('[AdminCategories] Failed to load categories:', error);
      showNotification('Không thể tải danh sách danh mục. Vui lòng thử lại.', 'error');
    } finally {
      setLoading(false);
    }
  };

  const toggleExpand = async (categoryId, category) => {
    setExpandedCategories(prev => {
      const newSet = new Set(prev);
      if (newSet.has(categoryId)) {
        newSet.delete(categoryId);
        // Also collapse products if expanded
        setExpandedProducts(prevProducts => {
          const newProducts = new Set(prevProducts);
          newProducts.delete(categoryId);
          return newProducts;
        });
      } else {
        newSet.add(categoryId);
        // If this is a Level 2 category with products, automatically load and show products
        if (category && category.level === 2 && category.productCount > 0) {
          setExpandedProducts(prev => new Set(prev).add(categoryId));
          if (!categoryProducts[categoryId]) {
            loadProductsForCategory(categoryId);
          }
        }
      }
      return newSet;
    });
  };

  const loadProductsForCategory = async (categoryId) => {
    if (loadingProducts.has(categoryId)) return;
    
    try {
      setLoadingProducts(prev => new Set(prev).add(categoryId));
      
      const response = await listProducts({
        categoryId: categoryId,
        page: 1,
        limit: 100 // Load up to 100 products
      });
      
      const products = response.data || response || [];
      
      setCategoryProducts(prev => ({
        ...prev,
        [categoryId]: products
      }));
    } catch (error) {
      console.error(`[AdminCategories] Failed to load products for category ${categoryId}:`, error);
      setCategoryProducts(prev => ({
        ...prev,
        [categoryId]: []
      }));
    } finally {
      setLoadingProducts(prev => {
        const newSet = new Set(prev);
        newSet.delete(categoryId);
        return newSet;
      });
    }
  };

  const findAllCategories = (cats) => {
    const result = [];
    const traverse = (categories) => {
      categories.forEach(cat => {
        result.push(cat);
        if (cat.children && cat.children.length > 0) {
          traverse(cat.children);
        }
      });
    };
    traverse(cats);
    return result;
  };

  const addCategoryToTree = (cats, newCategory, parentId) => {
    if (parentId === null) {
      return [...cats, newCategory];
    }
    return cats.map(cat => {
      if (cat.id === parentId) {
        return { ...cat, children: [...(cat.children || []), newCategory] };
      }
      if (cat.children && cat.children.length > 0) {
        return { ...cat, children: addCategoryToTree(cat.children, newCategory, parentId) };
      }
      return cat;
    });
  };

  const updateCategoryInTree = (cats, updatedCategory) => {
    return cats.map(cat => {
      if (cat.id === updatedCategory.id) {
        return { ...cat, ...updatedCategory };
      }
      if (cat.children && cat.children.length > 0) {
        return { ...cat, children: updateCategoryInTree(cat.children, updatedCategory) };
      }
      return cat;
    });
  };

  const deleteCategoryFromTree = (cats, categoryId) => {
    return cats
      .filter(cat => cat.id !== categoryId)
      .map(cat => {
        if (cat.children && cat.children.length > 0) {
          return { ...cat, children: deleteCategoryFromTree(cat.children, categoryId) };
        }
        return cat;
      });
  };

  const handleAddCategory = async () => {
    if (!formData.name.trim()) {
      showNotification('Vui lòng nhập tên danh mục', 'error');
      return;
    }

    try {
      const allCategories = findAllCategories(categories);
      const newCategory = await createCategory({
        categoryName: formData.name.trim(),
        parentId: formData.parentId
      });

      // Reload categories to get the full tree with new category
      await loadCategories();
      
      showNotification('Thêm danh mục thành công!', 'success');
      setIsAddDialogOpen(false);
      setFormData({ name: '', parentId: null });
    } catch (error) {
      console.error('[AdminCategories] Failed to add category:', error);
      const errorMessage = error.data?.message || error.message || 'Có lỗi xảy ra. Vui lòng thử lại.';
      showNotification(errorMessage, 'error');
    }
  };

  const handleEditCategory = async () => {
    if (!selectedCategory) return;
    if (!formData.name.trim()) {
      showNotification('Vui lòng nhập tên danh mục', 'error');
      return;
    }
    
    try {
      await updateCategory(selectedCategory.id, {
        categoryName: formData.name.trim()
      });

      // Reload categories
      await loadCategories();
      
      showNotification('Cập nhật danh mục thành công!', 'success');
      setIsEditDialogOpen(false);
      setSelectedCategory(null);
      setFormData({ name: '', parentId: null });
    } catch (error) {
      console.error('[AdminCategories] Failed to update category:', error);
      const errorMessage = error.data?.message || error.message || 'Có lỗi xảy ra. Vui lòng thử lại.';
      showNotification(errorMessage, 'error');
    }
  };


  const handleToggleStatus = async (category) => {
    const newStatus = !category.isDisabled;
    const action = newStatus ? 'vô hiệu hóa' : 'kích hoạt';
    
    if (window.confirm(`Bạn có chắc muốn ${action} danh mục "${category.name}"?`)) {
      try {
        const response = await updateCategory(category.id, {
          isDisabled: newStatus
        });
        // Reload categories để cập nhật trạng thái
        await loadCategories();
        showNotification(`${action.charAt(0).toUpperCase() + action.slice(1)} danh mục thành công!`, 'success');
      } catch (error) {
        console.error('[AdminCategories] Failed to toggle category status:', error);
        // Kiểm tra nếu lỗi là "Không tìm thấy" nhưng thực ra đã update thành công
        const errorMessage = error.data?.message || error.message || '';
        if (errorMessage.includes('Không tìm thấy') && newStatus) {
          // Nếu vô hiệu hóa thành công nhưng API trả về "Không tìm thấy" (vì filter disabled)
          // Vẫn reload và thông báo thành công
          await loadCategories();
          showNotification('Vô hiệu hóa danh mục thành công!', 'success');
        } else {
          showNotification(errorMessage || 'Có lỗi xảy ra. Vui lòng thử lại.', 'error');
        }
      }
    }
  };

  const openEditDialog = (category) => {
    setSelectedCategory(category);
    setFormData({
      name: category.name,
      parentId: category.parentId,
    });
    setIsEditDialogOpen(true);
  };

  const showNotification = (message, type = 'success') => {
    setNotification({ show: true, message, type });
    setTimeout(() => {
      setNotification({ show: false, message: '', type: '' });
    }, 3000);
  };

  const renderCategory = (category, level = 0) => {
    const hasChildren = category.children && category.children.length > 0;
    const isExpanded = expandedCategories.has(category.id);
    const isLevel1 = category.level === 1;
    const isLevel2 = category.level === 2;
    
    // Level 2 categories show products when expanded
    const showProducts = isLevel2 && isExpanded && expandedProducts.has(category.id);
    const isLoadingProducts = loadingProducts.has(category.id);
    const products = categoryProducts[category.id] || [];

    let bgClass = '';
    if (isLevel1) bgClass = 'bg-blue-50 font-semibold';
    else if (isLevel2) bgClass = 'bg-slate-50';

    return (
      <div key={category.id}>
        <div
          className={`category-row ${bgClass}`}
          onClick={() => {
            // Click vào category row sẽ toggle expand
            if (hasChildren || (isLevel2 && category.productCount > 0)) {
              toggleExpand(category.id, category);
            }
          }}
          style={{ 
            cursor: (hasChildren || (isLevel2 && category.productCount > 0)) ? 'pointer' : 'default',
            paddingLeft: 0,
            marginLeft: 0
          }}
        >
          <div className="category-row-content">
            {/* Tên danh mục */}
            <div className="col-name">
              <div className="category-row-left" style={{ paddingLeft: `${level * 1.5}rem` }}>
                {(hasChildren || (isLevel2 && category.productCount > 0)) ? (
                  <button
                    className="expand-btn"
                    onClick={(e) => {
                      e.stopPropagation();
                      toggleExpand(category.id, category);
                    }}
                    title={isExpanded ? 'Thu gọn' : 'Mở rộng'}
                    data-expanded={isExpanded}
                  />
                ) : (
                  <div className="expand-placeholder" />
                )}
                <div className="category-icon">
                  {isLevel1 && '📁'}
                  {isLevel2 && '📂'}
                </div>
                <span className={`category-name ${isLevel1 ? 'text-lg' : isLevel2 ? 'text-base' : 'text-sm'} ${category.isDisabled ? 'opacity-60' : ''}`}>
                  {category.name}
                </span>
              </div>
            </div>

            {/* Cấp */}
            <div className="col-level">
              {isLevel1 && <span className="level-badge level-1">Cấp 1</span>}
              {isLevel2 && <span className="level-badge level-2">Cấp 2</span>}
            </div>

            {/* Trạng thái */}
            <div className="col-status">
              {category.isDisabled ? (
                <span className="status-badge status-disabled" title="Đã vô hiệu hóa">🔴 Vô hiệu hóa</span>
              ) : (
                <span className="status-badge status-active" title="Đang hoạt động">🟢 Hoạt động</span>
              )}
            </div>

            {/* Số lượng */}
            <div className="col-count">
              <span className="count-number">{category.productCount || 0}</span> sản phẩm
            </div>

            {/* Thao tác */}
            <div className="col-actions" onClick={(e) => e.stopPropagation()}>
              <AdminActionDropdown
                actions={[
                  {
                    label: category.isDisabled ? '✅ Kích hoạt' : '❌ Vô hiệu hóa',
                    icon: category.isDisabled ? CheckCircle : XCircle,
                    onClick: () => handleToggleStatus(category)
                  },
                  {
                    label: '✏️ Sửa',
                    icon: Edit,
                    onClick: () => openEditDialog(category)
                  }
                ]}
              />
            </div>
          </div>
        </div>

        {/* Show child categories (Level 2) */}
        {hasChildren && isExpanded && (
          <div className="category-children">
            {category.children.map(child => renderCategory(child, level + 1))}
          </div>
        )}

        {/* Show products for Level 2 categories when expanded */}
        {isLevel2 && isExpanded && expandedProducts.has(category.id) && (
          <div className="category-products" style={{ paddingLeft: `${(level + 1) * 2 + 1}rem` }}>
            {isLoadingProducts ? (
              <div className="loading-products">Đang tải sản phẩm...</div>
            ) : products.length > 0 ? (
              <div className="products-list">
                {products.map(product => (
                  <div key={product.productId || product.id} className="product-row">
                    <div className="product-icon">📦</div>
                    <div className="product-info">
                      <div className="product-name-row">
                        <span className="product-name">{product.productName || product.name}</span>
                      </div>
                      <div className="product-details">
                        <span className="product-price">💰 {product.price?.toLocaleString('vi-VN') || 0} đ</span>
                        <span className="product-stock">📦 Tồn: {product.stock || 0}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="no-products">Không có sản phẩm nào</div>
            )}
          </div>
        )}
      </div>
    );
  };

  // Helper function to check if category or any child matches filter
  const matchesFilter = (category) => {
    // Check search query
    const matchesSearch = !searchQuery || 
      category.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      String(category.id).includes(searchQuery);
    
    // Check status filter
    let matchesStatus = true;
    if (filterStatus === 'active') {
      matchesStatus = !category.isDisabled;
    } else if (filterStatus === 'inactive') {
      matchesStatus = category.isDisabled === true;
    }
    
    // Check if category itself matches
    const categoryMatches = matchesSearch && matchesStatus;
    
    // Check if any child matches
    if (category.children && category.children.length > 0) {
      const hasMatchingChild = category.children.some(child => matchesFilter(child));
      return categoryMatches || hasMatchingChild;
    }
    
    return categoryMatches;
  };

  // Flatten categories to a flat array for pagination (keep tree structure but flatten for display)
  // Helper function to recursively collect visible categories (only root + expanded children)
  const getVisibleCategories = (cats, result = []) => {
    cats.forEach(cat => {
      const isLevel1 = cat.level === 1;
      const isExpanded = expandedCategories.has(cat.id);
      const hasChildren = cat.children && cat.children.length > 0;
      
      // Only add root categories (level 1) to the list for pagination
      // Children will be shown when parent is expanded
      if (isLevel1) {
        result.push(cat);
      }
    });
    return result;
  };

  // Get only root categories (level 1) for pagination
  const rootCategories = categories.filter(c => c.level === 1);
  
  // Filter root categories
  const filteredRootCategories = rootCategories.filter(cat => {
    const matchesSearch = !searchQuery || 
      cat.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      String(cat.id).includes(searchQuery);
    
    let matchesStatus = true;
    if (filterStatus === 'active') {
      matchesStatus = !cat.isDisabled;
    } else if (filterStatus === 'inactive') {
      matchesStatus = cat.isDisabled === true;
    }
    
    return matchesSearch && matchesStatus;
  });

  // Pagination - only for root categories (level 1)
  const totalPages = Math.ceil(filteredRootCategories.length / pageSize) || 1;
  const startIndex = (currentPage - 1) * pageSize;
  const endIndex = startIndex + pageSize;
  const paginatedCategories = filteredRootCategories.slice(startIndex, endIndex);

  // Use existing findAllCategories function (already declared above)
  const allCategories = findAllCategories(categories);
  // Only show Level 1 and Level 2 in parent selector (Level 3 is products, not categories)
  const level1And2Categories = allCategories.filter(c => c.level <= 2);

  const statusFilterOptions = [
    { value: 'all', label: 'Tất cả trạng thái' },
    { value: 'active', label: '🟢 Hoạt động' },
    { value: 'inactive', label: '🔴 Vô hiệu hóa' }
  ];

  return (
    <div className="admin-categories">
      {notification.show && (
        <div className={`notification ${notification.type}`}>
          {notification.message}
        </div>
      )}
      
      <AdminLoadingOverlay 
        loading={loading} 
        hasData={categories.length > 0}
        message="Đang tải danh mục..."
      >
        <AdminPageHeader
          title="Quản lý Danh mục"
          subtitle="Quản lý danh mục sản phẩm 3 cấp phân cấp"
          onAdd={() => setIsAddDialogOpen(true)}
          addButtonText="➕ Thêm danh mục mới"
        />

        <AdminFiltersBar
          searchValue={searchQuery}
          onSearchChange={setSearchQuery}
          searchPlaceholder="🔍 Tìm kiếm danh mục..."
          filters={[
            {
              key: 'status',
              value: filterStatus,
              onChange: setFilterStatus,
              options: statusFilterOptions
            }
          ]}
        />

        {/* Category Tree with Table Header */}
        <div className="category-tree-container">
          {/* Table Header */}
          <div className="categories-table-header">
            <div className="col-name">TÊN DANH MỤC</div>
            <div className="col-level">CẤP</div>
            <div className="col-status">TRẠNG THÁI</div>
            <div className="col-count">SỐ LƯỢNG</div>
            <div className="col-actions">THAO TÁC</div>
          </div>

          {/* Category Tree */}
          <div className="category-tree">
            {paginatedCategories.length === 0 ? (
              <div className="empty-state">
                {searchQuery ? 'Không tìm thấy danh mục nào' : 'Chưa có danh mục nào'}
              </div>
            ) : (
              paginatedCategories.map(category => renderCategory(category))
            )}
          </div>
        </div>

        {/* Pagination */}
        {filteredRootCategories.length > 0 && (
          <AdminPagination
            currentPage={currentPage}
            totalPages={totalPages}
            pageSize={pageSize}
            totalItems={filteredRootCategories.length}
            startIndex={startIndex + 1}
            endIndex={Math.min(endIndex, filteredRootCategories.length)}
            onPageChange={setCurrentPage}
            onPageSizeChange={(size) => {
              setPageSize(size);
              setCurrentPage(1);
            }}
            pageSizeOptions={[10, 20, 50]}
            itemName="danh mục"
          />
        )}
      </AdminLoadingOverlay>

      {/* Add Category Dialog */}
      <AdminModal
        open={isAddDialogOpen}
        onOpenChange={setIsAddDialogOpen}
        title="Thêm danh mục mới"
        description="Tạo danh mục sản phẩm mới"
        onSubmit={handleAddCategory}
        submitLabel="Thêm"
        size="md"
      >
        <div className="form-section">
          <h3 className="form-section-title">Thông tin danh mục</h3>
          <div className="form-grid">
            <div className="form-item">
              <Label htmlFor="category-name" className="form-label">Tên danh mục *</Label>
              <Input
                id="category-name"
                type="text"
                placeholder="Nhập tên danh mục"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="form-input"
              />
            </div>

            <div className="form-item">
              <Label htmlFor="category-parent" className="form-label">Danh mục cha</Label>
              <Select
                value={formData.parentId?.toString() || 'null'}
                onValueChange={(value) => {
                  setFormData({ 
                    ...formData, 
                    parentId: value === 'null' ? null : parseInt(value) 
                  });
                }}
              >
                <SelectTrigger className="form-select">
                  <SelectValue placeholder="Chọn danh mục cha" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="null">Không có (Danh mục cấp 1)</SelectItem>
                  {level1And2Categories.map(cat => (
                    <SelectItem key={cat.id} value={cat.id.toString()}>
                      {cat.level === 1 ? '📁 ' : '  📂 '}
                      {cat.name} (Cấp {cat.level})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="form-description">
                Chọn danh mục cấp 1 để tạo cấp 2, hoặc chọn cấp 2 để tạo cấp 3
              </p>
            </div>
          </div>
        </div>
      </AdminModal>

      {/* Edit Category Dialog */}
      <AdminModal
        open={isEditDialogOpen}
        onOpenChange={setIsEditDialogOpen}
        title="Chỉnh sửa danh mục"
        description="Cập nhật thông tin danh mục"
        onSubmit={handleEditCategory}
        submitLabel="Cập nhật"
        size="md"
      >
        {selectedCategory && (
          <div className="form-section">
            <h3 className="form-section-title">Thông tin danh mục</h3>
            <div className="form-grid">
              <div className="form-item">
                <Label htmlFor="edit-category-name" className="form-label">Tên danh mục *</Label>
                <Input
                  id="edit-category-name"
                  type="text"
                  placeholder="Nhập tên danh mục"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="form-input"
                />
              </div>
              
              <div className="form-item full-width">
                <Label htmlFor="edit-category-description" className="form-label">Mô tả</Label>
                <Textarea
                  id="edit-category-description"
                  placeholder="Nhập mô tả"
                  value={formData.description || ''}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  rows={3}
                  className="form-textarea"
                />
              </div>

              <div className="form-item full-width">
                <div className="p-3 bg-blue-50 rounded-md">
                  <strong>Cấp hiện tại:</strong> Cấp {selectedCategory.level}
                </div>
              </div>
            </div>
          </div>
        )}
      </AdminModal>
    </div>
  );
};

export default AdminCategories;
