import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import ProductCard from './ProductCard';
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
            
            // Prepare product data with calculated discount
            const productWithDiscount = {
              ...product,
              discount: discount > 0 ? discount : product.discount || 0,
              price: product.price || product.salePrice || product.originalPrice || product.onPrice || 0
            };
            
            return (
              <ProductCard
                key={product.id}
                product={productWithDiscount}
                onClick={handleProductClick}
                variant="default"
              />
            );
          })}
        </div>
      </div>
    </section>
  );
}

export default RecentlyViewed;

