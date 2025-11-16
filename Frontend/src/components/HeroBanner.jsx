import React, { useState, useEffect } from 'react';
import './HeroBanner.css';

const HeroBanner = () => {
  const [currentSlide, setCurrentSlide] = useState(0);

  const slides = [
    '/src/assets/slider1_1.webp',
    '/src/assets/slider1_2.webp',
    '/src/assets/slider1_3.webp',
    '/src/assets/slider1_4.webp',
    '/src/assets/slider1_5.webp'
  ];

  // Auto slide every 5 seconds
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentSlide((prev) => (prev + 1) % slides.length);
    }, 5000);

    return () => clearInterval(timer);
  }, [slides.length]);

  const goToSlide = (index) => {
    setCurrentSlide(index);
  };

  const goToPrevious = () => {
    setCurrentSlide((prev) => (prev - 1 + slides.length) % slides.length);
  };

  const goToNext = () => {
    setCurrentSlide((prev) => (prev + 1) % slides.length);
  };

  return (
    <section className="hero-banner">
      <div className="hero-container">
        {/* Background Image */}
        <div className="hero-background">
          <img 
            src={slides[currentSlide]} 
            alt={`Slide ${currentSlide + 1}`}
            className="slide-image"
          />
        </div>
        

        {/* Navigation Controls */}
        <div className="slider-controls">
          <button className="nav-btn prev-btn" onClick={goToPrevious}>
            <i className="fas fa-chevron-left"></i>
          </button>
          <button className="nav-btn next-btn" onClick={goToNext}>
            <i className="fas fa-chevron-right"></i>
          </button>
        </div>

        {/* Dots Indicator */}
        <div className="slider-dots">
          {slides.map((_, index) => (
            <button
              key={index}
              className={`dot ${index === currentSlide ? 'active' : ''}`}
              onClick={() => goToSlide(index)}
            />
          ))}
        </div>
      </div>
    </section>
  );
};

export default HeroBanner;
