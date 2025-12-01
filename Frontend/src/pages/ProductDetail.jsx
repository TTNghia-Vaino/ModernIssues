import React, { useState, useEffect, useMemo } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useCart } from '../context/CartContext';
import { useNotification } from '../context/NotificationContext';
import * as productService from '../services/productService';
import { transformProduct, resolveAllImageUrls } from '../utils/productUtils';
import { handleProductImageError, getPlaceholderImage } from '../utils/imageUtils';
import RelatedProducts from '../components/RelatedProducts';
import './ProductDetail.css';

function ProductDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { isInTokenGracePeriod, isAuthenticated } = useAuth();
  const { addItem } = useCart();
  const { success, error: showError } = useNotification();
  const [product, setProduct] = useState(null);
  const [selectedImage, setSelectedImage] = useState(0);
  const [quantity, setQuantity] = useState(1);
  const [selectedCapacity, setSelectedCapacity] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const placeholderImage = getPlaceholderImage('product');

  useEffect(() => {
    let cancelled = false;
    
    const attemptLoad = async () => {
      // Scroll to top immediately when product detail loads
      window.scrollTo(0, 0);
      document.documentElement.scrollTop = 0;
      document.body.scrollTop = 0;
      
      // If in grace period, wait for it to end
      if (isInTokenGracePeriod) {
        console.log('[ProductDetail] Waiting for token grace period to end before loading product');
        await new Promise(resolve => setTimeout(resolve, 6000));
        if (cancelled) return;
      }
      
      if (!cancelled) {
        fetchProductDetail();
      }
    };
    
    attemptLoad();
    
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]); // Run when id changes

  // Scroll to top after loading completes
  useEffect(() => {
    if (!loading) {
      // Use setTimeout to ensure DOM is fully rendered
      setTimeout(() => {
        window.scrollTo(0, 0);
        document.documentElement.scrollTop = 0;
        document.body.scrollTop = 0;
      }, 0);
    }
  }, [loading]);

  const fetchProductDetail = async () => {
    try {
      setLoading(true);
      setError(null);
      console.log('[ProductDetail] Fetching product with id:', id);
      
      // Try API first
      try {
        const productData = await productService.getProductById(id);
        console.log('[ProductDetail] Product from API:', productData);
        
        // Check if productData is valid
        if (!productData) {
          console.error('[ProductDetail] Product data is null or undefined');
          throw new Error('Sản phẩm không tồn tại');
        }
        
        // Handle Swagger response format: response.data contains product object
        const product = productData && typeof productData === 'object' ? productData : productData;
        console.log('[ProductDetail] Product before transform:', product);
        
        // Transform API format to component format
        const transformedProduct = transformProduct(product);
        console.log('[ProductDetail] Product after transform:', transformedProduct);
        
        // Validate transformed product
        if (!transformedProduct) {
          console.error('[ProductDetail] Transformed product is null or undefined');
          throw new Error('Không thể xử lý dữ liệu sản phẩm');
        }
        
        if (!transformedProduct.id && !transformedProduct.productId) {
          console.error('[ProductDetail] Product missing ID:', transformedProduct);
          throw new Error('Sản phẩm thiếu thông tin ID');
        }
        
        if (!transformedProduct.name && !transformedProduct.productName) {
          console.error('[ProductDetail] Product missing name:', transformedProduct);
          throw new Error('Sản phẩm thiếu tên');
        }
        
        setProduct(transformedProduct);
        
        // Nếu có variants (dung lượng), chọn variant đầu tiên
        if (transformedProduct.variants && transformedProduct.variants.length > 0) {
          setSelectedCapacity(transformedProduct.variants[0]);
        }
        
        // Lưu sản phẩm vào danh sách đã xem
        saveToRecentlyViewed(transformedProduct);
      } catch (apiError) {
        console.warn('[ProductDetail] API failed, trying localStorage:', apiError);
        // Fallback to localStorage
        const savedProducts = localStorage.getItem('adminProducts');
        if (savedProducts) {
          const allProducts = JSON.parse(savedProducts);
          const foundProduct = allProducts.find(p => p.id === parseInt(id));
          
          if (foundProduct) {
            console.log('[ProductDetail] Found product in localStorage:', foundProduct.name);
            setProduct(foundProduct);
            if (foundProduct.variants && foundProduct.variants.length > 0) {
              setSelectedCapacity(foundProduct.variants[0]);
            }
            saveToRecentlyViewed(foundProduct);
          } else {
            setError('Không tìm thấy sản phẩm');
          }
        } else {
          setError('Không tìm thấy sản phẩm');
        }
      }
    } catch (error) {
      console.error('Error fetching product:', error);
      setError(error.message || 'Có lỗi xảy ra khi tải sản phẩm');
    } finally {
      setLoading(false);
    }
  };

  const saveToRecentlyViewed = (viewedProduct) => {
    try {
      // Lấy danh sách sản phẩm đã xem
      const viewed = localStorage.getItem('recentlyViewedProducts');
      let viewedProducts = [];
      
      if (viewed) {
        try {
          viewedProducts = JSON.parse(viewed);
          // Làm sạch dữ liệu cũ: xóa các sản phẩm không hợp lệ
          viewedProducts = viewedProducts.filter(p => {
            const hasValidPrice = p.price || p.salePrice || p.originalPrice || p.onPrice;
            const hasRequiredFields = p.id && p.name && p.image;
            return hasRequiredFields && hasValidPrice;
          });
        } catch (error) {
          console.error('[ProductDetail] Error parsing old data, clearing localStorage:', error);
          // Nếu có lỗi parse dữ liệu cũ, xóa toàn bộ và bắt đầu lại
          localStorage.removeItem('recentlyViewedProducts');
          viewedProducts = [];
        }
      }
      
      // Loại bỏ sản phẩm nếu đã tồn tại (để cập nhật vị trí)
      viewedProducts = viewedProducts.filter(p => p.id !== viewedProduct.id);
      
      // Thêm sản phẩm vào đầu danh sách với đầy đủ thông tin
      // Xử lý giá: API có thể trả về onPrice thay vì originalPrice
      const onPrice = viewedProduct.onPrice || (Array.isArray(viewedProduct.onPrices) && viewedProduct.onPrices.length > 0 ? viewedProduct.onPrices[0] : null);
      const originalPriceValue = viewedProduct.originalPrice || onPrice || viewedProduct.price;
      const salePriceValue = viewedProduct.salePrice || viewedProduct.price;
      const priceValue = viewedProduct.price || salePriceValue || originalPriceValue;
      
      const productToSave = {
        id: viewedProduct.id,
        name: viewedProduct.name,
        image: viewedProduct.image,
        images: viewedProduct.images || [], // Tất cả hình ảnh
        salePrice: salePriceValue || null,
        originalPrice: originalPriceValue || null,
        price: priceValue || null,
        onPrice: onPrice || null, // Lưu thêm onPrice từ API
        rating: viewedProduct.rating || 0,
        reviewCount: viewedProduct.reviewCount || 0,
        isNew: viewedProduct.isNew || false,
        brand: viewedProduct.brand || '',
        category: viewedProduct.category || '',
        shortDescription: viewedProduct.shortDescription || '',
        stock: viewedProduct.stock || 0,
        inStock: viewedProduct.inStock !== false, // Default true
        variants: viewedProduct.variants || [] // Các biến thể (dung lượng, màu sắc...)
      };
      
      console.log('[ProductDetail] Saving product:', productToSave);
      viewedProducts.unshift(productToSave);
      
      // Giữ tối đa 10 sản phẩm
      if (viewedProducts.length > 10) {
        viewedProducts = viewedProducts.slice(0, 10);
      }
      
      console.log('[ProductDetail] Saving to localStorage:', viewedProducts);
      
      // Lưu lại vào localStorage
      localStorage.setItem('recentlyViewedProducts', JSON.stringify(viewedProducts));
      
      // Dispatch event để các component khác biết có cập nhật
      window.dispatchEvent(new Event('recentlyViewedUpdated'));
      console.log('[ProductDetail] Event dispatched');
    } catch (error) {
      console.error('Error saving to recently viewed:', error);
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

  const handleAddToCart = async () => {
    // Check authentication first
    if (!isAuthenticated) {
      navigate('/login', { 
        state: { 
          from: `/products/${id}`,
          action: 'addToCart',
          productId: id,
          message: 'Vui lòng đăng nhập để thêm sản phẩm vào giỏ hàng' 
        }
      });
      return;
    }

    const currentPrice = selectedCapacity ? selectedCapacity.price : product.price;
    const productToAdd = {
      id: product.id,
      productId: product.productId || product.id, // Ensure productId is available for API
      name: product.name,
      price: currentPrice,
      image: product.image,
      brand: product.brand,
      category: product.category,
      capacity: selectedCapacity ? selectedCapacity.capacity : null
    };
    
    try {
      await addItem(productToAdd, quantity);
      success('Đã thêm vào giỏ hàng!');
    } catch (error) {
      console.error('[ProductDetail] Error adding to cart:', error);
      showError('Không thể thêm sản phẩm vào giỏ hàng. Vui lòng thử lại.');
    }
  };

  const handleBuyNow = async () => {
    try {
      await handleAddToCart();
      
      // Scroll to top immediately before navigation
      window.scrollTo(0, 0);
      document.documentElement.scrollTop = 0;
      document.body.scrollTop = 0;
      
      // Navigate to cart
      navigate('/cart');
      
      // Additional scroll to top after navigation to ensure it works
      setTimeout(() => {
        window.scrollTo({
          top: 0,
          left: 0,
          behavior: 'instant'
        });
        document.documentElement.scrollTop = 0;
        document.body.scrollTop = 0;
      }, 50);
      
      // Final scroll after page is fully loaded
      setTimeout(() => {
        window.scrollTo({
          top: 0,
          left: 0,
          behavior: 'instant'
        });
      }, 200);
    } catch (error) {
      console.error('[ProductDetail] Error in handleBuyNow:', error);
    }
  };

  // Calculate derived values - must be before early returns
  const currentPrice = product ? (selectedCapacity ? selectedCapacity.price : product.price) : 0;
  const originalPrice = product ? (selectedCapacity ? selectedCapacity.originalPrice : product.originalPrice) : null;
  const discount = product?.discount || 0;

  // All hooks must be called before any conditional returns
  const productImages = useMemo(() => {
    if (!product) return [placeholderImage];
    
    // Use resolveAllImageUrls utility function to get all images
    const images = resolveAllImageUrls(product);
    
    return images.length > 0 ? images : [placeholderImage];
  }, [product, placeholderImage]);

  useEffect(() => {
    if (productImages.length > 0 && selectedImage >= productImages.length) {
      setSelectedImage(0);
    }
  }, [productImages.length, selectedImage]);

  if (loading) {
    return (
      <div className="product-detail-page">
        <div className="product-detail-loading">
          <div>Đang tải thông tin sản phẩm...</div>
        </div>
      </div>
    );
  }

  if (error || !product) {
    return (
      <div className="product-detail-page">
        <div className="product-not-found">
          <h2>{error || 'Không tìm thấy sản phẩm'}</h2>
          <p>Vui lòng thử lại sau hoặc quay về trang chủ.</p>
          <button onClick={() => navigate('/')}>Về trang chủ</button>
          <button onClick={() => navigate('/products')} style={{ marginLeft: '10px' }}>Xem tất cả sản phẩm</button>
        </div>
      </div>
    );
  }

  const handleImageError = handleProductImageError;

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
              {productImages.length > 1 && (
                <>
                  <button 
                    className="image-nav-btn image-nav-prev"
                    onClick={() => setSelectedImage((prev) => (prev - 1 + productImages.length) % productImages.length)}
                    aria-label="Ảnh trước"
                  >
                    ❮
                  </button>
                  <button 
                    className="image-nav-btn image-nav-next"
                    onClick={() => setSelectedImage((prev) => (prev + 1) % productImages.length)}
                    aria-label="Ảnh sau"
                  >
                    ❯
                  </button>
                </>
              )}
              <img 
                src={productImages[selectedImage]} 
                alt={product.name} 
                onError={handleImageError}
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
                    <img src={img} alt={`${product.name} ${index + 1}`} onError={handleImageError} />
                  </div>
                ))}
              </div>
            )}

            {/* Product Description - Below Images */}
            {product.description && (
              <div className="product-description-below-image">
                <h3 className="description-title">Mô tả sản phẩm</h3>
                <div className="description-content">
                  <p>{product.description}</p>
                </div>
              </div>
            )}
          </div>

          {/* Right: Product Info */}
          <div className="product-info-section">
            <h1 className="product-title">{product.name}</h1>
            
            <div className="product-meta">
              {product.brand && (
                <div className="meta-item">
                  <span className="label">Thương hiệu:</span>
                  <Link to={`/products?brand=${encodeURIComponent(product.brand)}`} className="brand-link">
                    {product.brand}
                  </Link>
                </div>
              )}
              <div className="meta-item">
                <span className="label">SKU:</span>
                <span className="sku">{product.sku || product.id}</span>
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
                <i className="fas fa-cart-plus"></i> THÊM VÀO GIỎ
              </button>
            </div>

          </div>
        </div>

        {/* Specifications Section - Between product detail and related products */}
        {product.specifications && product.specifications.trim() && (
          <div className="product-details-section">
            <h3 className="specifications-title">THÔNG SỐ KỸ THUẬT</h3>
            <div className="specifications-content">
              {product.specifications.split(';').map((spec, index) => {
                const trimmedSpec = spec.trim();
                if (!trimmedSpec) return null;
                return (
                  <div key={index} className="spec-item">
                    <span className="spec-icon">✅</span>
                    <span className="spec-text">{trimmedSpec}</span>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Related Products */}
        <RelatedProducts categoryId={product.categoryId} currentProductId={product.id} />
      </div>
    </div>
  );
}

export default ProductDetail;


