import React, { createContext, useContext, useState, useEffect, useRef } from 'react';
import { useAuth } from './AuthContext';
import { getCategoryTree } from '../services/categoryService';

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
    let cancelled = false;

    const attemptFetch = async () => {
      // If already fetching, don't start another fetch
      if (fetchPromiseRef.current) {
        return;
      }

      // If categories already loaded, don't fetch again
      if (hasLoadedRef.current) {
        setLoading(false);
        return;
      }

      // If in grace period, wait for it to end
      if (isInTokenGracePeriod) {
        console.log('[CategoryContext] Waiting for token grace period to end before loading categories');
        await new Promise(resolve => setTimeout(resolve, 6000));
        if (cancelled) return;
      }

      const fetchCategories = async () => {
      try {
        setLoading(true);
        setError(null);
        
        // Create and store the promise
        const promise = getCategoryTree();
        fetchPromiseRef.current = promise;
        
        const data = await promise;
        
        // Only update if this is still the current fetch
        if (fetchPromiseRef.current === promise) {
          setCategories(data);
          setError(null);
          hasLoadedRef.current = true; // Mark as loaded
        }
      } catch (err) {
        // Only update error if this is still the current fetch
        if (fetchPromiseRef.current) {
          setError(err);
          console.error('[CategoryContext] Failed to load categories:', err);
        }
      } finally {
        // Only update loading if this is still the current fetch
        if (fetchPromiseRef.current) {
          setLoading(false);
          fetchPromiseRef.current = null;
        }
      }
      };

      fetchCategories();
    };

    attemptFetch();

    // Cleanup: cancel fetch if component unmounts
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
      const data = await getCategoryTree();
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
