import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import './ProductDetail.css';

function ProductDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [product, setProduct] = useState(null);
  const [selectedImage, setSelectedImage] = useState(0);
  const [quantity, setQuantity] = useState(1);
  const [selectedCapacity, setSelectedCapacity] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchProductDetail();
  }, [id]);

  const fetchProductDetail = () => {
    try {
      const savedProducts = localStorage.getItem('adminProducts');
      if (savedProducts) {
        const allProducts = JSON.parse(savedProducts);
        const foundProduct = allProducts.find(p => p.id === id);
        
        if (foundProduct) {
          setProduct(foundProduct);
          // Nếu có variants (dung lượng), chọn variant đầu tiên
          if (foundProduct.variants && foundProduct.variants.length > 0) {
            setSelectedCapacity(foundProduct.variants[0]);
          }
        } else {
          console.error('Product not found');
        }
      }
      setLoading(false);
    } catch (error) {
      console.error('Error fetching product:', error);
      setLoading(false);
    }
  };

  const formatPrice = (price) => {
    return new Intl.NumberFormat('vi-VN', {
      style: 'currency',
      currency: 'VND'
    }).format(price);
  };

  const handleQuantityChange = (type) => {
    if (type === 'increase') {
      setQuantity(prev => prev + 1);
    } else if (type === 'decrease' && quantity > 1) {
      setQuantity(prev => prev - 1);
    }
  };

  const handleAddToCart = () => {
    const cart = JSON.parse(localStorage.getItem('cart') || '[]');
    const cartItem = {
      id: product.id,
      name: product.name,
      price: selectedCapacity ? selectedCapacity.price : product.price,
      image: product.image,
      quantity: quantity,
      capacity: selectedCapacity ? selectedCapacity.capacity : null
    };
    
    // Kiểm tra sản phẩm đã có trong giỏ hàng chưa
    const existingIndex = cart.findIndex(item => 
      item.id === cartItem.id && item.capacity === cartItem.capacity
    );
    
    if (existingIndex > -1) {
      cart[existingIndex].quantity += quantity;
    } else {
      cart.push(cartItem);
    }
    
    localStorage.setItem('cart', JSON.stringify(cart));
    alert('Đã thêm vào giỏ hàng!');
  };

  const handleBuyNow = () => {
    handleAddToCart();
    navigate('/cart');
  };

  if (loading) {
    return <div className="product-detail-loading">Đang tải...</div>;
  }

  if (!product) {
    return (
      <div className="product-not-found">
        <h2>Không tìm thấy sản phẩm</h2>
        <button onClick={() => navigate('/')}>Về trang chủ</button>
      </div>
    );
  }

  const currentPrice = selectedCapacity ? selectedCapacity.price : product.price;
  const originalPrice = selectedCapacity ? selectedCapacity.originalPrice : product.originalPrice;
  const discount = product.discount || 0;

  // Tạo mảng hình ảnh (có thể mở rộng sau)
  const productImages = [product.image];

  return (
    <div className="product-detail-page">
      {/* Breadcrumb */}
      <div className="breadcrumb">
        <div className="container">
          <Link to="/">Trang chủ</Link>
          <span>/</span>
          <Link to="/products">Sản phẩm</Link>
          <span>/</span>
          <span>{product.category}</span>
        </div>
      </div>

      <div className="container">
        <div className="product-detail-container">
          {/* Left: Product Images */}
          <div className="product-images-section">
            <div className="main-image">
              <img 
                src={productImages[selectedImage] || 'https://via.placeholder.com/500'} 
                alt={product.name} 
              />
              {discount > 0 && (
                <div className="discount-badge">-{discount}%</div>
              )}
            </div>
            
            {productImages.length > 1 && (
              <div className="thumbnail-images">
                {productImages.map((img, index) => (
                  <div
                    key={index}
                    className={`thumbnail ${selectedImage === index ? 'active' : ''}`}
                    onClick={() => setSelectedImage(index)}
                  >
                    <img src={img} alt={`${product.name} ${index + 1}`} />
                  </div>
                ))}
              </div>
            )}

            {/* Product Features */}
            <div className="product-features">
              <div className="feature-item">
                <span className="icon">✅</span>
                <div>
                  <strong>Dung lượng ổ cứng:</strong> {product.specs?.storage || 'N/A'}
                </div>
              </div>
              <div className="feature-item">
                <span className="icon">✅</span>
                <div>
                  <strong>Form Factor:</strong> {product.specs?.formFactor || 'M.2 2280'}
                </div>
              </div>
              <div className="feature-item">
                <span className="icon">✅</span>
                <div>
                  <strong>Chuẩn kết nối:</strong> {product.specs?.interface || 'PCIe Gen 4.0 x4 NVMe'}
                </div>
              </div>
              <div className="feature-item">
                <span className="icon">✅</span>
                <div>
                  <strong>Tốc độ đọc:</strong> {product.specs?.readSpeed || '5000 MB/s'}
                </div>
              </div>
              <div className="feature-item">
                <span className="icon">✅</span>
                <div>
                  <strong>Tốc độ ghi:</strong> {product.specs?.writeSpeed || '3000 MB/s'}
                </div>
              </div>
              <div className="feature-item">
                <span className="icon">✅</span>
                <div>
                  <strong>Bảo hành:</strong> 60 tháng hoặc trong giới hạn TBW
                </div>
              </div>
            </div>
          </div>

          {/* Right: Product Info */}
          <div className="product-info-section">
            <h1 className="product-title">{product.name}</h1>
            
            <div className="product-meta">
              <div className="meta-item">
                <span className="label">Thương hiệu:</span>
                <Link to={`/products?brand=${product.brand || 'Kingston'}`} className="brand-link">
                  {product.brand || 'Kingston'}
                </Link>
              </div>
              <div className="meta-item">
                <span className="label">SKU:</span>
                <span className="sku">{product.sku || product.id}</span>
              </div>
              <div className="meta-item">
                <span className={`stock-status ${product.stock > 0 ? 'in-stock' : 'out-of-stock'}`}>
                  {product.stock > 0 ? '🎯 Sẵn sàng' : '❌ Hết hàng'}
                </span>
              </div>
            </div>

            {/* Price */}
            <div className="product-pricing">
              <div className="current-price">{formatPrice(currentPrice)}</div>
              {originalPrice && originalPrice > currentPrice && (
                <>
                  <div className="original-price">{formatPrice(originalPrice)}</div>
                  <div className="discount-percent">-{discount}%</div>
                </>
              )}
            </div>

            {/* Gift/Promotion Box */}
            <div className="promotion-box">
              <div className="promo-item">
                <span className="gift-icon">🎁</span>
                <strong>Quà tặng:</strong> Ốc lắp đặt SSD M.2 và SSD mSATA 🔧
              </div>
              <div className="promo-item">
                <span className="gift-icon">🎁</span>
                <strong>Hỗ trợ lắp đặt SSD</strong> và Copy hệ điều hành sang ổ cứng mới tại cửa hàng (Miễn phí). 
                <a href="#" className="promo-link"> (Click here)</a>
              </div>
            </div>

            {/* Payment Methods */}
            <div className="payment-methods">
              <div className="payment-title">💳 Ưu đãi thanh toán:</div>
              <div className="payment-info">
                <img src="https://upload.wikimedia.org/wikipedia/commons/0/04/Visa.svg" alt="Visa" className="payment-logo" />
                <img src="https://upload.wikimedia.org/wikipedia/commons/2/2a/Mastercard-logo.svg" alt="Mastercard" className="payment-logo" />
                <span>Miễn phí khi thanh toán thẻ <strong>Visa, MasterCard</strong>.</span>
              </div>
            </div>

            {/* Shipping Info */}
            <div className="shipping-info">
              <div className="shipping-badge">
                <span className="truck-icon">🚚</span>
                <div>
                  <div>Nhập mã <strong className="freeship-code">FREESHIPST</strong> miễn phí</div>
                  <div><strong className="express-delivery">Giao hàng Siêu Tốc (2 - 4H)</strong> áp dụng trong nội thành</div>
                  <div><strong>HCM & Hà Nội</strong> cho đơn hàng tối thiểu <strong className="min-order">300.000đ</strong></div>
                </div>
              </div>
              <img src="https://via.placeholder.com/600x100?text=Free+Ship+Banner" alt="Free Ship" className="shipping-banner" />
            </div>

            {/* Product Line (Variants) */}
            {product.variants && product.variants.length > 0 && (
              <div className="product-variants">
                <div className="variants-title">Dòng sản phẩm:</div>
                <div className="variants-options">
                  {product.variants.map((variant, index) => (
                    <button
                      key={index}
                      className={`variant-btn ${selectedCapacity?.capacity === variant.capacity ? 'active' : ''}`}
                      onClick={() => setSelectedCapacity(variant)}
                    >
                      <div className="variant-capacity">{variant.capacity}</div>
                      <div className="variant-price">{formatPrice(variant.price)}</div>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Capacity Options (Alternative) */}
            <div className="capacity-options">
              <div className="capacity-title">Dung Lượng:</div>
              <div className="capacity-buttons">
                <button className="capacity-btn active">
                  <div className="capacity-size">500GB</div>
                  <div className="capacity-price">{formatPrice(currentPrice)}</div>
                </button>
                {originalPrice && (
                  <>
                    <button className="capacity-btn">
                      <div className="capacity-size">1TB</div>
                      <div className="capacity-price">{formatPrice(originalPrice * 1.5)}</div>
                    </button>
                    <button className="capacity-btn">
                      <div className="capacity-size">2TB</div>
                      <div className="capacity-price">{formatPrice(originalPrice * 2.8)}</div>
                    </button>
                  </>
                )}
              </div>
            </div>

            {/* Quantity Selector */}
            <div className="quantity-selector">
              <div className="quantity-title">Số lượng:</div>
              <div className="quantity-controls">
                <button 
                  className="qty-btn minus" 
                  onClick={() => handleQuantityChange('decrease')}
                  disabled={quantity <= 1}
                >
                  −
                </button>
                <input 
                  type="number" 
                  className="qty-input" 
                  value={quantity}
                  onChange={(e) => setQuantity(Math.max(1, parseInt(e.target.value) || 1))}
                  min="1"
                />
                <button 
                  className="qty-btn plus" 
                  onClick={() => handleQuantityChange('increase')}
                >
                  +
                </button>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="action-buttons">
              <button 
                className="btn-buy-now"
                onClick={handleBuyNow}
                disabled={product.stock <= 0}
              >
                <span>MUA NGAY</span>
                <small>Giao hàng nội hoặc nhận tại cửa hàng</small>
              </button>
              <button 
                className="btn-add-cart"
                onClick={handleAddToCart}
                disabled={product.stock <= 0}
              >
                🛒 THÊM VÀO GIỎ
              </button>
            </div>

            {/* Additional Services */}
            <div className="additional-services">
              <div className="service-item">
                <span className="service-icon">📞</span>
                <div>
                  <strong>Tư vấn miễn phí</strong>
                  <p>Gọi: 1900 xxxx (8:00 - 21:00)</p>
                </div>
              </div>
              <div className="service-item">
                <span className="service-icon">🏪</span>
                <div>
                  <strong>Mua tại cửa hàng</strong>
                  <p>Xem địa chỉ cửa hàng gần bạn</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Product Description */}
        <div className="product-description-section">
          <h2 className="section-title">Mô tả sản phẩm</h2>
          <div className="description-content">
            {product.description ? (
              <p>{product.description}</p>
            ) : (
              <p>Thông tin chi tiết về sản phẩm sẽ được cập nhật sớm.</p>
            )}
          </div>

          {/* Specifications Table */}
          {product.specs && (
            <div className="specifications-table">
              <h3>Thông số kỹ thuật</h3>
              <table>
                <tbody>
                  {product.specs.cpu && (
                    <tr>
                      <td className="spec-label">CPU</td>
                      <td className="spec-value">{product.specs.cpu}</td>
                    </tr>
                  )}
                  {product.specs.ram && (
                    <tr>
                      <td className="spec-label">RAM</td>
                      <td className="spec-value">{product.specs.ram}</td>
                    </tr>
                  )}
                  {product.specs.storage && (
                    <tr>
                      <td className="spec-label">Ổ cứng</td>
                      <td className="spec-value">{product.specs.storage}</td>
                    </tr>
                  )}
                  {product.specs.display && (
                    <tr>
                      <td className="spec-label">Màn hình</td>
                      <td className="spec-value">{product.specs.display}</td>
                    </tr>
                  )}
                  {product.specs.gpu && (
                    <tr>
                      <td className="spec-label">Card đồ họa</td>
                      <td className="spec-value">{product.specs.gpu}</td>
                    </tr>
                  )}
                  {product.specs.os && (
                    <tr>
                      <td className="spec-label">Hệ điều hành</td>
                      <td className="spec-value">{product.specs.os}</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default ProductDetail;


