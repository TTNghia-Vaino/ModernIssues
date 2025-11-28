import React, { useState, useEffect, useRef } from 'react';
import { getPlaceholderImage, handleProductImageError } from '../utils/imageUtils';

/**
 * SafeImage Component
 * 
 * Smart image loading that reduces 404 errors by:
 * - Using placeholder by default
 * - Only loading real images when they're about to be visible (Intersection Observer)
 * - Caching validation results to avoid repeated attempts
 * - Fast fallback to placeholder on error
 * 
 * Note: Some 404s may still appear in console when validating images.
 * This is normal browser behavior - the component ensures UI doesn't break.
 */
const SafeImage = ({
  src,
  alt,
  placeholder,
  className = '',
  loading = 'lazy',
  onError,
  onLoad,
  ...props
}) => {
  // Use placeholder by default
  const defaultPlaceholder = placeholder || getPlaceholderImage('product');
  const [displaySrc, setDisplaySrc] = useState(defaultPlaceholder);
  const [isValidating, setIsValidating] = useState(false);
  const imgRef = useRef(null);
  const observerRef = useRef(null);
  
  // Global cache for validated images (shared across all SafeImage instances)
  if (!window.__safeImageCache) {
    window.__safeImageCache = new Map();
  }
  const validationCache = window.__safeImageCache;
  const currentSrcRef = useRef(null);

  // Handle image validation and loading
  const validateAndLoadImage = (imageSrc) => {
    if (!imageSrc || imageSrc === defaultPlaceholder) {
      return;
    }

    // If it's a data URI or blob, use it directly
    if (imageSrc.startsWith('data:') || imageSrc.startsWith('blob:')) {
      setDisplaySrc(imageSrc);
      currentSrcRef.current = imageSrc;
      return;
    }

    // Check cache first
    if (validationCache.has(imageSrc)) {
      const isValid = validationCache.get(imageSrc);
      setDisplaySrc(isValid ? imageSrc : defaultPlaceholder);
      currentSrcRef.current = imageSrc;
      return;
    }

    // Validate and load image
    setIsValidating(true);
    const img = new Image();
    
    const timeout = setTimeout(() => {
      img.onload = null;
      img.onerror = null;
      validationCache.set(imageSrc, false);
      setDisplaySrc(defaultPlaceholder);
      setIsValidating(false);
      currentSrcRef.current = imageSrc;
    }, 2000); // 2 second timeout

    img.onload = () => {
      clearTimeout(timeout);
      validationCache.set(imageSrc, true);
      setDisplaySrc(imageSrc);
      setIsValidating(false);
      currentSrcRef.current = imageSrc;
    };

    img.onerror = () => {
      clearTimeout(timeout);
      validationCache.set(imageSrc, false);
      setDisplaySrc(defaultPlaceholder);
      setIsValidating(false);
      currentSrcRef.current = imageSrc;
    };

    img.src = imageSrc;
  };

  // Set up Intersection Observer for lazy loading
  useEffect(() => {
    if (!src) {
      return;
    }

    // If loading is not lazy, load immediately
    if (loading !== 'lazy') {
      validateAndLoadImage(src);
      return;
    }

    // Wait for image element to be mounted
    if (!imgRef.current) {
      return;
    }

    // Use Intersection Observer for lazy loading
    observerRef.current = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            validateAndLoadImage(src);
            // Stop observing once we start loading
            if (observerRef.current && imgRef.current) {
              observerRef.current.unobserve(imgRef.current);
            }
          }
        });
      },
      {
        rootMargin: '100px', // Start loading 100px before image enters viewport
        threshold: 0.01
      }
    );

    observerRef.current.observe(imgRef.current);

    return () => {
      if (observerRef.current && imgRef.current) {
        observerRef.current.unobserve(imgRef.current);
      }
    };
  }, [src, loading, defaultPlaceholder]);

  // Handle image error (fallback in case validation missed something)
  const handleError = (e) => {
    const failedSrc = displaySrc;
    if (failedSrc !== defaultPlaceholder && failedSrc !== src) {
      // Cache the failed validation
      validationCache.set(failedSrc, false);
    }
    if (src && src !== defaultPlaceholder) {
      validationCache.set(src, false);
    }
    setDisplaySrc(defaultPlaceholder);
    if (onError) {
      onError(e);
    } else {
      handleProductImageError(e);
    }
  };

  return (
    <img
      ref={imgRef}
      src={displaySrc}
      alt={alt || ''}
      className={className}
      onError={handleError}
      onLoad={onLoad}
      loading={loading}
      style={{ opacity: isValidating ? 0.7 : 1, transition: 'opacity 0.2s' }}
      {...props}
    />
  );
};

export default SafeImage;
