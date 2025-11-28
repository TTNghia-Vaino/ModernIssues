import React, { createContext, useContext, useEffect, useMemo, useState, useRef } from 'react';
import * as authService from '../services/authService';
import * as productService from '../services/productService';
import * as userService from '../services/userService';

const AuthContext = createContext(null);
const STORAGE_KEY = 'modernissues_auth_v1';

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      return raw ? JSON.parse(raw) : null;
    } catch {
      return null;
    }
  });
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    try {
      if (user) localStorage.setItem(STORAGE_KEY, JSON.stringify(user));
      else localStorage.removeItem(STORAGE_KEY);
    } catch {
      // ignore
    }
  }, [user]);

  // Listen for storage changes (for admin login fallback and cross-tab sync)
  useEffect(() => {
    const handleStorageChange = (e) => {
      if (e.key === STORAGE_KEY) {
        try {
          const newValue = e.newValue ? JSON.parse(e.newValue) : null;
          if (newValue && (!user || user.id !== newValue.id || user.role !== newValue.role)) {
            setUser(newValue);
          } else if (!newValue && user) {
            setUser(null);
          }
        } catch {
          // ignore parse errors
        }
      }
    };

    // Listen for custom event (same-tab sync)
    const handleCustomStorageSync = () => {
      try {
        const raw = localStorage.getItem(STORAGE_KEY);
        const newValue = raw ? JSON.parse(raw) : null;
        if (newValue && (!user || user.id !== newValue.id || user.role !== newValue.role)) {
          setUser(newValue);
        } else if (!newValue && user) {
          setUser(null);
        }
      } catch {
        // ignore parse errors
      }
    };

    window.addEventListener('storage', handleStorageChange);
    window.addEventListener('authStorageSync', handleCustomStorageSync);
    return () => {
      window.removeEventListener('storage', handleStorageChange);
      window.removeEventListener('authStorageSync', handleCustomStorageSync);
    };
  }, [user]);

  const login = async (credentials) => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await authService.login(credentials);
      
      // Check if 2FA is required
      if (response.requires2FA) {
        return {
          success: true,
          requires2FA: true,
          email: response.email,
          message: response.message,
          method: response.method
        };
      }
      
      // Extract user data from response
      const userData = {
        id: response.userId || response.id,
        email: response.email || credentials.email,
        name: response.name || response.fullName || credentials.email.split('@')[0],
        role: response.role || 'customer',
        ...response
      };
      
      setUser(userData);
      return { success: true, data: userData };
    } catch (err) {
      const errorMessage = err.message || 'Đăng nhập thất bại. Vui lòng thử lại.';
      setError(errorMessage);
      return { success: false, error: errorMessage };
    } finally {
      setIsLoading(false);
    }
  };

  const logout = async () => {
    setIsLoading(true);
    try {
      await authService.logout();
    } catch (err) {
      console.error('Logout error:', err);
      // Continue with logout even if API call fails
    } finally {
      setUser(null);
      setIsLoading(false);
    }
  };

  const register = async (userData) => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await authService.register(userData);
      
      // Auto login after registration if token is provided
      if (response.token || response.accessToken) {
        const token = response.token || response.accessToken;
        localStorage.setItem('auth_token', token);
        
        const newUser = {
          id: response.userId || response.id,
          email: response.email || userData.email,
          name: response.name || response.username || userData.username,
          role: response.role || 'customer',
          ...response
        };
        setUser(newUser);
      }
      
      return { success: true, data: response };
    } catch (err) {
      const errorMessage = err.message || 'Đăng ký thất bại. Vui lòng thử lại.';
      setError(errorMessage);
      return { success: false, error: errorMessage };
    } finally {
      setIsLoading(false);
    }
  };

  const isAuthenticated = useMemo(() => Boolean(user), [user]);

  /**
   * Refresh current user information from API
   * Tries Product/CurrentUser first, then User/CurrentUser as fallback
   */
  const refreshUser = async () => {
    if (!isAuthenticated) {
      return { success: false, error: 'User not authenticated' };
    }

    setIsLoading(true);
    setError(null);
    
    try {
      // Try Product/CurrentUser endpoint first
      let userData = null;
      try {
        const productResponse = await productService.getCurrentUserInfo();
        if (productResponse && productResponse.data) {
          userData = productResponse.data;
        }
      } catch (productError) {
        console.warn('[AuthContext] Product/CurrentUser failed, trying User/CurrentUser:', productError);
        
        // Fallback to User/CurrentUser endpoint
        try {
          const userResponse = await userService.getCurrentUser();
          userData = userResponse;
        } catch (userError) {
          console.error('[AuthContext] Both endpoints failed:', userError);
          throw userError;
        }
      }

      // Normalize user data
      if (userData && typeof userData === 'object') {
        const normalizedUser = {
          id: userData.id || userData.userId,
          email: userData.email,
          name: userData.name || userData.fullName || userData.username,
          role: userData.role || 'customer',
          phone: userData.phone,
          address: userData.address,
          avatar: userData.avatar,
          ...userData
        };
        
        setUser(normalizedUser);
        return { success: true, data: normalizedUser };
      }
      
      return { success: false, error: 'Invalid user data format' };
    } catch (err) {
      const errorMessage = err.message || 'Failed to refresh user information';
      setError(errorMessage);
      
      // If 401, clear user (session expired)
      if (err.status === 401) {
        setUser(null);
      }
      
      return { success: false, error: errorMessage };
    } finally {
      setIsLoading(false);
    }
  };

  // Track login time to avoid clearing user immediately after login
  const loginTimeRef = useRef(null);
  
  // Update login time when user is set
  useEffect(() => {
    if (user) {
      loginTimeRef.current = Date.now();
      // Also store loginTime in user object for api.js to check
      const userWithLoginTime = {
        ...user,
        loginTime: new Date().toISOString()
      };
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(userWithLoginTime));
      } catch (e) {
        console.warn('[AuthContext] Failed to store loginTime:', e);
      }
      console.log('[AuthContext] User logged in, tracking login time');
    }
  }, [user]);

  // Listen for token expiration events from API layer
  useEffect(() => {
    const handleTokenExpired = (event) => {
      // Don't clear user if login just happened (within last 8 seconds)
      // This prevents race condition where 401 errors occur before token is fully synced
      // We use 8 seconds to cover: 5s grace period + 1s buffer + 2s safety margin
      const timeSinceLogin = loginTimeRef.current ? Date.now() - loginTimeRef.current : Infinity;
      const RECENT_LOGIN_THRESHOLD = 8000; // 8 seconds
      
      // Also check if we're currently in grace period
      const isInGracePeriod = timeSinceLogin < 5000; // 5 seconds grace period
      
      if (timeSinceLogin < RECENT_LOGIN_THRESHOLD) {
        console.log('[AuthContext] Ignoring token expired event - user just logged in (grace period)', {
          timeSinceLogin,
          isInGracePeriod,
          threshold: RECENT_LOGIN_THRESHOLD,
          url: event?.detail?.url
        });
        return;
      }
      
      // Only clear user if we have a user (to avoid clearing when not logged in)
      if (user) {
        console.log('[AuthContext] Token expired, clearing user session', {
          timeSinceLogin,
          url: event?.detail?.url
        });
        setUser(null);
      }
    };

    window.addEventListener('authTokenExpired', handleTokenExpired);
    return () => {
      window.removeEventListener('authTokenExpired', handleTokenExpired);
    };
  }, [user]);

  // Auto-refresh user info on mount if authenticated
  useEffect(() => {
    if (isAuthenticated && user) {
      // Optionally refresh user info on mount
      // Uncomment if you want to auto-refresh on every mount
      // refreshUser();
    }
  }, []); // Only run on mount

  // Check if we're in the token grace period (first 5 seconds after login)
  // Use a state that updates periodically to check grace period
  const [isInTokenGracePeriod, setIsInTokenGracePeriod] = useState(false);
  
  useEffect(() => {
    if (!loginTimeRef.current) {
      setIsInTokenGracePeriod(false);
      return;
    }
    
    // Check immediately
    const checkGracePeriod = () => {
      const timeSinceLogin = Date.now() - loginTimeRef.current;
      setIsInTokenGracePeriod(timeSinceLogin < 5000);
    };
    
    checkGracePeriod();
    
    // Update every second to track grace period
    const interval = setInterval(checkGracePeriod, 1000);
    
    // Clear interval after grace period ends
    const timeout = setTimeout(() => {
      clearInterval(interval);
      setIsInTokenGracePeriod(false);
    }, 5000);
    
    return () => {
      clearInterval(interval);
      clearTimeout(timeout);
    };
  }, [user]);

  return (
    <AuthContext.Provider value={{ 
      user, 
      isAuthenticated, 
      login, 
      logout, 
      register,
      refreshUser,
      isLoading,
      error,
      clearError: () => setError(null),
      setUser, // Expose setUser for admin login fallback
      isInTokenGracePeriod // Export grace period status
    }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
};



