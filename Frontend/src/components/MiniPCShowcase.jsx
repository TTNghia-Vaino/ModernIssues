import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import './MiniPCShowcase.css';
import miniPCBanner from '../assets/mini-pc-banner.png';

function MiniPCShowcase() {
  const navigate = useNavigate();
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);

  const categories = [
    { id: 'van-phong-st', name: 'PC Văn Phòng ST' },
    { id: 'gaming-st', name: 'PC Gaming ST' },
    { id: 'do-hoa-render', name: 'PC Đồ Họa Render' },
    { id: 'itx-nho-gon', name: 'PC ITX / Nhỏ Gọn' },
    { id: 'pc-ai', name: 'PC AI' },
    { id: 'tu-build', name: 'PC Tự Build' }
  ];

  useEffect(() => {
    fetchMiniPCProducts();
  }, []);

  const fetchMiniPCProducts = () => {
    try {
      // Lấy sản phẩm từ localStorage (từ Admin Products)
      const savedProducts = localStorage.getItem('adminProducts');
      if (savedProducts) {
        const allProducts = JSON.parse(savedProducts);
        // Lọc sản phẩm theo category "Mini PC" và status "active"
        const miniPCProducts = allProducts.filter(
          product => product.category === 'Mini PC' && product.status === 'active'
        );
        setProducts(miniPCProducts.slice(0, 10)); // Lấy 10 sản phẩm đầu tiên
      }
      setLoading(false);
    } catch (error) {
      console.error('Error fetching Mini PC products:', error);
      setLoading(false);
    }
  };

  const handleProductClick = (productId) => {
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

  const calculateDiscount = (originalPrice, salePrice) => {
    if (!originalPrice || !salePrice || originalPrice <= salePrice) return 0;
    return Math.round(((originalPrice - salePrice) / originalPrice) * 100);
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
                    <img src={product.image || 'https://via.placeholder.com/200'} alt={product.name} />
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

