import React, { useEffect, useMemo, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import * as productService from '../services/productService';
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

  // Cập nhật category và query khi URL thay đổi
  useEffect(() => {
    const currentParams = new URLSearchParams(search);
    const newCategory = currentParams.get('category') || '';
    const newSubcategory = currentParams.get('subcategory') || '';
    const newQ = currentParams.get('q') || '';
    
    // Map subcategory to category name if exists
    const effectiveNewCategory = newSubcategory && subcategoryMap[newSubcategory]
      ? subcategoryMap[newSubcategory]
      : newCategory;
    
    let shouldReload = false;
    
    // Cập nhật category nếu thay đổi
    if (effectiveNewCategory !== category) {
      setCategory(effectiveNewCategory);
      shouldReload = true;
    }
    
    // Cập nhật query nếu thay đổi
    if (newQ !== q) {
      setQ(newQ);
      shouldReload = true;
    }
    
    // Reload products khi category hoặc query từ URL thay đổi
    if (shouldReload) {
      loadProducts(effectiveNewCategory || null, newQ);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search]);

  // Scroll to top when component mounts or search params change
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'instant' });
  }, [search]);

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
        loadProducts(effectiveCategory || null, initialQ);
      }
    };
    
    attemptLoad();
    
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Only run on mount

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
        const apiCategoryId = hasSubcategory ? null : activeCategory;
        console.log('[ProductsList] Fetching products from API...', { 
          categoryId: apiCategoryId, 
          search: activeSearchQuery,
          hasSubcategory,
          subcategory: currentSubcategory,
          effectiveCategory: activeCategory,
          willFilterBy: hasSubcategory ? subcategoryMap[currentSubcategory] : activeCategory
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
        
        setProducts(activeProducts);
      } catch (apiError) {
        console.error('[ProductsList] API failed:', apiError);
        console.error('[ProductsList] Error details:', {
          message: apiError.message,
          status: apiError.status,
          data: apiError.data
        });
        // Fallback to localStorage
        const savedProducts = localStorage.getItem('adminProducts');
        if (savedProducts) {
          const allProducts = JSON.parse(savedProducts);
          const activeProducts = allProducts.filter(p => {
            const isNotDisabled = p.isDisabled !== true && p.isDisabled !== 'true';
            return (p.status === 'active' || p.status !== 'disabled') && isNotDisabled;
          });
          setProducts(activeProducts);
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

  const brands = useMemo(() => uniqueValues('brand'), [products]);
  const categories = useMemo(() => uniqueValues('category'), [products]);

  // Nếu có query từ URL, không cần filter client-side nữa (API đã filter rồi)
  const urlParams = useMemo(() => new URLSearchParams(search), [search]);
  const hasUrlQuery = urlParams.get('q');
  const filtered = useMemo(() => {
    if (hasUrlQuery && !brand && !category && !maxPrice) {
      // Chỉ có query từ URL, không có filter khác -> dùng products trực tiếp (API đã filter)
      return products;
    }
    // Có filter khác hoặc không có query từ URL -> filter client-side
    return searchProducts({ q, brand, category, maxPrice, hasUrlQuery: !!hasUrlQuery });
  }, [products, q, brand, category, maxPrice, search]);

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
              Không tìm thấy sản phẩm nào. Vui lòng thêm sản phẩm từ trang Admin.
            </div>
          )}
        </section>
      </div>
    </div>
  );
};

export default ProductsList;


