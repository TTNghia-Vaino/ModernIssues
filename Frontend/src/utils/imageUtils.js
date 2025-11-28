/**
 * Image utility functions for handling image errors and placeholders
 * 
 * Note: Browser console may still show 404 errors for failed image loads.
 * This is normal browser behavior and cannot be prevented from JavaScript.
 * The onError handlers ensure users see placeholder images instead of broken images.
 */

// Base64 encoded placeholder image (SVG with gray background)
// Using base64 prevents external URL requests for placeholder images
const PLACEHOLDER_BASE64 = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMzAwIiBoZWlnaHQ9IjIwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iMTAwJSIgaGVpZ2h0PSIxMDAlIiBmaWxsPSIjZjNmNGY2Ii8+PHRleHQgeD0iNTAlIiB5PSI1MCUiIGZvbnQtZmFtaWx5PSJBcmlhbCwgc2Fucy1zZXJpZiIgZm9udC1zaXplPSIxNCIgZmlsbD0iIzljYTNhZiIgdGV4dC1hbmNob3I9Im1pZGRsZSIgZHk9Ii4zZW0iPk5vIEltYWdlPC90ZXh0Pjwvc3ZnPg==';

// Product placeholder
const PRODUCT_PLACEHOLDER_BASE64 = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMzAwIiBoZWlnaHQ9IjMwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iMTAwJSIgaGVpZ2h0PSIxMDAlIiBmaWxsPSIjZjNmNGY2Ii8+PHRleHQgeD0iNTAlIiB5PSI1MCUiIGZvbnQtZmFtaWx5PSJBcmlhbCwgc2Fucy1zZXJpZiIgZm9udC1zaXplPSIxNCIgZmlsbD0iIzljYTNhZiIgdGV4dC1hbmNob3I9Im1pZGRsZSIgZHk9Ii4zZW0iPlByb2R1Y3Q8L3RleHQ+PC9zdmc+';

/**
 * Create an image error handler that sets fallback placeholder
 * Prevents infinite loops by tracking if fallback was already applied
 * 
 * @param {string} placeholder - Placeholder image URL (defaults to base64 placeholder)
 * @returns {Function} - Error handler function for img onError event
 */
export const createImageErrorHandler = (placeholder = PLACEHOLDER_BASE64) => {
  return (event) => {
    const img = event.currentTarget || event.target;
    
    // Prevent infinite loop if fallback already applied
    if (img.dataset.fallbackApplied === 'true') {
      return;
    }
    
    // Mark as fallback applied
    img.dataset.fallbackApplied = 'true';
    
    // Only switch to placeholder if current src is different
    if (img.src !== placeholder) {
      img.src = placeholder;
    }
  };
};

/**
 * Default image error handler using base64 placeholder
 */
export const handleImageError = createImageErrorHandler();

/**
 * Product image error handler
 */
export const handleProductImageError = createImageErrorHandler(PRODUCT_PLACEHOLDER_BASE64);

/**
 * Get placeholder image URL
 * @param {string} type - Type of placeholder ('product' or default)
 * @returns {string} - Placeholder image URL
 */
export const getPlaceholderImage = (type = 'default') => {
  return type === 'product' ? PRODUCT_PLACEHOLDER_BASE64 : PLACEHOLDER_BASE64;
};

export default {
  createImageErrorHandler,
  handleImageError,
  handleProductImageError,
  getPlaceholderImage,
  PLACEHOLDER_BASE64,
  PRODUCT_PLACEHOLDER_BASE64
};

