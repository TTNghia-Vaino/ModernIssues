import React, { useState, useEffect } from 'react';
import './MainBanner.css';

function MainBanner() {
  const [currentSlide, setCurrentSlide] = useState(0);

  const banners = [
    {
      id: 1,
      title: "KHUYẾN MÃI LỚN NHẤT NĂM",
      subtitle: "Giảm giá lên đến 50%",
      description: "Laptop Gaming, PC, Phụ kiện với giá tốt nhất",
      image: "/banner1.jpg",
      buttonText: "Mua ngay",
      buttonLink: "/promotion"
    },
    {
      id: 2,
      title: "LAPTOP GAMING MỚI",
      subtitle: "RTX 40 Series",
      description: "Trải nghiệm gaming đỉnh cao với công nghệ mới nhất",
      image: "/banner2.jpg",
      buttonText: "Khám phá",
      buttonLink: "/laptop"
    },
    {
      id: 3,
      title: "PC GAMING SIÊU MẠNH",
      subtitle: "Từ 15 triệu",
      description: "Build PC gaming hoàn hảo cho mọi nhu cầu",
      image: "/banner3.jpg",
      buttonText: "Xem ngay",
      buttonLink: "/pc"
    }
  ];

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentSlide((prev) => (prev + 1) % banners.length);
    }, 5000);

    return () => clearInterval(timer);
  }, [banners.length]);

  const nextSlide = () => {
    setCurrentSlide((prev) => (prev + 1) % banners.length);
  };

  const prevSlide = () => {
    setCurrentSlide((prev) => (prev - 1 + banners.length) % banners.length);
  };

  const goToSlide = (index) => {
    setCurrentSlide(index);
  };

  return (
    <div className="main-banner">
      <div className="banner-container">
        {/* Banner Slides */}
        <div className="banner-slides">
          {banners.map((banner, index) => (
            <div
              key={banner.id}
              className={`banner-slide ${index === currentSlide ? 'active' : ''}`}
            >
              <div className="banner-image">
                <img src={banner.image} alt={banner.title} />
                <div className="banner-overlay"></div>
              </div>
              <div className="banner-content">
                <div className="banner-text">
                  <h1 className="banner-title">{banner.title}</h1>
                  <h2 className="banner-subtitle">{banner.subtitle}</h2>
                  <p className="banner-description">{banner.description}</p>
                  <a href={banner.buttonLink} className="banner-btn">
                    {banner.buttonText}
                    <i className="fas fa-arrow-right"></i>
                  </a>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Navigation Arrows */}
        <button className="banner-nav prev" onClick={prevSlide}>
          <i className="fas fa-chevron-left"></i>
        </button>
        <button className="banner-nav next" onClick={nextSlide}>
          <i className="fas fa-chevron-right"></i>
        </button>

        {/* Dots Indicator */}
        <div className="banner-dots">
          {banners.map((_, index) => (
            <button
              key={index}
              className={`dot ${index === currentSlide ? 'active' : ''}`}
              onClick={() => goToSlide(index)}
            ></button>
          ))}
        </div>
      </div>

      {/* Quick Access Categories */}
      <div className="quick-categories">
        <div className="container">
          <div className="quick-category">
            <div className="category-icon">
              <i className="fas fa-laptop"></i>
            </div>
            <span>Laptop Gaming</span>
          </div>
          <div className="quick-category">
            <div className="category-icon">
              <i className="fas fa-desktop"></i>
            </div>
            <span>PC Gaming</span>
          </div>
          <div className="quick-category">
            <div className="category-icon">
              <i className="fas fa-keyboard"></i>
            </div>
            <span>Phụ kiện</span>
          </div>
          <div className="quick-category">
            <div className="category-icon">
              <i className="fas fa-hdd"></i>
            </div>
            <span>Lưu trữ</span>
          </div>
        </div>
      </div>
    </div>
  );
}

export default MainBanner;
