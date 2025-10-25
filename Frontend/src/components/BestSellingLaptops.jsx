import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import './BestSellingLaptops.css';

function BestSellingLaptops() {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('Lenovo');

  const brands = ['Lenovo', 'Asus', 'Acer', 'MSI', 'HP', 'LG', 'Dell'];

  const laptops = [
    {
      id: 1,
      name: 'Laptop Acer Aspire Lite AL15-41P-R3U5 NX.J53SV.001',
      price: '12.300.000',
      originalPrice: '12.990.000',
      discount: '-5%',
      image: '/images/laptops/laptop-1.jpg',
      specs: ['RYZEN 7', 'AMD RADEON', '16GB DDR4', '512GB GEN4', '15.6" IPS FHD 60Hz'],
      badge: 'TRÚNG KHÔNG GIỚI HẠN',
      badgeDate: 'BỐCTHĂM NGÀY 13.03.2021',
      brand: 'Acer',
      isNew: true
    },
    {
      id: 2,
      name: 'Laptop Lenovo V14 G4 83A000BEVN (i5-13420H, 8GB, 512GB, 14" IPS FHD 60Hz)',
      price: '12.490.000',
      originalPrice: '12.990.000',
      discount: '-4%',
      image: '/images/laptops/laptop-2.jpg',
      specs: ['CORE i5 13420H', 'INTEL UHD GRAPHICS', '8GB DDR4', '512GB GEN4', '14" IPS FHD 60Hz'],
      badge: 'TRÚNG KHÔNG GIỚI HẠN',
      badgeDate: 'BỐC THĂM NGÀY 13.03.2021',
      brand: 'Lenovo',
      isNew: true
    },
    {
      id: 3,
      name: 'Laptop Lenovo V15 G4 IRU 83A100URVN (i5-13420H, 8GB, 512GB, 15.6" IPS FHD 60Hz)',
      price: '13.200.000',
      originalPrice: '15.490.000',
      discount: '-15%',
      image: '/images/laptops/laptop-3.jpg',
      specs: ['CORE i5 13420H', 'INTEL UHD GRAPHICS', '8GB DDR4', '512GB GEN4', '15.6" IPS FHD 60Hz'],
      badge: 'TRÚNG KHÔNG GIỚI HẠN',
      badgeDate: 'BỐC THĂM NGÀY 13.03.2021',
      brand: 'Lenovo',
      isNew: true
    },
    {
      id: 4,
      name: 'Combo Laptop Lenovo V15 G4 i5-13420H Intel UHD + Chuột Logitech',
      price: '13.400.000',
      originalPrice: null,
      discount: null,
      image: '/images/laptops/laptop-4.jpg',
      specs: ['CORE i5 13420H', 'INTEL UHD GRAPHICS', '8GB DDR4', '512GB GEN4', '15.6" IPS FHD 60Hz'],
      badge: 'TRÚNG KHÔNG GIỚI HẠN',
      badgeDate: 'BỐC THĂM NGÀY 13.03.2021',
      brand: 'Lenovo',
      isCombo: true,
      comboText: 'COMBO VĂN PHÒNG CẦN MỚI DEADLINE'
    },
    {
      id: 5,
      name: 'Laptop Asus Vivobook 15 X1502VA-BQ886W (i7-13700H, 16GB, 512GB, 15.6" IPS FHD 60Hz)',
      price: '16.500.000',
      originalPrice: '17.990.000',
      discount: '-8%',
      image: '/images/laptops/laptop-5.jpg',
      specs: ['CORE i7 13620H', 'UHD GRAPHICS', '16GB DDR4', '512GB GEN4', '15.6" IPS FHD 60Hz'],
      badge: 'TRÚNG KHÔNG GIỚI HẠN',
      badgeDate: 'BỐC THĂM NGÀY PROFESSIONAL PLUS 2021',
      brand: 'Asus',
      isNew: true
    },
    {
      id: 6,
      name: 'Laptop Acer Aspire 5 A515-58M-79R7 (i7-13620H, UHD Graphics, 16GB, 512GB, 15.6" IPS FHD 60Hz)',
      price: '17.000.000',
      originalPrice: '20.990.000',
      discount: '-19%',
      image: '/images/laptops/laptop-6.jpg',
      specs: ['CORE i7 13620H', 'UHD GRAPHICS', '16GB DDR4', '512GB GEN4', '15.6" IPS FHD 60Hz'],
      badge: 'TRÚNG KHÔNG GIỚI HẠN',
      badgeDate: 'BỐC THĂM NGÀY PROFESSIONAL PLUS 2021',
      brand: 'Acer',
      isNew: true
    },
    {
      id: 7,
      name: 'Laptop ASUS ExpertBook P1 P1403CVA-i7 i6-50W (i7-1355U, 16GB, 512GB, 14" IPS FHD)',
      price: '17.500.000',
      originalPrice: '19.900.000',
      discount: '-12%',
      image: '/images/laptops/laptop-7.jpg',
      specs: ['CORE i7 1355U', 'INTEL GRAPHICS', '16GB DDR4', '512GB GEN4', '14" IPS FHD 60Hz'],
      badge: 'TRÚNG KHÔNG GIỚI HẠN',
      badgeDate: 'BỐC THĂM NGÀY PROFESSIONAL PLUS 2021',
      brand: 'Asus',
      isNew: true
    },
    {
      id: 8,
      name: 'Laptop Asus ExpertBook P3 P3405CVA-NZ0027W (i5-1340P, 16GB, 512GB, 14" IPS 2.5K 144Hz)',
      price: '17.800.000',
      originalPrice: '19.990.000',
      discount: '-11%',
      image: '/images/laptops/laptop-8.jpg',
      specs: ['CORE i5 1340P', 'INTEL GRAPHICS', '16GB DDR4', '512GB GEN4', '14" IPS 2.5K 144Hz'],
      badge: 'TRÚNG KHÔNG GIỚI HẠN',
      badgeDate: 'BỐC THĂM NGÀY PROFESSIONAL PLUS 2021',
      brand: 'Asus',
      isNew: true
    }
  ];

  const filteredLaptops = activeTab === 'Lenovo' 
    ? laptops.filter(laptop => laptop.brand === 'Lenovo')
    : laptops;

  return (
    <section className="best-selling-laptops">
      <div className="container">
        <div className="section-header">
          <h2 className="section-title">LAPTOP BÁN CHẠY</h2>
          <div className="brand-tabs">
            {brands.map((brand) => (
              <button
                key={brand}
                className={`brand-tab ${activeTab === brand ? 'active' : ''}`}
                onClick={() => setActiveTab(brand)}
              >
                {brand}
              </button>
            ))}
            <button className="brand-tab view-all">
              Xem tất cả <span className="arrow">›</span>
            </button>
          </div>
        </div>

        <div className="laptops-grid">
          {filteredLaptops.map((laptop) => (
            <div 
              key={laptop.id} 
              className="laptop-card"
              onClick={() => navigate(`/products/${laptop.id}`)}
              style={{ cursor: 'pointer' }}
            >
              {laptop.discount && (
                <div className="discount-badge">{laptop.discount}</div>
              )}
              {laptop.isNew && (
                <div className="new-badge">
                  <svg viewBox="0 0 24 24" fill="currentColor">
                    <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z"/>
                  </svg>
                </div>
              )}
              
              <div className="laptop-image-wrapper">
                <img src={laptop.image} alt={laptop.name} className="laptop-image" />
                {laptop.comboText && (
                  <div className="combo-overlay">{laptop.comboText}</div>
                )}
              </div>

              <div className="laptop-specs">
                {laptop.specs.map((spec, index) => (
                  <div key={index} className="spec-item">
                    {spec}
                  </div>
                ))}
              </div>

              <div className="laptop-badge">
                <div className="badge-icon">
                  <svg viewBox="0 0 24 24" fill="currentColor">
                    <path d="M12 2L3 14h9l-1 8 10-12h-9l1-8z"/>
                  </svg>
                </div>
                <div className="badge-text">
                  <div className="badge-title">{laptop.badge}</div>
                  <div className="badge-date">{laptop.badgeDate}</div>
                </div>
              </div>

              <h3 className="laptop-name">{laptop.name}</h3>

              <div className="laptop-price-section">
                <div className="current-price">{laptop.price} ₫</div>
                {laptop.originalPrice && (
                  <div className="original-price">{laptop.originalPrice} ₫</div>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

export default BestSellingLaptops;

