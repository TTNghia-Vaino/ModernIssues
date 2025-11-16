import React from 'react';
import './ContactPage.css';

function ContactPage() {
  return (
    <div className="contact-page">
      {/* Breadcrumb */}
      <div className="breadcrumb">
        <div className="container">
          <a href="/">Trang chủ</a>
          <span className="separator">/</span>
          <span>Liên hệ</span>
        </div>
      </div>

      <div className="container">
        <h1 className="page-title">Liên hệ</h1>

        {/* Hotline Section */}
        <div className="hotline-section">
          <h2 className="section-title">HOTLINE MUA HÀNG:</h2>
          <div className="hotline-info">
            <p className="hotline-phone">
              (028) 7301 3878 <span className="hotline-time">(08:00 - 20:00)</span>
            </p>
            <p className="zalo-info">
              Zalo OA TechZone: <a href="https://zalo.me/techzonevn" target="_blank" rel="noopener noreferrer">https://zalo.me/techzonevn</a> <span className="zalo-time">(08:00 - 20:00)</span>
            </p>
          </div>

          {/* Zalo QR Code */}
          <div className="zalo-qr-container">
            <div className="zalo-qr-card">
              <div className="zalo-header">
                <div className="zalo-logo">
                  <div className="logo-circle">
                    <span className="logo-text">TZ</span>
                  </div>
                  <div className="verified-badge">
                    <i className="fas fa-check"></i>
                  </div>
                </div>
                <div className="zalo-info-text">
                  <p className="zalo-name">TechZone</p>
                  <p className="zalo-type">Tài khoản OA</p>
                </div>
              </div>
              
              <div className="qr-code-placeholder">
                <div className="qr-pattern">
                  <div className="qr-corner top-left"></div>
                  <div className="qr-corner top-right"></div>
                  <div className="qr-corner bottom-left"></div>
                  <div className="qr-dots">
                    {[...Array(64)].map((_, i) => (
                      <div key={i} className="qr-dot"></div>
                    ))}
                  </div>
                  <div className="qr-center">
                    <i className="fab fa-facebook-messenger"></i>
                  </div>
                </div>
              </div>
              
              <p className="qr-instruction">
                Mở Zalo bấm nút quét <i className="fas fa-qrcode"></i> để quét quan tâm
              </p>
            </div>
          </div>
        </div>

        {/* Store Locations Section */}
        <div className="stores-section">
          <h2 className="section-title stores-title">HỆ THỐNG CỬA HÀNG</h2>
          
          <div className="stores-grid">
            {/* HCM Store */}
            <div className="store-card">
              <h3 className="store-location">TP. HCM</h3>
              <div className="store-info">
                <div className="info-row">
                  <i className="fas fa-map-marker-alt"></i>
                  <div className="info-content">
                    <strong>Địa chỉ:</strong>{' '}
                    <a 
                      href="https://maps.google.com/?q=4C+Đông+Xoài,+Phường+Tân+Bình,+Tp.+Hồ+Chí+Minh" 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="address-link"
                    >
                      4C Đông Xoài, Phường Tân Bình, Tp. Hồ Chí Minh
                    </a>
                  </div>
                </div>
                <div className="info-row">
                  <i className="fas fa-clock"></i>
                  <div className="info-content">
                    <strong>Giờ làm việc:</strong> 09:00 - 21:00 từ Thứ 2 đến Chủ nhật.
                  </div>
                </div>
                <div className="info-row">
                  <i className="fas fa-phone"></i>
                  <div className="info-content">
                    <strong>Điện thoại:</strong> <a href="tel:0909305350">0909 305 350</a>
                  </div>
                </div>
              </div>
              <a 
                href="https://maps.google.com/?q=4C+Đông+Xoài,+Phường+Tân+Bình,+Tp.+Hồ+Chí+Minh" 
                target="_blank" 
                rel="noopener noreferrer"
                className="direction-btn"
              >
                <i className="fas fa-directions"></i>
                Chỉ đường
              </a>
            </div>

            {/* Hanoi Store */}
            <div className="store-card">
              <h3 className="store-location">HÀ NỘI</h3>
              <div className="store-info">
                <div className="info-row">
                  <i className="fas fa-map-marker-alt"></i>
                  <div className="info-content">
                    <strong>Địa chỉ:</strong>{' '}
                    <a 
                      href="https://maps.google.com/?q=60+Dịch+Vọng+Hậu,+Phường+Cầu+Giấy,+Tp.+Hà+Nội" 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="address-link"
                    >
                      60 Dịch Vọng Hậu, Phường Cầu Giấy, Tp. Hà Nội
                    </a>
                  </div>
                </div>
                <div className="info-row">
                  <i className="fas fa-clock"></i>
                  <div className="info-content">
                    <strong>Giờ làm việc:</strong> 09:00 - 21:00 từ Thứ 2 đến Chủ nhật.
                  </div>
                </div>
                <div className="info-row">
                  <i className="fas fa-phone"></i>
                  <div className="info-content">
                    <strong>Điện thoại:</strong> <a href="tel:0915305350">0915 305 350</a>
                  </div>
                </div>
              </div>
              <a 
                href="https://maps.google.com/?q=60+Dịch+Vọng+Hậu,+Phường+Cầu+Giấy,+Tp.+Hà+Nội" 
                target="_blank" 
                rel="noopener noreferrer"
                className="direction-btn"
              >
                <i className="fas fa-directions"></i>
                Chỉ đường
              </a>
            </div>
          </div>
        </div>

        {/* Contact Form Section */}
        <div className="contact-form-section">
          <h2 className="section-title">GỬI TIN NHẮN CHO CHÚNG TÔI</h2>
          <form className="contact-form">
            <div className="form-row">
              <div className="form-group">
                <label htmlFor="name">
                  Họ và tên <span className="required">*</span>
                </label>
                <input 
                  type="text" 
                  id="name" 
                  placeholder="Nhập họ và tên của bạn"
                  required
                />
              </div>
              <div className="form-group">
                <label htmlFor="phone">
                  Số điện thoại <span className="required">*</span>
                </label>
                <input 
                  type="tel" 
                  id="phone" 
                  placeholder="Nhập số điện thoại"
                  required
                />
              </div>
            </div>

            <div className="form-row">
              <div className="form-group">
                <label htmlFor="email">
                  Email <span className="required">*</span>
                </label>
                <input 
                  type="email" 
                  id="email" 
                  placeholder="Nhập địa chỉ email"
                  required
                />
              </div>
              <div className="form-group">
                <label htmlFor="subject">Tiêu đề</label>
                <input 
                  type="text" 
                  id="subject" 
                  placeholder="Nhập tiêu đề tin nhắn"
                />
              </div>
            </div>

            <div className="form-group full-width">
              <label htmlFor="message">
                Nội dung <span className="required">*</span>
              </label>
              <textarea 
                id="message" 
                rows="6" 
                placeholder="Nhập nội dung tin nhắn của bạn..."
                required
              ></textarea>
            </div>

            <button type="submit" className="submit-btn">
              <i className="fas fa-paper-plane"></i>
              Gửi tin nhắn
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}

export default ContactPage;

