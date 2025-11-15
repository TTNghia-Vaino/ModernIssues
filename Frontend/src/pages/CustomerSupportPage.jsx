import React from 'react';
import './CustomerSupportPage.css';

const CustomerSupportPage = () => {
  const supportServices = [
    {
      id: 1,
      title: 'GỬI YÊU CẦU XUẤT HÓA ĐƠN',
      icon: '📄',
      description: 'Yêu cầu xuất hóa đơn VAT cho đơn hàng của bạn',
      link: '/invoice-request'
    },
    {
      id: 2,
      title: 'TRA CỨU THÔNG TIN HÓA ĐƠN',
      icon: '🔍',
      description: 'Tra cứu thông tin chi tiết hóa đơn đã xuất',
      link: '/invoice-lookup'
    },
    {
      id: 3,
      title: 'TRA CỨU HÀNH TRÌNH ĐỐN HÀNG',
      icon: '📍',
      description: 'Theo dõi hành trình vận chuyển đơn hàng',
      link: '/order-tracking'
    },
    {
      id: 4,
      title: 'ĐỔI TRẢ HÀNG',
      icon: '↩️',
      description: 'Yêu cầu đổi trả sản phẩm theo chính sách',
      link: '/return-policy'
    },
    {
      id: 5,
      title: 'GỬI YÊU CẦU HỖ TRỢ KỸ THUẬT',
      icon: '💻',
      description: 'Nhận hỗ trợ kỹ thuật từ đội ngũ chuyên gia',
      link: '/technical-support'
    },
    {
      id: 6,
      title: 'GỬI THÔNG TIN BẢO HÀNH',
      icon: '🔧',
      description: 'Gửi yêu cầu bảo hành sản phẩm',
      link: '/warranty-request'
    },
    {
      id: 7,
      title: 'PHẢN ÁNH CHẤT LƯỢNG',
      icon: '⭐',
      description: 'Góp ý, phản ánh về chất lượng sản phẩm/dịch vụ',
      link: '/feedback'
    },
    {
      id: 8,
      title: 'TRUNG TÂM TRỢ GIÚP',
      icon: '❓',
      description: 'Tìm câu trả lời cho các câu hỏi thường gặp',
      link: '/help-center'
    }
  ];

  return (
    <div className="customer-support-page">
      {/* Hero Section */}
      <div className="support-hero">
        <div className="hero-content">
          <h1 className="hero-title">
            Trung tâm Hỗ trợ khách hàng | <span className="brand-name">TechZone</span>
          </h1>
          <p className="hero-subtitle">
            Bạn có thể tìm thấy sự hỗ trợ của chúng tôi ở đây, thông qua việc gửi cho chúng tôi những yêu cầu.
          </p>
        </div>
      </div>

      {/* Support Services Grid */}
      <div className="container">
        <div className="support-services-grid">
          {supportServices.map((service) => (
            <div key={service.id} className="support-card">
              <div className="support-card-inner">
                <div className="support-icon">
                  <div className="astronaut-wrapper">
                    <span className="service-emoji">{service.icon}</span>
                  </div>
                </div>
                <h3 className="support-title">{service.title}</h3>
                <p className="support-description">{service.description}</p>
                <button className="support-btn">
                  Gửi yêu cầu <i className="fas fa-arrow-right"></i>
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Contact Section */}
      <div className="support-contact-section">
        <div className="container">
          <div className="contact-grid">
            <div className="contact-item">
              <i className="fas fa-phone-alt"></i>
              <div className="contact-info">
                <h4>Hotline hỗ trợ</h4>
                <p>(028) 7301 3878</p>
                <span className="contact-time">08:00 - 20:00 hàng ngày</span>
              </div>
            </div>
            <div className="contact-item">
              <i className="fab fa-facebook-messenger"></i>
              <div className="contact-info">
                <h4>Chat với chúng tôi</h4>
                <p>Zalo OA TechZone</p>
                <span className="contact-time">08:00 - 20:00 hàng ngày</span>
              </div>
            </div>
            <div className="contact-item">
              <i className="fas fa-envelope"></i>
              <div className="contact-info">
                <h4>Email hỗ trợ</h4>
                <p>bachxuancanh@techzone.vn</p>
                <span className="contact-time">Phản hồi trong 24h</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* FAQ Section */}
      <div className="faq-preview-section">
        <div className="container">
          <h2 className="section-title">Câu hỏi thường gặp</h2>
          <div className="faq-grid">
            <div className="faq-item">
              <h4>Làm thế nào để tra cứu đơn hàng?</h4>
              <p>Bạn có thể tra cứu đơn hàng bằng cách nhập mã đơn hàng trong mục "Tra cứu hành trình đơn hàng".</p>
            </div>
            <div className="faq-item">
              <h4>Chính sách đổi trả như thế nào?</h4>
              <p>TechZone hỗ trợ đổi trả trong vòng 7 ngày với sản phẩm còn nguyên tem, hộp và chưa qua sử dụng.</p>
            </div>
            <div className="faq-item">
              <h4>Thời gian bảo hành là bao lâu?</h4>
              <p>Tùy thuộc vào từng sản phẩm, thời gian bảo hành từ 12-36 tháng theo chính sách của nhà sản xuất.</p>
            </div>
            <div className="faq-item">
              <h4>Có hỗ trợ kỹ thuật trực tuyến không?</h4>
              <p>Có, đội ngũ kỹ thuật của chúng tôi sẵn sàng hỗ trợ trực tuyến qua Hotline, Zalo hoặc Email.</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CustomerSupportPage;




