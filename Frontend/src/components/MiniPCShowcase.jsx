import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import * as productService from '../services/productService';
import { transformProducts } from '../utils/productUtils';
import './MiniPCShowcase.css';
import miniPCBanner from '../assets/section_product_2.webp';

function MiniPCShowcase() {
  const navigate = useNavigate();
  const { isInTokenGracePeriod } = useAuth();
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);

  const categories = [
    { id: 'van-phong-st', name: 'PC Văn Phòng ST' },
    { id: 'gaming-st', name: 'PC Gaming ST' },
    { id: 'do-hoa-render', name: 'PC Đồ Họa Render' },
    { id: 'itx-nho-gon', name: 'PC ITX / Nhỏ Gọn' },
    { id: 'pc-ai', name: 'PC AI' },
    { id: 'tu-build', name: 'PC Tự Build' },
    { id: 'thung-may', name: 'Thùng máy' }
  ];

  useEffect(() => {
    let cancelled = false;
    
    const attemptLoad = async () => {
      // If in grace period, wait for it to end
      if (isInTokenGracePeriod) {
        console.log('[MiniPCShowcase] Waiting for token grace period to end before loading products');
        await new Promise(resolve => setTimeout(resolve, 6000));
        if (cancelled) return;
      }
      
      if (!cancelled) {
        fetchMiniPCProducts();
      }
    };
    
    attemptLoad();
    
    return () => {
      cancelled = true;
    };
  }, []); // Only run on mount

  const fetchMiniPCProducts = async () => {
    try {
      setLoading(true);
      // Try API first
      try {
        console.log('[MiniPCShowcase] Fetching products from API...');
        // Load more products to ensure we get all Mini PC related products
        const productsData = await productService.listProducts({ 
          page: 1, 
          limit: 100
        });
        
        console.log('[MiniPCShowcase] Raw API response:', productsData);
        
        // Handle Swagger response format: { totalCount, currentPage, limit, data: [...] }
        let productsArray = [];
        if (productsData && typeof productsData === 'object') {
          if (Array.isArray(productsData.data)) {
            productsArray = productsData.data;
            console.log('[MiniPCShowcase] Found products in productsData.data:', productsArray.length);
          } else if (Array.isArray(productsData)) {
            productsArray = productsData;
            console.log('[MiniPCShowcase] productsData is array:', productsArray.length);
          } else if (productsData.items) {
            productsArray = productsData.items;
            console.log('[MiniPCShowcase] Found products in productsData.items:', productsArray.length);
          } else {
            console.warn('[MiniPCShowcase] Unknown response format:', Object.keys(productsData));
          }
        } else if (Array.isArray(productsData)) {
          productsArray = productsData;
          console.log('[MiniPCShowcase] productsData is direct array:', productsArray.length);
        } else {
          console.warn('[MiniPCShowcase] Unexpected response type:', typeof productsData);
        }
        
        console.log('[MiniPCShowcase] Products array length:', productsArray.length);
        
        // Transform API format to component format
        const transformedProducts = transformProducts(productsArray);
        console.log('[MiniPCShowcase] Transformed products:', transformedProducts.length);
        
        // Create a set of valid category names for Mini PC
        const validCategoryNames = new Set([
          'Mini PC',
          ...categories.map(cat => cat.name)
        ]);
        console.log('[MiniPCShowcase] Valid category names:', Array.from(validCategoryNames));
        
        const miniPCProducts = transformedProducts.filter(
          product => {
            // Filter out disabled products
            const isNotDisabled = product.isDisabled !== true && product.isDisabled !== 'true';
            if (!isNotDisabled) return false;
            
            // Check status (active or undefined)
            const isActive = product.status === 'active' || product.status === undefined;
            if (!isActive) return false;
            
            // Check if category matches any valid Mini PC category
            const categoryMatch = product.category && validCategoryNames.has(product.category);
            
            // Also check if category or name contains 'mini' (for backward compatibility)
            const nameOrCategoryContainsMini = product.category?.toLowerCase().includes('mini') ||
                                               product.name?.toLowerCase().includes('mini');
            
            const isMatch = categoryMatch || nameOrCategoryContainsMini;
            
            if (isMatch) {
              console.log('[MiniPCShowcase] Product matched:', {
                name: product.name,
                category: product.category,
                matchReason: categoryMatch ? 'category_match' : 'name_contains_mini'
              });
            }
            
            return isMatch;
          }
        );
        console.log('[MiniPCShowcase] Filtered Mini PC products:', miniPCProducts.length);
        setProducts(miniPCProducts.slice(0, 10)); // Lấy 10 sản phẩm đầu tiên
      } catch (apiError) {
        console.error('[MiniPCShowcase] API failed:', apiError);
        console.error('[MiniPCShowcase] Error details:', {
          message: apiError.message,
          status: apiError.status,
          data: apiError.data
        });
        // Fallback to localStorage
        const savedProducts = localStorage.getItem('adminProducts');
        if (savedProducts) {
          console.log('[MiniPCShowcase] Using localStorage fallback');
          const allProducts = JSON.parse(savedProducts);
          const miniPCProducts = allProducts.filter(
            product => {
              const isNotDisabled = product.isDisabled !== true && product.isDisabled !== 'true';
              return product.category === 'Mini PC' && 
                     product.status === 'active' && 
                     isNotDisabled;
            }
          );
          setProducts(miniPCProducts.slice(0, 10));
        } else {
          console.warn('[MiniPCShowcase] No localStorage data available');
        }
      }
    } catch (error) {
      console.error('[MiniPCShowcase] Unexpected error:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleProductClick = (productId) => {
    // Scroll to top immediately before navigation
    window.scrollTo(0, 0);
    document.documentElement.scrollTop = 0;
    document.body.scrollTop = 0;
    // Then navigate
    navigate(`/products/${productId}`);
  };

  const handleCategoryClick = (categoryId) => {
    navigate(`/products?category=Mini PC&subcategory=${categoryId}`);
  };

  const handleViewAll = () => {
    navigate('/products?category=Mini PC');
  };

  const formatPrice = (price) => {
    return new Intl.NumberFormat('vi-VN', {
      style: 'currency',
      currency: 'VND'
    }).format(price);
  };


  if (loading) {
    return <div className="mini-pc-showcase loading">Đang tải...</div>;
  }

  return (
    <section className="mini-pc-showcase">
      <div className="container">
        {/* Banner */}
        <div className="mini-pc-banner">
          <img src={miniPCBanner} alt="Mini PC & Máy Bộ" />
        </div>

        {/* Category Tabs */}
        <div className="category-tabs">
          {categories.map(category => (
            <button
              key={category.id}
              className="category-tab"
              onClick={() => handleCategoryClick(category.id)}
            >
              {category.name}
            </button>
          ))}
          <button className="category-tab view-all" onClick={handleViewAll}>
            Xem tất cả
          </button>
        </div>

        {/* Products Grid */}
        <div className="products-grid">
          {products.length === 0 ? (
            <div className="no-products">
              <p>Chưa có sản phẩm Mini PC nào. Vui lòng thêm sản phẩm trong trang Admin.</p>
            </div>
          ) : (
            products.map(product => {
              return (
                <div
                  key={product.id}
                  className="product-card"
                  onClick={() => handleProductClick(product.id)}
                >
                  {product.discount > 0 && (
                    <div className="discount-badge">-{product.discount}%</div>
                  )}
                  
                  {product.badge && (
                    <div className="product-badge">{product.badge}</div>
                  )}

                  <div className="product-image">
                    <img 
                      src={product.image || 'https://via.placeholder.com/200'} 
                      alt={product.name}
                      className="product-image-main" 
                    />
                    {product.image2 && (
                      <img 
                        src={product.image2} 
                        alt={`${product.name} - View 2`} 
                        className="product-image-hover" 
                      />
                    )}
                  </div>

                  <div className="product-specs">
                    {product.specs && (
                      <>
                        {product.specs.cpu && (
                          <div className="spec-item">
                            <span>💻 {product.specs.cpu}</span>
                          </div>
                        )}
                        {product.specs.ram && (
                          <div className="spec-item">
                            <span>🎮 {product.specs.ram}</span>
                          </div>
                        )}
                        {product.specs.storage && (
                          <div className="spec-item">
                            <span>💾 {product.specs.storage}</span>
                          </div>
                        )}
                        {product.specs.gpu && (
                          <div className="spec-item">
                            <span>🖥️ {product.specs.gpu}</span>
                          </div>
                        )}
                      </>
                    )}
                  </div>

                  <h3 className="product-name">{product.name}</h3>

                  <div className="product-pricing">
                    <div className="current-price">{formatPrice(product.price)}</div>
                    {product.originalPrice && product.originalPrice > product.price && (
                      <div className="original-price">{formatPrice(product.originalPrice)}</div>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </section>
  );
}

export default MiniPCShowcase;

