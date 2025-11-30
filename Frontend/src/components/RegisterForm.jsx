import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useNotification } from '../context/NotificationContext';
import * as userService from '../services/userService';
import './RegisterForm.css';

const RegisterForm = () => {
  const [formData, setFormData] = useState({
    username: '',
    email: '',
    phone: '',
    address: '',
    password: '',
    confirmPassword: ''
  });
  const [errors, setErrors] = useState({});
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const { register } = useAuth();
  const { success, error: showError } = useNotification();
  const navigate = useNavigate();

  // Validation functions
  const validateUsername = (username) => {
    if (!username.trim()) {
      return 'Tên đăng nhập là bắt buộc';
    }
    if (username.length < 3) {
      return 'Tên đăng nhập phải có ít nhất 3 ký tự';
    }
    if (username.length > 50) {
      return 'Tên đăng nhập không được quá 50 ký tự';
    }
    if (!/^[a-zA-Z0-9_]+$/.test(username)) {
      return 'Tên đăng nhập chỉ được chứa chữ cái, số và dấu gạch dưới';
    }
    return '';
  };

  const validateEmail = (email) => {
    if (!email.trim()) {
      return 'Vui lòng nhập email';
    }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email.trim())) {
      return 'Email không đúng định dạng. Vui lòng nhập email hợp lệ (ví dụ: example@email.com)';
    }
    return '';
  };

  const validatePhone = (phone) => {
    if (!phone.trim()) {
      return ''; // Optional field
    }
    const phoneRegex = /^[0-9]{10,11}$/;
    if (!phoneRegex.test(phone.replace(/\s+/g, ''))) {
      return 'Số điện thoại không hợp lệ (10-11 chữ số)';
    }
    return '';
  };

  const validatePassword = (password) => {
    if (!password) {
      return 'Mật khẩu là bắt buộc';
    }
    if (password.length < 6) {
      return 'Mật khẩu phải có ít nhất 6 ký tự';
    }
    if (password.length > 100) {
      return 'Mật khẩu không được quá 100 ký tự';
    }
    return '';
  };

  const validateConfirmPassword = (password, confirmPassword) => {
    if (!confirmPassword) {
      return 'Vui lòng xác nhận mật khẩu';
    }
    if (password !== confirmPassword) {
      return 'Mật khẩu xác nhận không khớp';
    }
    return '';
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    
    // Clear error for this field when user starts typing
    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: '' }));
    }
  };

  const validateForm = () => {
    const newErrors = {};
    
    const usernameError = validateUsername(formData.username);
    if (usernameError) newErrors.username = usernameError;
    
    const emailError = validateEmail(formData.email);
    if (emailError) newErrors.email = emailError;
    
    const phoneError = validatePhone(formData.phone);
    if (phoneError) newErrors.phone = phoneError;
    
    const passwordError = validatePassword(formData.password);
    if (passwordError) newErrors.password = passwordError;
    
    const confirmPasswordError = validateConfirmPassword(formData.password, formData.confirmPassword);
    if (confirmPasswordError) newErrors.confirmPassword = confirmPasswordError;
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleBlur = (e) => {
    const { name, value } = e.target;
    let error = '';
    
    switch (name) {
      case 'username':
        error = validateUsername(value);
        break;
      case 'email':
        error = validateEmail(value);
        break;
      case 'phone':
        error = validatePhone(value);
        break;
      case 'password':
        error = validatePassword(value);
        // Also revalidate confirmPassword if it has value
        if (formData.confirmPassword) {
          const confirmError = validateConfirmPassword(value, formData.confirmPassword);
          setErrors(prev => ({ ...prev, confirmPassword: confirmError }));
        }
        break;
      case 'confirmPassword':
        error = validateConfirmPassword(formData.password, value);
        break;
      default:
        break;
    }
    
    if (error) {
      setErrors(prev => ({ ...prev, [name]: error }));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // Validate form before submitting
    if (!validateForm()) {
      showError('Vui lòng điền đầy đủ thông tin và kiểm tra lại các trường bắt buộc');
      return;
    }
    
    setIsLoading(true);
    setErrors({});
    
    try {
      const registerData = {
        username: formData.username.trim(),
        email: formData.email.trim(),
        password: formData.password
      };
      
      // Only include optional fields if they have values
      if (formData.phone?.trim()) {
        registerData.phone = formData.phone.trim().replace(/\s+/g, '');
      }
      if (formData.address?.trim()) {
        registerData.address = formData.address.trim();
      }
      
      const result = await register(registerData);
      
      if (result && (result.success !== false)) {
        // Backend automatically sends OTP email after registration
        success('Đăng ký thành công! Email xác thực đã được gửi tự động. Vui lòng kiểm tra hộp thư của bạn.');
        // Navigate to verify email page with email and password in state for auto-login after verification
        setTimeout(() => {
          navigate('/verify-email', { 
            state: { 
              email: formData.email.trim(),
              password: formData.password // Store password for auto-login after verification
            } 
          });
        }, 1500);
      } else {
        // Handle API errors
        const errorMessage = result?.error || result?.message || 'Đăng ký thất bại. Vui lòng thử lại.';
        showError(errorMessage);
        setErrors(prev => ({ ...prev, submit: errorMessage }));
        
        // Set field-specific errors if available
        if (errorMessage.toLowerCase().includes('email') || errorMessage.toLowerCase().includes('tài khoản')) {
          setErrors(prev => ({ ...prev, email: errorMessage }));
        } else if (errorMessage.toLowerCase().includes('username') || errorMessage.toLowerCase().includes('tên đăng nhập')) {
          setErrors(prev => ({ ...prev, username: errorMessage }));
        } else if (errorMessage.toLowerCase().includes('mật khẩu') || errorMessage.toLowerCase().includes('password')) {
          setErrors(prev => ({ ...prev, password: errorMessage }));
        }
      }
    } catch (error) {
      // Extract error message from API response
      let errorMessage = 'Có lỗi xảy ra. Vui lòng thử lại sau.';
      
      if (error.message) {
        errorMessage = error.message;
      } else if (error.response?.data?.message) {
        errorMessage = error.response.data.message;
      } else if (error.response?.data?.errors && Array.isArray(error.response.data.errors)) {
        errorMessage = error.response.data.errors.join(', ');
      }
      
      showError(errorMessage);
      setErrors(prev => ({ ...prev, submit: errorMessage }));
      
      // Set field-specific errors if available
      if (errorMessage.toLowerCase().includes('email') || errorMessage.toLowerCase().includes('tài khoản')) {
        setErrors(prev => ({ ...prev, email: errorMessage }));
      } else if (errorMessage.toLowerCase().includes('username') || errorMessage.toLowerCase().includes('tên đăng nhập')) {
        setErrors(prev => ({ ...prev, username: errorMessage }));
      } else if (errorMessage.toLowerCase().includes('mật khẩu') || errorMessage.toLowerCase().includes('password')) {
        setErrors(prev => ({ ...prev, password: errorMessage }));
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="register-page">
      {/* Breadcrumbs */}
      <div className="breadcrumbs">
        <div className="container">
          <span>Trang chủ / Đăng ký tài khoản</span>
        </div>
      </div>

      <div className="register-container">
        <div className="container">
          <div className="register-main-centered">
            <div className="register-form-container">
              <h1 className="register-title">ĐĂNG KÝ TÀI KHOẢN</h1>
              
              <p className="login-link">
                Đã có tài khoản? <a href="/login">Đăng nhập tại đây</a>
              </p>

              <form className="register-form" onSubmit={handleSubmit}>
                {errors.submit && (
                  <div className="error-message submit-error">
                    <i className="fas fa-info-circle" aria-hidden="true"></i>
                    {errors.submit}
                  </div>
                )}

                <div className="form-group">
                  <label htmlFor="username">Tên đăng nhập *</label>
                  <input
                    type="text"
                    id="username"
                    name="username"
                    placeholder="Nhập tên đăng nhập (3-50 ký tự, chữ cái, số, dấu _)"
                    value={formData.username}
                    onChange={handleInputChange}
                    onBlur={handleBlur}
                    autoComplete="username"
                    className={errors.username ? 'error' : ''}
                  />
                  {errors.username && (
                    <span className="error-text">
                      <i className="fas fa-exclamation-circle" aria-hidden="true"></i>
                      {errors.username}
                    </span>
                  )}
                </div>

                <div className="form-group">
                  <label htmlFor="email">Email *</label>
                  <input
                    type="text"
                    id="email"
                    name="email"
                    placeholder="Nhập email"
                    value={formData.email}
                    onChange={handleInputChange}
                    onBlur={handleBlur}
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
                  <label htmlFor="phone">Số điện thoại</label>
                  <input
                    type="tel"
                    id="phone"
                    name="phone"
                    placeholder="Nhập số điện thoại (10-11 chữ số, tùy chọn)"
                    value={formData.phone}
                    onChange={handleInputChange}
                    onBlur={handleBlur}
                    autoComplete="tel"
                    className={errors.phone ? 'error' : ''}
                  />
                  {errors.phone && (
                    <span className="error-text">
                      <i className="fas fa-exclamation-circle" aria-hidden="true"></i>
                      {errors.phone}
                    </span>
                  )}
                </div>

                <div className="form-group">
                  <label htmlFor="address">Địa chỉ</label>
                  <input
                    type="text"
                    id="address"
                    name="address"
                    placeholder="Nhập địa chỉ (tùy chọn)"
                    value={formData.address}
                    onChange={handleInputChange}
                    autoComplete="street-address"
                  />
                </div>

                <div className="form-group">
                  <label htmlFor="password">Mật khẩu *</label>
                  <div className="password-input-wrapper">
                    <input
                      type={showPassword ? "text" : "password"}
                      id="password"
                      name="password"
                      placeholder="Nhập mật khẩu (tối thiểu 6 ký tự)"
                      value={formData.password}
                      onChange={handleInputChange}
                      onBlur={handleBlur}
                      autoComplete="new-password"
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

                <div className="form-group">
                  <label htmlFor="confirmPassword">Xác nhận mật khẩu *</label>
                  <div className="password-input-wrapper">
                    <input
                      type={showConfirmPassword ? "text" : "password"}
                      id="confirmPassword"
                      name="confirmPassword"
                      placeholder="Nhập lại mật khẩu"
                      value={formData.confirmPassword}
                      onChange={handleInputChange}
                      onBlur={handleBlur}
                      autoComplete="new-password"
                      className={errors.confirmPassword ? 'error' : ''}
                    />
                    <button
                      type="button"
                      className="password-toggle"
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      aria-label={showConfirmPassword ? "Ẩn mật khẩu" : "Hiển thị mật khẩu"}
                    >
                      <i className={showConfirmPassword ? "fas fa-eye-slash" : "fas fa-eye"}></i>
                    </button>
                  </div>
                  {errors.confirmPassword && (
                    <span className="error-text">
                      <i className="fas fa-exclamation-circle" aria-hidden="true"></i>
                      {errors.confirmPassword}
                    </span>
                  )}
                </div>

                <button type="submit" className="register-btn" disabled={isLoading}>
                  {isLoading ? (
                    <>
                      <i className="fas fa-spinner fa-spin" aria-hidden="true"></i>
                      Đang đăng ký...
                    </>
                  ) : (
                    'Đăng ký'
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

export default RegisterForm;
