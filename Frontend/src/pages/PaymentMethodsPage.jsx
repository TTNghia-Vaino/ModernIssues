import React from 'react';
import './PaymentMethodsPage.css';

const PaymentMethodsPage = () => {
  const paymentMethods = [
    {
      id: 1,
      title: 'Thanh toán Chuyển khoản',
      description: 'Thanh toán chuyển khoản qua ngân hàng bằng hình thức quét mã QR Code rất an toàn.',
      icon: (
        <svg viewBox="0 0 200 200" className="payment-svg">
          <rect x="40" y="50" width="120" height="80" rx="10" fill="#4CAF50" opacity="0.2"/>
          <rect x="50" y="40" width="100" height="100" rx="8" fill="#E8F5E9" stroke="#4CAF50" strokeWidth="2"/>
          <rect x="60" y="55" width="30" height="30" rx="4" fill="#4CAF50"/>
          <rect x="100" y="60" width="40" height="4" rx="2" fill="#81C784"/>
          <rect x="100" y="70" width="30" height="4" rx="2" fill="#A5D6A7"/>
          <rect x="60" y="95" width="80" height="35" rx="4" fill="white" stroke="#4CAF50" strokeWidth="2"/>
          <rect x="65" y="100" width="10" height="10" fill="#4CAF50"/>
          <rect x="77" y="100" width="10" height="10" fill="#4CAF50"/>
          <rect x="65" y="112" width="10" height="10" fill="#4CAF50"/>
          <rect x="77" y="112" width="10" height="10" fill="#4CAF50"/>
          <rect x="92" y="100" width="10" height="10" fill="#4CAF50"/>
          <rect x="104" y="100" width="10" height="10" fill="#4CAF50"/>
          <rect x="116" y="100" width="10" height="10" fill="#4CAF50"/>
          <rect x="128" y="100" width="10" height="10" fill="#4CAF50"/>
        </svg>
      )
    },
    {
      id: 2,
      title: 'Thanh toán Khi nhận hàng',
      description: 'Thanh toán trực tiếp với nhân viên giao nhận hoặc đối tác giao hàng của TechZone.',
      icon: (
        <svg viewBox="0 0 200 200" className="payment-svg">
          <circle cx="100" cy="100" r="60" fill="#FFF3E0" stroke="#FF9800" strokeWidth="3"/>
          <path d="M80 85 L95 70 L105 85" fill="none" stroke="#FF9800" strokeWidth="4" strokeLinecap="round"/>
          <circle cx="95" cy="95" r="8" fill="#FF9800"/>
          <path d="M70 130 Q100 110 130 130" fill="none" stroke="#FF9800" strokeWidth="3" strokeLinecap="round"/>
          <rect x="60" y="140" width="80" height="20" rx="10" fill="#FF9800"/>
          <text x="100" y="155" textAnchor="middle" fill="white" fontSize="14" fontWeight="bold">❤</text>
        </svg>
      )
    },
    {
      id: 3,
      title: 'Thanh toán Trả góp 0% lãi suất',
      description: 'Trả góp 0% qua thẻ tín dụng (Credit Card) Visa, Master, JCB liên kết với 29 ngân hàng.',
      icon: (
        <svg viewBox="0 0 200 200" className="payment-svg">
          <circle cx="100" cy="100" r="70" fill="#E8F5E9" stroke="#4CAF50" strokeWidth="4"/>
          <text x="100" y="90" textAnchor="middle" fontSize="50" fontWeight="bold" fill="#4CAF50">0</text>
          <text x="130" y="70" textAnchor="middle" fontSize="30" fontWeight="bold" fill="#4CAF50">%</text>
          <text x="100" y="130" textAnchor="middle" fontSize="18" fontWeight="bold" fill="#66BB6A">Lãi suất</text>
        </svg>
      )
    },
    {
      id: 4,
      title: 'Thanh toán qua thẻ Visa, Master...',
      description: 'Thanh toán online qua thẻ Visa, Master, JCB (Miễn phí thanh toán)',
      icon: (
        <svg viewBox="0 0 200 200" className="payment-svg">
          <rect x="30" y="60" width="140" height="90" rx="10" fill="#5C6BC0"/>
          <rect x="30" y="60" width="140" height="30" fill="#3F51B5"/>
          <rect x="40" y="100" width="120" height="8" fill="#1A237E"/>
          <rect x="40" y="120" width="50" height="20" rx="4" fill="#FFD700"/>
          <circle cx="150" cy="130" r="15" fill="#FF5722" opacity="0.7"/>
          <circle cx="135" cy="130" r="15" fill="#FFC107" opacity="0.7"/>
        </svg>
      )
    },
    {
      id: 5,
      title: 'Thanh toán Trực tiếp tại cửa hàng',
      description: 'Quý khách có thể đến trực tiếp Showroom TechZone trải nghiệm và thanh toán trực tiếp.',
      icon: (
        <svg viewBox="0 0 200 200" className="payment-svg">
          <rect x="50" y="120" width="100" height="50" rx="5" fill="#8BC34A"/>
          <rect x="60" y="80" width="80" height="50" fill="#AED581"/>
          <polygon points="100,40 50,80 150,80" fill="#7CB342"/>
          <rect x="85" y="130" width="30" height="40" fill="#5D4037"/>
          <rect x="70" y="100" width="20" height="25" fill="#64B5F6" stroke="#1976D2" strokeWidth="2"/>
          <rect x="110" y="100" width="20" height="25" fill="#64B5F6" stroke="#1976D2" strokeWidth="2"/>
          <circle cx="100" cy="50" r="8" fill="#FFD700"/>
        </svg>
      )
    },
    {
      id: 6,
      title: 'Mua trước Trả sau với Fundiin',
      description: 'Thanh toán hàng tháng miễn lãi, dễ dàng với nhiều kỳ hạn.',
      icon: (
        <svg viewBox="0 0 200 200" className="payment-svg">
          <rect x="40" y="60" width="120" height="80" rx="10" fill="#FF6F61" opacity="0.1"/>
          <rect x="50" y="50" width="100" height="100" rx="10" fill="white" stroke="#FF6F61" strokeWidth="3"/>
          <circle cx="70" cy="80" r="8" fill="#FF6F61"/>
          <rect x="85" cy="75" width="50" height="4" rx="2" fill="#FFB3B0"/>
          <rect x="85" cy="85" width="35" height="4" rx="2" fill="#FFB3B0"/>
          <text x="100" y="120" textAnchor="middle" fontSize="24" fontWeight="bold" fill="#FF6F61">F</text>
          <rect x="60" y="130" width="80" height="8" rx="4" fill="#FF6F61"/>
        </svg>
      )
    }
  ];

  return (
    <div className="payment-methods-page">
      {/* Hero Section */}
      <div className="payment-hero">
        <div className="payment-hero-content">
          <h1>Hướng Dẫn Thanh Toán</h1>
          <p>TechZone cung cấp đa dạng phương thức thanh toán để bạn lựa chọn phù hợp nhất</p>
        </div>
      </div>

      {/* Payment Methods Grid */}
      <div className="payment-container">
        <div className="payment-methods-grid">
          {paymentMethods.map(method => (
            <div key={method.id} className="payment-method-card">
              <div className="payment-icon-wrapper">
                {method.icon}
              </div>
              <h3 className="payment-title">{method.title}</h3>
              <p className="payment-description">{method.description}</p>
            </div>
          ))}
        </div>

        {/* Additional Info */}
        <div className="payment-info-section">
          <div className="info-card">
            <h2>📋 Lưu Ý Quan Trọng</h2>
            <ul className="info-list">
              <li>✓ Tất cả giao dịch đều được mã hóa bảo mật SSL</li>
              <li>✓ TechZone không lưu trữ thông tin thẻ thanh toán của bạn</li>
              <li>✓ Vui lòng kiểm tra kỹ thông tin đơn hàng trước khi thanh toán</li>
              <li>✓ Liên hệ hotline (028) 7301 3878 nếu cần hỗ trợ</li>
            </ul>
          </div>

          <div className="info-card">
            <h2>🎁 Ưu Đãi Thanh Toán</h2>
            <ul className="info-list">
              <li>🏦 Giảm ngay 100.000đ khi thanh toán chuyển khoản cho đơn từ 5 triệu</li>
              <li>💳 Hoàn tiền 5% tối đa 500.000đ với thẻ tín dụng quốc tế</li>
              <li>📱 Giảm 50.000đ khi thanh toán qua ví MoMo, ZaloPay</li>
              <li>🎉 Tích điểm thưởng với mọi giao dịch thành công</li>
            </ul>
          </div>
        </div>

        {/* Contact Support */}
        <div className="payment-support">
          <h2>💬 Cần Hỗ Trợ Thanh Toán?</h2>
          <p>Đội ngũ TechZone luôn sẵn sàng hỗ trợ bạn mọi lúc mọi nơi</p>
          <div className="support-contacts">
            <div className="support-item">
              <span className="support-icon">📞</span>
              <div className="support-text">
                <span className="support-label">Hotline</span>
                <span className="support-value">(028) 7301 3878</span>
              </div>
            </div>
            <div className="support-item">
              <span className="support-icon">✉️</span>
              <div className="support-text">
                <span className="support-label">Email</span>
                <span className="support-value">support@techzone.vn</span>
              </div>
            </div>
            <div className="support-item">
              <span className="support-icon">💬</span>
              <div className="support-text">
                <span className="support-label">Chat trực tuyến</span>
                <span className="support-value">8:00 - 22:00</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PaymentMethodsPage;

