import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useCategories } from '../context/CategoryContext';
import { listProducts } from '../services/productService';
import { transformProducts } from '../utils/productUtils';
import { getPlaceholderImage } from '../utils/imageUtils';
import SafeImage from './SafeImage';
import './ProductMenu.css';

// Removed DEFAULT_CATEGORIES - chỉ dùng dữ liệu từ API

const getCategoryIcon = (name) => {
  // Handle undefined or null name
  if (!name || typeof name !== 'string') {
    return 'fas fa-box';
  }
  const lower = name.toLowerCase();
  const iconMap = {
    laptop: 'fas fa-laptop',
    pc: 'fas fa-desktop', 'máy bộ': 'fas fa-desktop',
    chuột: 'fas fa-mouse', 'bàn phím': 'fas fa-mouse', 'tai nghe': 'fas fa-mouse',
    ssd: 'fas fa-sd-card',
    ram: 'fas fa-memory',
    'màn hình': 'fas fa-tv', loa: 'fas fa-tv',
    'phụ kiện': 'fas fa-plug',
    usb: 'fas fa-usb',
    hdd: 'fas fa-database',
    'điện thoại': 'fas fa-mobile-alt',
    'máy in': 'fas fa-print',
    'phần mềm': 'fas fa-code'
  };
  return Object.entries(iconMap).find(([key]) => lower.includes(key))?.[1] || 'fas fa-box';
};

// Transform API categories: xử lý giống AdminCategories
// Level 1 (root) -> Level 2 (children) -> Level 3 (products)
const transformCategories = (apiCategories) => {
  if (!Array.isArray(apiCategories)) return [];
  
  console.log('[ProductMenu.transformCategories] Input:', apiCategories);
  
  // Process categories recursively, chỉ lấy 2 levels (giống AdminCategories)
  const processCategories = (cats, level = 1) => {
    if (!Array.isArray(cats)) return [];
    
    return cats.map(cat => {
      if (!cat) return null;
      
      // Giống AdminCategories: dùng categoryId hoặc id
      const categoryId = cat.categoryId || cat.id || cat.category_id;
      const categoryName = cat.categoryName || cat.name || cat.label || 'Unnamed Category';
      
      // Chỉ process children nếu level < 2 (stop at level 2)
      // Level 2 categories sẽ hiển thị products khi hover, không phải categories nữa
      const processedChildren = (cat.children && Array.isArray(cat.children) && cat.children.length > 0 && level < 2)
        ? processCategories(cat.children, level + 1)
        : [];
      
      return {
        id: categoryId,
        icon: cat.icon || getCategoryIcon(categoryName),
        label: categoryName,
        children: processedChildren // Danh mục cấp 2 (array)
      };
    }).filter(Boolean); // Remove null entries
  };
  
  // Xử lý trực tiếp apiCategories (giống AdminCategories - không filter root)
  // API getCategoryTreeFull() đã trả về root categories rồi
  const transformed = processCategories(apiCategories, 1);
  console.log('[ProductMenu.transformCategories] Transformed:', transformed);
  console.log('[ProductMenu.transformCategories] Transformed count:', transformed.length);
  
  return transformed;
};

const ProductMenu = ({ title = 'DANH MỤC SẢN PHẨM', categories: propCategories }) => {
  const [open, setOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);
  const [hoveredLevel2Id, setHoveredLevel2Id] = useState(null); // Track hovered level 2 category
  const [level3Products, setLevel3Products] = useState({}); // Cache products by level 2 category ID
  const [loadingProducts, setLoadingProducts] = useState({}); // Track loading state per category
  const [categories, setCategories] = useState(propCategories || []);
  const navigate = useNavigate();
  // Get categories from context - must be called at top level
  const categoriesContext = useCategories();
  const apiCategories = categoriesContext?.categories || null;
  const categoriesLoading = categoriesContext?.loading || false;
  
  // Debug logs
  console.log('[ProductMenu] Context state:', {
    hasContext: !!categoriesContext,
    apiCategories: apiCategories,
    apiCategoriesType: typeof apiCategories,
    apiCategoriesIsArray: Array.isArray(apiCategories),
    apiCategoriesLength: Array.isArray(apiCategories) ? apiCategories.length : 'N/A',
    categoriesLoading: categoriesLoading
  });

  useEffect(() => {
    if (propCategories) {
      setCategories(propCategories);
      return;
    }
    
    // Đợi API load xong
    if (categoriesLoading) {
      console.log('[ProductMenu] Categories are still loading...');
      return;
    }
    
    // Chỉ dùng dữ liệu từ API - không dùng DEFAULT_CATEGORIES
    try {
      // Kiểm tra apiCategories - có thể là null, array, hoặc object
      console.log('[ProductMenu] Processing categories, apiCategories:', apiCategories);
      
      if (!apiCategories) {
        console.log('[ProductMenu] apiCategories is null/undefined, waiting for data...');
        setCategories([]);
        return;
      }
      
      // Nếu apiCategories là array, dùng trực tiếp
      let categoriesToTransform = [];
      if (Array.isArray(apiCategories)) {
        categoriesToTransform = apiCategories;
      } else if (apiCategories && typeof apiCategories === 'object') {
        // Nếu là object, có thể có data property
        if (Array.isArray(apiCategories.data)) {
          categoriesToTransform = apiCategories.data;
        } else {
          console.warn('[ProductMenu] apiCategories is object but no data array:', apiCategories);
          setCategories([]);
          return;
        }
      } else {
        console.warn('[ProductMenu] apiCategories has unexpected type:', typeof apiCategories);
        setCategories([]);
        return;
      }
      
      if (categoriesToTransform.length > 0) {
        console.log('[ProductMenu] Raw API categories:', categoriesToTransform);
        console.log('[ProductMenu] First category sample:', categoriesToTransform[0]);
        const transformed = transformCategories(categoriesToTransform);
        console.log('[ProductMenu] Transformed categories:', transformed);
        if (transformed && transformed.length > 0) {
          console.log('[ProductMenu] First transformed category:', transformed[0]);
          console.log('[ProductMenu] First category children:', transformed[0]?.children);
          setCategories(transformed);
        } else {
          // Nếu transform trả về empty, set empty array
          console.warn('[ProductMenu] Transformed categories is empty');
          setCategories([]);
        }
      } else {
        // Nếu không có categories, set empty array
        console.log('[ProductMenu] No categories in array');
        setCategories([]);
      }
    } catch (error) {
      console.error('[ProductMenu] Error transforming categories:', error);
      // Set empty array on error
      setCategories([]);
    }
  }, [propCategories, apiCategories, categoriesLoading]);

  // Fetch products when hovering over level 2 category
  const fetchProductsForLevel2 = useCallback(async (categoryId) => {
    if (!categoryId || level3Products[categoryId]) {
      // Already loaded or invalid ID
      return;
    }

    if (loadingProducts[categoryId]) {
      // Already loading
      return;
    }

    try {
      setLoadingProducts(prev => ({ ...prev, [categoryId]: true }));
      
      const productsData = await listProducts({
        page: 1,
        limit: 12, // Limit to 12 products for menu display
        categoryId: categoryId
      });

      // Handle response format
      let productsArray = [];
      if (productsData && typeof productsData === 'object') {
        if (Array.isArray(productsData.data)) {
          productsArray = productsData.data;
        } else if (Array.isArray(productsData)) {
          productsArray = productsData;
        } else if (productsData.items) {
          productsArray = productsData.items;
        }
      } else if (Array.isArray(productsData)) {
        productsArray = productsData;
      }

      // Transform products
      const transformedProducts = transformProducts(productsArray);
      const activeProducts = transformedProducts.filter(
        product => product.isDisabled !== true && product.isDisabled !== 'true'
      );

      setLevel3Products(prev => ({ ...prev, [categoryId]: activeProducts }));
    } catch (error) {
      console.error('[ProductMenu] Failed to load products for category:', categoryId, error);
      setLevel3Products(prev => ({ ...prev, [categoryId]: [] }));
    } finally {
      setLoadingProducts(prev => ({ ...prev, [categoryId]: false }));
    }
  }, [level3Products, loadingProducts]);

  // Handle hover on level 2 category
  const handleLevel2Hover = (categoryId) => {
    setHoveredLevel2Id(categoryId);
    if (categoryId) {
      fetchProductsForLevel2(categoryId);
    }
  };

  const navigateTo = (path) => {
    window.scrollTo({ top: 0, behavior: 'instant' });
    navigate(path);
    setOpen(false);
  };

  // Click on level 2 category → navigate to filter page
  const handleLevel2Click = (categoryId) => {
    if (categoryId) {
      navigateTo(`/products?category=${categoryId}`);
    }
  };

  // Click on product (level 3) → navigate to product detail
  const handleProductClick = (productId) => {
    if (productId) {
      navigateTo(`/products/${productId}`);
    }
  };

  // Click on level 1 category (if no children) → navigate to filter page
  const handleCategoryClick = (category) => {
    const hasChildren = category.children && category.children.length > 0;
    if (!hasChildren && category.id) {
      const path = `/products?category=${category.id}`;
      navigateTo(path);
    }
  };

  // Safety checks
  const safeActiveIndex = categories.length > 0 ? Math.min(activeIndex, categories.length - 1) : 0;
  const activeCategory = categories[safeActiveIndex] || null;
  
  // Handle children từ API - chỉ xử lý array (không còn object structure từ DEFAULT_CATEGORIES)
  let level2Categories = [];
  if (activeCategory?.children && Array.isArray(activeCategory.children)) {
    // API format: children is array of category objects
    level2Categories = activeCategory.children.map(child => ({
      id: child.id || child.categoryId || child.category_id,
      name: child.name || child.categoryName || child.label || 'Unnamed',
      icon: child.icon || getCategoryIcon(child.name || child.categoryName || child.label || 'Unnamed')
    }));
  }
  
  const hoveredLevel2Category = level2Categories.find(cat => cat && cat.id === hoveredLevel2Id);
  const level3ProductsList = hoveredLevel2Id ? (level3Products[hoveredLevel2Id] || []) : [];
  const isLoadingProducts = hoveredLevel2Id ? (loadingProducts[hoveredLevel2Id] || false) : false;

  // Debug logs
  if (activeCategory) {
    console.log('[ProductMenu] Active category:', activeCategory);
    console.log('[ProductMenu] Children type:', typeof activeCategory.children, Array.isArray(activeCategory.children) ? 'array' : 'object');
    console.log('[ProductMenu] Level 2 categories:', level2Categories);
    console.log('[ProductMenu] Has level 2:', level2Categories.length > 0);
  }

  // Calculate grid columns based on what's displayed
  const hasLevel2 = level2Categories.length > 0;
  const hasLevel3 = hoveredLevel2Id !== null;
  let gridColumns = '260px'; // Default: only level 1
  let dropdownWidth = '260px';
  
  if (hasLevel2 && !hasLevel3) {
    gridColumns = '260px 240px';
    dropdownWidth = '500px';
  } else if (hasLevel2 && hasLevel3) {
    gridColumns = '260px 240px 1fr';
    dropdownWidth = '1200px';
  }

  return (
    <div className="product-menu">
      <button className="product-menu__toggle" onClick={() => setOpen(!open)}>
        <i className="fas fa-bars"></i>
        <span>{title}</span>
        <i className={`fas fa-chevron-${open ? 'up' : 'down'} caret`}></i>
      </button>

      {open && (
        <>
          <div className="product-menu__backdrop" onClick={() => setOpen(false)} aria-hidden="true"></div>
          <div 
            className="product-menu__dropdown" 
            role="menu" 
            aria-label="Product categories"
            style={{
              gridTemplateColumns: gridColumns,
              width: dropdownWidth
            }}
          >
            {/* Cấp 1: Left column */}
            <div className="pmenu-left">
              {categories && categories.length > 0 ? (
                categories.map((c, idx) => {
                  if (!c) return null;
                  const hasChildren = c.children && Array.isArray(c.children) && c.children.length > 0;
                  return (
                    <button 
                      key={c.id || idx} 
                      className={`product-menu__item ${idx === safeActiveIndex ? 'active' : ''}`} 
                      onMouseEnter={() => {
                        setActiveIndex(idx);
                        setHoveredLevel2Id(null); // Reset level 2 hover when changing level 1
                      }}
                      onClick={() => handleCategoryClick(c)}
                    >
                      <i className={c.icon || 'fas fa-box'} aria-hidden="true"></i>
                      <span className="label">{c.label || 'Unnamed'}</span>
                      {hasChildren && <i className="fas fa-angle-right arrow" aria-hidden="true"></i>}
                    </button>
                  );
                })
              ) : (
                <div className="pmenu-empty">Không có danh mục</div>
              )}
            </div>

            {/* Cấp 2: Middle column */}
            {level2Categories.length > 0 && (
              <div className="pmenu-middle">
                <div className="pmenu-middle-content">
                  {level2Categories.map((level2Cat) => (
                    <div
                      key={level2Cat.id || level2Cat.name}
                      className={`pmenu-level2-item ${hoveredLevel2Id === level2Cat.id ? 'active' : ''}`}
                      onMouseEnter={() => handleLevel2Hover(level2Cat.id)}
                      onClick={() => handleLevel2Click(level2Cat.id)}
                    >
                      <i className={level2Cat.icon || 'fas fa-folder'}></i>
                      <span className="level2-label">{level2Cat.name}</span>
                      <i className="fas fa-angle-right level2-arrow"></i>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Cấp 3: Right column - Products */}
            {hoveredLevel2Id && (
              <div className="pmenu-right">
                {isLoadingProducts ? (
                  <div className="pmenu-products-loading">
                    <div className="loading-spinner"></div>
                    <p>Đang tải sản phẩm...</p>
                  </div>
                ) : level3ProductsList.length > 0 ? (
                  <div className="pmenu-products-grid">
                    {level3ProductsList.map((product) => {
                      const productImage = product.image || product.imageUrl || getPlaceholderImage('product');
                      const productName = product.name || product.title || 'Sản phẩm';
                      const productPrice = product.price || product.salePrice || 0;
                      const formattedPrice = new Intl.NumberFormat('vi-VN').format(productPrice);
                      
                      return (
                        <div
                          key={product.id}
                          className="pmenu-product-item"
                          onClick={() => handleProductClick(product.id)}
                        >
                          <div className="pmenu-product-image">
                            <SafeImage
                              src={productImage}
                              alt={productName}
                              className="product-thumb"
                            />
                          </div>
                          <div className="pmenu-product-info">
                            <div className="pmenu-product-name">{productName}</div>
                            <div className="pmenu-product-price">{formattedPrice} ₫</div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="pmenu-products-empty">
                    <p>Chưa có sản phẩm trong danh mục này</p>
                  </div>
                )}
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
};

export default ProductMenu;
