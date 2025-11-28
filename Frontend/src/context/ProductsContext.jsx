import React, { createContext, useContext, useState, useEffect, useRef } from 'react';
import { useAuth } from './AuthContext';
import * as productService from '../services/productService';
import { transformProducts } from '../utils/productUtils';

const ProductsContext = createContext(null);

export const useProducts = () => {
  const context = useContext(ProductsContext);
  if (!context) {
    throw new Error('useProducts must be used within ProductsProvider');
  }
  return context;
};

export const ProductsProvider = ({ children }) => {
  const { isInTokenGracePeriod } = useAuth();
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const fetchPromiseRef = useRef(null); // Track ongoing fetch to prevent duplicates
  const hasLoadedRef = useRef(false); // Track if data has been loaded at least once

  useEffect(() => {
    let cancelled = false;

    const attemptFetch = async () => {
      // If already fetching, don't start another fetch
      if (fetchPromiseRef.current) {
        return;
      }

      // If products already loaded, don't fetch again
      if (hasLoadedRef.current) {
        setLoading(false);
        return;
      }

      // If in grace period, wait for it to end
      if (isInTokenGracePeriod) {
        console.log('[ProductsContext] Waiting for token grace period to end before loading products');
        await new Promise(resolve => setTimeout(resolve, 6000));
        if (cancelled) return;
      }

      const fetchProducts = async () => {
      try {
        setLoading(true);
        setError(null);
        
        // Create and store the promise
        const promise = productService.listProducts({
          page: 1,
          limit: 100 // Get products for search suggestions
        });
        fetchPromiseRef.current = promise;
        
        const productsData = await promise;
        
        // Handle Swagger response format: { totalCount, currentPage, limit, data: [...] }
        let productsArray = [];
        if (productsData && typeof productsData === 'object') {
          if (Array.isArray(productsData.data)) {
            productsArray = productsData.data;
          } else if (Array.isArray(productsData)) {
            productsArray = productsData;
          } else if (productsData.items) {
            productsArray = productsData.items;
          }
        } else if (Array.isArray(productsData)) {
          productsArray = productsData;
        }
        
        // Transform API format to component format
        const transformedProducts = transformProducts(productsArray);
        
        // Only update if this is still the current fetch
        if (fetchPromiseRef.current === promise) {
          setProducts(transformedProducts);
          setError(null);
          hasLoadedRef.current = true; // Mark as loaded
          // Also save to localStorage as backup
          localStorage.setItem('adminProducts', JSON.stringify(transformedProducts));
        }
      } catch (err) {
        // Only update error if this is still the current fetch
        if (fetchPromiseRef.current) {
          // Try localStorage fallback
          try {
            const savedProducts = localStorage.getItem('adminProducts');
            if (savedProducts) {
              const allProducts = JSON.parse(savedProducts);
              setProducts(allProducts);
              setError(null);
              hasLoadedRef.current = true; // Mark as loaded
            } else {
              setError(err);
            }
          } catch (localError) {
            setError(err);
          }
          console.error('[ProductsContext] Failed to load products:', err);
        }
      } finally {
        // Only update loading if this is still the current fetch
        if (fetchPromiseRef.current) {
          setLoading(false);
          fetchPromiseRef.current = null;
        }
      }
      };

      fetchProducts();
    };

    attemptFetch();

    // Cleanup: cancel fetch if component unmounts
    return () => {
      cancelled = true;
      fetchPromiseRef.current = null;
    };
  }, []); // Empty deps - only run once on mount

  const refreshProducts = async () => {
    try {
      setLoading(true);
      setError(null);
      fetchPromiseRef.current = null; // Reset ref
      hasLoadedRef.current = false; // Reset loaded flag
      const productsData = await productService.listProducts({
        page: 1,
        limit: 100
      });
      
      let productsArray = [];
      if (productsData && typeof productsData === 'object') {
        if (Array.isArray(productsData.data)) {
          productsArray = productsData.data;
        } else if (Array.isArray(productsData)) {
          productsArray = productsData;
        } else if (productsData.items) {
          productsArray = productsData.items;
        }
      } else if (Array.isArray(productsData)) {
        productsArray = productsData;
      }
      
      const transformedProducts = transformProducts(productsArray);
      setProducts(transformedProducts);
      setError(null);
      localStorage.setItem('adminProducts', JSON.stringify(transformedProducts));
    } catch (err) {
      setError(err);
      console.error('[ProductsContext] Failed to refresh products:', err);
    } finally {
      setLoading(false);
      fetchPromiseRef.current = null;
    }
  };

  const value = {
    products,
    loading,
    error,
    refreshProducts
  };

  return (
    <ProductsContext.Provider value={value}>
      {children}
    </ProductsContext.Provider>
  );
};
