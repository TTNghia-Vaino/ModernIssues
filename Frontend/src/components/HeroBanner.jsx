import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { listPromotions } from '../services/promotionService';
import { normalizeImageUrl } from '../utils/productUtils';
import './HeroBanner.css';

const HeroBanner = () => {
  const [currentSlide, setCurrentSlide] = useState(0);
  const [promotions, setPromotions] = useState([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  // Default slides fallback
  const defaultSlides = [
    '/src/assets/slider1_1.webp',
    '/src/assets/slider1_2.webp',
    '/src/assets/slider1_3.webp',
    '/src/assets/slider1_4.webp',
    '/src/assets/slider1_5.webp'
  ];

  // Helper function to get banner URL with proper path
  const getBannerUrl = (promotion) => {
    const bannerUrl = promotion.banner || promotion.bannerUrl;
    console.log('[HeroBanner] getBannerUrl - promotion:', {
      id: promotion.id || promotion.promotionId,
      banner: promotion.banner,
      bannerUrl: promotion.bannerUrl,
      rawBannerUrl: bannerUrl
    });
    
    if (!bannerUrl || bannerUrl.trim() === '') {
      console.log('[HeroBanner] No banner URL, using default');
      return defaultSlides[0]; // Default fallback
    }
    
    // Use normalizeImageUrl from productUtils (same as admin uses)
    const normalizedUrl = normalizeImageUrl(bannerUrl);
    console.log('[HeroBanner] Normalized URL:', normalizedUrl);
    return normalizedUrl || defaultSlides[0];
  };

  // Load active promotions with banners for hero location
  useEffect(() => {
    const loadPromotions = async () => {
      try {
        setLoading(true);
        // Import getPromotionsByLocal dynamically
        const { getPromotionsByLocal } = await import('../services/promotionService');
        const heroPromotions = await getPromotionsByLocal('hero');
        
        console.log('[HeroBanner] Loaded hero promotions:', heroPromotions);
        
        // API already filters by active and date range, so we just need to check for banner
        const promotionsWithBanners = heroPromotions.filter(
          promo => {
            const hasBanner = (promo.banner && promo.banner.trim() !== '') || 
                             (promo.bannerUrl && promo.bannerUrl.trim() !== '');
            console.log('[HeroBanner] Promotion:', {
              id: promo.id || promo.promotionId,
              name: promo.name || promo.promotionName,
              status: promo.status,
              isActive: promo.isActive,
              hasBanner,
              banner: promo.banner,
              bannerUrl: promo.bannerUrl
            });
            return hasBanner;
          }
        );
        
        console.log('[HeroBanner] Promotions with banners:', promotionsWithBanners);
        setPromotions(promotionsWithBanners);
      } catch (error) {
        console.error('[HeroBanner] Error loading promotions:', error);
        setPromotions([]);
      } finally {
        setLoading(false);
      }
    };

    loadPromotions();
  }, []);

  // Get slides: promotions first, then default slides
  const slides = promotions.length > 0 
    ? promotions.map(promo => ({
        image: getBannerUrl(promo),
        promotionId: promo.id || promo.promotionId,
        title: promo.name || promo.promotionName || 'Khuyến mãi'
      }))
    : defaultSlides.map(img => ({ image: img, promotionId: null }));

  // Auto slide every 5 seconds
  useEffect(() => {
    if (slides.length === 0) return;
    
    const timer = setInterval(() => {
      setCurrentSlide((prev) => (prev + 1) % slides.length);
    }, 5000);

    return () => clearInterval(timer);
  }, [slides.length]);

  const handleSlideClick = () => {
    const currentPromotionId = slides[currentSlide]?.promotionId;
    if (currentPromotionId) {
      navigate(`/products?promotion=${currentPromotionId}`);
    }
  };

  const goToSlide = (index) => {
    setCurrentSlide(index);
  };

  const goToPrevious = () => {
    setCurrentSlide((prev) => (prev - 1 + slides.length) % slides.length);
  };

  const goToNext = () => {
    setCurrentSlide((prev) => (prev + 1) % slides.length);
  };

  if (loading && promotions.length === 0) {
    // Show default slide while loading
    return (
      <section className="hero-banner">
        <div className="hero-container">
          <div className="hero-background">
            <img 
              src={defaultSlides[0]} 
              alt="Loading"
              className="slide-image"
            />
          </div>
        </div>
      </section>
    );
  }

  const currentSlideData = slides[currentSlide] || { image: defaultSlides[0], promotionId: null };

  return (
    <section className="hero-banner">
      <div className="hero-container">
        {/* Background Image */}
        <div 
          className="hero-background"
          onClick={handleSlideClick}
          style={{ cursor: currentSlideData.promotionId ? 'pointer' : 'default' }}
        >
          <img 
            src={typeof currentSlideData === 'string' ? currentSlideData : currentSlideData.image} 
            alt={typeof currentSlideData === 'string' ? `Slide ${currentSlide + 1}` : currentSlideData.title}
            className="slide-image"
            onError={(e) => {
              // Fallback to default slide if image fails to load
              e.target.src = defaultSlides[0];
            }}
          />
        </div>
        

        {/* Navigation Controls */}
        {slides.length > 1 && (
          <div className="slider-controls">
            <button className="nav-btn prev-btn" onClick={goToPrevious}>
              <i className="fas fa-chevron-left"></i>
            </button>
            <button className="nav-btn next-btn" onClick={goToNext}>
              <i className="fas fa-chevron-right"></i>
            </button>
          </div>
        )}

        {/* Dots Indicator */}
        {slides.length > 1 && (
          <div className="slider-dots">
            {slides.map((_, index) => (
              <button
                key={index}
                className={`dot ${index === currentSlide ? 'active' : ''}`}
                onClick={() => goToSlide(index)}
              />
            ))}
          </div>
        )}
      </div>
    </section>
  );
};

export default HeroBanner;
