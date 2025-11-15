import React, { createContext, useContext, useEffect, useMemo, useState, useCallback, useRef } from 'react';
import { useAuth } from './AuthContext';
import * as cartService from '../services/cartService';

const CartContext = createContext(null);

// Storage key for cart persistence (sessionStorage for non-authenticated users)
const STORAGE_KEY = 'modernissues_cart_v1';

export const CartProvider = ({ children }) => {
  const { isAuthenticated, isInTokenGracePeriod } = useAuth();
  const [items, setItems] = useState([]);
  const [cartId, setCartId] = useState(null); // Lưu cartId từ API
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [prevAuthenticated, setPrevAuthenticated] = useState(isAuthenticated);
  const [retryCount, setRetryCount] = useState(0); // Track retry attempts
  const lastLoadTimeRef = useRef(0); // Track last load time to prevent rapid calls

  // Transform cart item from API format to component format
  const transformCartItem = (apiItem) => {
    if (!apiItem || typeof apiItem !== 'object') {
      return apiItem;
    }
    
    // API format: { productId, productName, productImage, ... }
    // Component format: { id, productId, name, image, ... }
    return {
      id: apiItem.productId || apiItem.id,
      productId: apiItem.productId || apiItem.id,
      name: apiItem.productName || apiItem.name,
      image: apiItem.productImage || apiItem.image,
      price: apiItem.currentPrice || apiItem.priceAtAdd || apiItem.price,
      quantity: apiItem.quantity || 1,
      cartId: apiItem.cartId,
      capacity: apiItem.capacity,
      // Keep other properties
      brand: apiItem.brand,
      category: apiItem.category,
      subTotal: apiItem.subTotal,
      priceAtAdd: apiItem.priceAtAdd,
      currentPrice: apiItem.currentPrice
    };
  };

  const loadCart = useCallback(async () => {
    if (isAuthenticated) {
      // Prevent rapid API calls (debounce: wait at least 1 second between calls)
      const now = Date.now();
      const timeSinceLastLoad = now - lastLoadTimeRef.current;
      const MIN_LOAD_INTERVAL = 1000; // 1 second
      
      if (timeSinceLastLoad < MIN_LOAD_INTERVAL) {
        console.log('[CartContext] Skipping load - too soon after last load', { timeSinceLastLoad });
        return;
      }
      
      // Skip API call if we're in token grace period and have retried too many times
      if (isInTokenGracePeriod && retryCount > 2) {
        console.log('[CartContext] Skipping load - in grace period with too many retries', { retryCount });
        // Reset retry count after grace period
        setTimeout(() => setRetryCount(0), 5000 - (Date.now() - (now - 1000)));
        return;
      }
      
      lastLoadTimeRef.current = now;
      
      // Load from API
      setIsLoading(true);
      try {
        const cartData = await cartService.getCart();
        console.log('[CartContext] Cart data from API:', cartData);
        // Reset retry count on success
        setRetryCount(0);
        
        // Handle different response formats
        // Format 1: { cartItems: [...], totalAmount, totalItems, ... }
        // Format 2: { data: { cartItems: [...], ... } }
        // Format 3: { items: [...] }
        let cartItems = [];
        if (cartData.cartItems && Array.isArray(cartData.cartItems)) {
          cartItems = cartData.cartItems;
        } else if (cartData.data?.cartItems && Array.isArray(cartData.data.cartItems)) {
          cartItems = cartData.data.cartItems;
        } else if (cartData.items && Array.isArray(cartData.items)) {
          cartItems = cartData.items;
        } else if (Array.isArray(cartData)) {
          cartItems = cartData;
        }
        
        // Transform cart items to component format
        const transformedItems = cartItems.map(item => transformCartItem(item));
        console.log('[CartContext] Transformed cart items:', transformedItems);
        
        // Lưu cartId từ response (có thể là id hoặc cartId)
        const currentCartId = cartData.id || cartData.cartId || cartData.data?.id || cartData.data?.cartId || null;
        setCartId(currentCartId);
        
        // Lưu items đã transform
        setItems(transformedItems);
      } catch (err) {
        console.error('[CartContext] Failed to load cart:', err);
        
        // Increment retry count on error (especially 401 errors during grace period)
        if (err.status === 401 || err.isUnauthorized) {
          setRetryCount(prev => prev + 1);
          
          // If in grace period, don't show error or fallback yet
          if (isInTokenGracePeriod) {
            console.log('[CartContext] 401 error during grace period, will retry later', { retryCount: retryCount + 1 });
            setIsLoading(false);
            return; // Don't fallback to sessionStorage during grace period
          }
        }
        
        setError(err.message);
        // Fallback to sessionStorage if API fails (only if not in grace period)
        try {
          const raw = sessionStorage.getItem(STORAGE_KEY);
          if (raw) setItems(JSON.parse(raw));
        } catch {
          setItems([]);
        }
        setCartId(null);
      } finally {
        setIsLoading(false);
      }
    } else {
      // Load from sessionStorage for non-authenticated users
      try {
        const raw = sessionStorage.getItem(STORAGE_KEY);
        setItems(raw ? JSON.parse(raw) : []);
      } catch {
        setItems([]);
      }
      setCartId(null);
      // Reset retry count when not authenticated
      setRetryCount(0);
    }
  }, [isAuthenticated, isInTokenGracePeriod, retryCount]);

  // Sync cart from sessionStorage to API when user logs in
  const syncCartToAPI = useCallback(async () => {
    setIsLoading(true);
    try {
      // Get local cart items from sessionStorage
      let localItems = [];
      try {
        const raw = sessionStorage.getItem(STORAGE_KEY);
        localItems = raw ? JSON.parse(raw) : [];
      } catch {
        localItems = [];
      }

      // If no local items, just load cart from API
      if (localItems.length === 0) {
        await loadCart();
        return;
      }

      // Load cart from API
      const cartData = await cartService.getCart();
      console.log('[CartContext] Cart data from API:', cartData);
      
      // Handle different response formats
      let cartItems = [];
      if (cartData.cartItems && Array.isArray(cartData.cartItems)) {
        cartItems = cartData.cartItems;
      } else if (cartData.data?.cartItems && Array.isArray(cartData.data.cartItems)) {
        cartItems = cartData.data.cartItems;
      } else if (cartData.items && Array.isArray(cartData.items)) {
        cartItems = cartData.items;
      } else if (Array.isArray(cartData)) {
        cartItems = cartData;
      }

      // Merge local items with API cart
      // Add local items that don't exist in API cart
      for (const localItem of localItems) {
        const productId = localItem.productId || localItem.id;
        const capacity = localItem.capacity;
        
        // Check if item already exists in API cart
        const existsInAPI = cartItems.some(apiItem => {
          const apiProductId = apiItem.productId || apiItem.id;
          const apiCapacity = apiItem.capacity;
          return apiProductId === productId && apiCapacity === capacity;
        });

        if (!existsInAPI && productId) {
          // Add to API
          try {
            await cartService.addToCart({
              productId: productId,
              quantity: localItem.quantity || 1,
              capacity: capacity
            });
          } catch (err) {
            console.warn('[CartContext] Failed to sync item to API:', err);
          }
        }
      }

      // Reload cart from API after sync
      await loadCart();

      // Clear sessionStorage after successful sync
      try {
        sessionStorage.removeItem(STORAGE_KEY);
      } catch {
        // ignore
      }
    } catch (err) {
      console.error('[CartContext] Failed to sync cart to API:', err);
      setError(err.message);
      // Still try to load cart even if sync fails
      await loadCart();
    } finally {
      setIsLoading(false);
    }
  }, [isAuthenticated, loadCart]);

  // Load cart from API or sessionStorage
  useEffect(() => {
    // Reset retry count when authentication state changes
    if (prevAuthenticated !== isAuthenticated) {
      setRetryCount(0);
    }
    
    // If user just logged in (transition from false to true), sync cart from sessionStorage to API
    if (isAuthenticated && !prevAuthenticated) {
      // Wait a bit before syncing to let token settle
      const timer = setTimeout(() => {
        syncCartToAPI();
      }, 500); // Wait 500ms after login before syncing
      return () => clearTimeout(timer);
    } else if (isAuthenticated && prevAuthenticated) {
      // User already authenticated, just load cart
      // Only load if not in grace period or if retry count is low
      if (!isInTokenGracePeriod || retryCount <= 2) {
        loadCart();
      }
    } else {
      // Not authenticated, load from sessionStorage
      loadCart();
    }
    setPrevAuthenticated(isAuthenticated);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAuthenticated, prevAuthenticated]);

  // Sync to sessionStorage for non-authenticated users
  useEffect(() => {
    if (!isAuthenticated) {
      try {
        sessionStorage.setItem(STORAGE_KEY, JSON.stringify(items));
      } catch {
        // ignore persistence errors
      }
    }
  }, [items, isAuthenticated]);

  const addItem = async (product, quantity = 1) => {
    // Get productId from product (could be id, productId, or _original.productId)
    const productId = product.productId || product.id || product._original?.productId;
    if (!product || !productId) {
      console.error('[CartContext] Cannot add item: missing product or productId', product);
      return;
    }

    if (isAuthenticated) {
      // Add via API
      setIsLoading(true);
      setError(null);
      try {
        await cartService.addToCart({
          productId: productId,
          quantity: quantity,
          capacity: product.capacity
        });
        await loadCart(); // Reload cart from API
      } catch (err) {
        setError(err.message || 'Không thể thêm sản phẩm vào giỏ hàng');
        throw err;
      } finally {
        setIsLoading(false);
      }
    } else {
      // Add to local state for non-authenticated users
      setItems(prev => {
        const existing = prev.find(i => i.id === product.id && i.capacity === product.capacity);
        if (existing) {
          return prev.map(i => 
            (i.id === product.id && i.capacity === product.capacity) 
              ? { ...i, quantity: i.quantity + quantity } 
              : i
          );
        }
        return [...prev, { 
          id: product.id, 
          name: product.name, 
          price: product.price, 
          brand: product.brand, 
          category: product.category, 
          image: product.image,
          capacity: product.capacity,
          quantity 
        }];
      });
    }
  };

  const removeItem = async (productId, itemCartId = null) => {
    // itemCartId là cartId từ item (nếu có), nếu không thì dùng cartId từ state
    const currentCartId = itemCartId || cartId;
    
    if (isAuthenticated && currentCartId) {
      // Remove via API
      setIsLoading(true);
      setError(null);
      try {
        await cartService.removeCartItem(currentCartId, productId);
        await loadCart(); // Reload cart from API
      } catch (err) {
        setError(err.message || 'Không thể xóa sản phẩm khỏi giỏ hàng');
        throw err;
      } finally {
        setIsLoading(false);
      }
    } else {
      // Remove from local state (non-authenticated or no cartId)
      setItems(prev => prev.filter(i => i.id !== productId && i.productId !== productId));
    }
  };

  const updateQuantity = async (productId, quantity, itemCartId = null) => {
    const q = Math.max(1, Number(quantity) || 1);
    // itemCartId là cartId từ item (nếu có), nếu không thì dùng cartId từ state
    const currentCartId = itemCartId || cartId;
    
    if (isAuthenticated && currentCartId) {
      // Update via API
      setIsLoading(true);
      setError(null);
      try {
        await cartService.updateCartItem(currentCartId, productId, { quantity: q });
        await loadCart(); // Reload cart from API
      } catch (err) {
        setError(err.message || 'Không thể cập nhật số lượng');
        throw err;
      } finally {
        setIsLoading(false);
      }
    } else {
      // Update local state (non-authenticated or no cartId)
      setItems(prev => prev.map(i => 
        (i.id === productId || i.productId === productId) 
          ? { ...i, quantity: q } 
          : i
      ));
    }
  };

  const clearCart = async () => {
    if (isAuthenticated) {
      // Clear via API
      setIsLoading(true);
      setError(null);
      try {
        await cartService.clearCart();
        setItems([]);
      } catch (err) {
        setError(err.message || 'Không thể xóa giỏ hàng');
        throw err;
      } finally {
        setIsLoading(false);
      }
    } else {
      // Clear local state and sessionStorage
      setItems([]);
      try {
        sessionStorage.removeItem(STORAGE_KEY);
      } catch {
        // ignore
      }
    }
  };

  const totalCount = useMemo(() => items.reduce((sum, i) => sum + (i.quantity || 0), 0), [items]);
  const totalPrice = useMemo(() => items.reduce((sum, i) => sum + (i.price || 0) * (i.quantity || 0), 0), [items]);

  const value = {
    items,
    addItem,
    removeItem,
    updateQuantity,
    clearCart,
    totalCount,
    totalPrice,
    isLoading,
    error,
    reloadCart: loadCart,
    clearError: () => setError(null)
  };

  return (
    <CartContext.Provider value={value}>
      {children}
    </CartContext.Provider>
  );
};

export const useCart = () => {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error('useCart must be used within CartProvider');
  return ctx;
};


