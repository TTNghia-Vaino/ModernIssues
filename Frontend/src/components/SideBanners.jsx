import React, { useState, useEffect } from 'react';
import './SideBanners.css';

const SideBanners = () => {
  const [scrollY, setScrollY] = useState(0);

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

  const parallaxStyle = { transform: `translateY(${scrollY * 0.5}px)` };

  return (
    <>
      <div className="side-banner left-banner" style={parallaxStyle}>
        <div className="banner-full-image">
          <img src="/src/assets/quangcao_1.png" alt="Quảng cáo 1" />
        </div>
      </div>

      <div className="side-banner right-banner" style={parallaxStyle}>
        <div className="banner-full-image">
          <img src="/src/assets/quangcao_2.png" alt="Quảng cáo 2" />
        </div>
      </div>
    </>
  );
};

export default SideBanners;
