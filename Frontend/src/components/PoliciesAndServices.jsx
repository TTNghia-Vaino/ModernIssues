import React from 'react';
import './PoliciesAndServices.css';

function PoliciesAndServices() {
  const policies = [
    {
      id: 1,
      icon: "fas fa-shipping-fast",
      title: "Giao hàng Siêu Tốc 2-4H",
      description: "Giao hàng trong nội thành HCM & Hà Nội nhanh chóng từ 2-4 giờ",
      details: "Miễn phí giao hàng cho đơn hàng từ 500k"
    },
    {
      id: 2,
      icon: "fas fa-undo-alt",
      title: "7 ngày đổi trả",
      description: "Yên tâm mua sắm với chính sách đổi trả trong vòng 7 ngày",
      details: "Đổi trả miễn phí, không cần lý do"
    },
    {
      id: 3,
      icon: "fas fa-shield-alt",
      title: "Bảo hành chính hãng",
      description: "Tất cả sản phẩm đều có bảo hành chính hãng từ nhà sản xuất",
      details: "Hỗ trợ bảo hành tại 50+ điểm trên toàn quốc"
    },
    {
      id: 4,
      icon: "fas fa-credit-card",
      title: "Thanh toán linh hoạt",
      description: "Hỗ trợ nhiều hình thức thanh toán tiện lợi và an toàn",
      details: "COD, chuyển khoản, thẻ tín dụng, trả góp 0%"
    },
    {
      id: 5,
      icon: "fas fa-headset",
      title: "Hỗ trợ 24/7",
      description: "Đội ngũ tư vấn chuyên nghiệp sẵn sàng hỗ trợ mọi lúc",
      details: "Hotline, chat online, email hỗ trợ"
    },
    {
      id: 6,
      icon: "fas fa-gift",
      title: "Quà tặng hấp dẫn",
      description: "Nhiều chương trình khuyến mãi và quà tặng giá trị",
      details: "Tặng phụ kiện, giảm giá, tích điểm đổi quà"
    }
  ];

  const services = [
    {
      id: 1,
      title: "Tư vấn Build PC",
      description: "Đội ngũ chuyên gia tư vấn build PC phù hợp với nhu cầu và ngân sách",
      icon: "fas fa-cogs",
      features: ["Tư vấn miễn phí", "Build PC tối ưu", "Bảo hành lắp ráp"]
    },
    {
      id: 2,
      title: "Sửa chữa Laptop",
      description: "Dịch vụ sửa chữa laptop chuyên nghiệp với linh kiện chính hãng",
      icon: "fas fa-tools",
      features: ["Bảo hành 6 tháng", "Linh kiện chính hãng", "Sửa chữa tại nhà"]
    },
    {
      id: 3,
      title: "Nâng cấp PC",
      description: "Dịch vụ nâng cấp PC gaming, laptop để tăng hiệu năng",
      icon: "fas fa-arrow-up",
      features: ["Tư vấn nâng cấp", "Lắp đặt miễn phí", "Bảo hành 1 năm"]
    }
  ];

  return (
    <section className="policies-and-services">
      <div className="container">
        {/* Policies Section */}
        <div className="policies-section">
          <div className="section-header">
            <h2 className="section-title">Chính sách & Dịch vụ</h2>
            <p className="section-subtitle">Cam kết mang đến trải nghiệm mua sắm tốt nhất</p>
          </div>

          <div className="policies-grid">
            {policies.map((policy) => (
              <div key={policy.id} className="policy-card">
                <div className="policy-icon">
                  <i className={policy.icon}></i>
                </div>
                <div className="policy-content">
                  <h3 className="policy-title">{policy.title}</h3>
                  <p className="policy-description">{policy.description}</p>
                  <div className="policy-details">
                    <i className="fas fa-check-circle"></i>
                    <span>{policy.details}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Services Section */}
        <div className="services-section">
          <div className="section-header">
            <h2 className="section-title">Dịch vụ chuyên nghiệp</h2>
            <p className="section-subtitle">Đội ngũ kỹ thuật viên giàu kinh nghiệm</p>
          </div>

          <div className="services-grid">
            {services.map((service) => (
              <div key={service.id} className="service-card">
                <div className="service-header">
                  <div className="service-icon">
                    <i className={service.icon}></i>
                  </div>
                  <h3 className="service-title">{service.title}</h3>
                </div>
                <p className="service-description">{service.description}</p>
                <ul className="service-features">
                  {service.features.map((feature, index) => (
                    <li key={index} className="feature-item">
                      <i className="fas fa-check"></i>
                      {feature}
                    </li>
                  ))}
                </ul>
                <button className="service-btn">
                  Tìm hiểu thêm
                  <i className="fas fa-arrow-right"></i>
                </button>
              </div>
            ))}
          </div>
        </div>

        {/* Contact Info */}
        <div className="contact-info-section">
          <div className="contact-card">
            <div className="contact-content">
              <h3>Cần hỗ trợ tư vấn?</h3>
              <p>Đội ngũ chuyên gia sẵn sàng hỗ trợ bạn 24/7</p>
              <div className="contact-methods">
                <div className="contact-method">
                  <i className="fas fa-phone"></i>
                  <div>
                    <span>Hotline</span>
                    <strong>(028) 7301 3878</strong>
                  </div>
                </div>
                <div className="contact-method">
                  <i className="fas fa-envelope"></i>
                  <div>
                    <span>Email</span>
                    <strong>support@memoryzone.com.vn</strong>
                  </div>
                </div>
                <div className="contact-method">
                  <i className="fas fa-comments"></i>
                  <div>
                    <span>Chat Online</span>
                    <strong>Hỗ trợ trực tuyến</strong>
                  </div>
                </div>
              </div>
            </div>
            <div className="contact-image">
              <img src="/support-team.jpg" alt="Support Team" />
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

export default PoliciesAndServices;



