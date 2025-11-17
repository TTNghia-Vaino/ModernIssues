/**
 * Utility functions for product data transformation
 * Converts API format to component format
 */

/**
 * Transform API product format to component format
 * API format: { productId, productName, imageUrl, categoryName, ... }
 * Component format: { id, name, image, category, ... }
 * 
 * @param {object} apiProduct - Product object from API
 * @returns {object} - Transformed product object for components
 */
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
  
  return {
    // Map API properties to component properties
    id: productIdValue,
    name: apiProduct.productName || apiProduct.name,
    image: apiProduct.imageUrl || apiProduct.image,
    category: apiProduct.categoryName || apiProduct.category,
    categoryId: apiProduct.categoryId || apiProduct.categoryId,
    
    // Keep productId for API calls (Cart, etc.)
    productId: productIdValue,
    
    // Keep other properties as is
    price: apiProduct.price,
    description: apiProduct.description,
    stock: apiProduct.stock,
    warrantyPeriod: apiProduct.warrantyPeriod,
    brand: apiProduct.brand,
    discount: apiProduct.discount,
    originalPrice: apiProduct.originalPrice,
    salePrice: apiProduct.salePrice,
    specs: apiProduct.specs,
    badge: apiProduct.badge,
    featured: apiProduct.featured,
    status: apiProduct.status,
    rating: apiProduct.rating,
    reviewCount: apiProduct.reviewCount,
    isNew: apiProduct.isNew,
    shortDescription: apiProduct.shortDescription,
    inStock: apiProduct.inStock,
    variants: apiProduct.variants,
    images: apiProduct.images,
    sku: apiProduct.sku,
    onPrices: apiProduct.onPrices,
    
    // Keep original API properties for reference
    _original: {
      productId: apiProduct.productId,
      productName: apiProduct.productName,
      imageUrl: apiProduct.imageUrl,
      categoryName: apiProduct.categoryName
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

