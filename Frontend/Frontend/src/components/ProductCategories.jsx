import React from 'react';
import './ProductCategories.css';

function ProductCategories() {
  const categories = [
    {
      id: 1,
      name: "Laptop Gaming",
      icon: "fas fa-laptop",
      image: "/category-laptop.jpg",
      description: "Laptop gaming hiệu năng cao",
      productCount: "500+ sản phẩm",
      link: "/laptop"
    },
    {
      id: 2,
      name: "PC Gaming",
      icon: "fas fa-desktop",
      image: "/category-pc.jpg",
      description: "PC gaming tùy chỉnh",
      productCount: "300+ sản phẩm",
      link: "/pc"
    },
    {
      id: 3,
      name: "Phụ kiện Gaming",
      icon: "fas fa-keyboard",
      image: "/category-accessories.jpg",
      description: "Bàn phím, chuột, tai nghe",
      productCount: "800+ sản phẩm",
      link: "/accessories"
    },
    {
      id: 4,
      name: "Lưu trữ",
      icon: "fas fa-hdd",
      image: "/category-storage.jpg",
      description: "SSD, HDD, USB",
      productCount: "200+ sản phẩm",
      link: "/storage"
    },
    {
      id: 5,
      name: "Màn hình",
      icon: "fas fa-tv",
      image: "/category-monitor.jpg",
      description: "Màn hình gaming 4K",
      productCount: "150+ sản phẩm",
      link: "/monitor"
    },
    {
      id: 6,
      name: "Card đồ họa",
      icon: "fas fa-microchip",
      image: "/category-gpu.jpg",
      description: "RTX, GTX series",
      productCount: "100+ sản phẩm",
      link: "/gpu"
    }
  ];

  return (
    <section className="product-categories">
      <div className="container">
        <div className="section-header">
          <h2 className="section-title">Danh mục sản phẩm</h2>
          <p className="section-subtitle">Khám phá các sản phẩm công nghệ tốt nhất</p>
        </div>

        <div className="categories-grid">
          {categories.map((category) => (
            <div key={category.id} className="category-card">
              <div className="category-image">
                <img src={category.image} alt={category.name} />
                <div className="category-overlay">
                  <div className="category-icon">
                    <i className={category.icon}></i>
                  </div>
                </div>
              </div>
              
              <div className="category-content">
                <h3 className="category-name">{category.name}</h3>
                <p className="category-description">{category.description}</p>
                <div className="category-info">
                  <span className="product-count">{category.productCount}</span>
                  <a href={category.link} className="category-link">
                    Xem tất cả
                    <i className="fas fa-arrow-right"></i>
                  </a>
                </div>
              </div>

              <div className="category-hover-effect">
                <div className="hover-content">
                  <h4>Khám phá ngay</h4>
                  <p>Hàng trăm sản phẩm chất lượng</p>
                  <a href={category.link} className="hover-btn">
                    <i className="fas fa-shopping-cart"></i>
                    Mua ngay
                  </a>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Featured Brands */}
        <div className="featured-brands">
          <h3 className="brands-title">Thương hiệu nổi bật</h3>
          <div className="brands-grid">
            <div className="brand-item">
              <img src="/brand-asus.png" alt="ASUS" />
            </div>
            <div className="brand-item">
              <img src="/brand-msi.png" alt="MSI" />
            </div>
            <div className="brand-item">
              <img src="/brand-nvidia.png" alt="NVIDIA" />
            </div>
            <div className="brand-item">
              <img src="/brand-intel.png" alt="Intel" />
            </div>
            <div className="brand-item">
              <img src="/brand-amd.png" alt="AMD" />
            </div>
            <div className="brand-item">
              <img src="/brand-corsair.png" alt="Corsair" />
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

export default ProductCategories;
