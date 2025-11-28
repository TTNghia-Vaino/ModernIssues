import React, { useEffect, useState, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';

const AdminRoute = ({ children }) => {
  const { user, isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const [isChecking, setIsChecking] = useState(true);
  const hasRedirected = useRef(false);

  useEffect(() => {
    // Reset redirect flag when component mounts
    hasRedirected.current = false;
    setIsChecking(true);
    
    console.log('[AdminRoute] Checking auth, user:', user, 'isAuthenticated:', isAuthenticated);
    
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
        console.error('[AdminRoute] Error reading user from localStorage:', e);
      }
      
      return currentUser;
    };

    // Give AuthContext more time to sync from localStorage
    // Use multiple checks to ensure we catch the user state
    const checkAuth = (isFinalCheck = false) => {
      const currentUser = getUser();
      const userRole = currentUser?.role?.toLowerCase();
      
      console.log('[AdminRoute] Check auth - user:', currentUser, 'role:', userRole, 'isFinalCheck:', isFinalCheck);

      // If we found an admin user, grant access
      if (currentUser && userRole === 'admin') {
        console.log('[AdminRoute] Access granted for user:', currentUser, 'role:', userRole);
        setIsChecking(false);
        return true;
      }
      
      // Only redirect if this is the final check and we still don't have admin user
      if (isFinalCheck && !hasRedirected.current) {
        console.log('[AdminRoute] Access denied after final check, userRole:', userRole, 'redirecting to login');
        hasRedirected.current = true;
        setIsChecking(false);
        navigate('/login', { 
          replace: true,
          state: { message: 'Vui lòng đăng nhập với tài khoản admin' }
        });
        return false;
      }
      
      return false;
    };

    // Quick check first - if user is already available, grant access immediately
    if (user) {
      const userRole = user?.role?.toLowerCase();
      if (userRole === 'admin') {
        console.log('[AdminRoute] Quick access granted, admin user found in context');
        setIsChecking(false);
        return;
      }
    }

    // Check from localStorage immediately
    const localStorageUser = getUser();
    if (localStorageUser) {
      const userRole = localStorageUser?.role?.toLowerCase();
      if (userRole === 'admin') {
        console.log('[AdminRoute] Quick access granted, admin user found in localStorage');
        setIsChecking(false);
        return;
      }
    }

    // Initial check with delay to allow AuthContext to sync
    const timeout1 = setTimeout(() => checkAuth(false), 300);
    
    // Second check after more delay
    const timeout2 = setTimeout(() => checkAuth(false), 600);
    
    // Final check after maximum delay - redirect if no admin user found
    const timeout3 = setTimeout(() => checkAuth(true), 1000);

    return () => {
      clearTimeout(timeout1);
      clearTimeout(timeout2);
      clearTimeout(timeout3);
    };
  }, [isAuthenticated, user, navigate]);

  // Listen for user changes to quickly grant access if admin user appears
  useEffect(() => {
    if (isChecking && user) {
      const userRole = user?.role?.toLowerCase();
      if (userRole === 'admin') {
        console.log('[AdminRoute] User updated: Found admin user, granting access');
        setIsChecking(false);
      }
    }
  }, [user, isChecking]);

  // Check user from localStorage as fallback during check
  let currentUser = user;
  if (!currentUser) {
    try {
      const storedUser = localStorage.getItem('modernissues_auth_v1');
      if (storedUser) {
        currentUser = JSON.parse(storedUser);
        console.log('[AdminRoute] Render: Using user from localStorage:', currentUser);
      }
    } catch (e) {
      console.error('[AdminRoute] Render: Error reading localStorage:', e);
    }
  }

  // Kiểm tra role case-insensitive
  const currentUserRole = currentUser?.role?.toLowerCase();
  
  // Hiển thị loading khi đang kiểm tra HOẶC khi không có user hoặc user không phải admin
  if (isChecking || !currentUser || currentUserRole !== 'admin') {
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
          Đang kiểm tra quyền truy cập...
        </div>
      </div>
    );
  }

  return children;
};

export default AdminRoute;

