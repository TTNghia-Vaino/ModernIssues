import React from 'react';
import './Footer.css';

function Footer() {
  const currentYear = new Date().getFullYear();

  const footerLinks = {
    products: [
      { name: "Laptop Gaming", link: "/laptop" },
      { name: "PC Gaming", link: "/pc" },
      { name: "Phụ kiện Gaming", link: "/accessories" },
      { name: "Lưu trữ", link: "/storage" },
      { name: "Màn hình", link: "/monitor" },
      { name: "Card đồ họa", link: "/gpu" }
    ],
    support: [
      { name: "Chăm sóc khách hàng", link: "/customer-support" },
      { name: "Hướng dẫn mua hàng", link: "/guide" },
      { name: "Chính sách bảo hành", link: "/warranty" },
      { name: "Chính sách đổi trả", link: "/return" },
      { name: "Hỗ trợ kỹ thuật", link: "/support" },
      { name: "Câu hỏi thường gặp", link: "/faq" },
      { name: "Liên hệ", link: "/contact" }
    ],
    company: [
      { name: "Giới thiệu", link: "/about" },
      { name: "Tin tức", link: "/news" },
      { name: "Tuyển dụng", link: "/careers" },
      { name: "Đối tác", link: "/partners" },
      { name: "Điều khoản sử dụng", link: "/terms" },
      { name: "Chính sách bảo mật", link: "/privacy" }
    ]
  };

  const socialLinks = [
    { name: "Facebook", icon: "fab fa-facebook-f", link: "https://facebook.com/techzone", color: "#1877f2" },
    { name: "Instagram", icon: "fab fa-instagram", link: "https://instagram.com/techzone", color: "#e4405f" },
    { name: "YouTube", icon: "fab fa-youtube", link: "https://youtube.com/techzone", color: "#ff0000" },
    { name: "TikTok", icon: "fab fa-tiktok", link: "https://tiktok.com/@techzone", color: "#000000" },
    { name: "Zalo", icon: "fab fa-facebook-messenger", link: "https://zalo.me/techzone", color: "#0068ff" }
  ];

  return (
    <footer className="footer">
      {/* Main Footer Content */}
      <div className="footer-main">
        <div className="footer-grid">
          {/* Company Info */}
          <div className="footer-section company-info">
              <div className="footer-logo">
                <img src="/Logo-Dai-Hoc-Quoc-Te-Sai-Gon-SIU.webp" alt="SIU" />
                <span>TechZone</span>
              </div>
              <p className="company-description">
                Chuyên cung cấp laptop gaming, PC gaming, phụ kiện và linh kiện máy tính 
                chính hãng với giá tốt nhất thị trường.
              </p>
            </div>

          {/* Products Links */}
          <div className="footer-section">
            <h3 className="footer-title">Sản phẩm</h3>
            <ul className="footer-links">
              {footerLinks.products.map((link, index) => (
                <li key={index}>
                  <a href={link.link}>{link.name}</a>
                </li>
              ))}
            </ul>
          </div>

          {/* Support Links */}
          <div className="footer-section">
            <h3 className="footer-title">Hỗ trợ</h3>
            <ul className="footer-links">
              {footerLinks.support.map((link, index) => (
                <li key={index}>
                  <a href={link.link}>{link.name}</a>
                </li>
              ))}
            </ul>
          </div>

          {/* Company Links */}
          <div className="footer-section">
            <h3 className="footer-title">Công ty</h3>
            <ul className="footer-links">
              {footerLinks.company.map((link, index) => (
                <li key={index}>
                  <a href={link.link}>{link.name}</a>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>

      {/* Footer Bottom */}
      <div className="footer-bottom">
        <div className="footer-bottom-content">
          <div className="copyright">
            <p>&copy; {currentYear} TechZone. Tất cả quyền được bảo lưu.</p>
          </div>
          <div className="certifications">
            <div className="cert-item">
              <i className="fas fa-shield-alt"></i>
              <span>Bảo mật SSL</span>
            </div>
            <div className="cert-item">
              <i className="fas fa-award"></i>
              <span>Chứng nhận ISO</span>
            </div>
            <div className="cert-item">
              <i className="fas fa-check-circle"></i>
              <span>Hàng chính hãng</span>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
}

export default Footer;
