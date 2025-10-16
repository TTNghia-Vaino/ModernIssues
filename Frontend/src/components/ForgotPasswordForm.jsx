import React, { useState } from 'react';
import './ForgotPasswordForm.css';

const ForgotPasswordForm = () => {
  const [email, setEmail] = useState('');
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!email) {
      alert('Vui lòng nhập email!');
      return;
    }
    
    setIsLoading(true);
    
    setTimeout(() => {
      setIsLoading(false);
      setIsSubmitted(true);
    }, 2000);
  };

  if (isSubmitted) {
    return (
      <div className="forgot-password-page">
        {/* Breadcrumbs */}
        <div className="breadcrumbs">
          <div className="container">
            <span>Trang chủ / Quên mật khẩu</span>
          </div>
        </div>

        <div className="forgot-password-container">
          <div className="container">
            <div className="forgot-password-main-centered">
              <div className="forgot-password-form-container">
                <div className="success-message">
                  <div className="success-icon">
                    <i className="fas fa-check-circle"></i>
                  </div>
                  <h1 className="success-title">Email đã được gửi!</h1>
                  <p className="success-description">
                    Chúng tôi đã gửi link đặt lại mật khẩu đến email <strong>{email}</strong>
                  </p>
                  <p className="success-note">
                    Vui lòng kiểm tra hộp thư (cả thư mục spam) và làm theo hướng dẫn để đặt lại mật khẩu.
                  </p>
                  <div className="success-actions">
                    <button 
                      type="button"
                      className="back-to-login-btn"
                      onClick={() => window.location.href = '/login'}
                    >
                      Quay lại đăng nhập
                    </button>
                    <button 
                      type="button"
                      className="resend-btn"
                      onClick={() => setIsSubmitted(false)}
                    >
                      Gửi lại email
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
  }

  return (
    <div className="forgot-password-page">
      {/* Breadcrumbs */}
      <div className="breadcrumbs">
        <div className="container">
          <span>Trang chủ / Quên mật khẩu</span>
        </div>
      </div>

      <div className="forgot-password-container">
        <div className="container">
          <div className="forgot-password-main-centered">
            <div className="forgot-password-form-container">
              <h1 className="forgot-password-title">QUÊN MẬT KHẨU</h1>
              
              <p className="forgot-password-description">
                Nhập email của bạn để nhận link đặt lại mật khẩu
              </p>

              <p className="login-link">
                Nhớ mật khẩu? <a href="/login">Đăng nhập tại đây</a>
              </p>

              <form className="forgot-password-form" onSubmit={handleSubmit}>
                <div className="form-group">
                  <label htmlFor="email">Email *</label>
                  <input
                    type="email"
                    id="email"
                    name="email"
                    placeholder="Nhập email của bạn"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    autoComplete="email"
                  />
                </div>

                <button 
                  type="submit" 
                  className="send-reset-btn"
                  disabled={isLoading}
                >
                  {isLoading ? (
                    <>
                      <i className="fas fa-spinner fa-spin" aria-hidden="true"></i>
                      Đang gửi...
                    </>
                  ) : (
                    <>
                      <i className="fas fa-paper-plane" aria-hidden="true"></i>
                      Gửi link đặt lại
                    </>
                  )}
                </button>
              </form>
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

export default ForgotPasswordForm;
