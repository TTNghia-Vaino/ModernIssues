import React, { useState } from 'react';
import './RegisterForm.css';

const RegisterForm = () => {
  const [formData, setFormData] = useState({
    fullName: '',
    email: '',
    phone: '',
    password: '',
    confirmPassword: ''
  });

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    
    if (formData.password !== formData.confirmPassword) {
      alert('Mật khẩu xác nhận không khớp!');
      return;
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
                <div className="form-group">
                  <label htmlFor="fullName">Họ và tên *</label>
                  <input
                    type="text"
                    id="fullName"
                    name="fullName"
                    placeholder="Nhập họ và tên"
                    value={formData.fullName}
                    onChange={handleInputChange}
                    required
                    autoComplete="name"
                  />
                </div>

                <div className="form-group">
                  <label htmlFor="email">Email *</label>
                  <input
                    type="email"
                    id="email"
                    name="email"
                    placeholder="Nhập email"
                    value={formData.email}
                    onChange={handleInputChange}
                    required
                    autoComplete="email"
                  />
                </div>

                <div className="form-group">
                  <label htmlFor="phone">Số điện thoại *</label>
                  <input
                    type="tel"
                    id="phone"
                    name="phone"
                    placeholder="Nhập số điện thoại"
                    value={formData.phone}
                    onChange={handleInputChange}
                    required
                    autoComplete="tel"
                  />
                </div>

                <div className="form-group">
                  <label htmlFor="password">Mật khẩu *</label>
                  <input
                    type="password"
                    id="password"
                    name="password"
                    placeholder="Nhập mật khẩu"
                    value={formData.password}
                    onChange={handleInputChange}
                    required
                    autoComplete="new-password"
                  />
                </div>

                <div className="form-group">
                  <label htmlFor="confirmPassword">Xác nhận mật khẩu *</label>
                  <input
                    type="password"
                    id="confirmPassword"
                    name="confirmPassword"
                    placeholder="Nhập lại mật khẩu"
                    value={formData.confirmPassword}
                    onChange={handleInputChange}
                    required
                    autoComplete="new-password"
                  />
                </div>
                <button type="submit" className="register-btn">
                  Đăng ký
                </button>
              </form>

              <div className="social-register">
                <p>Hoặc đăng ký bằng</p>
                <div className="social-buttons">
                  <button type="button" className="social-btn facebook-btn">
                    <i className="fab fa-facebook-f" aria-hidden="true"></i>
                    Facebook
                  </button>
                  <button type="button" className="social-btn google-btn">
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

export default RegisterForm;
