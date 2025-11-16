import React, { useEffect, useMemo, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import * as productService from '../services/productService';
import { transformProducts } from '../utils/productUtils';
import './ProductsList.css';

const formatPrice = v => v.toLocaleString('vi-VN') + '₫';

const ProductsList = () => {
  const { search } = useLocation();
  const navigate = useNavigate();
  const { isInTokenGracePeriod } = useAuth();
  const params = new URLSearchParams(search);
  const initialQ = params.get('q') || '';
  const urlCategory = params.get('category') || ''; // Đọc category từ URL

  const [products, setProducts] = useState([]);
  const [q, setQ] = useState(initialQ);
  const [brand, setBrand] = useState('');
  const [category, setCategory] = useState(urlCategory); // Set category từ URL
  const [maxPrice, setMaxPrice] = useState('');
  const [loading, setLoading] = useState(true);

  // Cập nhật category và query khi URL thay đổi
  useEffect(() => {
    const currentParams = new URLSearchParams(search);
    const newCategory = currentParams.get('category') || '';
    const newQ = currentParams.get('q') || '';
    
    let shouldReload = false;
    
    // Cập nhật category nếu thay đổi
    if (newCategory !== category) {
      setCategory(newCategory);
      shouldReload = true;
    }
    
    // Cập nhật query nếu thay đổi
    if (newQ !== q) {
      setQ(newQ);
      shouldReload = true;
    }
    
    // Reload products khi category hoặc query từ URL thay đổi
    if (shouldReload) {
      loadProducts(newCategory || null, newQ);
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
        loadProducts(urlCategory || null, initialQ);
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
      
      // Try API first
      try {
        console.log('[ProductsList] Fetching products from API...', { categoryId: activeCategory, search: activeSearchQuery });
        const productsData = await productService.listProducts({
          page: 1,
          limit: 100, // Get more products for listing
          ...(activeCategory && { categoryId: activeCategory }),
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
        setProducts(transformedProducts);
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
          const activeProducts = allProducts.filter(p => p.status === 'active' || p.status !== 'disabled');
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
              <div 
                key={p.id} 
                onClick={() => handleProductClick(p.id)}
                className="product-card"
                style={{border:'1px solid #eee', borderRadius:'8px', padding:'12px', cursor:'pointer', color:'#2c3e50', transition:'box-shadow 0.2s'}}
                onMouseEnter={(e) => e.currentTarget.style.boxShadow = '0 2px 8px rgba(0,0,0,0.1)'}
                onMouseLeave={(e) => e.currentTarget.style.boxShadow = 'none'}
              >
                <div style={{height:220, background:'#f7f7f7', borderRadius:6, marginBottom:8, overflow:'hidden', width: '100%', flexShrink: 0}}>
                  {p.image && <img src={p.image} alt={p.name} style={{width:'100%', height:'100%', objectFit:'cover'}} />}
                </div>
                <div style={{fontSize:16, fontWeight:600, marginBottom: '8px', lineHeight: '1.5'}}>{p.name}</div>
                <div style={{fontSize:18, color:'#0a804a', fontWeight:700, marginBottom: '6px'}}>{formatPrice(p.price || p.salePrice || 0)}</div>
                <div style={{fontSize:13, color:'#6b7280'}}>{p.brand ? `${p.brand} · ` : ''}{p.category}</div>
              </div>
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


