import React, { useState } from 'react';
import './LoginForm.css';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const LoginForm = () => {
  const [formData, setFormData] = useState({
    email: '',
    password: ''
  });
  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    
    // Kiểm tra đăng nhập admin
    if (formData.email === 'admin@modernissues.com' && formData.password === 'admin123') {
      const adminUser = {
        id: 'admin-001',
        username: 'admin',
        email: 'admin@modernissues.com',
        role: 'admin',
        name: 'Administrator',
        loginTime: new Date().toISOString()
      };
      login(adminUser);
      navigate('/admin/dashboard');
      return;
    }
    
    // Đăng nhập khách hàng thông thường
    const user = { 
      email: formData.email,
      role: 'customer',
      name: formData.email.split('@')[0]
    };
    login(user);
    const redirectTo = (location.state && location.state.from) || '/';
    navigate(redirectTo);
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
              
              <div className="admin-info">
                <p><strong>Tài khoản Admin:</strong></p>
                <p>Email: <code>admin@modernissues.com</code></p>
                <p>Mật khẩu: <code>admin123</code></p>
              </div>

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
                  <input
                    type="password"
                    id="password"
                    name="password"
                    placeholder="Mật khẩu"
                    value={formData.password}
                    onChange={handleInputChange}
                    required
                    autoComplete="current-password"
                  />
                </div>

                <div className="forgot-password">
                  <a href="/forgot-password">Quên mật khẩu? Nhấn vào đây</a>
                </div>

                <button type="submit" className="login-btn">
                  Đăng nhập
                </button>
              </form>

              <div className="social-login">
                <p>Hoặc đăng nhập bằng</p>
                <div className="social-buttons">
                  <button 
                    type="button" 
                    className="social-btn facebook-btn"
                    onClick={() => window.open('https://www.facebook.com', '_blank')}
                  >
                    <i className="fab fa-facebook-f" aria-hidden="true"></i>
                    Facebook
                  </button>
                  <button 
                    type="button" 
                    className="social-btn google-btn"
                    onClick={() => window.open('https://www.google.com', '_blank')}
                  >
                    <i className="fab fa-google" aria-hidden="true"></i>
                    Google
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Floating contact buttons */}
      <div className="floating-contacts">
        <a href="#" className="floating-btn messenger-btn" aria-label="Messenger">
          <i className="fab fa-facebook-messenger" aria-hidden="true"></i>
        </a>
        <a href="#" className="floating-btn zalo-btn" aria-label="Zalo">
          <i className="fab fa-facebook-messenger" aria-hidden="true"></i>
        </a>
        <a href="tel:1900123456" className="floating-btn phone-btn" aria-label="Call">
          <i className="fas fa-phone" aria-hidden="true"></i>
        </a>
        <a href="#" className="floating-btn chat-btn" aria-label="Chat">
          <i className="fas fa-comments" aria-hidden="true"></i>
          <span>Xin chào!</span>
        </a>
      </div>
    </div>
  );
};

export default LoginForm;
