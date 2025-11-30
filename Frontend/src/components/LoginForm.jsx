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
  const [errors, setErrors] = useState({});
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
      // Ưu tiên redirectTo (nếu có) > from (trang hiện tại) > trang chủ
      const redirectTo = (location.state && location.state.redirectTo) || 
                        (location.state && location.state.from) || 
                        '/';
      console.log('[LoginForm] Regular user, redirecting to:', redirectTo);
      navigate(redirectTo, { replace: true });
    }
  }, [user, navigate, location, isLoggingIn, isLoading]);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const validateForm = () => {
    const newErrors = {};
    
    // Validate email
    if (!formData.email || formData.email.trim() === '') {
      newErrors.email = 'Vui lòng nhập email';
    } else {
      // Validate email format
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(formData.email.trim())) {
        newErrors.email = 'Email không đúng định dạng. Vui lòng nhập email hợp lệ (ví dụ: example@email.com)';
      }
    }
    
    // Validate password
    if (!formData.password || formData.password.trim() === '') {
      newErrors.password = 'Vui lòng nhập mật khẩu';
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // Validate form before submitting
    if (!validateForm()) {
      showError('Vui lòng điền đầy đủ thông tin');
      return;
    }
    
    setIsLoading(true);
    setIsLoggingIn(true); // Set flag to prevent useEffect redirect
    setErrors({}); // Clear previous errors
    
    try {
      // Đăng nhập qua API
      const result = await login({
        email: formData.email.trim(),
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
          // User thường, redirect về trang trước đó hoặc trang được chỉ định
          // Ưu tiên redirectTo (nếu có) > from (trang hiện tại) > trang chủ
          const redirectTo = (location.state && location.state.redirectTo) || 
                            (location.state && location.state.from) || 
                            '/';
          console.log('[LoginForm] Regular user, redirecting to:', redirectTo);
          navigate(redirectTo, { replace: true });
        }
      } else {
        setIsLoggingIn(false);
        const errorMsg = result.error || 'Đăng nhập thất bại. Vui lòng kiểm tra lại thông tin.';
        showError(errorMsg);
        
        // Set field-specific errors if available
        if (result.error) {
          if (result.error.toLowerCase().includes('email') || result.error.toLowerCase().includes('tài khoản')) {
            setErrors({ email: result.error });
          } else if (result.error.toLowerCase().includes('mật khẩu') || result.error.toLowerCase().includes('password')) {
            setErrors({ password: result.error });
          }
        }
      }
    } catch (error) {
      setIsLoggingIn(false);
      // Extract error message from API response
      let errorMessage = 'Có lỗi xảy ra. Vui lòng thử lại sau.';
      
      if (error.message) {
        errorMessage = error.message;
      } else if (error.response?.data?.message) {
        errorMessage = error.response.data.message;
      } else if (error.response?.data?.errors && Array.isArray(error.response.data.errors)) {
        errorMessage = error.response.data.errors.join(', ');
      }
      
      // Check for specific error types
      if (errorMessage.toLowerCase().includes('email') || errorMessage.toLowerCase().includes('tài khoản') || errorMessage.toLowerCase().includes('user not found')) {
        setErrors({ email: 'Email hoặc tài khoản không tồn tại' });
        showError('Email hoặc tài khoản không tồn tại');
      } else if (errorMessage.toLowerCase().includes('mật khẩu') || errorMessage.toLowerCase().includes('password') || errorMessage.toLowerCase().includes('incorrect password')) {
        setErrors({ password: 'Mật khẩu không đúng' });
        showError('Mật khẩu không đúng');
      } else if (errorMessage.toLowerCase().includes('unauthorized') || errorMessage.toLowerCase().includes('401')) {
        setErrors({ password: 'Email hoặc mật khẩu không đúng' });
        showError('Email hoặc mật khẩu không đúng');
      } else {
        showError(errorMessage);
      }
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
                    type="text"
                    id="email"
                    name="email"
                    placeholder="Email"
                    value={formData.email}
                    onChange={(e) => {
                      handleInputChange(e);
                      // Clear error when user starts typing
                      if (errors.email) {
                        setErrors(prev => ({ ...prev, email: '' }));
                      }
                    }}
                    onBlur={() => {
                      // Validate email format when user leaves the field
                      if (formData.email && formData.email.trim() !== '') {
                        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
                        if (!emailRegex.test(formData.email.trim())) {
                          setErrors(prev => ({ ...prev, email: 'Email không đúng định dạng. Vui lòng nhập email hợp lệ (ví dụ: example@email.com)' }));
                        }
                      }
                    }}
                    autoComplete="email"
                    className={errors.email ? 'error' : ''}
                  />
                  {errors.email && (
                    <span className="error-text">
                      <i className="fas fa-exclamation-circle" aria-hidden="true"></i>
                      {errors.email}
                    </span>
                  )}
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
                      onChange={(e) => {
                        handleInputChange(e);
                        // Clear error when user starts typing
                        if (errors.password) {
                          setErrors(prev => ({ ...prev, password: '' }));
                        }
                      }}
                      autoComplete="current-password"
                      className={errors.password ? 'error' : ''}
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
                  {errors.password && (
                    <span className="error-text">
                      <i className="fas fa-exclamation-circle" aria-hidden="true"></i>
                      {errors.password}
                    </span>
                  )}
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
