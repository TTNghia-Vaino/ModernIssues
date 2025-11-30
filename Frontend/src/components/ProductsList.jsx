import React, { useEffect, useMemo, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import * as productService from '../services/productService';
import * as promotionService from '../services/promotionService';
import { transformProducts } from '../utils/productUtils';
import ProductCard from './ProductCard';
import './ProductsList.css';


const ProductsList = () => {
  const { search } = useLocation();
  const navigate = useNavigate();
  const { isInTokenGracePeriod } = useAuth();
  const params = new URLSearchParams(search);
  const initialQ = params.get('q') || '';
  const urlCategory = params.get('category') || ''; // Đọc category từ URL
  const urlSubcategory = params.get('subcategory') || ''; // Đọc subcategory từ URL
  const urlPromotion = params.get('promotion') || ''; // Đọc promotion từ URL

  // Map subcategory ID to category name
  const subcategoryMap = {
    'van-phong-st': 'PC Văn Phòng ST',
    'gaming-st': 'PC Gaming ST',
    'do-hoa-render': 'PC Đồ Họa Render',
    'itx-nho-gon': 'PC ITX / Nhỏ Gọn',
    'pc-ai': 'PC AI',
    'tu-build': 'PC Tự Build',
    'thung-may': 'Thùng máy'
  };

  // If subcategory exists, use its mapped category name, otherwise use urlCategory
  const effectiveCategory = urlSubcategory && subcategoryMap[urlSubcategory] 
    ? subcategoryMap[urlSubcategory] 
    : urlCategory;

  const [products, setProducts] = useState([]);
  const [q, setQ] = useState(initialQ);
  const [brand, setBrand] = useState('');
  const [category, setCategory] = useState(effectiveCategory); // Set category từ URL hoặc subcategory
  const [maxPrice, setMaxPrice] = useState('');
  const [loading, setLoading] = useState(true);
  const [brands, setBrands] = useState([]); // Brands từ API

  // Cập nhật category, query và promotion khi URL thay đổi
  useEffect(() => {
    console.log('[ProductsList] URL changed, search:', search);
    const currentParams = new URLSearchParams(search);
    const newCategory = currentParams.get('category') || '';
    const newSubcategory = currentParams.get('subcategory') || '';
    const newQ = currentParams.get('q') || '';
    const newPromotion = currentParams.get('promotion') || '';
    
    console.log('[ProductsList] URL params:', { newCategory, newSubcategory, newQ, newPromotion, currentCategory: category });
    
    // If subcategory exists, use its mapped category name, otherwise use category from URL
    // But if category is a number (categoryId), keep it as is for API filtering
    let effectiveNewCategory = newCategory;
    if (newSubcategory && subcategoryMap[newSubcategory]) {
      effectiveNewCategory = subcategoryMap[newSubcategory];
    }
    
    let shouldReload = false;
    
    // Cập nhật category nếu thay đổi
    if (effectiveNewCategory !== category) {
      console.log('[ProductsList] Category changed:', category, '->', effectiveNewCategory);
      setCategory(effectiveNewCategory);
      shouldReload = true;
    }
    
    // Cập nhật query nếu thay đổi
    if (newQ !== q) {
      console.log('[ProductsList] Query changed:', q, '->', newQ);
      setQ(newQ);
      shouldReload = true;
    }
    
    // Nếu có promotion trong URL, load products theo promotion
    if (newPromotion) {
      console.log('[ProductsList] Loading products by promotion:', newPromotion);
      loadProductsByPromotion(newPromotion);
    } else if (shouldReload) {
      // Reload products khi category hoặc query từ URL thay đổi
      // Pass the raw categoryId from URL if it's a number, otherwise pass the category name
      const categoryIdToPass = newSubcategory ? null : (newCategory && !isNaN(parseInt(newCategory, 10)) ? newCategory : null);
      console.log('[ProductsList] Reloading products with:', { categoryIdToPass, effectiveNewCategory, newQ, shouldReload });
      loadProducts(categoryIdToPass || effectiveNewCategory || null, newQ);
    } else {
      console.log('[ProductsList] No reload needed');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search]);

  // Scroll to top when component mounts or search params change
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'instant' });
  }, [search]);

  // Load brands from API on mount
  useEffect(() => {
    let cancelled = false;
    
    const loadBrands = async () => {
      try {
        console.log('[ProductsList] Loading brands from API...');
        const brandsData = await productService.getBrands();
        console.log('[ProductsList] Brands loaded:', brandsData);
        if (!cancelled) {
          setBrands(Array.isArray(brandsData) ? brandsData : []);
        }
      } catch (error) {
        console.error('[ProductsList] Error loading brands:', error);
        if (!cancelled) {
          setBrands([]);
        }
      }
    };
    
    loadBrands();
    
    return () => {
      cancelled = true;
    };
  }, []); // Only run on mount

  // Load products from API on initial mount, but delay if in grace period
  useEffect(() => {
    let cancelled = false;
    
    const attemptLoad = async () => {
      // If in grace period, wait for it to end
      if (isInTokenGracePeriod) {
        console.log('[ProductsList] Waiting for token grace period to end before loading products');
        await new Promise(resolve => setTimeout(resolve, 6000));
        if (cancelled) return;
      }
      
      if (!cancelled) {
        // Nếu có promotion trong URL, load theo promotion
        if (urlPromotion) {
          loadProductsByPromotion(urlPromotion);
        } else {
          loadProducts(effectiveCategory || null, initialQ);
        }
      }
    };
    
    attemptLoad();
    
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Only run on mount

  const loadProductsByPromotion = async (promotionId) => {
    try {
      setLoading(true);
      console.log('[ProductsList] Loading products by promotion ID:', promotionId);
      
      const promotionIdNum = parseInt(promotionId, 10);
      if (isNaN(promotionIdNum)) {
        console.error('[ProductsList] Invalid promotion ID:', promotionId);
        setProducts([]);
        setLoading(false);
        return;
      }
      
      const productsData = await promotionService.getProductsByPromotion(promotionIdNum, {
        page: 1,
        limit: 200
      });
      
      console.log('[ProductsList] Products by promotion response:', productsData);
      
      // Handle response format: { totalCount, currentPage, limit, data: [...] }
      let productsArray = [];
      if (productsData && typeof productsData === 'object') {
        if (Array.isArray(productsData.data)) {
          productsArray = productsData.data;
        } else if (Array.isArray(productsData)) {
          productsArray = productsData;
        }
      } else if (Array.isArray(productsData)) {
        productsArray = productsData;
      }
      
      console.log('[ProductsList] Products array length:', productsArray.length);
      
      // Transform API format to component format
      const transformedProducts = transformProducts(productsArray);
      console.log('[ProductsList] Transformed products:', transformedProducts.length);
      
      // Filter out disabled products
      const activeProducts = transformedProducts.filter(
        product => product.isDisabled !== true && product.isDisabled !== 'true'
      );
      console.log('[ProductsList] Active products:', activeProducts.length);
      
      setProducts(activeProducts);
    } catch (error) {
      console.error('[ProductsList] Error loading products by promotion:', error);
      setProducts([]);
    } finally {
      setLoading(false);
    }
  };

  const loadProducts = async (categoryId = null, searchQuery = null) => {
    try {
      setLoading(true);
      // Use categoryId parameter if provided, otherwise use state category
      const activeCategory = categoryId !== null ? categoryId : category;
      // Use searchQuery parameter if provided, otherwise use state q
      const activeSearchQuery = searchQuery !== null ? searchQuery : q;
      
      // Check if we have subcategory - if so, we'll filter client-side by category name
      const currentParams = new URLSearchParams(search);
      const currentSubcategory = currentParams.get('subcategory') || '';
      const hasSubcategory = !!currentSubcategory;
      
      // Try API first
      try {
        // If we have subcategory, don't filter by parent category in API
        // Load all products (or with search if provided) and filter client-side by subcategory category name
        // This is because subcategory products may have different category name than parent
        // Convert categoryId to number if it's a string (from URL query)
        // Only use categoryId if it's a valid number (API only supports categoryId, not category name)
        let apiCategoryId = null;
        if (!hasSubcategory && activeCategory) {
          if (typeof activeCategory === 'number') {
            apiCategoryId = activeCategory;
          } else if (typeof activeCategory === 'string') {
            const parsedId = parseInt(activeCategory, 10);
            if (!isNaN(parsedId)) {
              apiCategoryId = parsedId;
            }
            // If activeCategory is a string but not a number, it's likely a category name
            // API doesn't support filtering by category name, so we'll filter client-side later
          }
        }
        
        console.log('[ProductsList] Fetching products from API...', { 
          categoryId: apiCategoryId, 
          categoryIdType: typeof apiCategoryId,
          activeCategory: activeCategory,
          activeCategoryType: typeof activeCategory,
          search: activeSearchQuery,
          hasSubcategory,
          subcategory: currentSubcategory,
          willFilterBy: hasSubcategory ? subcategoryMap[currentSubcategory] : (apiCategoryId ? `categoryId=${apiCategoryId}` : activeCategory)
        });
        const productsData = await productService.listProducts({
          page: 1,
          limit: 200, // Get more products when filtering by subcategory (need to find products across all categories)
          ...(apiCategoryId && { categoryId: apiCategoryId }),
          ...(activeSearchQuery && { search: activeSearchQuery })
        });
        
        console.log('[ProductsList] Raw API response:', productsData);
        
        // Handle Swagger response format: { totalCount, currentPage, limit, data: [...] }
        let productsArray = [];
        if (productsData && typeof productsData === 'object') {
          if (Array.isArray(productsData.data)) {
            productsArray = productsData.data;
            console.log('[ProductsList] Found products in productsData.data:', productsArray.length);
          } else if (Array.isArray(productsData)) {
            productsArray = productsData;
            console.log('[ProductsList] productsData is array:', productsArray.length);
          } else if (productsData.items) {
            productsArray = productsData.items;
            console.log('[ProductsList] Found products in productsData.items:', productsArray.length);
          } else {
            console.warn('[ProductsList] Unknown response format:', Object.keys(productsData));
          }
        } else if (Array.isArray(productsData)) {
          productsArray = productsData;
          console.log('[ProductsList] productsData is direct array:', productsArray.length);
        } else {
          console.warn('[ProductsList] Unexpected response type:', typeof productsData);
        }
        
        console.log('[ProductsList] Products array length:', productsArray.length);
        
        // Transform API format to component format
        const transformedProducts = transformProducts(productsArray);
        console.log('[ProductsList] Transformed products:', transformedProducts.length);
        
        // Filter out disabled products (API should already filter, but double-check for safety)
        let activeProducts = transformedProducts.filter(
          product => product.isDisabled !== true && product.isDisabled !== 'true'
        );
        console.log('[ProductsList] Active products (after filtering disabled):', activeProducts.length);
        
        // If we have subcategory, filter by category name client-side
        if (hasSubcategory && currentSubcategory && subcategoryMap[currentSubcategory]) {
          const categoryNameToFilter = subcategoryMap[currentSubcategory];
          console.log('[ProductsList] Filtering by subcategory category name:', categoryNameToFilter);
          const beforeFilterCount = activeProducts.length;
          activeProducts = activeProducts.filter(
            product => product.category === categoryNameToFilter
          );
          console.log('[ProductsList] Products after subcategory filter:', activeProducts.length, 'out of', beforeFilterCount);
        }
        
        // If activeCategory is a category name (not a number) and we didn't use apiCategoryId, filter client-side
        if (!hasSubcategory && activeCategory && typeof activeCategory === 'string' && isNaN(parseInt(activeCategory, 10))) {
          console.log('[ProductsList] Filtering by category name (client-side):', activeCategory);
          const beforeFilterCount = activeProducts.length;
          activeProducts = activeProducts.filter(
            product => product.category === activeCategory
          );
          console.log('[ProductsList] Products after category name filter:', activeProducts.length, 'out of', beforeFilterCount);
        }
        
        setProducts(activeProducts);
      } catch (apiError) {
        console.error('[ProductsList] API failed:', apiError);
        console.error('[ProductsList] Error details:', {
          message: apiError.message,
          status: apiError.status,
          data: apiError.data
        });
        
        // Nếu là lỗi 500 từ Backend, hiển thị thông báo lỗi
        if (apiError.status === 500) {
          console.error('[ProductsList] Backend server error (500). Please check backend logs.');
          // Vẫn thử fallback để hiển thị products từ cache nếu có
        }
        
        // Fallback to localStorage
        const savedProducts = localStorage.getItem('adminProducts');
        if (savedProducts) {
          try {
            const allProducts = JSON.parse(savedProducts);
            const activeProducts = allProducts.filter(p => {
              const isNotDisabled = p.isDisabled !== true && p.isDisabled !== 'true';
              return (p.status === 'active' || p.status !== 'disabled') && isNotDisabled;
            });
            
            // Nếu có search query, filter theo query
            if (activeSearchQuery && activeSearchQuery.trim()) {
              const searchLower = activeSearchQuery.toLowerCase();
              const filtered = activeProducts.filter(p => 
                (p.name && p.name.toLowerCase().includes(searchLower)) ||
                (p.productName && p.productName.toLowerCase().includes(searchLower)) ||
                (p.description && p.description.toLowerCase().includes(searchLower))
              );
              setProducts(filtered);
            } else {
              setProducts(activeProducts);
            }
          } catch (parseError) {
            console.error('[ProductsList] Failed to parse localStorage products:', parseError);
            setProducts([]);
          }
        } else {
          setProducts([]);
        }
      }
    } catch (error) {
      console.error('Error loading products:', error);
    } finally {
      setLoading(false);
    }
  };

  // Get unique values for filters
  const uniqueValues = (key) => {
    const values = Array.from(new Set(products.map(p => p[key]).filter(Boolean)));
    return values;
  };

  // Search and filter products (chỉ filter client-side nếu không có query từ URL)
  // Nếu có query từ URL, products đã được filter từ API rồi
  const searchProducts = ({ q = '', brand = '', category = '', maxPrice, hasUrlQuery = false } = {}) => {
    // Nếu có query từ URL, chỉ filter theo brand, category, maxPrice (API đã filter theo q rồi)
    // Nếu không có query từ URL, filter cả theo q (client-side)
    return products.filter(p => (
      (!hasUrlQuery && (!q || p.name.toLowerCase().includes(q.toLowerCase()))) &&
      (!brand || p.brand === brand) &&
      (!category || p.category === category) &&
      (maxPrice === undefined || maxPrice === '' || p.price <= Number(maxPrice))
    ));
  };

  // Use brands from API instead of extracting from products
  // const brands = useMemo(() => uniqueValues('brand'), [products]);
  const categories = useMemo(() => uniqueValues('category'), [products]);

  // Nếu có query từ URL, không cần filter client-side nữa (API đã filter rồi)
  const urlParams = useMemo(() => new URLSearchParams(search), [search]);
  const hasUrlQuery = urlParams.get('q');
  const hasUrlCategoryId = urlParams.get('category') && !isNaN(parseInt(urlParams.get('category'), 10));
  const filtered = useMemo(() => {
    console.log('[ProductsList] Filtering products:', {
      productsCount: products.length,
      hasUrlQuery: !!hasUrlQuery,
      hasUrlCategoryId: !!hasUrlCategoryId,
      q,
      brand,
      category,
      maxPrice
    });
    
    // Nếu có query từ URL, API đã filter rồi, chỉ cần filter theo brand/category/maxPrice nếu có
    if (hasUrlQuery) {
      // API đã filter theo q rồi, chỉ filter theo brand/category/maxPrice
      const filteredByFilters = products.filter(p => (
        (!brand || p.brand === brand) &&
        (!category || p.category === category) &&
        (maxPrice === undefined || maxPrice === '' || p.price <= Number(maxPrice))
      ));
      console.log('[ProductsList] Filtered by filters (hasUrlQuery):', filteredByFilters.length);
      return filteredByFilters;
    }
    
    // Nếu có categoryId từ URL, API đã filter theo categoryId rồi
    // Không nên filter client-side theo category nữa (vì category state là categoryId, không phải category name)
    if (hasUrlCategoryId) {
      // API đã filter theo categoryId rồi, chỉ filter theo brand/maxPrice nếu có
      const filteredByFilters = products.filter(p => (
        (!brand || p.brand === brand) &&
        (maxPrice === undefined || maxPrice === '' || p.price <= Number(maxPrice))
      ));
      console.log('[ProductsList] Filtered by filters (hasUrlCategoryId):', filteredByFilters.length);
      return filteredByFilters;
    }
    
    // Không có query từ URL và không có categoryId -> filter client-side theo tất cả criteria
    const filtered = searchProducts({ q, brand, category, maxPrice, hasUrlQuery: false });
    console.log('[ProductsList] Filtered client-side (noUrlQuery):', filtered.length);
    return filtered;
  }, [products, q, brand, category, maxPrice, search, hasUrlQuery, hasUrlCategoryId]);

  const handleProductClick = (productId) => {
    // Scroll to top immediately before navigation
    window.scrollTo(0, 0);
    document.documentElement.scrollTop = 0;
    document.body.scrollTop = 0;
    // Then navigate
    navigate(`/products/${productId}`);
  };

  // Kiểm tra có category từ URL không - nếu có thì ẩn filter sidebar
  const hasCategoryFromUrl = !!urlCategory;
  
  if (loading) {
    return (
      <div className="products-list-container" style={{minHeight: '100vh', textAlign: 'center', paddingTop: '0px'}}>
        <div>Đang tải sản phẩm...</div>
      </div>
    );
  }

  return (
    <div 
      className={`products-list-container ${hasCategoryFromUrl ? 'no-filter-sidebar' : ''}`} 
      style={{minHeight: '100vh', paddingTop: '0px', paddingBottom: '40px'}}
    >
      <h2 style={{margin: '10px 0 20px 0'}}>Sản phẩm</h2>
      <div 
        className="products-layout-wrapper" 
        style={{
          display: 'grid', 
          gridTemplateColumns: hasCategoryFromUrl ? '1fr' : '260px 1fr', 
          gap: '10px', 
          maxWidth: '100%'
        }}
      >
        {!hasCategoryFromUrl && (
          <aside className="products-filter-sidebar" style={{border:'1px solid #eee', padding:'12px', borderRadius:'8px'}}>
            <div style={{display:'grid', gap:'10px'}}>
              <input placeholder="Tìm kiếm" value={q} onChange={e=>setQ(e.target.value)} style={{padding:'8px 10px'}} />
              <select value={brand} onChange={e=>setBrand(e.target.value)}>
                <option value="">Thương hiệu</option>
                {brands.map(b=> <option key={b} value={b}>{b}</option>)}
              </select>
              <select value={category} onChange={e=>setCategory(e.target.value)}>
                <option value="">Danh mục</option>
                {categories.map(c=> <option key={c} value={c}>{c}</option>)}
              </select>
              <input type="number" placeholder="Giá tối đa" value={maxPrice} onChange={e=>setMaxPrice(e.target.value)} />
              <button onClick={()=>{setQ('');setBrand('');setCategory('');setMaxPrice('');}}>Xóa bộ lọc</button>
            </div>
          </aside>
        )}

        <section className="products-grid-section">
          {filtered.length > 0 ? (
            filtered.map(p => (
              <ProductCard
                key={p.id}
                product={p}
                onClick={handleProductClick}
                variant="default"
              />
            ))
          ) : (
            <div style={{gridColumn:'1 / -1', textAlign:'center', padding:'40px', color:'#6b7280'}}>
              {loading ? (
                <div>
                  <p>Đang tải sản phẩm...</p>
                </div>
              ) : (
                <div>
                  <p style={{fontSize: '18px', marginBottom: '10px'}}>Không tìm thấy sản phẩm nào.</p>
                  {hasUrlQuery && (
                    <p style={{fontSize: '14px', color: '#9ca3af'}}>
                      Có thể do lỗi Backend API (500). Vui lòng thử lại sau hoặc liên hệ admin.
                    </p>
                  )}
                  {!hasUrlQuery && (
                    <p style={{fontSize: '14px', color: '#9ca3af'}}>
                      Vui lòng thêm sản phẩm từ trang Admin.
                    </p>
                  )}
                </div>
              )}
            </div>
          )}
        </section>
      </div>
    </div>
  );
};

export default ProductsList;


