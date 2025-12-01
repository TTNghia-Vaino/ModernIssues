import React from 'react';
import { useNavigate } from 'react-router-dom';
import './ProductShowcase.css';
import banner2Img from '../assets/banner_2.webp';
import banner3Img from '../assets/banner_3.webp';
import banner4Img from '../assets/banner_4.webp';
import banner11Img from '../assets/banner_11.webp';
import banner22Img from '../assets/banner_22.webp';

function ProductShowcase() {
  const navigate = useNavigate();
  // Category icons section with search keywords
  const categoryIcons = [
    {
      id: 1,
      name: "Tự build PC",
      image: "/images/categories/build-pc.png",
      link: "/build-pc",
      searchKeyword: "tự build"
    },
    {
      id: 2,
      name: "PC - Máy bộ",
      image: "/images/categories/pc-desktop.png",
      link: "/pc-desktop",
      searchKeyword: "PC"
    },
    {
      id: 3,
      name: "Màn hình",
      image: "/images/categories/monitor.png",
      link: "/monitor",
      searchKeyword: "màn hình"
    },
    {
      id: 4,
      name: "Laptop",
      image: "/images/categories/laptop.png",
      link: "/laptop",
      searchKeyword: "laptop"
    },
    {
      id: 5,
      name: "Chuột - Phím\nTai nghe",
      image: "/images/categories/accessories.png",
      link: "/accessories",
      searchKeyword: "chuột bàn phím tai nghe"
    },
    {
      id: 6,
      name: "Ổ cứng SSD\nGắn trong",
      image: "/images/categories/ssd-internal.png",
      link: "/ssd-internal",
      searchKeyword: "SSD"
    },
    {
      id: 7,
      name: "Ổ cứng SSD\nDi động",
      image: "/images/categories/ssd-external.png",
      link: "/ssd-external",
      searchKeyword: "SSD di động"
    },
    {
      id: 8,
      name: "Thẻ nhớ",
      image: "/images/categories/memory-card.png",
      link: "/memory-card",
      searchKeyword: "thẻ nhớ"
    },
    {
      id: 9,
      name: "RAM",
      image: "/images/categories/ram.png",
      link: "/ram",
      searchKeyword: "RAM"
    },
    {
      id: 10,
      name: "NAS",
      image: "/images/categories/nas.png",
      link: "/nas",
      searchKeyword: "NAS"
    }
  ];

  // Promotional banners
  const promotionalBanners = [
    {
      id: 1,
      title: "LAPTOP VĂN PHÒNG",
      price: "12.300.000đ",
      image: banner2Img,
      link: "/laptop-office",
      size: "large" // takes 1 column
    },
    {
      id: 2,
      title: "PC SIÊU TỐC",
      subtitle: "VĂN PHÒNG - GAMING - ĐỒ HỌA",
      price: "6.770.000đ",
      badge: "Máy build sẵn\nTối ưu cấu hình",
      image: banner3Img,
      link: "/pc-super",
      size: "large" // takes 1 column
    },
    {
      id: 3,
      title: "MINI PC",
      price: "4.350.000đ",
      badge: "Giảm hàng siêu tốc 4-6h",
      image: banner4Img,
      link: "/mini-pc",
      size: "large" // takes 1 column
    },
    {
      id: 4,
      title: "LAPTOP GAMING",
      price: "20.800.000đ",
      image: banner11Img,
      link: "/laptop-gaming",
      size: "medium" // takes 1/2 column
    },
    {
      id: 5,
      title: "MÀN HÌNH CHÍNH HÃNG",
      price: "1.650.000đ",
      badge: "MUA NGAY",
      image: banner22Img,
      link: "/monitor-official",
      size: "medium" // takes 1/2 column
    }
  ];

  return (
    <section className="product-showcase">
      <div className="container">
        {/* Category Icons Grid */}
        <div className="category-icons-section">
          <div className="category-icons-grid">
            {categoryIcons.map((category) => (
              <div 
                key={category.id} 
                className="category-icon-card"
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  // Navigate to products page with search keyword
                  if (category.searchKeyword) {
                    const searchParams = new URLSearchParams({ q: category.searchKeyword });
                    navigate(`/products?${searchParams.toString()}`);
                  } else if (category.link) {
                    navigate(category.link);
                  }
                }}
                style={{ cursor: 'pointer' }}
              >
                <div className="category-icon-image">
                  <img src={category.image} alt={category.name} />
                </div>
                <h3 className="category-icon-name">{category.name}</h3>
              </div>
            ))}
          </div>
        </div>

        {/* Promotional Banners Grid */}
        <div className="promotional-banners-section">
          <div className="promotional-banners-grid">
            {/* Top Row - 3 large banners */}
            <div className="banner-row banner-row-top">
              {promotionalBanners.slice(0, 3).map((banner) => (
                <div 
                  key={banner.id} 
                  className={`promo-banner promo-banner-${banner.size}`}
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    if (banner.link) {
                      navigate(banner.link);
                    } else if (banner.promotionId) {
                      navigate(`/products?promotion=${banner.promotionId}`);
                    }
                  }}
                  style={{ cursor: (banner.link || banner.promotionId) ? 'pointer' : 'default' }}
                >
                  <div className="promo-banner-content">
                    <img 
                      src={banner.image} 
                      alt={banner.title}
                      className="promo-banner-image"
                    />
                    <div className="promo-banner-overlay">
                      <h3 className="promo-banner-title">{banner.title}</h3>
                      {banner.subtitle && (
                        <p className="promo-banner-subtitle">{banner.subtitle}</p>
                      )}
                      {banner.badge && (
                        <div className="promo-banner-badge">{banner.badge}</div>
                      )}
                      <div className="promo-banner-price">
                        <span className="price-label">GIÁ CHỈ TỪ</span>
                        <span className="price-value">{banner.price}</span>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Bottom Row - 2 medium banners */}
            <div className="banner-row banner-row-bottom">
              {promotionalBanners.slice(3, 5).map((banner) => (
                <div 
                  key={banner.id} 
                  className={`promo-banner promo-banner-${banner.size}`}
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    if (banner.link) {
                      navigate(banner.link);
                    } else if (banner.promotionId) {
                      navigate(`/products?promotion=${banner.promotionId}`);
                    }
                  }}
                  style={{ cursor: (banner.link || banner.promotionId) ? 'pointer' : 'default' }}
                >
                  <div className="promo-banner-content">
                    <img 
                      src={banner.image} 
                      alt={banner.title}
                      className="promo-banner-image"
                    />
                    <div className="promo-banner-overlay">
                      <h3 className="promo-banner-title">{banner.title}</h3>
                      {banner.badge && (
                        <div className="promo-banner-badge">{banner.badge}</div>
                      )}
                      <div className="promo-banner-price">
                        <span className="price-label">GIÁ CHỈ TỪ</span>
                        <span className="price-value">{banner.price}</span>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

export default ProductShowcase;

