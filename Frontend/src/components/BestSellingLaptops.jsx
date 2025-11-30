import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import * as productService from '../services/productService';
import * as promotionService from '../services/promotionService';
import { transformProducts } from '../utils/productUtils';
import ProductCard from './ProductCard';
import './BestSellingLaptops.css';

function BestSellingLaptops() {
  const navigate = useNavigate();
  const { isInTokenGracePeriod } = useAuth();
  const [activeTab, setActiveTab] = useState('all');
  const [laptops, setLaptops] = useState([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [direction, setDirection] = useState('next');
  const [activePromotions, setActivePromotions] = useState([]);

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
        let productsData;
        try {
          productsData = await productService.listProducts({ 
            page: 1, 
            limit: 50,
            search: 'Laptop'
          });
        } catch (listError) {
          // If ListProducts fails, try getAllListProducts as fallback
          console.warn('[BestSellingLaptops] listProducts failed, trying getAllListProducts...', listError);
          productsData = await productService.getAllListProducts();
          // Filter to only active laptops
          if (productsData && Array.isArray(productsData)) {
            productsData = productsData.filter(p => {
              const category = (p.categoryName || p.category || '').toString().trim().toLowerCase();
              const isLaptop = category === 'laptop';
              const isActive = (p.status === 'active' || p.status === undefined) && 
                              (p.isDisabled !== true && p.isDisabled !== 'true');
              return isLaptop && isActive;
            });
          }
        }
        
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
        
        // Debug: Log raw API data for first product to check promotion fields
        if (productsArray.length > 0 && import.meta.env.DEV) {
          const firstRawProduct = productsArray[0];
          console.log('[BestSellingLaptops] First raw product from API:', {
            productId: firstRawProduct.productId || firstRawProduct.id,
            productName: firstRawProduct.productName || firstRawProduct.name,
            price: firstRawProduct.price,
            onPrice: firstRawProduct.onPrice,
            onPrices: firstRawProduct.onPrices,
            discount: firstRawProduct.discount,
            promotionPrice: firstRawProduct.promotionPrice,
            salePrice: firstRawProduct.salePrice
          });
        }
        
        // Transform API format to component format
        const transformedProducts = transformProducts(productsArray);
        console.log('[BestSellingLaptops] Transformed products:', transformedProducts.length);
        
        // Debug: Log transformed product to check promotion data
        if (transformedProducts.length > 0 && import.meta.env.DEV) {
          transformedProducts.forEach((product, index) => {
            if (product.originalPrice || product.onPrice || product.discount > 0) {
              console.log(`[BestSellingLaptops] Product ${index + 1} with promotion:`, {
                name: product.name,
                price: product.price,
                originalPrice: product.originalPrice,
                onPrice: product.onPrice,
                discount: product.discount,
                hasPromotion: product.originalPrice && product.originalPrice > product.price
              });
            }
          });
        }
        
        // Filter only laptops - must be exact category match, not just containing "laptop"
        const activeLaptops = transformedProducts.filter(product => {
          // Filter out disabled products
          const isNotDisabled = product.isDisabled !== true && product.isDisabled !== 'true';
          if (!isNotDisabled) return false;
          
          // Check status
          const isActive = product.status === 'active' || product.status === undefined;
          if (!isActive) return false;
          
          // Check category - must be exactly "Laptop" (case-insensitive)
          const category = product.category?.toString().trim();
          if (!category) return false;
          
          // Exact match for "Laptop" category (case-insensitive)
          const categoryLower = category.toLowerCase();
          const isLaptopCategory = categoryLower === 'laptop';
          
          return isLaptopCategory;
        });
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
            product => {
              const isNotDisabled = product.isDisabled !== true && product.isDisabled !== 'true';
              return product.category === 'Laptop' && 
                     product.status === 'active' && 
                     isNotDisabled;
            }
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

  const handleProductClick = (productId) => {
    // Scroll to top immediately before navigation
    window.scrollTo(0, 0);
    document.documentElement.scrollTop = 0;
    document.body.scrollTop = 0;
    // Then navigate
    navigate(`/products/${productId}`, { replace: false });
  };

  const handleViewAll = () => {
    // Scroll to top immediately before navigation
    window.scrollTo(0, 0);
    document.documentElement.scrollTop = 0;
    document.body.scrollTop = 0;
    // Then navigate
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
                      gridTemplateColumns: 'repeat(4, 1fr)',
                      gap: '16px'
                    }}>
                      {(() => {
                        // Show 4 products at a time
                        const itemsPerSlide = 4;
                        const visibleLaptops = [];
                        for (let i = 0; i < itemsPerSlide; i++) {
                          if (filteredLaptops.length > 0) {
                            visibleLaptops.push(filteredLaptops[(currentIndex + i) % filteredLaptops.length]);
                          }
                        }
                        return visibleLaptops.map((laptop, idx) => (
                          <ProductCard
                            key={`${currentIndex}-${idx}`}
                            product={laptop}
                            onClick={handleProductClick}
                            variant="laptop"
                            showAnimation={true}
                            animationDirection={direction}
                            animationDelay={idx * 0.05}
                            className="laptop-card"
                          />
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
                  {filteredLaptops.length > 4 && (
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

