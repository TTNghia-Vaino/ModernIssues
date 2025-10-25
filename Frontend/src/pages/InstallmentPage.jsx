import React, { useState } from 'react';
import './InstallmentPage.css';

const InstallmentPage = () => {
  const [activeTab, setActiveTab] = useState('creditCard');

  const banks = [
    { name: 'SHB', logo: '/images/banks/shb.png' },
    { name: 'Techcombank', logo: '/images/banks/techcombank.png' },
    { name: 'Ngân hàng Bản Việt', logo: '/images/banks/banviet.png' },
    { name: 'ACB', logo: '/images/banks/acb.png' },
    { name: 'Sacombank', logo: '/images/banks/sacombank.png' },
    { name: 'FE Credit', logo: '/images/banks/fecredit.png' },
    { name: 'Citibank', logo: '/images/banks/citi.png' },
    { name: 'VPBank', logo: '/images/banks/vpbank.png' },
    { name: 'TPBank', logo: '/images/banks/tpbank.png' },
    { name: 'VIB', logo: '/images/banks/vib.png' },
    { name: 'HD Saison', logo: '/images/banks/hdsaison.png' },
    { name: 'Home Credit', logo: '/images/banks/homecredit.png' },
  ];

  return (
    <div className="installment-page">
      {/* Hero Banner */}
      <div className="installment-hero">
        <div className="hero-lights">
          <div className="light star"></div>
          <div className="light bulb blue"></div>
          <div className="light bulb pink"></div>
          <div className="light bulb yellow"></div>
          <div className="light star right"></div>
          <div className="light bulb pink right"></div>
          <div className="light bulb yellow right"></div>
        </div>
        
        <div className="hero-content">
          <h1 className="hero-title">HƯỚNG DẪN TRẢ GÓP</h1>
          <p className="hero-subtitle">Với nhiều ưu đãi hấp dẫn</p>
          
          <div className="hero-benefits">
            <div className="benefit-card">
              <span className="benefit-label">0 phí</span>
              <span className="benefit-desc">quẹt thẻ</span>
            </div>
            <div className="benefit-card">
              <span className="benefit-label">0%</span>
              <span className="benefit-desc">lãi suất</span>
            </div>
          </div>
          
          <button className="hero-cta">
            Tìm hiểu ngay <i className="fas fa-arrow-right"></i>
          </button>
        </div>
      </div>

      {/* Main Content */}
      <div className="installment-content">
        <div className="container">
          {/* Tab Navigation */}
          <div className="installment-tabs">
            <button 
              className={`tab-btn ${activeTab === 'creditCard' ? 'active' : ''}`}
              onClick={() => setActiveTab('creditCard')}
            >
              <i className="fas fa-credit-card"></i>
              Trả góp qua thẻ Tín Dụng
            </button>
            <button 
              className={`tab-btn ${activeTab === 'fundiin' ? 'active' : ''}`}
              onClick={() => setActiveTab('fundiin')}
            >
              <i className="fas fa-shopping-bag"></i>
              Mua trước Trả sau qua Fundiin
            </button>
            <button 
              className={`tab-btn ${activeTab === 'company' ? 'active' : ''}`}
              onClick={() => setActiveTab('company')}
            >
              <i className="fas fa-building"></i>
              Trả góp qua công ty tài chính
            </button>
          </div>

          {/* Tab Content */}
          <div className="tab-content">
            {activeTab === 'creditCard' && (
              <div className="content-section">
                <div className="section-left">
                  <h2 className="section-title">Trả góp qua thẻ Tín Dụng</h2>
                  
                  <div className="info-card">
                    <h3 className="info-title">
                      <span className="number">1.</span> Điều kiện cần có
                    </h3>
                    <ul className="info-list">
                      <li>• Có thẻ tín dụng (Credit Card) được phát hành trong 30 ngân hàng chấp nhận thẻ tại Việt Nam.</li>
                      <li>• Thanh toán cho đơn hàng hoặc sản phẩm có giá trị <strong>từ 3.000.000đ</strong> trở lên.</li>
                      <li>• Thẻ tín dụng còn hạn mức lớn hơn giá trị đơn hàng, không có nợ xấu với ngân hàng phát hành thẻ.</li>
                    </ul>
                  </div>

                  <div className="info-card">
                    <h3 className="info-title">
                      <span className="number">2.</span> Lưu ý quan trọng
                    </h3>
                    <ul className="info-list">
                      <li>• Trả góp 0% lãi suất áp dụng cho các ngân hàng đối tác (xem danh sách bên dưới).</li>
                      <li>• Khách hàng cần liên hệ ngân hàng phát hành thẻ để đăng ký gói trả góp phù hợp.</li>
                      <li>• Thời gian trả góp: 3, 6, 9, 12, 18, 24 tháng tùy theo từng ngân hàng.</li>
                      <li>• Phí chuyển đổi (nếu có) do ngân hàng quy định.</li>
                    </ul>
                  </div>

                  <div className="info-card">
                    <h3 className="info-title">
                      <span className="number">3.</span> Quy trình thanh toán
                    </h3>
                    <div className="process-steps">
                      <div className="step">
                        <div className="step-number">1</div>
                        <div className="step-content">
                          <h4>Chọn sản phẩm</h4>
                          <p>Thêm sản phẩm vào giỏ hàng và tiến hành thanh toán</p>
                        </div>
                      </div>
                      <div className="step">
                        <div className="step-number">2</div>
                        <div className="step-content">
                          <h4>Chọn hình thức trả góp</h4>
                          <p>Tại trang thanh toán, chọn "Trả góp qua thẻ tín dụng"</p>
                        </div>
                      </div>
                      <div className="step">
                        <div className="step-number">3</div>
                        <div className="step-content">
                          <h4>Nhập thông tin thẻ</h4>
                          <p>Điền đầy đủ thông tin thẻ tín dụng và xác nhận</p>
                        </div>
                      </div>
                      <div className="step">
                        <div className="step-number">4</div>
                        <div className="step-content">
                          <h4>Hoàn tất đơn hàng</h4>
                          <p>Nhận sản phẩm và thanh toán theo kỳ hạn đã đăng ký</p>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Bank Partners */}
                  <div className="bank-partners">
                    <h3 className="partners-title">Ngân hàng đối tác</h3>
                    <div className="banks-grid">
                      {banks.map((bank, index) => (
                        <div key={index} className="bank-card">
                          <div className="bank-logo-placeholder">
                            {bank.name}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="section-right">
                  <div className="sticky-card">
                    <img src="/images/payment/card-payment.svg" alt="Payment" className="card-image" />
                    <h3 className="card-title">Thanh toán dễ dàng</h3>
                    <p className="card-text">Chỉ cần vài thao tác đơn giản là bạn đã có thể sở hữu sản phẩm yêu thích</p>
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'fundiin' && (
              <div className="content-section">
                <div className="section-left">
                  <h2 className="section-title">Mua trước Trả sau qua Fundiin</h2>
                  
                  <div className="info-card">
                    <h3 className="info-title">
                      <span className="number">1.</span> Fundiin là gì?
                    </h3>
                    <ul className="info-list">
                      <li>• Fundiin là dịch vụ Mua trước - Trả sau (BNPL) tiên phong tại Việt Nam.</li>
                      <li>• Không cần thẻ tín dụng, không kiểm tra lịch sử tín dụng.</li>
                      <li>• Phê duyệt nhanh chóng trong vòng 30 giây.</li>
                      <li>• Áp dụng cho đơn hàng từ 1.000.000đ đến 50.000.000đ.</li>
                    </ul>
                  </div>

                  <div className="info-card">
                    <h3 className="info-title">
                      <span className="number">2.</span> Điều kiện sử dụng
                    </h3>
                    <ul className="info-list">
                      <li>• Công dân Việt Nam từ 18 tuổi trở lên.</li>
                      <li>• Có CMND/CCCD còn hiệu lực.</li>
                      <li>• Có tài khoản ngân hàng và điện thoại di động.</li>
                      <li>• Tải app Fundiin và đăng ký tài khoản.</li>
                    </ul>
                  </div>

                  <div className="info-card">
                    <h3 className="info-title">
                      <span className="number">3.</span> Ưu điểm vượt trội
                    </h3>
                    <ul className="info-list">
                      <li>✓ <strong>0% lãi suất</strong> - Không phí trả góp</li>
                      <li>✓ <strong>Không cần thẻ tín dụng</strong> - Dễ dàng phê duyệt</li>
                      <li>✓ <strong>Trả góp linh hoạt</strong> - 3, 6, 9, 12 tháng</li>
                      <li>✓ <strong>Thanh toán nhanh</strong> - Chỉ 3 phút hoàn tất</li>
                    </ul>
                  </div>

                  <div className="info-card">
                    <h3 className="info-title">
                      <span className="number">4.</span> Hướng dẫn sử dụng
                    </h3>
                    <div className="process-steps">
                      <div className="step">
                        <div className="step-number">1</div>
                        <div className="step-content">
                          <h4>Tải app Fundiin</h4>
                          <p>Download app Fundiin trên App Store hoặc Google Play</p>
                        </div>
                      </div>
                      <div className="step">
                        <div className="step-number">2</div>
                        <div className="step-content">
                          <h4>Đăng ký tài khoản</h4>
                          <p>Điền thông tin cá nhân và xác thực danh tính</p>
                        </div>
                      </div>
                      <div className="step">
                        <div className="step-number">3</div>
                        <div className="step-content">
                          <h4>Mua sắm tại TechZone</h4>
                          <p>Chọn sản phẩm và chọn "Thanh toán qua Fundiin"</p>
                        </div>
                      </div>
                      <div className="step">
                        <div className="step-number">4</div>
                        <div className="step-content">
                          <h4>Nhận hàng & Trả góp</h4>
                          <p>Nhận sản phẩm ngay, trả tiền theo tháng</p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="section-right">
                  <div className="sticky-card fundiin-card">
                    <div className="fundiin-logo">Fundiin</div>
                    <h3 className="card-title">Mua ngay, trả sau</h3>
                    <p className="card-text">Không cần thẻ tín dụng<br/>Phê duyệt trong 30s</p>
                    <div className="fundiin-benefits">
                      <div className="benefit-item">
                        <i className="fas fa-check-circle"></i>
                        <span>0% lãi suất</span>
                      </div>
                      <div className="benefit-item">
                        <i className="fas fa-check-circle"></i>
                        <span>Không phí ẩn</span>
                      </div>
                      <div className="benefit-item">
                        <i className="fas fa-check-circle"></i>
                        <span>Duyệt tự động</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'company' && (
              <div className="content-section">
                <div className="section-left">
                  <h2 className="section-title">Trả góp qua công ty tài chính</h2>
                  
                  <div className="info-card">
                    <h3 className="info-title">
                      <span className="number">1.</span> Giới thiệu
                    </h3>
                    <ul className="info-list">
                      <li>• Hình thức trả góp phổ biến cho các sản phẩm giá trị cao.</li>
                      <li>• Không cần thẻ tín dụng, chỉ cần CMND/CCCD.</li>
                      <li>• Hồ sơ đơn giản, duyệt nhanh trong ngày.</li>
                      <li>• Áp dụng cho đơn hàng từ 3.000.000đ trở lên.</li>
                    </ul>
                  </div>

                  <div className="info-card">
                    <h3 className="info-title">
                      <span className="number">2.</span> Hồ sơ cần thiết
                    </h3>
                    <ul className="info-list">
                      <li>• CMND/CCCD hoặc Hộ chiếu (bản photo công chứng)</li>
                      <li>• Hộ khẩu hoặc Sổ tạm trú (bản photo)</li>
                      <li>• Giấy xác nhận thu nhập hoặc Bảng lương 3 tháng gần nhất</li>
                      <li>• Hóa đơn điện/nước tại địa chỉ cư trú</li>
                    </ul>
                  </div>

                  <div className="info-card">
                    <h3 className="info-title">
                      <span className="number">3.</span> Đối tác tài chính
                    </h3>
                    <div className="finance-partners">
                      <div className="partner-card">
                        <div className="partner-name">Home Credit</div>
                        <ul className="partner-features">
                          <li>• Lãi suất ưu đãi 0% - 2.5%/tháng</li>
                          <li>• Trả góp 6-24 tháng</li>
                          <li>• Duyệt hồ sơ trong 2h</li>
                        </ul>
                      </div>
                      <div className="partner-card">
                        <div className="partner-name">FE Credit</div>
                        <ul className="partner-features">
                          <li>• Lãi suất từ 0%</li>
                          <li>• Trả góp 3-18 tháng</li>
                          <li>• Không cần chứng minh thu nhập</li>
                        </ul>
                      </div>
                      <div className="partner-card">
                        <div className="partner-name">HD Saison</div>
                        <ul className="partner-features">
                          <li>• Lãi suất cạnh tranh</li>
                          <li>• Trả góp 6-12 tháng</li>
                          <li>• Hỗ trợ 24/7</li>
                        </ul>
                      </div>
                    </div>
                  </div>

                  <div className="info-card">
                    <h3 className="info-title">
                      <span className="number">4.</span> Quy trình đăng ký
                    </h3>
                    <div className="process-steps">
                      <div className="step">
                        <div className="step-number">1</div>
                        <div className="step-content">
                          <h4>Chọn sản phẩm</h4>
                          <p>Chọn sản phẩm và hình thức trả góp công ty tài chính</p>
                        </div>
                      </div>
                      <div className="step">
                        <div className="step-number">2</div>
                        <div className="step-content">
                          <h4>Nộp hồ sơ</h4>
                          <p>Chuẩn bị và nộp hồ sơ tại cửa hàng hoặc online</p>
                        </div>
                      </div>
                      <div className="step">
                        <div className="step-number">3</div>
                        <div className="step-content">
                          <h4>Chờ phê duyệt</h4>
                          <p>Công ty tài chính xét duyệt trong vòng 2-4 giờ</p>
                        </div>
                      </div>
                      <div className="step">
                        <div className="step-number">4</div>
                        <div className="step-content">
                          <h4>Ký hợp đồng & Nhận hàng</h4>
                          <p>Ký hợp đồng và nhận sản phẩm ngay sau khi duyệt</p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="section-right">
                  <div className="sticky-card company-card">
                    <i className="fas fa-building card-icon"></i>
                    <h3 className="card-title">Công ty tài chính</h3>
                    <p className="card-text">Giải pháp tài chính linh hoạt cho mọi nhu cầu mua sắm</p>
                    <div className="company-stats">
                      <div className="stat-item">
                        <div className="stat-value">2-4h</div>
                        <div className="stat-label">Thời gian duyệt</div>
                      </div>
                      <div className="stat-item">
                        <div className="stat-value">0-2.5%</div>
                        <div className="stat-label">Lãi suất/tháng</div>
                      </div>
                      <div className="stat-item">
                        <div className="stat-value">3-24</div>
                        <div className="stat-label">Tháng trả góp</div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default InstallmentPage;

