import React, { useState, useEffect } from 'react';
import { getCategoryTree } from '../services/categoryService';
import './ProductCategories.css';

// Map icon based on category name
const getCategoryIcon = (categoryName) => {
  const name = categoryName.toLowerCase();
  if (name.includes('laptop')) return 'fas fa-laptop';
  if (name.includes('pc') || name.includes('máy bộ')) return 'fas fa-desktop';
  if (name.includes('chuột') || name.includes('bàn phím') || name.includes('tai nghe')) return 'fas fa-keyboard';
  if (name.includes('ssd') || name.includes('lưu trữ')) return 'fas fa-hdd';
  if (name.includes('màn hình')) return 'fas fa-tv';
  if (name.includes('phụ kiện')) return 'fas fa-plug';
  if (name.includes('card') || name.includes('gpu') || name.includes('đồ họa')) return 'fas fa-microchip';
  return 'fas fa-box';
};

// Default placeholder image
const getCategoryImage = (categoryName) => {
  const name = categoryName.toLowerCase();
  if (name.includes('laptop')) return "/category-laptop.jpg";
  if (name.includes('pc')) return "/category-pc.jpg";
  if (name.includes('phụ kiện')) return "/category-accessories.jpg";
  if (name.includes('lưu trữ') || name.includes('ssd')) return "/category-storage.jpg";
  if (name.includes('màn hình')) return "/category-monitor.jpg";
  if (name.includes('card') || name.includes('gpu')) return "/category-gpu.jpg";
  return "/placeholder-product.svg";
};

function ProductCategories() {
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadCategories = async () => {
      try {
        setLoading(true);
        const apiCategories = await getCategoryTree();
        
        if (Array.isArray(apiCategories) && apiCategories.length > 0) {
          // Transform API categories to component format
          const transformed = apiCategories.slice(0, 6).map(cat => ({
            id: cat.id,
            name: cat.name,
            icon: cat.icon || getCategoryIcon(cat.name),
            image: cat.image || getCategoryImage(cat.name),
            description: cat.description || `${cat.name} chất lượng cao`,
            productCount: cat.productCount ? `${cat.productCount}+ sản phẩm` : "0+ sản phẩm",
            link: `/products?category=${cat.id}`
          }));
          setCategories(transformed);
        }
      } catch (error) {
        console.warn('[ProductCategories] Failed to load categories from API:', error);
        // Fallback to empty array or default categories
        setCategories([]);
      } finally {
        setLoading(false);
      }
    };

    loadCategories();
  }, []);

  if (loading) {
    return (
      <section className="product-categories">
        <div className="container">
          <div className="section-header">
            <h2 className="section-title">Danh mục sản phẩm</h2>
            <p className="section-subtitle">Khám phá các sản phẩm công nghệ tốt nhất</p>
          </div>
          <div style={{ textAlign: 'center', padding: '40px' }}>Đang tải danh mục...</div>
        </div>
      </section>
    );
  }

  if (categories.length === 0) {
    return null; // Don't show section if no categories
  }

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
                  <a href={category.link} className="category-link" onClick={(e) => {
                    e.preventDefault();
                    window.location.href = category.link;
                  }}>
                    Xem tất cả
                    <i className="fas fa-arrow-right"></i>
                  </a>
                </div>
              </div>

              <div className="category-hover-effect">
                <div className="hover-content">
                  <h4>Khám phá ngay</h4>
                  <p>Hàng trăm sản phẩm chất lượng</p>
                  <a href={category.link} className="hover-btn" onClick={(e) => {
                    e.preventDefault();
                    window.location.href = category.link;
                  }}>
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
