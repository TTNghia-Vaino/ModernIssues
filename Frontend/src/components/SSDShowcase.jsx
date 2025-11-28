import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import * as productService from '../services/productService';
import { transformProducts } from '../utils/productUtils';
import { handleProductImageError, getPlaceholderImage } from '../utils/imageUtils';
import './SSDShowcase.css';

function SSDShowcase() {
  const navigate = useNavigate();
  const { isInTokenGracePeriod } = useAuth();
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);

  const categories = [
    { id: 'top-ssd', name: 'Top SSD' },
    { id: 'ssd-120gb-128gb', name: 'SSD 120GB - 128GB' },
    { id: 'ssd-240gb-256gb', name: 'SSD 240GB - 256GB' },
    { id: 'ssd-480gb-512gb', name: 'SSD 480GB - 512GB' },
    { id: 'ssd-960gb-1tb', name: 'SSD 960GB - 1TB' },
    { id: 'ssd-2tb', name: 'SSD 2TB' },
    { id: 'ssd-4tb-8tb', name: 'SSD 4TB - 8TB' }
  ];

  useEffect(() => {
    let cancelled = false;
    
    const attemptLoad = async () => {
      // If in grace period, wait for it to end
      if (isInTokenGracePeriod) {
        console.log('[SSDShowcase] Waiting for token grace period to end before loading products');
        await new Promise(resolve => setTimeout(resolve, 6000));
        if (cancelled) return;
      }
      
      if (!cancelled) {
        fetchSSDProducts();
      }
    };
    
    attemptLoad();
    
    return () => {
      cancelled = true;
    };
  }, []); // Only run on mount

  const fetchSSDProducts = async () => {
    try {
      setLoading(true);
      // Try API first
      try {
        console.log('[SSDShowcase] Fetching products from API...');
        const productsData = await productService.listProducts({ 
          page: 1, 
          limit: 10,
          // Note: categoryId should be numeric, using search as fallback
          search: 'SSD'
        });
        
        console.log('[SSDShowcase] Raw API response:', productsData);
        
        // Handle Swagger response format: { totalCount, currentPage, limit, data: [...] }
        let productsArray = [];
        if (productsData && typeof productsData === 'object') {
          if (Array.isArray(productsData.data)) {
            productsArray = productsData.data;
            console.log('[SSDShowcase] Found products in productsData.data:', productsArray.length);
          } else if (Array.isArray(productsData)) {
            productsArray = productsData;
            console.log('[SSDShowcase] productsData is array:', productsArray.length);
          } else if (productsData.items) {
            productsArray = productsData.items;
            console.log('[SSDShowcase] Found products in productsData.items:', productsArray.length);
          } else {
            console.warn('[SSDShowcase] Unknown response format:', Object.keys(productsData));
          }
        } else if (Array.isArray(productsData)) {
          productsArray = productsData;
          console.log('[SSDShowcase] productsData is direct array:', productsArray.length);
        } else {
          console.warn('[SSDShowcase] Unexpected response type:', typeof productsData);
        }
        
        console.log('[SSDShowcase] Products array length:', productsArray.length);
        
        // Transform API format to component format
        const transformedProducts = transformProducts(productsArray);
        console.log('[SSDShowcase] Transformed products:', transformedProducts.length);
        
        const ssdProducts = transformedProducts.filter(
          product => {
            // Filter out disabled products
            const isNotDisabled = product.isDisabled !== true && product.isDisabled !== 'true';
            if (!isNotDisabled) return false;
            
            // Check status (active or undefined)
            const isActive = product.status === 'active' || product.status === undefined;
            if (!isActive) return false;
            
            // Check category or name contains 'ssd'
            return product.category?.toLowerCase().includes('ssd') ||
                   product.name?.toLowerCase().includes('ssd');
          }
        );
        console.log('[SSDShowcase] Filtered SSD products:', ssdProducts.length);
        setProducts(ssdProducts.slice(0, 10)); // Lấy 10 sản phẩm đầu tiên
      } catch (apiError) {
        console.error('[SSDShowcase] API failed:', apiError);
        console.error('[SSDShowcase] Error details:', {
          message: apiError.message,
          status: apiError.status,
          data: apiError.data
        });
        // Fallback to localStorage
        const savedProducts = localStorage.getItem('adminProducts');
        if (savedProducts) {
          console.log('[SSDShowcase] Using localStorage fallback');
          const allProducts = JSON.parse(savedProducts);
          const ssdProducts = allProducts.filter(
            product => {
              const isNotDisabled = product.isDisabled !== true && product.isDisabled !== 'true';
              return product.category === 'SSD' && 
                     product.status === 'active' && 
                     isNotDisabled;
            }
          );
          setProducts(ssdProducts.slice(0, 10));
        } else {
          console.warn('[SSDShowcase] No localStorage data available');
        }
      }
    } catch (error) {
      console.error('[SSDShowcase] Unexpected error:', error);
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
    navigate(`/products?category=SSD&subcategory=${categoryId}`);
  };

  const handleViewAll = () => {
    navigate('/products?category=SSD');
  };

  const formatPrice = (price) => {
    return new Intl.NumberFormat('vi-VN', {
      style: 'currency',
      currency: 'VND'
    }).format(price);
  };

  const calculateDiscount = (originalPrice, salePrice) => {
    return Math.round(((originalPrice - salePrice) / originalPrice) * 100);
  };

  if (loading) {
    return <div className="ssd-showcase loading">Đang tải...</div>;
  }

  return (
    <section className="ssd-showcase">
      <div className="container">
        {/* Banner */}
        <div className="ssd-banner">
          <div className="ssd-banner-content">
            <div className="ssd-banner-left">
              <div className="ssd-images">
                <div className="ssd-image-wrapper">
                  <div className="ssd-placeholder">Samsung</div>
                </div>
                <div className="ssd-image-wrapper">
                  <div className="ssd-placeholder">WD Green</div>
                </div>
                <div className="ssd-image-wrapper">
                  <div className="ssd-placeholder">Lexar</div>
                </div>
              </div>
            </div>
            <div className="ssd-banner-right">
              <h2 className="ssd-banner-title">
                <span className="title-icon">💾</span>
                Ổ CỨNG SSD GẮN TRONG
              </h2>
              <div className="ssd-banner-features">
                <div className="feature-item">
                  <span className="feature-icon">🔗</span>
                  <span>Đa dạng kết nối</span>
                </div>
                <div className="feature-item">
                  <span className="feature-icon">🚀</span>
                  <span>Tốc độ cao</span>
                </div>
              </div>
              <div className="ssd-banner-features">
                <div className="feature-item">
                  <span className="feature-icon">🛡️</span>
                  <span>Bảo hành chính hãng 3 - 5 năm</span>
                </div>
              </div>
            </div>
          </div>
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
            Xem tất cả →
          </button>
        </div>

        {/* Products Grid */}
        <div className="products-grid">
          {products.length === 0 ? (
            <div className="no-products">
              <p>Chưa có sản phẩm SSD nào. Vui lòng thêm sản phẩm trong trang Admin.</p>
            </div>
          ) : (
            products.map(product => {
              const discount = product.originalPrice && product.originalPrice > product.price
                ? calculateDiscount(product.originalPrice, product.price)
                : product.discount || 0;

              return (
                <div
                  key={product.id}
                  className="product-card"
                  onClick={() => handleProductClick(product.id)}
                >
                  {discount > 0 && (
                    <div className="discount-badge">-{discount}%</div>
                  )}
                  
                  {product.badge && (
                    <div className="product-badge">{product.badge}</div>
                  )}

                  <div className="product-image">
                    <img 
                      src={product.image || getPlaceholderImage('product')} 
                      alt={product.name}
                      onError={handleProductImageError}
                    />
                  </div>

                  <h3 className="product-name">{product.name}</h3>

                  <div className="product-specs">
                    {product.specs && (
                      <>
                        {product.specs.capacity && (
                          <div className="spec-item">
                            <span>💾 {product.specs.capacity}</span>
                          </div>
                        )}
                        {product.specs.interface && (
                          <div className="spec-item">
                            <span>🔗 {product.specs.interface}</span>
                          </div>
                        )}
                        {product.specs.speed && (
                          <div className="spec-item">
                            <span>⚡ {product.specs.speed}</span>
                          </div>
                        )}
                        {product.specs.warranty && (
                          <div className="spec-item">
                            <span>🛡️ {product.specs.warranty}</span>
                          </div>
                        )}
                      </>
                    )}
                  </div>

                  <div className="product-pricing">
                    <div className="current-price">{formatPrice(product.price)}</div>
                    {product.originalPrice && product.originalPrice > product.price && (
                      <div className="original-price">{formatPrice(product.originalPrice)}</div>
                    )}
                  </div>

                  <div className="product-rating">
                    <div className="stars">
                      {'⭐'.repeat(5)}
                    </div>
                    <span className="review-count">({product.reviews || 0} đánh giá)</span>
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

export default SSDShowcase;

