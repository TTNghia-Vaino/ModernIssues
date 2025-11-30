import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import * as productService from '../services/productService';
import { transformProducts } from '../utils/productUtils';
import ProductCard from './ProductCard';
import './BestSellingLaptops.css';

function LatestProducts() {
  const navigate = useNavigate();
  const { isInTokenGracePeriod } = useAuth();
  const [activeTab, setActiveTab] = useState('all');
  const [products, setProducts] = useState([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [direction, setDirection] = useState('next');
  const [allBrands, setAllBrands] = useState([]); // Brands từ API

  // Load brands from API on mount
  useEffect(() => {
    let cancelled = false;
    
    const loadBrands = async () => {
      try {
        console.log('[LatestProducts] Loading brands from API...');
        const brandsData = await productService.getBrands();
        console.log('[LatestProducts] Brands loaded:', brandsData);
        if (!cancelled) {
          setAllBrands(Array.isArray(brandsData) ? brandsData : []);
        }
      } catch (error) {
        console.error('[LatestProducts] Error loading brands:', error);
        if (!cancelled) {
          setAllBrands([]);
        }
      }
    };
    
    loadBrands();
    
    return () => {
      cancelled = true;
    };
  }, []); // Only run on mount

  // Load latest products from API, but delay if in grace period
  useEffect(() => {
    let cancelled = false;
    
    const attemptLoad = async () => {
      // If in grace period, wait for it to end
      if (isInTokenGracePeriod) {
        console.log('[LatestProducts] Waiting for token grace period to end before loading products');
        await new Promise(resolve => setTimeout(resolve, 6000));
        if (cancelled) return;
      }
      
      if (!cancelled) {
        loadLatestProducts();
      }
    };
    
    attemptLoad();
    
    return () => {
      cancelled = true;
    };
  }, []); // Only run on mount

  const loadLatestProducts = async () => {
    try {
      console.log('[LatestProducts] Fetching latest products from API...');
      
      // Call GetLatestProducts API
      const productsData = await productService.getLatestProducts();
      
      console.log('[LatestProducts] Raw API response:', productsData);
      
      // Handle response format
      let productsArray = [];
      if (Array.isArray(productsData)) {
        productsArray = productsData;
      } else if (productsData && typeof productsData === 'object' && Array.isArray(productsData.data)) {
        productsArray = productsData.data;
      }
      
      console.log('[LatestProducts] Products array length:', productsArray.length);
      
      // Debug: Log raw API data for first product to check price/onPrices fields
      if (productsArray.length > 0 && import.meta.env.DEV) {
        const firstRawProduct = productsArray[0];
        console.log('[LatestProducts] First raw product from API:', {
          productId: firstRawProduct.productId || firstRawProduct.id,
          productName: firstRawProduct.productName || firstRawProduct.name,
          price: firstRawProduct.price,
          onPrices: firstRawProduct.onPrices
        });
      }
      
      // Transform API format to component format
      const transformedProducts = transformProducts(productsArray);
      console.log('[LatestProducts] Transformed products:', transformedProducts.length);
      
      // Debug: Log transformed product to check promotion data
      if (transformedProducts.length > 0 && import.meta.env.DEV) {
        transformedProducts.forEach((product, index) => {
          if (product.originalPrice || product.onPrice || product.discount > 0) {
            console.log(`[LatestProducts] Product ${index + 1} with promotion:`, {
              name: product.name,
              price: product.price,
              originalPrice: product.originalPrice,
              onPrice: product.onPrice,
              onPrices: product.onPrices,
              discount: product.discount,
              hasPromotion: product.originalPrice && product.originalPrice > product.price
            });
          }
        });
      }
      
      // Filter out disabled products
      const activeProducts = transformedProducts.filter(
        product => product.isDisabled !== true && product.isDisabled !== 'true'
      );
      
      console.log('[LatestProducts] Active products:', activeProducts.length);
      setProducts(activeProducts);
    } catch (error) {
      console.error('[LatestProducts] Error loading latest products:', error);
      setProducts([]);
    }
  };

  // Extract brands from API that exist in current products (memoized)
  const brands = useMemo(() => {
    const productBrands = new Set(products.map(p => p.brand).filter(Boolean));
    // Filter allBrands to only include brands that exist in current products
    return allBrands.filter(brand => productBrands.has(brand));
  }, [products, allBrands]);

  // Filter products by active tab (memoized)
  const filteredProducts = useMemo(() => {
    return activeTab === 'all' 
      ? products 
      : products.filter(product => product.brand === activeTab);
  }, [activeTab, products]);

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
    navigate('/products');
  };

  const handleCarouselNext = () => {
    setDirection('next');
    setCurrentIndex(prev => (prev + 1) % filteredProducts.length);
  };

  const handleCarouselPrev = () => {
    setDirection('prev');
    setCurrentIndex(prev => (prev - 1 + filteredProducts.length) % filteredProducts.length);
  };

  return (
    <section className="best-selling-laptops">
      <div className="container">
        <div className="section-header">
          <h2 className="section-title">SẢN PHẨM MỚI NHẤT</h2>
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
          {filteredProducts.length > 0 ? (
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
                        const visibleProducts = [];
                        for (let i = 0; i < itemsPerSlide; i++) {
                          if (filteredProducts.length > 0) {
                            visibleProducts.push(filteredProducts[(currentIndex + i) % filteredProducts.length]);
                          }
                        }
                        return visibleProducts.map((product, idx) => (
                          <ProductCard
                            key={`${currentIndex}-${idx}`}
                            product={product}
                            onClick={handleProductClick}
                            variant="default"
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
                  {filteredProducts.length > 4 && (
                    <div className="carousel-indicators">
                      {filteredProducts.map((_, idx) => (
                        <button
                          key={idx}
                          className={`indicator ${currentIndex % filteredProducts.length === idx ? 'active' : ''}`}
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
              Chưa có sản phẩm mới nào.
            </div>
          )}
        </div>
      </div>
    </section>
  );
}

export default LatestProducts;

