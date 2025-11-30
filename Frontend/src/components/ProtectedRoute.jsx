import React, { useEffect, useState, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate, useLocation } from 'react-router-dom';

const ProtectedRoute = ({ children }) => {
  const { user, isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [isChecking, setIsChecking] = useState(true);
  const hasRedirected = useRef(false);

  useEffect(() => {
    // Reset redirect flag when component mounts
    hasRedirected.current = false;
    setIsChecking(true);
    
    console.log('[ProtectedRoute] Checking auth, user:', user, 'isAuthenticated:', isAuthenticated);
    
    // Helper function to check user from localStorage or context
    const getUser = () => {
      let currentUser = user;
      
      try {
        const storedUser = localStorage.getItem('modernissues_auth_v1');
        if (storedUser) {
          const parsedUser = JSON.parse(storedUser);
          // Use localStorage user if context user is not available or different
          if (!currentUser || currentUser.id !== parsedUser.id) {
            currentUser = parsedUser;
          }
        }
      } catch (e) {
        console.error('[ProtectedRoute] Error reading user from localStorage:', e);
      }
      
      return currentUser;
    };

    // Check authentication
    const checkAuth = (isFinalCheck = false) => {
      const currentUser = getUser();
      
      console.log('[ProtectedRoute] Check auth - user:', currentUser, 'isFinalCheck:', isFinalCheck);

      // If we found a user, grant access
      if (currentUser) {
        console.log('[ProtectedRoute] Access granted for user:', currentUser);
        setIsChecking(false);
        return true;
      }
      
      // Only redirect if this is the final check and we still don't have user
      if (isFinalCheck && !hasRedirected.current) {
        console.log('[ProtectedRoute] Access denied after final check, redirecting to login');
        hasRedirected.current = true;
        setIsChecking(false);
        // Save current location to redirect back after login
        navigate('/login', { 
          replace: true,
          state: { 
            from: location.pathname,
            message: 'Vui lòng đăng nhập để tiếp tục' 
          }
        });
        return false;
      }
      
      return false;
    };

    // Quick check first - if user is already available, grant access immediately
    if (user) {
      console.log('[ProtectedRoute] Quick access granted, user found in context');
      setIsChecking(false);
      return;
    }

    // Check from localStorage immediately
    const localStorageUser = getUser();
    if (localStorageUser) {
      console.log('[ProtectedRoute] Quick access granted, user found in localStorage');
      setIsChecking(false);
      return;
    }

    // Initial check with delay to allow AuthContext to sync
    const timeout1 = setTimeout(() => checkAuth(false), 300);
    
    // Second check after more delay
    const timeout2 = setTimeout(() => checkAuth(false), 600);
    
    // Final check after maximum delay - redirect if no user found
    const timeout3 = setTimeout(() => checkAuth(true), 1000);

    return () => {
      clearTimeout(timeout1);
      clearTimeout(timeout2);
      clearTimeout(timeout3);
    };
  }, [isAuthenticated, user, navigate, location.pathname]);

  // Listen for user changes to quickly grant access if user appears
  useEffect(() => {
    if (isChecking && user) {
      console.log('[ProtectedRoute] User updated: Found user, granting access');
      setIsChecking(false);
    }
  }, [user, isChecking]);

  // Check user from localStorage as fallback during check
  let currentUser = user;
  if (!currentUser) {
    try {
      const storedUser = localStorage.getItem('modernissues_auth_v1');
      if (storedUser) {
        currentUser = JSON.parse(storedUser);
        console.log('[ProtectedRoute] Render: Using user from localStorage:', currentUser);
      }
    } catch (e) {
      console.error('[ProtectedRoute] Render: Error reading localStorage:', e);
    }
  }
  
  // Hiển thị loading khi đang kiểm tra HOẶC khi không có user
  if (isChecking || !currentUser) {
    return (
      <div style={{
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        height: '100vh',
        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)'
      }}>
        <div style={{
          textAlign: 'center',
          color: 'white',
          fontSize: '18px',
          fontWeight: '500'
        }}>
          <div style={{
            marginBottom: '16px',
            fontSize: '48px'
          }}>⏳</div>
          Đang kiểm tra đăng nhập...
        </div>
      </div>
    );
  }

  return children;
};

export default ProtectedRoute;

