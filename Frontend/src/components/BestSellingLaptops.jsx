import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import * as productService from '../services/productService';
import { transformProducts } from '../utils/productUtils';
import './BestSellingLaptops.css';

function BestSellingLaptops() {
  const navigate = useNavigate();
  const { isInTokenGracePeriod } = useAuth();
  const [activeTab, setActiveTab] = useState('all');
  const [laptops, setLaptops] = useState([]);

  // Load laptops from API, but delay if in grace period
  useEffect(() => {
    let cancelled = false;
    
    const attemptLoad = async () => {
      // If in grace period, wait for it to end
      if (isInTokenGracePeriod) {
        console.log('[BestSellingLaptops] Waiting for token grace period to end before loading laptops');
        await new Promise(resolve => setTimeout(resolve, 6000));
        if (cancelled) return;
      }
      
      if (!cancelled) {
        loadLaptops();
      }
    };
    
    attemptLoad();
    
    return () => {
      cancelled = true;
    };
  }, []); // Only run on mount

  const loadLaptops = async () => {
    try {
      // Try API first
      try {
        console.log('[BestSellingLaptops] Fetching products from API...');
        const productsData = await productService.listProducts({ 
          page: 1, 
          limit: 50,
          search: 'Laptop'
        });
        
        console.log('[BestSellingLaptops] Raw API response:', productsData);
        
        // Handle Swagger response format: { totalCount, currentPage, limit, data: [...] }
        let productsArray = [];
        if (productsData && typeof productsData === 'object') {
          if (Array.isArray(productsData.data)) {
            productsArray = productsData.data;
            console.log('[BestSellingLaptops] Found products in productsData.data:', productsArray.length);
          } else if (Array.isArray(productsData)) {
            productsArray = productsData;
            console.log('[BestSellingLaptops] productsData is array:', productsArray.length);
          } else if (productsData.items) {
            productsArray = productsData.items;
            console.log('[BestSellingLaptops] Found products in productsData.items:', productsArray.length);
          } else {
            console.warn('[BestSellingLaptops] Unknown response format:', Object.keys(productsData));
          }
        } else if (Array.isArray(productsData)) {
          productsArray = productsData;
          console.log('[BestSellingLaptops] productsData is direct array:', productsArray.length);
        } else {
          console.warn('[BestSellingLaptops] Unexpected response type:', typeof productsData);
        }
        
        console.log('[BestSellingLaptops] Products array length:', productsArray.length);
        
        // Transform API format to component format
        const transformedProducts = transformProducts(productsArray);
        console.log('[BestSellingLaptops] Transformed products:', transformedProducts.length);
        
        const activeLaptops = transformedProducts.filter(
          product => product.status === 'active' || product.status === undefined ||
                     product.category?.toLowerCase().includes('laptop') ||
                     product.name?.toLowerCase().includes('laptop')
        );
        console.log('[BestSellingLaptops] Filtered laptops:', activeLaptops.length);
        setLaptops(activeLaptops);
      } catch (apiError) {
        console.error('[BestSellingLaptops] API failed:', apiError);
        console.error('[BestSellingLaptops] Error details:', {
          message: apiError.message,
          status: apiError.status,
          data: apiError.data
        });
        // Fallback to localStorage
        const savedProducts = localStorage.getItem('adminProducts');
        if (savedProducts) {
          console.log('[BestSellingLaptops] Using localStorage fallback');
          const allProducts = JSON.parse(savedProducts);
          const activeLaptops = allProducts.filter(
            product => product.category === 'Laptop' && product.status === 'active'
          );
          setLaptops(activeLaptops);
        } else {
          console.warn('[BestSellingLaptops] No localStorage data available');
        }
      }
    } catch (error) {
      console.error('[BestSellingLaptops] Unexpected error:', error);
    }
  };

  // Extract unique brands (memoized)
  const brands = useMemo(() => {
    return [...new Set(laptops.map(p => p.brand).filter(Boolean))];
  }, [laptops]);

  // Filter laptops by active tab (memoized)
  const filteredLaptops = useMemo(() => {
    return activeTab === 'all' 
      ? laptops 
      : laptops.filter(laptop => laptop.brand === activeTab);
  }, [activeTab, laptops]);

  const formatPrice = (price) => {
    return new Intl.NumberFormat('vi-VN', {
      style: 'currency',
      currency: 'VND'
    }).format(price);
  };

  const handleProductClick = (productId) => {
    // Scroll to top immediately before navigation
    window.scrollTo(0, 0);
    document.documentElement.scrollTop = 0;
    document.body.scrollTop = 0;
    // Then navigate
    navigate(`/products/${productId}`, { replace: false });
  };

  const handleViewAll = () => {
    navigate('/products?category=Laptop');
  };

  // Render laptop specs
  const renderSpecs = (specs) => {
    if (!specs) return null;
    
    const specItems = [
      specs.cpu,
      specs.gpu,
      specs.ram,
      specs.storage,
      specs.display
    ].filter(Boolean);

    return (
      <div className="laptop-specs">
        {specItems.map((spec, index) => (
          <div key={index} className="spec-item">{spec}</div>
        ))}
      </div>
    );
  };

  // Render laptop badge
  const renderBadge = (laptop) => {
    if (!laptop.badge) return null;

    const BoltIcon = () => (
      <svg viewBox="0 0 24 24" fill="currentColor">
        <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z"/>
      </svg>
    );

    return (
      <>
        <div className="new-badge">
          <BoltIcon />
        </div>
        <div className="laptop-badge">
          <div className="badge-icon">
            <BoltIcon />
          </div>
          <div className="badge-text">
            <div className="badge-title">{laptop.badge}</div>
            {laptop.featured && <div className="badge-date">SẢN PHẨM NỔI BẬT</div>}
          </div>
        </div>
      </>
    );
  };

  return (
    <section className="best-selling-laptops">
      <div className="container">
        <div className="section-header">
          <h2 className="section-title">LAPTOP BÁN CHẠY</h2>
          <div className="brand-tabs">
            {brands.map((brand) => (
              <button
                key={brand}
                className={`brand-tab ${activeTab === brand ? 'active' : ''}`}
                onClick={() => setActiveTab(brand)}
              >
                {brand}
              </button>
            ))}
            <button 
              className="brand-tab view-all"
              onClick={handleViewAll}
            >
              Xem tất cả <span className="arrow">›</span>
            </button>
          </div>
        </div>

        <div className="laptops-grid">
          {filteredLaptops.length > 0 ? (
            filteredLaptops.map((laptop) => (
              <div 
                key={laptop.id} 
                className="laptop-card"
                onClick={() => handleProductClick(laptop.id)}
              >
                {laptop.discount > 0 && (
                  <div className="discount-badge">-{laptop.discount}%</div>
                )}
                
                {renderBadge(laptop)}
                
                <div className="laptop-image-wrapper">
                  <img 
                    src={laptop.image || 'https://via.placeholder.com/300x200?text=Laptop'} 
                    alt={laptop.name} 
                    className="laptop-image" 
                  />
                </div>

                {renderSpecs(laptop.specs)}

                <h3 className="laptop-name">{laptop.name}</h3>

                <div className="laptop-price-section">
                  <div className="current-price">{formatPrice(laptop.price)}</div>
                  {(() => {
                    // Nếu có originalPrice, dùng nó
                    if (laptop.originalPrice && laptop.originalPrice > laptop.price) {
                      return <div className="original-price">{formatPrice(laptop.originalPrice)}</div>;
                    }
                    // Nếu có discount nhưng không có originalPrice, tính ngược lại
                    if (laptop.discount && laptop.discount > 0) {
                      const calculatedOriginalPrice = Math.round(laptop.price / (1 - laptop.discount / 100));
                      return <div className="original-price">{formatPrice(calculatedOriginalPrice)}</div>;
                    }
                    // Nếu không có discount nhưng muốn hiển thị giá gốc mặc định (thêm 10%)
                    if (!laptop.discount && !laptop.originalPrice) {
                      const defaultOriginalPrice = Math.round(laptop.price * 1.1);
                      return <div className="original-price">{formatPrice(defaultOriginalPrice)}</div>;
                    }
                    return null;
                  })()}
                </div>
              </div>
            ))
          ) : (
            <div style={{ gridColumn: '1 / -1', textAlign: 'center', padding: '40px', color: '#6b7280' }}>
              Chưa có laptop nào. Vui lòng thêm sản phẩm từ trang Admin.
            </div>
          )}
        </div>
      </div>
    </section>
  );
}

export default BestSellingLaptops;

