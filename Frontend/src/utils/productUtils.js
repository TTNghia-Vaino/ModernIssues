import { getBaseURL } from '../config/api';

/**
 * Utility functions for product data transformation
 * Converts API format to component format
 */

const FALLBACK_IMAGE_BASE_URL = 'http://35.232.61.38:5000';

const getCleanBaseUrl = () => {
  const baseUrl = getBaseURL() || FALLBACK_IMAGE_BASE_URL;
  return baseUrl.replace(/\/$/, '').replace(/\/v1$/i, '');
};

export const normalizeImageUrl = (url) => {
  if (typeof url !== 'string') {
    return undefined;
  }

  const trimmed = url.trim();
  if (!trimmed) {
    return undefined;
  }

  const absolutePrefixes = ['http://', 'https://', 'data:', 'blob:', '//'];
  if (absolutePrefixes.some(prefix => trimmed.toLowerCase().startsWith(prefix))) {
    return trimmed;
  }

  const cleanBaseUrl = getCleanBaseUrl();
  if (trimmed.startsWith('/')) {
    return `${cleanBaseUrl}${trimmed}`;
  }

  // Default upload location on backend
  return `${cleanBaseUrl}/Uploads/Images/${trimmed}`;
};

const normalizeImageCollection = (collection) => {
  if (!Array.isArray(collection)) {
    return [];
  }

  const normalized = collection
    .map(item => {
      if (!item) return undefined;
      if (typeof item === 'string') {
        return normalizeImageUrl(item);
      }
      if (typeof item === 'object') {
        const fromObject = item.url || item.src || item.path || item.imageUrl || item.image;
        return normalizeImageUrl(fromObject);
      }
      return undefined;
    })
    .filter(Boolean);

  return Array.from(new Set(normalized));
};

/**
 * Transform API product format to component format
 * API format: { productId, productName, imageUrl, categoryName, ... }
 * Component format: { id, name, image, category, ... }
 * 
 * @param {object} apiProduct - Product object from API
 * @returns {object} - Transformed product object for components
 */
export const resolveImageUrl = (product) => {
  if (!product) return undefined;

  const candidates = [
    product.image,
    product.imageUrl,
    product.thumbnailUrl,
    product.thumbnail,
    product.coverImage
  ]
    .map(normalizeImageUrl)
    .filter(Boolean);

  if (candidates.length > 0) {
    return candidates[0];
  }

  const collectionCandidates = [
    ...normalizeImageCollection(product.images),
    ...normalizeImageCollection(product.media)
  ];

  return collectionCandidates.length > 0 ? collectionCandidates[0] : undefined;
};

export const transformProduct = (apiProduct) => {
  if (!apiProduct || typeof apiProduct !== 'object') {
    return apiProduct;
  }

  // If already transformed, return as is
  if (apiProduct.id && apiProduct.name && !apiProduct.productId && !apiProduct.productName) {
    return apiProduct;
  }

  // Get productId value (from API or existing)
  const productIdValue = apiProduct.productId || apiProduct.id;
  const resolvedImage = resolveImageUrl(apiProduct);
  const resolvedImages = normalizeImageCollection(apiProduct.images);
  
  // Map isDisabled from API (handle both camelCase and snake_case)
  const isDisabled = apiProduct.isDisabled === true || apiProduct.isDisabled === 'true' || 
                     apiProduct.is_disabled === true || apiProduct.is_disabled === 'true';
  
  // Set status based on isDisabled if status is not provided
  // If isDisabled is false/undefined, product is active
  // If isDisabled is true, product is inactive
  const status = apiProduct.status || (isDisabled ? 'inactive' : 'active');
  
  // Handle pricing: onPrice/onPrices is original price, price is promotion price
  // API may return onPrice (single value) or onPrices (array, take first)
  const onPriceValue = apiProduct.onPrice || 
    (Array.isArray(apiProduct.onPrices) && apiProduct.onPrices.length > 0 ? apiProduct.onPrices[0] : null) ||
    (typeof apiProduct.onPrices === 'number' ? apiProduct.onPrices : null);
  
  // Determine original price and current price
  // If onPrice exists, it's the original price before promotion (stored in DB)
  // price from API is the current/promotion price (updated by UpdatePrices API)
  // Logic: onPrice = giá gốc, price = giá khuyến mãi (nếu có promotion)
  const hasPromotion = onPriceValue && apiProduct.price && onPriceValue > apiProduct.price;
  
  const originalPriceValue = hasPromotion 
    ? onPriceValue  // Use onPrice as original when there's promotion
    : (apiProduct.originalPrice || (onPriceValue && !apiProduct.price ? onPriceValue : null));
  
  const currentPriceValue = apiProduct.price || onPriceValue || apiProduct.originalPrice || 0;
  
  // Calculate discount percentage if there's a promotion
  const calculatedDiscount = hasPromotion
    ? Math.round(((onPriceValue - apiProduct.price) / onPriceValue) * 100)
    : (apiProduct.discount || 0);
  
  // Transform variants if they exist
  const transformedVariants = apiProduct.variants && Array.isArray(apiProduct.variants)
    ? apiProduct.variants.map(variant => {
        const variantOnPrice = variant.onPrice || 
          (Array.isArray(variant.onPrices) && variant.onPrices.length > 0 ? variant.onPrices[0] : null);
        const variantOriginalPrice = variantOnPrice || variant.originalPrice || variant.price;
        const variantCurrentPrice = variant.price || variantOnPrice || variant.originalPrice;
        
        return {
          ...variant,
          price: variantCurrentPrice,
          originalPrice: variantOriginalPrice,
          onPrice: variantOnPrice
        };
      })
    : apiProduct.variants;
  
  return {
    // Map API properties to component properties
    id: productIdValue,
    name: apiProduct.productName || apiProduct.name,
    image: resolvedImage || resolvedImages[0],
    category: apiProduct.categoryName || apiProduct.category,
    categoryId: apiProduct.categoryId || apiProduct.categoryId,
    
    // Keep productId for API calls (Cart, etc.)
    productId: productIdValue,
    
    // Pricing: price is current/promotion price, originalPrice is before promotion
    price: currentPriceValue,
    originalPrice: (originalPriceValue && originalPriceValue !== currentPriceValue) ? originalPriceValue : null,
    salePrice: apiProduct.salePrice || currentPriceValue,
    onPrice: onPriceValue, // Keep onPrice for reference
    onPrices: apiProduct.onPrices, // Keep onPrices array for reference
    discount: calculatedDiscount,
    
    // Other properties
    description: apiProduct.description,
    stock: apiProduct.stock,
    warrantyPeriod: apiProduct.warrantyPeriod,
    brand: apiProduct.brand,
    specs: apiProduct.specs,
    badge: apiProduct.badge,
    featured: apiProduct.featured,
    status: status,
    isDisabled: isDisabled,
    rating: apiProduct.rating,
    reviewCount: apiProduct.reviewCount,
    isNew: apiProduct.isNew,
    shortDescription: apiProduct.shortDescription,
    inStock: apiProduct.inStock,
    variants: transformedVariants,
    images: resolvedImages.length > 0 ? resolvedImages : normalizeImageCollection(apiProduct.media),
    sku: apiProduct.sku,
    
    // Keep original API properties for reference
    _original: {
      productId: apiProduct.productId,
      productName: apiProduct.productName,
      imageUrl: apiProduct.imageUrl,
      categoryName: apiProduct.categoryName,
      onPrice: apiProduct.onPrice,
      onPrices: apiProduct.onPrices
    }
  };
};

/**
 * Transform array of products from API format to component format
 * 
 * @param {Array} apiProducts - Array of product objects from API
 * @returns {Array} - Array of transformed product objects
 */
export const transformProducts = (apiProducts) => {
  if (!Array.isArray(apiProducts)) {
    return [];
  }
  
  return apiProducts.map(product => transformProduct(product));
};

/**
 * Check if product data is in API format
 * 
 * @param {object} product - Product object to check
 * @returns {boolean} - True if product is in API format
 */
export const isApiFormat = (product) => {
  if (!product || typeof product !== 'object') {
    return false;
  }
  
  return !!(product.productId || product.productName || product.imageUrl || product.categoryName);
};

