import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { getPlaceholderImage } from '../utils/imageUtils';
import SafeImage from './SafeImage';
import './RecentlyViewed.css';

function RecentlyViewed() {
  const navigate = useNavigate();
  const [viewedProducts, setViewedProducts] = useState([]);

  useEffect(() => {
    // Lấy danh sách sản phẩm đã xem từ localStorage
    const getViewedProducts = () => {
      try {
        const viewed = localStorage.getItem('recentlyViewedProducts');
        console.log('[RecentlyViewed] Data from localStorage:', viewed);
        if (viewed) {
          const products = JSON.parse(viewed);
          console.log('[RecentlyViewed] Parsed products:', products);
          
          // Lọc và làm sạch dữ liệu: xóa các sản phẩm không hợp lệ hoặc thiếu giá
          const validProducts = products.filter(product => {
            // Kiểm tra nếu sản phẩm có giá hợp lệ (ít nhất một trong các trường giá phải có)
            const hasValidPrice = product.price || product.salePrice || product.originalPrice || product.onPrice;
            // Kiểm tra các trường bắt buộc
            const hasRequiredFields = product.id && product.name && product.image;
            return hasRequiredFields && hasValidPrice;
          });
          
          // Nếu số lượng sản phẩm hợp lệ khác với số lượng ban đầu, cập nhật localStorage
          if (validProducts.length !== products.length) {
            console.log('[RecentlyViewed] Cleaning invalid products. Old count:', products.length, 'New count:', validProducts.length);
            if (validProducts.length > 0) {
              localStorage.setItem('recentlyViewedProducts', JSON.stringify(validProducts));
            } else {
              // Nếu không còn sản phẩm hợp lệ nào, xóa toàn bộ
              localStorage.removeItem('recentlyViewedProducts');
            }
          }
          
          setViewedProducts(validProducts.slice(0, 5)); // Lấy tối đa 5 sản phẩm
        } else {
          console.log('[RecentlyViewed] No products found in localStorage');
        }
      } catch (error) {
        console.error('Error loading recently viewed products:', error);
        // Xóa dữ liệu cũ nếu có lỗi parse
        localStorage.removeItem('recentlyViewedProducts');
        setViewedProducts([]);
      }
    };

    getViewedProducts();

    // Lắng nghe sự kiện cập nhật sản phẩm đã xem
    const handleStorageChange = () => {
      getViewedProducts();
    };

    window.addEventListener('storage', handleStorageChange);
    window.addEventListener('recentlyViewedUpdated', handleStorageChange);

    return () => {
      window.removeEventListener('storage', handleStorageChange);
      window.removeEventListener('recentlyViewedUpdated', handleStorageChange);
    };
  }, []);

  const handleProductClick = (productId) => {
    // Scroll to top immediately before navigation
    window.scrollTo(0, 0);
    document.documentElement.scrollTop = 0;
    document.body.scrollTop = 0;
    // Then navigate
    navigate(`/products/${productId}`);
  };

  const formatPrice = (price) => {
    // Xử lý các trường hợp giá không hợp lệ
    // Kiểm tra nếu giá là null, undefined, chuỗi rỗng, hoặc không phải số hợp lệ
    if (price === undefined || price === null || price === '') {
      return 'Liên hệ';
    }
    
    // Chuyển đổi sang số
    const numPrice = Number(price);
    
    // Kiểm tra nếu không phải số hợp lệ (NaN) hoặc <= 0
    if (isNaN(numPrice) || numPrice <= 0) {
      return 'Liên hệ';
    }
    
    // Format giá và loại bỏ phần thập phân .00
    return new Intl.NumberFormat('vi-VN', {
      style: 'currency',
      currency: 'VND',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(numPrice);
  };

  const calculateDiscount = (originalPrice, salePrice) => {
    if (!originalPrice || !salePrice || originalPrice <= salePrice) return 0;
    return Math.round(((originalPrice - salePrice) / originalPrice) * 100);
  };

  if (!viewedProducts || viewedProducts.length === 0) {
    return null; // Không hiển thị gì nếu chưa có sản phẩm đã xem
  }

  return (
    <section className="recently-viewed">
      <div className="container">
        <div className="section-header">
          <h2 className="section-title">SẢN PHẨM ĐÃ XEM</h2>
        </div>

        <div className="products-grid">
          {viewedProducts.map((product) => {
            const discount = calculateDiscount(product.originalPrice, product.salePrice);
            
            return (
              <div 
                key={product.id} 
                className="product-card"
                onClick={() => handleProductClick(product.id)}
              >
                {/* Discount Badge */}
                {discount > 0 && (
                  <div className="discount-badge">
                    -{discount}%
                  </div>
                )}

                {/* New Arrival Badge */}
                {product.isNew && (
                  <div className="new-badge">
                    <span className="new-label">NEW</span>
                    <span className="arrival-label">ARRIVAL</span>
                  </div>
                )}

                {/* Product Image */}
                <div className="product-image">
                  <SafeImage 
                    src={product.image} 
                    alt={product.name}
                    loading="lazy"
                  />
                </div>

                {/* Product Info */}
                <div className="product-info">
                  <h3 className="product-name">{product.name}</h3>
                  
                  <div className="price-container">
                    {(() => {
                      // Xác định giá hiện tại (giá đang bán)
                      const currentPrice = product.price || product.salePrice || product.originalPrice || product.onPrice;
                      
                      // Xác định giá gốc
                      let originalPrice = null;
                      if (product.originalPrice && product.originalPrice > currentPrice) {
                        originalPrice = product.originalPrice;
                      } else if (product.onPrice && product.onPrice > currentPrice) {
                        originalPrice = product.onPrice;
                      } else if (product.originalPrice && product.originalPrice > (product.price || product.salePrice)) {
                        originalPrice = product.originalPrice;
                      }
                      
                      return (
                        <>
                          <div className="current-price">
                            {formatPrice(currentPrice)}
                          </div>
                          {originalPrice && originalPrice > currentPrice && (
                            <div className="original-price">
                              {formatPrice(originalPrice)}
                            </div>
                          )}
                        </>
                      );
                    })()}
                  </div>

                  {/* Rating */}
                  {product.rating > 0 && product.reviewCount > 0 && (
                    <div className="rating">
                      <div className="stars">
                        {[...Array(5)].map((_, index) => (
                          <i 
                            key={index} 
                            className={`fas fa-star ${index < Math.floor(product.rating) ? 'filled' : ''}`}
                          ></i>
                        ))}
                      </div>
                      <span className="review-count">({product.reviewCount})</span>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}

export default RecentlyViewed;

