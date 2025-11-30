import React, { createContext, useContext, useState, useEffect, useRef } from 'react';
import { useAuth } from './AuthContext';
import { getCategoryTreeFull } from '../services/categoryService';

const CategoryContext = createContext(null);

export const useCategories = () => {
  const context = useContext(CategoryContext);
  if (!context) {
    throw new Error('useCategories must be used within CategoryProvider');
  }
  return context;
};

export const CategoryProvider = ({ children }) => {
  const { isInTokenGracePeriod } = useAuth();
  const [categories, setCategories] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const fetchPromiseRef = useRef(null); // Track ongoing fetch to prevent duplicates
  const hasLoadedRef = useRef(false); // Track if data has been loaded at least once

  useEffect(() => {
    console.log('[CategoryContext] useEffect triggered', {
      hasFetchPromise: !!fetchPromiseRef.current,
      hasLoaded: hasLoadedRef.current,
      currentCategories: categories,
      isInGracePeriod: isInTokenGracePeriod
    });
    
    let cancelled = false;

    const loadCategories = async () => {
      // Reset hasLoadedRef if categories is null/empty (force refetch)
      if (hasLoadedRef.current && (!categories || (Array.isArray(categories) && categories.length === 0))) {
        console.log('[CategoryContext] Marked as loaded but categories is null/empty, resetting flags');
        hasLoadedRef.current = false;
        fetchPromiseRef.current = null;
      }

      // If already fetching, don't start another fetch
      if (fetchPromiseRef.current) {
        console.log('[CategoryContext] Already fetching, skipping');
        return;
      }

      // If categories already loaded and have data, don't fetch again
      if (hasLoadedRef.current && categories && Array.isArray(categories) && categories.length > 0) {
        console.log('[CategoryContext] Already loaded with data, skipping fetch. Count:', categories.length);
        setLoading(false);
        return;
      }
      
      console.log('[CategoryContext] Proceeding to fetch categories...');

      // If in grace period, wait for it to end
      if (isInTokenGracePeriod) {
        console.log('[CategoryContext] Waiting for token grace period to end...');
        await new Promise(resolve => setTimeout(resolve, 6000));
        if (cancelled) return;
      }

      try {
        console.log('[CategoryContext] Starting to fetch categories...');
        setLoading(true);
        setError(null);
        
        // Call API directly like AdminCategories
        const promise = getCategoryTreeFull();
        fetchPromiseRef.current = promise;
        
        const data = await promise;
        
        console.log('[CategoryContext] API response data:', data);
        console.log('[CategoryContext] Data type:', typeof data);
        console.log('[CategoryContext] Is array:', Array.isArray(data));
        
        if (cancelled) {
          console.log('[CategoryContext] Fetch was cancelled');
          return;
        }
        
        // Ensure data is an array (handle both direct array and { data: [...] } format)
        let categoriesArray = [];
        if (Array.isArray(data)) {
          categoriesArray = data;
        } else if (data && typeof data === 'object' && Array.isArray(data.data)) {
          categoriesArray = data.data;
        } else if (data && typeof data === 'object' && data.success && Array.isArray(data.data)) {
          categoriesArray = data.data;
        }
        
        console.log('[CategoryContext] Categories array:', categoriesArray.length);
        
        setCategories(categoriesArray);
        setError(null);
        hasLoadedRef.current = true;
        console.log('[CategoryContext] Categories set successfully, count:', categoriesArray.length);
      } catch (err) {
        console.error('[CategoryContext] Failed to load categories:', err);
        setError(err);
        setCategories(null); // Set to null on error
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
        fetchPromiseRef.current = null;
      }
    };

    loadCategories();

    // Cleanup
    return () => {
      cancelled = true;
      fetchPromiseRef.current = null;
    };
  }, []); // Empty deps - only run once on mount

  const refreshCategories = async () => {
    try {
      setLoading(true);
      setError(null);
      fetchPromiseRef.current = null; // Reset ref
      hasLoadedRef.current = false; // Reset loaded flag
      const data = await getCategoryTreeFull();
      setCategories(data);
      setError(null);
    } catch (err) {
      setError(err);
      console.error('[CategoryContext] Failed to refresh categories:', err);
    } finally {
      setLoading(false);
      fetchPromiseRef.current = null;
    }
  };

  const value = {
    categories,
    loading,
    error,
    refreshCategories
  };

  return (
    <CategoryContext.Provider value={value}>
      {children}
    </CategoryContext.Provider>
  );
};
