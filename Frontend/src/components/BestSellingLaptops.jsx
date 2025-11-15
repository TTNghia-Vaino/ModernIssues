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
  const [currentIndex, setCurrentIndex] = useState(0);
  const [direction, setDirection] = useState('next');

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

  const handleCarouselNext = () => {
    setDirection('next');
    setCurrentIndex(prev => (prev + 1) % filteredLaptops.length);
  };

  const handleCarouselPrev = () => {
    setDirection('prev');
    setCurrentIndex(prev => (prev - 1 + filteredLaptops.length) % filteredLaptops.length);
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
            <>
              <div className="carousel-wrapper">
                <div className="carousel-container">
                  {/* Previous Button */}
                  <button 
                    className="carousel-btn carousel-btn-prev"
                    onClick={handleCarouselPrev}
                    aria-label="Previous"
                  >
                    ❮
                  </button>

                  <div className="carousel-content">
                    <div className="laptops-carousel-grid" style={{
                      display: 'grid',
                      gridTemplateColumns: 'repeat(5, 1fr)',
                      gap: '16px'
                    }}>
                      {(() => {
                        // Show 5 products at a time
                        const itemsPerSlide = 5;
                        const visibleLaptops = [];
                        for (let i = 0; i < itemsPerSlide; i++) {
                          if (filteredLaptops.length > 0) {
                            visibleLaptops.push(filteredLaptops[(currentIndex + i) % filteredLaptops.length]);
                          }
                        }
                        return visibleLaptops.map((laptop, idx) => (
                          <div 
                            key={`${currentIndex}-${idx}`}
                            className={`laptop-card slide-${direction}`}
                            onClick={() => handleProductClick(laptop.id)}
                            style={{
                              animation: `${direction === 'next' ? 'itemSlideInRight' : 'itemSlideInLeft'} 0.6s cubic-bezier(0.4, 0, 0.2, 1) forwards`,
                              animationDelay: `${idx * 0.05}s`
                            }}
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

                            <div className="laptop-info">
                              <h3 className="laptop-name">{laptop.name}</h3>

                              {laptop.brand && (
                                <div className="laptop-brand">
                                  <span className="brand-tag">{laptop.brand}</span>
                                </div>
                              )}

                              {renderSpecs(laptop.specs)}

                              <div className="laptop-price-section">
                                <div className="current-price">{formatPrice(laptop.price)}</div>
                                {(() => {
                                  let originalPrice = null;
                                  
                                  if (laptop.originalPrice && laptop.originalPrice > laptop.price) {
                                    originalPrice = laptop.originalPrice;
                                  } else if (laptop.discount && laptop.discount > 0) {
                                    originalPrice = Math.round(laptop.price / (1 - laptop.discount / 100));
                                  } else if (!laptop.discount && !laptop.originalPrice) {
                                    // Default: add 10% to current price
                                    originalPrice = Math.round(laptop.price * 1.1);
                                  }
                                  
                                  if (originalPrice && originalPrice > laptop.price) {
                                    return <div className="original-price">{formatPrice(originalPrice)}</div>;
                                  }
                                  return null;
                                })()}
                              </div>
                            </div>
                          </div>
                        ));
                      })()}
                    </div>
                  </div>

                  {/* Next Button */}
                  <button 
                    className="carousel-btn carousel-btn-next"
                    onClick={handleCarouselNext}
                    aria-label="Next"
                  >
                    ❯
                  </button>
                </div>

                {/* Carousel Controls Below */}
                <div className="carousel-controls">
                  {/* Carousel Indicators */}
                  {filteredLaptops.length > 5 && (
                    <div className="carousel-indicators">
                      {filteredLaptops.map((_, idx) => (
                        <button
                          key={idx}
                          className={`indicator ${currentIndex % filteredLaptops.length === idx ? 'active' : ''}`}
                          onClick={() => setCurrentIndex(idx)}
                          aria-label={`Slide ${idx + 1}`}
                        />
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </>
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

