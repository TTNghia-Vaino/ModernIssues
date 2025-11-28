import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { getPromotionsByLocal } from '../services/promotionService';
import { normalizeImageUrl } from '../utils/productUtils';
import './SideBanners.css';

const SideBanners = () => {
  const [scrollY, setScrollY] = useState(0);
  const [leftPromotion, setLeftPromotion] = useState(null);
  const [rightPromotion, setRightPromotion] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    let ticking = false;
    
    const handleScroll = () => {
      if (!ticking) {
        requestAnimationFrame(() => {
          setScrollY(window.scrollY);
          ticking = false;
        });
        ticking = true;
      }
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Load promotions for left and right banners
  useEffect(() => {
    const loadPromotions = async () => {
      try {
        const [leftPromos, rightPromos] = await Promise.all([
          getPromotionsByLocal('left'),
          getPromotionsByLocal('right')
        ]);
        
        console.log('[SideBanners] Loaded promotions:', { left: leftPromos, right: rightPromos });
        
        // API already filters by active and date range, so we just need to check for banner
        // Get first promotion with banner for each side
        const activeLeft = leftPromos.find(
          promo => {
            const hasBanner = (promo.banner && promo.banner.trim() !== '') || 
                             (promo.bannerUrl && promo.bannerUrl.trim() !== '');
            console.log('[SideBanners] Left promotion:', {
              id: promo.id || promo.promotionId,
              name: promo.name || promo.promotionName,
              hasBanner,
              banner: promo.banner,
              bannerUrl: promo.bannerUrl
            });
            return hasBanner;
          }
        );
        const activeRight = rightPromos.find(
          promo => {
            const hasBanner = (promo.banner && promo.banner.trim() !== '') || 
                             (promo.bannerUrl && promo.bannerUrl.trim() !== '');
            console.log('[SideBanners] Right promotion:', {
              id: promo.id || promo.promotionId,
              name: promo.name || promo.promotionName,
              hasBanner,
              banner: promo.banner,
              bannerUrl: promo.bannerUrl
            });
            return hasBanner;
          }
        );
        
        console.log('[SideBanners] Selected promotions:', { left: activeLeft, right: activeRight });
        setLeftPromotion(activeLeft || null);
        setRightPromotion(activeRight || null);
      } catch (error) {
        console.error('[SideBanners] Error loading promotions:', error);
        setLeftPromotion(null);
        setRightPromotion(null);
      }
    };

    loadPromotions();
  }, []);

  const getBannerUrl = (promotion) => {
    if (!promotion) return null;
    const bannerUrl = promotion.banner || promotion.bannerUrl;
    console.log('[SideBanners] getBannerUrl - promotion:', {
      id: promotion.id || promotion.promotionId,
      banner: promotion.banner,
      bannerUrl: promotion.bannerUrl,
      rawBannerUrl: bannerUrl
    });
    
    if (!bannerUrl || bannerUrl.trim() === '') {
      console.log('[SideBanners] No banner URL');
      return null;
    }
    
    const normalizedUrl = normalizeImageUrl(bannerUrl);
    console.log('[SideBanners] Normalized URL:', normalizedUrl);
    return normalizedUrl;
  };

  const handleBannerClick = (promotion) => {
    if (promotion && (promotion.id || promotion.promotionId)) {
      const promotionId = promotion.id || promotion.promotionId;
      console.log('[SideBanners] Clicking banner, navigating to promotion:', promotionId);
      navigate(`/products?promotion=${promotionId}`);
    } else {
      console.log('[SideBanners] No promotion ID available, cannot navigate');
    }
  };

  const parallaxStyle = { transform: `translateY(${scrollY * 0.5}px)` };

  const leftBannerUrl = getBannerUrl(leftPromotion);
  const rightBannerUrl = getBannerUrl(rightPromotion);

  return (
    <>
      <div 
        className={`side-banner left-banner ${leftPromotion ? 'clickable' : ''}`}
        onClick={() => handleBannerClick(leftPromotion)}
        style={{ 
          ...parallaxStyle,
          pointerEvents: leftPromotion ? 'auto' : 'none'
        }}
      >
        <div className="banner-full-image">
          {leftBannerUrl ? (
            <img 
              src={leftBannerUrl} 
              alt={leftPromotion?.name || leftPromotion?.promotionName || 'Quảng cáo bên trái'}
              onError={(e) => {
                e.target.src = '/src/assets/quangcao_1.png';
              }}
            />
          ) : (
            <img src="/src/assets/quangcao_1.png" alt="Quảng cáo 1" />
          )}
        </div>
      </div>

      <div 
        className={`side-banner right-banner ${rightPromotion ? 'clickable' : ''}`}
        onClick={() => handleBannerClick(rightPromotion)}
        style={{ 
          ...parallaxStyle,
          pointerEvents: rightPromotion ? 'auto' : 'none'
        }}
      >
        <div className="banner-full-image">
          {rightBannerUrl ? (
            <img 
              src={rightBannerUrl} 
              alt={rightPromotion?.name || rightPromotion?.promotionName || 'Quảng cáo bên phải'}
              onError={(e) => {
                e.target.src = '/src/assets/quangcao_2.png';
              }}
            />
          ) : (
            <img src="/src/assets/quangcao_2.png" alt="Quảng cáo 2" />
          )}
        </div>
      </div>
    </>
  );
};

export default SideBanners;
