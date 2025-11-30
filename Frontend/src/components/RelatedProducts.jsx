import React, { useState, useEffect } from 'react';
import * as productService from '../services/productService';
import { transformProduct } from '../utils/productUtils';
import ProductCard from './ProductCard';
import './RelatedProducts.css';

function RelatedProducts({ categoryId, currentProductId }) {
  const [relatedProducts, setRelatedProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [direction, setDirection] = useState('next');

  useEffect(() => {
    fetchRelatedProducts();
  }, [categoryId, currentProductId]);

  // Auto-rotate carousel every 5 seconds
  useEffect(() => {
    if (relatedProducts.length > 5) {
      const interval = setInterval(() => {
        setCurrentIndex(prev => (prev + 1) % relatedProducts.length);
      }, 5000);
      
      return () => clearInterval(interval);
    }
  }, [relatedProducts]);

  const handleNext = () => {
    setDirection('next');
    setCurrentIndex(prev => (prev + 1) % relatedProducts.length);
  };

  const handlePrev = () => {
    setDirection('prev');
    setCurrentIndex(prev => (prev - 1 + relatedProducts.length) % relatedProducts.length);
  };

  const fetchRelatedProducts = async () => {
    try {
      setLoading(true);
      setError(null);

      // Try to fetch from API first with category filter
      try {
        const response = await productService.listProducts({
          categoryId: categoryId,
          limit: 10,
          page: 1
        });

        console.log('[RelatedProducts] API Response:', response);

        // Extract products array from response
        let products = [];
        if (response && Array.isArray(response.data)) {
          products = response.data;
        } else if (response && Array.isArray(response)) {
          products = response;
        } else if (response?.data && Array.isArray(response.data.data)) {
          products = response.data.data;
        }

        // Filter out current product, disabled products, and transform
        const filtered = products
          .filter(p => {
            // Filter out disabled products
            const isNotDisabled = p.isDisabled !== true && p.isDisabled !== 'true' && 
                                  p.is_disabled !== true && p.is_disabled !== 'true';
            return isNotDisabled && p.id !== parseInt(currentProductId);
          })
          .slice(0, 10)
          .map(p => transformProduct(p))
          .filter(p => p.isDisabled !== true && p.isDisabled !== 'true'); // Double-check after transform

        console.log('[RelatedProducts] Filtered and transformed products:', filtered);

        if (filtered.length === 0) {
          // Fallback to localStorage if API doesn't return results
          const fallbackProducts = getRelatedProductsFromStorage();
          setRelatedProducts(fallbackProducts);
        } else {
          setRelatedProducts(filtered);
        }
      } catch (apiError) {
        console.warn('[RelatedProducts] API failed, trying localStorage:', apiError);
        
        // Fallback to localStorage
        const fallbackProducts = getRelatedProductsFromStorage();
        setRelatedProducts(fallbackProducts);
      }
    } catch (error) {
      console.error('[RelatedProducts] Error fetching related products:', error);
      setError('Không thể tải sản phẩm liên quan');
    } finally {
      setLoading(false);
    }
  };

  const getRelatedProductsFromStorage = () => {
    try {
      const savedProducts = localStorage.getItem('adminProducts');
      if (savedProducts) {
        const allProducts = JSON.parse(savedProducts);
        
        // Filter products by category, exclude disabled products and current product
        const related = allProducts
          .filter(p => {
            const isNotDisabled = p.isDisabled !== true && p.isDisabled !== 'true';
            const matchesCategory = p.category === categoryId || 
                                   p.categoryId === categoryId ||
                                   (categoryId && p.category?.toString().includes(categoryId?.toString()));
            return isNotDisabled && matchesCategory && p.id !== parseInt(currentProductId);
          })
          .slice(0, 10);

        // If not enough products found by category, just take 10 random excluding current and disabled
        if (related.length < 3) {
          return allProducts
            .filter(p => {
              const isNotDisabled = p.isDisabled !== true && p.isDisabled !== 'true';
              return isNotDisabled && p.id !== parseInt(currentProductId);
            })
            .slice(0, 10);
        }

        return related;
      }
      return [];
    } catch (error) {
      console.error('[RelatedProducts] Error reading from localStorage:', error);
      return [];
    }
  };

  const handleProductClick = (productId) => {
    // Scroll to top immediately before navigation
    window.scrollTo(0, 0);
    document.documentElement.scrollTop = 0;
    document.body.scrollTop = 0;
  };

  if (loading) {
    return (
      <div className="related-products-section">
        <div className="section-title">Sản phẩm cùng loại</div>
        <div className="related-products-loading">Đang tải...</div>
      </div>
    );
  }

  if (error || relatedProducts.length === 0) {
    return null; // Don't show the section if there are no related products
  }

  // Show only 5 visible products
  const itemsPerSlide = 5;
  const visibleProducts = [];
  for (let i = 0; i < itemsPerSlide; i++) {
    visibleProducts.push(relatedProducts[(currentIndex + i) % relatedProducts.length]);
  }

  return (
    <div className="related-products-section">
      <div className="section-title">Sản phẩm cùng loại</div>
      
      <div className="carousel-wrapper">
        <div className="carousel-container">
          {/* Previous Button */}
          <button 
            className="carousel-btn carousel-btn-prev"
            onClick={handlePrev}
            aria-label="Previous"
          >
            ❮
          </button>

          <div className="carousel-content">
            <div className="related-products-grid" style={{
              transform: `translateX(0)`,
              transition: 'transform 0.6s cubic-bezier(0.4, 0, 0.2, 1)',
              display: 'grid',
              gridTemplateColumns: 'repeat(5, 1fr)',
              gap: '16px'
            }}>
              {/* Show only visible products */}
              {visibleProducts.map((product, idx) => (
                <ProductCard
                  key={`product-${currentIndex}-${idx}`}
                  product={product}
                  onClick={handleProductClick}
                  variant="default"
                  showAnimation={true}
                  animationDirection={direction}
                  animationDelay={idx * 0.05}
                  className="related-product-card"
                />
              ))}
            </div>
          </div>

          {/* Next Button */}
          <button 
            className="carousel-btn carousel-btn-next"
            onClick={handleNext}
            aria-label="Next"
          >
            ❯
          </button>
        </div>

        {/* Carousel Controls Below */}
        <div className="carousel-controls">
          {/* Carousel Indicators */}
          {relatedProducts.length > 5 && (
            <div className="carousel-indicators">
              {relatedProducts.map((_, idx) => (
                <button
                  key={idx}
                  className={`indicator ${currentIndex % relatedProducts.length === idx ? 'active' : ''}`}
                  onClick={() => setCurrentIndex(idx)}
                  aria-label={`Slide ${idx + 1}`}
                />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default RelatedProducts;
