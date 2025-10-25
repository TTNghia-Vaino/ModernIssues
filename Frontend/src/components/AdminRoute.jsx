import React, { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';

const AdminRoute = ({ children }) => {
  const { user, isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const [isChecking, setIsChecking] = useState(true);

  useEffect(() => {
    // Kiểm tra authentication và role
    if (!isAuthenticated || user?.role !== 'admin') {
      // Redirect về trang login
      navigate('/login', { 
        replace: true,
        state: { message: 'Vui lòng đăng nhập với tài khoản admin' }
      });
    } else {
      setIsChecking(false);
    }
  }, [isAuthenticated, user, navigate]);

  // Hiển thị loading khi đang kiểm tra
  if (isChecking || !isAuthenticated || user?.role !== 'admin') {
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

