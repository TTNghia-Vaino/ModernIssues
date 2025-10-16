import React from 'react';
import './FeaturedProducts.css';

function FeaturedProducts() {
  const featuredSections = [
    {
      id: 1,
      title: "Ổ CỨNG DI ĐỘNG",
      subtitle: "GIÁ TỐT DUNG LƯỢNG KHỦNG",
      discount: "30%",
      products: [
        { name: "SSD SanDisk Extreme 1TB", image: "https://via.placeholder.com/60x60/4CAF50/FFFFFF?text=SSD" },
        { name: "HDD Seagate 2TB", image: "https://via.placeholder.com/60x60/2196F3/FFFFFF?text=HDD" },
        { name: "SSD Samsung T7 500GB", image: "https://via.placeholder.com/60x60/FF9800/FFFFFF?text=SSD" }
      ],
      background: "green"
    },
    {
      id: 2,
      title: "THẺ NHỚ CHÍNH HÃNG",
      subtitle: "GIẢM GIÁ LÊN ĐẾN 30%",
      discount: "30%",
      products: [
        { name: "SD Card SanDisk 128GB", image: "https://via.placeholder.com/60x60/E91E63/FFFFFF?text=SD" },
        { name: "MicroSD Samsung 256GB", image: "https://via.placeholder.com/60x60/9C27B0/FFFFFF?text=μSD" },
        { name: "CF Card Lexar 64GB", image: "https://via.placeholder.com/60x60/673AB7/FFFFFF?text=CF" }
      ],
      background: "green"
    },
    {
      id: 3,
      title: "CHUỘT - BÀN PHÍM - TAI NGHE",
      subtitle: "GIẢM GIÁ LÊN ĐẾN 50%",
      discount: "50%",
      products: [
        { name: "Bàn phím Gaming Corsair", image: "https://via.placeholder.com/60x60/F44336/FFFFFF?text=⌨" },
        { name: "Chuột Gaming Razer", image: "https://via.placeholder.com/60x60/795548/FFFFFF?text=🖱" },
        { name: "Tai nghe Gaming SteelSeries", image: "https://via.placeholder.com/60x60/607D8B/FFFFFF?text=🎧" }
      ],
      background: "green"
    }
  ];

  return (
    <section className="featured-products" style={{backgroundColor: 'red', padding: '20px', border: '5px solid blue'}}>
      <div className="featured-container" style={{backgroundColor: 'yellow', padding: '10px'}}>
        <h1 style={{color: 'black', fontSize: '24px'}}>DEBUG: FeaturedProducts Component</h1>
        <div className="featured-sections-grid">
          {featuredSections.map((section) => (
            <div key={section.id} className="featured-section">
              <div className="section-background">
                <div className="glow-effect"></div>
                <div className="stars-effect">
                  <div className="star star-1"></div>
                  <div className="star star-2"></div>
                  <div className="star star-3"></div>
                  <div className="star star-4"></div>
                </div>
              </div>
              
              <div className="section-content">
                <div className="section-text">
                  <h3 className="section-title">{section.title}</h3>
                  <p className="section-subtitle">{section.subtitle}</p>
                </div>
                
                <div className="section-products">
                  {section.products.map((product, index) => (
                    <div key={index} className="product-item">
                      <img src={product.image} alt={product.name} />
                    </div>
                  ))}
                </div>
                
                <button className="buy-now-btn">
                  MUA NGAY
                  <i className="fas fa-arrow-right"></i>
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

export default FeaturedProducts;
