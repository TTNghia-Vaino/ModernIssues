import React, { useState } from 'react';
import './InstallmentPage.css';

const InstallmentPage = () => {
  const [activeTab, setActiveTab] = useState('creditCard');
  const [calculatorPrice, setCalculatorPrice] = useState('');
  const [calculatorMonths, setCalculatorMonths] = useState(6);

  const formatPrice = (price) => {
    return new Intl.NumberFormat('vi-VN', {
      style: 'currency',
      currency: 'VND'
    }).format(price);
  };

  const calculateMonthlyPayment = () => {
    const price = parseFloat(calculatorPrice) || 0;
    if (price === 0 || calculatorMonths === 0) return 0;
    return Math.round(price / calculatorMonths);
  };

  const handlePriceChange = (e) => {
    const value = e.target.value.replace(/[^\d]/g, '');
    setCalculatorPrice(value);
  };

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
        <div className="hero-content">
          <h1 className="hero-title">HƯỚNG DẪN TRẢ GÓP</h1>
          <p className="hero-subtitle">Với nhiều ưu đãi hấp dẫn</p>
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
                    
                    {/* Installment Calculator */}
                    <div className="installment-calculator">
                      <h4 className="calculator-title">Tính trả góp</h4>
                      <div className="calculator-input-group">
                        <label>Giá sản phẩm (VNĐ)</label>
                        <input
                          type="text"
                          className="calculator-input"
                          placeholder="Nhập giá sản phẩm"
                          value={calculatorPrice ? formatPrice(parseFloat(calculatorPrice)) : ''}
                          onChange={handlePriceChange}
                        />
                      </div>
                      <div className="calculator-input-group">
                        <label>Kỳ hạn trả góp</label>
                        <select
                          className="calculator-select"
                          value={calculatorMonths}
                          onChange={(e) => setCalculatorMonths(parseInt(e.target.value))}
                        >
                          <option value={3}>3 tháng</option>
                          <option value={6}>6 tháng</option>
                          <option value={9}>9 tháng</option>
                          <option value={12}>12 tháng</option>
                          <option value={18}>18 tháng</option>
                          <option value={24}>24 tháng</option>
                        </select>
                      </div>
                      {calculatorPrice && parseFloat(calculatorPrice) > 0 && (
                        <div className="calculator-result">
                          <div className="result-label">Số tiền trả mỗi tháng:</div>
                          <div className="result-price">{formatPrice(calculateMonthlyPayment())}</div>
                          <div className="result-note">* 0% lãi suất, không phí ẩn</div>
                        </div>
                      )}
                    </div>
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

                    {/* Installment Calculator */}
                    <div className="installment-calculator">
                      <h4 className="calculator-title">Tính trả góp</h4>
                      <div className="calculator-input-group">
                        <label>Giá sản phẩm (VNĐ)</label>
                        <input
                          type="text"
                          className="calculator-input"
                          placeholder="Nhập giá sản phẩm"
                          value={calculatorPrice ? formatPrice(parseFloat(calculatorPrice)) : ''}
                          onChange={handlePriceChange}
                        />
                      </div>
                      <div className="calculator-input-group">
                        <label>Kỳ hạn trả góp</label>
                        <select
                          className="calculator-select"
                          value={calculatorMonths}
                          onChange={(e) => setCalculatorMonths(parseInt(e.target.value))}
                        >
                          <option value={3}>3 tháng</option>
                          <option value={6}>6 tháng</option>
                          <option value={9}>9 tháng</option>
                          <option value={12}>12 tháng</option>
                        </select>
                      </div>
                      {calculatorPrice && parseFloat(calculatorPrice) > 0 && (
                        <div className="calculator-result">
                          <div className="result-label">Số tiền trả mỗi tháng:</div>
                          <div className="result-price">{formatPrice(calculateMonthlyPayment())}</div>
                          <div className="result-note">* 0% lãi suất, không phí ẩn</div>
                        </div>
                      )}
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

