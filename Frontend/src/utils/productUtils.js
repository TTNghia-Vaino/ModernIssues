import { getBaseURL } from '../config/api';

/**
 * Utility functions for product data transformation
 * Converts API format to component format
 */

const FALLBACK_IMAGE_BASE_URL = 'http://35.232.61.38:5000';

const getCleanBaseUrl = () => {
  const baseUrl = getBaseURL();
  const cleaned = baseUrl ? baseUrl.replace(/\/$/, '').replace(/\/v1$/i, '') : '';
  
  // If using proxy (empty base URL), use remote server for images
  // Images are stored in wwwroot/Uploads/Images on remote server
  if (!baseUrl || baseUrl === '') {
    // Using Vite proxy, so images should come from remote server
    // Return fallback to remote server
    return FALLBACK_IMAGE_BASE_URL;
  }
  
  // Return cleaned base URL (should be http://35.232.61.38:5000)
  return cleaned || FALLBACK_IMAGE_BASE_URL;
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
  
  // If already starts with /Uploads/Images/, just prepend base URL
  if (trimmed.startsWith('/Uploads/Images/') || trimmed.startsWith('Uploads/Images/')) {
    const cleanPath = trimmed.startsWith('/') ? trimmed : `/${trimmed}`;
    // If using proxy (empty baseUrl), return relative path
    if (!cleanBaseUrl || cleanBaseUrl === '') {
      return cleanPath;
    }
    return `${cleanBaseUrl}${cleanPath}`;
  }
  
  // If starts with /, prepend base URL
  if (trimmed.startsWith('/')) {
    if (!cleanBaseUrl || cleanBaseUrl === '') {
      return trimmed; // Return as is for proxy
    }
    return `${cleanBaseUrl}${trimmed}`;
  }

  // Default upload location on backend - just filename
  // If using proxy, return relative path
  if (!cleanBaseUrl || cleanBaseUrl === '') {
    return `/Uploads/Images/${trimmed}`;
  }
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
  
  // Logic đơn giản: price từ API = giá gốc, onPrices = giá khuyến mãi (nếu có)
  const originalPriceValue = apiProduct.price || 0;  // Giá gốc
  const promotionPriceValue = apiProduct.onPrice || 
    (Array.isArray(apiProduct.onPrices) && apiProduct.onPrices.length > 0 ? apiProduct.onPrices[0] : null) ||
    (typeof apiProduct.onPrices === 'number' ? apiProduct.onPrices : null);  // Giá khuyến mãi
  
  // Có khuyến mãi khi có promotionPrice và nó nhỏ hơn giá gốc
  const hasPromotion = promotionPriceValue && promotionPriceValue > 0 && originalPriceValue > promotionPriceValue;
  
  // Giá hiện tại = giá khuyến mãi nếu có, nếu không thì = giá gốc
  const currentPriceValue = hasPromotion ? promotionPriceValue : originalPriceValue;
  
  // Tính % giảm giá: (giá_gốc - giá_sau_km) / giá_gốc * 100
  const calculatedDiscount = hasPromotion && originalPriceValue > 0
    ? Math.round(((originalPriceValue - promotionPriceValue) / originalPriceValue) * 100)
    : (apiProduct.discount || 0);
  
  // Transform variants if they exist
  const transformedVariants = apiProduct.variants && Array.isArray(apiProduct.variants)
    ? apiProduct.variants.map(variant => {
        const variantOriginalPrice = variant.price || 0;  // Giá gốc
        const variantPromotionPrice = variant.onPrice || 
          (Array.isArray(variant.onPrices) && variant.onPrices.length > 0 ? variant.onPrices[0] : null);
        const variantHasPromotion = variantPromotionPrice && variantPromotionPrice > 0 && variantOriginalPrice > variantPromotionPrice;
        const variantCurrentPrice = variantHasPromotion ? variantPromotionPrice : variantOriginalPrice;
        
        return {
          ...variant,
          price: variantCurrentPrice,
          originalPrice: variantHasPromotion ? variantOriginalPrice : null,
          onPrice: variantPromotionPrice
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
    
    // Pricing: price là giá hiện tại (giá khuyến mãi nếu có, nếu không thì giá gốc)
    price: currentPriceValue,
    // originalPrice là giá gốc (chỉ hiển thị khi có khuyến mãi)
    originalPrice: hasPromotion ? originalPriceValue : null,
    salePrice: apiProduct.salePrice || currentPriceValue,
    onPrice: promotionPriceValue, // Giá khuyến mãi (để tham khảo)
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

