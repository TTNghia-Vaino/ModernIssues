import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Card } from './ui/card';
import SafeImage from './SafeImage';
import { getPlaceholderImage } from '../utils/imageUtils';
import { cn } from '../lib/utils';

/**
 * Reusable Product Card Component
 * 
 * @param {Object} product - Product object with properties:
 *   - id: Product ID
 *   - name: Product name (or title)
 *   - image: Product image URL (or imageUrl)
 *   - price: Current price
 *   - originalPrice: Original price (if on sale)
 *   - discount: Discount percentage
 *   - brand: Brand name
 *   - specs: Product specs object {cpu, gpu, ram, storage, display}
 *   - badge: Badge text (e.g., "MỚI", "NỔI BẬT")
 *   - featured: Boolean indicating if product is featured
 * @param {Function} onClick - Optional click handler (defaults to navigate to /products/:id)
 * @param {String} className - Additional CSS classes
 * @param {Object} style - Additional inline styles
 * @param {String} variant - Card variant: 'default' | 'laptop' | 'compact'
 * @param {Boolean} showAnimation - Whether to show slide animation
 * @param {String} animationDirection - Animation direction: 'next' | 'prev'
 * @param {Number} animationDelay - Animation delay in seconds
 */
function ProductCard({
  product,
  onClick,
  className = '',
  style = {},
  variant = 'default',
  showAnimation = false,
  animationDirection = 'next',
  animationDelay = 0
}) {
  const navigate = useNavigate();
  const placeholderImage = getPlaceholderImage('product');

  if (!product) {
    return null;
  }

  const handleClick = () => {
    if (onClick) {
      onClick(product.id);
    } else {
      // Default behavior: scroll to top and navigate
      window.scrollTo(0, 0);
      document.documentElement.scrollTop = 0;
      document.body.scrollTop = 0;
      navigate(`/products/${product.id}`, { replace: false });
    }
  };

  const getProductImage = () => {
    if (!product) return placeholderImage;
    // Support both 'image' and 'imageUrl' props
    if (product.image && product.image.trim() !== '') {
      return product.image;
    }
    if (product.imageUrl && product.imageUrl.trim() !== '') {
      return product.imageUrl;
    }
    if (Array.isArray(product.images) && product.images.length > 0) {
      const firstImage = product.images.find(Boolean);
      if (typeof firstImage === 'string' && firstImage.trim()) {
        return firstImage;
      }
      if (firstImage && typeof firstImage === 'object') {
        const url = firstImage.url || firstImage.src || firstImage.path || firstImage.image;
        if (url && url.trim()) {
          return url;
        }
      }
    }
    return placeholderImage;
  };

  const formatPrice = (price) => {
    if (!price && price !== 0) return '';
    return new Intl.NumberFormat('vi-VN').format(price);
  };

  // Get product title/name
  const title = product.title || product.name || '';

  // Determine prices
  const getPrices = () => {
    // Support both 'price' prop and calculated price
    let currentPrice = product.price || product.salePrice || 0;
    let originalPrice = product.originalPrice || null;

    // If there's onPrice and it's less than price, onPrice is the sale price
    if (product.onPrice && product.price && product.onPrice < product.price) {
      currentPrice = product.onPrice;
      originalPrice = product.price;
    }
    // If originalPrice exists and is greater than currentPrice
    else if (originalPrice && originalPrice > currentPrice) {
      // currentPrice is already the sale price
    }
    // If no originalPrice but price > salePrice
    else if (!originalPrice && product.price && product.salePrice && product.price > product.salePrice) {
      currentPrice = product.salePrice;
      originalPrice = product.price;
    }

    return { currentPrice, originalPrice };
  };

  const { currentPrice, originalPrice } = getPrices();

  // Render specs (optional, for laptop cards)
  const renderSpecs = () => {
    if (!product.specs || variant !== 'laptop') return null;
    
    const specItems = [];
    
    // Standard laptop specs
    if (product.specs.cpu) specItems.push({ key: 'cpu', value: product.specs.cpu });
    if (product.specs.gpu) specItems.push({ key: 'gpu', value: product.specs.gpu });
    if (product.specs.ram) specItems.push({ key: 'ram', value: product.specs.ram });
    if (product.specs.storage) specItems.push({ key: 'storage', value: product.specs.storage });
    if (product.specs.display) specItems.push({ key: 'display', value: product.specs.display });

    if (specItems.length === 0) return null;

    return (
      <div className="flex flex-wrap gap-1.5 mt-2">
        {specItems.slice(0, 3).map((spec, index) => (
          <span key={index} className="text-xs bg-blue-50 text-gray-700 px-2 py-0.5 rounded font-semibold whitespace-nowrap">
            {spec.value}
          </span>
        ))}
      </div>
    );
  };

  // Render badge (optional)
  const renderBadge = () => {
    if (product.discount > 0) {
      return (
        <div className="absolute top-2 left-2 bg-gradient-to-br from-red-500 to-red-600 text-white px-2 py-1 rounded-md text-xs font-bold shadow-lg z-10">
          -{product.discount}%
        </div>
      );
    }
    return null;
  };

  const cardClasses = cn(
    'group hover:shadow-lg transition-shadow duration-300 bg-white border border-gray-200 overflow-hidden p-0 cursor-pointer',
    showAnimation && `slide-${animationDirection}`,
    className
  );

  const animationStyle = showAnimation ? {
    animation: `${animationDirection === 'next' ? 'itemSlideInRight' : 'itemSlideInLeft'} 0.6s cubic-bezier(0.4, 0, 0.2, 1) forwards`,
    animationDelay: `${animationDelay}s`
  } : {};

  return (
    <Card
      className={cn(cardClasses, "flex flex-col h-full")}
      onClick={handleClick}
      style={{ ...animationStyle, ...style }}
    >
      {/* Image Section */}
      <div className="aspect-square bg-gray-50 flex items-center justify-center relative overflow-hidden flex-shrink-0">
        {renderBadge()}
        
        <SafeImage
          src={getProductImage()}
          alt={title}
          className={cn(
            "w-full h-full transition-opacity duration-300",
            product.image2 ? "object-contain opacity-100 group-hover:opacity-0" : "object-contain"
          )}
          loading="lazy"
        />
        
        {/* Hover image support */}
        {product.image2 && (
          <SafeImage
            src={product.image2}
            alt={`${title} - View 2`}
            className="absolute inset-0 w-full h-full object-contain opacity-0 transition-opacity duration-300 group-hover:opacity-100"
            loading="lazy"
          />
        )}
      </div>

      {/* Content Section - Fixed height container */}
      <div className="p-4 flex flex-col flex-grow min-h-0">
        {/* Title */}
        <h3 className="text-base font-medium text-gray-900 mb-3 line-clamp-2 min-h-[3rem] flex-shrink-0">
          {title}
        </h3>

        {/* Brand (optional) */}
        {product.brand && variant === 'laptop' && (
          <div className="mb-2 flex-shrink-0">
            <span className="text-xs bg-blue-50 text-green-600 px-2 py-1 rounded font-semibold">
              {product.brand}
            </span>
          </div>
        )}

        {/* Specs (for laptop variant) */}
        <div className="flex-shrink-0">
          {renderSpecs()}
        </div>

        {/* Spacer to push price to bottom */}
        <div className="flex-grow"></div>

        {/* Price Section - Fixed at bottom */}
        <div className="space-y-1 mt-auto flex-shrink-0">
          <p className="text-2xl font-bold text-green-600">
            {formatPrice(currentPrice)} ₫
          </p>
          {/* Always reserve space for original price to prevent card height change */}
          <p className={cn(
            "text-sm line-through",
            originalPrice && originalPrice > currentPrice 
              ? "text-gray-400" 
              : "text-transparent h-[1.25rem]"
          )}>
            {originalPrice && originalPrice > currentPrice 
              ? `${formatPrice(originalPrice)} ₫` 
              : '\u00A0'}
          </p>
        </div>

        {/* Rating (optional) */}
        {product.rating > 0 && product.reviewCount > 0 && (
          <div className="flex items-center gap-2 mt-2 flex-shrink-0">
            <div className="flex gap-0.5">
              {[...Array(5)].map((_, index) => (
                <span key={index} className={index < Math.floor(product.rating) ? 'text-yellow-400' : 'text-gray-300'}>
                  ⭐
                </span>
              ))}
            </div>
            <span className="text-xs text-gray-500">({product.reviewCount})</span>
          </div>
        )}
      </div>
    </Card>
  );
}

export default ProductCard;
