import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import './SSDShowcase.css';

function SSDShowcase() {
  const navigate = useNavigate();
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
    fetchSSDProducts();
  }, []);

  const fetchSSDProducts = () => {
    try {
      // Lấy sản phẩm từ localStorage (từ Admin Products)
      const savedProducts = localStorage.getItem('adminProducts');
      if (savedProducts) {
        const allProducts = JSON.parse(savedProducts);
        // Lọc sản phẩm theo category "SSD" và status "active"
        const ssdProducts = allProducts.filter(
          product => product.category === 'SSD' && product.status === 'active'
        );
        setProducts(ssdProducts.slice(0, 10)); // Lấy 10 sản phẩm đầu tiên
      }
      setLoading(false);
    } catch (error) {
      console.error('Error fetching SSD products:', error);
      setLoading(false);
    }
  };

  const handleProductClick = (productId) => {
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
                    <img src={product.image || 'https://via.placeholder.com/200'} alt={product.name} />
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

