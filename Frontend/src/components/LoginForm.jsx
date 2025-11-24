import React, { useState } from 'react';
import './LoginForm.css';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useNotification } from '../context/NotificationContext';

const LoginForm = () => {
  const [formData, setFormData] = useState({
    email: '',
    password: ''
  });
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [isLoggingIn, setIsLoggingIn] = useState(false); // Flag to prevent redirect during login
  const { login, user, setUser } = useAuth();
  const { error: showError } = useNotification();
  const navigate = useNavigate();
  const location = useLocation();

  // Redirect if already logged in (but not for admin users who should go to admin dashboard)
  // Only redirect if not currently logging in
  React.useEffect(() => {
    if (user && !isLoggingIn && !isLoading) {
      console.log('[LoginForm] User detected in useEffect, user:', user);
      // Admin users should go to admin dashboard, not home (case-insensitive check)
      const userRole = user?.role?.toLowerCase();
      if (userRole === 'admin') {
        console.log('[LoginForm] Admin user detected, redirecting to /admin/dashboard');
        navigate('/admin/dashboard', { replace: true });
        return;
      }
      const redirectTo = (location.state && location.state.from) || '/';
      console.log('[LoginForm] Regular user, redirecting to:', redirectTo);
      navigate(redirectTo);
    }
  }, [user, navigate, location, isLoggingIn, isLoading]);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    setIsLoggingIn(true); // Set flag to prevent useEffect redirect
    
    try {
      // Đăng nhập qua API
      const result = await login({
        email: formData.email,
        password: formData.password
      });
      
      if (result.success) {
        // Check if 2FA is required
        if (result.requires2FA) {
          console.log('[LoginForm] 2FA required, redirecting to 2FA verification');
          setIsLoggingIn(false);
          navigate('/2fa/verify', { 
            state: { 
              email: result.email,
              message: result.message,
              method: result.method
            },
            replace: true 
          });
          return;
        }
        
        // Đợi một chút để đảm bảo AuthContext đã cập nhật user
        await new Promise(resolve => setTimeout(resolve, 200));
        
        // Kiểm tra user từ context hoặc từ localStorage
        let currentUser = user;
        try {
          const storedUser = localStorage.getItem('modernissues_auth_v1');
          if (storedUser) {
            const parsedUser = JSON.parse(storedUser);
            currentUser = parsedUser;
          }
        } catch (e) {
          console.error('[LoginForm] Error reading user from localStorage:', e);
        }
        
        // Nếu không tìm thấy trong context, lấy từ result
        if (!currentUser) {
          currentUser = result.data || result;
        }
        
        // Kiểm tra role (case-insensitive để xử lý các trường hợp 'admin', 'Admin', 'ADMIN', etc.)
        const userRole = currentUser?.role?.toLowerCase();
        console.log('[LoginForm] Login successful, user role:', userRole, 'user:', currentUser);
        
        // Clear flag before navigate
        setIsLoggingIn(false);
        
        // Nếu là admin, redirect đến admin dashboard
        if (userRole === 'admin') {
          console.log('[LoginForm] Admin user detected, redirecting to /admin/dashboard');
          navigate('/admin/dashboard', { replace: true });
        } else {
          // User thường, redirect như bình thường
          const redirectTo = (location.state && location.state.from) || '/';
          console.log('[LoginForm] Regular user, redirecting to:', redirectTo);
          navigate(redirectTo);
        }
      } else {
        setIsLoggingIn(false);
        showError(result.error || 'Đăng nhập thất bại. Vui lòng kiểm tra lại thông tin.');
      }
    } catch (error) {
      setIsLoggingIn(false);
      showError('Có lỗi xảy ra. Vui lòng thử lại sau.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="login-page">

      {/* Breadcrumbs */}
      <div className="breadcrumbs">
        <div className="container">
          <span>Trang chủ / Đăng nhập tài khoản</span>
        </div>
      </div>

      <div className="login-container">
        <div className="container">
          <div className="login-main-centered">
            <div className="login-form-container">
              <h1 className="login-title">ĐĂNG NHẬP TÀI KHOẢN</h1>
              
              <p className="register-link">
                Bạn chưa có tài khoản ? <a href="/register">Đăng ký tại đây</a>
              </p>

              <form className="login-form" onSubmit={handleSubmit}>
                <div className="form-group">
                  <label htmlFor="email">Email *</label>
                  <input
                    type="email"
                    id="email"
                    name="email"
                    placeholder="Email"
                    value={formData.email}
                    onChange={handleInputChange}
                    required
                    autoComplete="email"
                  />
                </div>

                <div className="form-group">
                  <label htmlFor="password">Mật khẩu *</label>
                  <div className="password-input-wrapper">
                    <input
                      type={showPassword ? "text" : "password"}
                      id="password"
                      name="password"
                      placeholder="Mật khẩu"
                      value={formData.password}
                      onChange={handleInputChange}
                      required
                      autoComplete="current-password"
                    />
                    <button
                      type="button"
                      className="password-toggle"
                      onClick={() => setShowPassword(!showPassword)}
                      aria-label={showPassword ? "Ẩn mật khẩu" : "Hiển thị mật khẩu"}
                    >
                      <i className={showPassword ? "fas fa-eye-slash" : "fas fa-eye"}></i>
                    </button>
                  </div>
                </div>

                <div className="forgot-password">
                  <a href="/forgot-password">Quên mật khẩu? Nhấn vào đây</a>
                </div>

                <button type="submit" className="login-btn" disabled={isLoading}>
                  {isLoading ? (
                    <>
                      <i className="fas fa-spinner fa-spin" aria-hidden="true"></i>
                      Đang đăng nhập...
                    </>
                  ) : (
                    'Đăng nhập'
                  )}
                </button>
              </form>
            </div>
          </div>
        </div>
      </div>

      {/* Floating contact buttons */}
      <div className="floating-contacts">
        <a href="#" className="floating-btn chat-btn" aria-label="Chat">
          <i className="fas fa-comments" aria-hidden="true"></i>
          <span>Xin chào!</span>
        </a>
      </div>
    </div>
  );
};

export default LoginForm;
