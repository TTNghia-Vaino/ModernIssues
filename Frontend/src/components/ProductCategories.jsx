import React, { useState, useEffect } from 'react';
import { getCategoryTree } from '../services/categoryService';
import { getProductCountByCategory } from '../services/productService';
import './ProductCategories.css';

// Map icon based on category name
const getCategoryIcon = (categoryName) => {
  if (!categoryName || typeof categoryName !== 'string') {
    return 'fas fa-box'; // Default icon if name is invalid
  }
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
  if (!categoryName || typeof categoryName !== 'string') {
    return "/placeholder-product.svg"; // Default image if name is invalid
  }
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
        
        // Load categories and product counts in parallel
        const [apiCategories, productCounts] = await Promise.all([
          getCategoryTree(),
          getProductCountByCategory().catch(err => {
            console.warn('[ProductCategories] Failed to load product counts:', err);
            return []; // Return empty array if API fails
          })
        ]);
        
        if (Array.isArray(apiCategories) && apiCategories.length > 0) {
          // Create a map of category_id to product_count for quick lookup
          const countMap = {};
          if (Array.isArray(productCounts)) {
            productCounts.forEach(item => {
              countMap[item.category_id] = item.product_count;
            });
          }
          
          // Transform API categories to component format
          const transformed = apiCategories.slice(0, 6)
            .filter(cat => cat && cat.id && cat.name) // Filter out invalid categories
            .map(cat => {
              const productCount = countMap[cat.id] || 0;
              return {
                id: cat.id,
                name: cat.name || 'Danh mục không tên',
                icon: cat.icon || getCategoryIcon(cat.name),
                image: cat.image || getCategoryImage(cat.name),
                description: cat.description || `${cat.name || 'Danh mục'} chất lượng cao`,
                productCount: productCount > 0 ? `${productCount} sản phẩm` : "0 sản phẩm",
                link: `/products?category=${cat.id}`
              };
            });
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
