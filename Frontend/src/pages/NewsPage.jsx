import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import './NewsPage.css';

const NewsPage = () => {
  const [selectedCategory, setSelectedCategory] = useState('all');

  const categories = [
    { id: 'all', name: 'Tất cả', icon: '📰', count: 0 },
    { id: 'news', name: 'Tin tức', icon: '🎮', count: 597 },
    { id: 'gaming', name: 'Thế giới game', icon: '🎯', count: 37 },
    { id: 'promotion', name: 'Khuyến mãi', icon: '🏷️', count: 130 },
    { id: 'review', name: 'Tổng hợp', icon: '💡', count: 48 },
    { id: 'guide', name: 'Tư vấn và đánh giá', icon: '📊', count: 44 }
  ];

  const newsArticles = [
    {
      id: 1,
      title: 'PlayStation 6 Handheld: Rò rỉ cấu hình, ngày ra mắt và giá bán dự kiến 2027',
      excerpt: 'Sự xuất hiện của PlayStation 6 Handheld đang tạo nên làn sóng bàn luận sôi nổi trong cộng đồng game thủ, với những rò rỉ cấu hình ấn tượng, hỗ trợ dock mode và khả năng tương thích ngược ...',
      image: 'https://images.unsplash.com/photo-1606144042614-b2417e99c4e3?w=800&q=80',
      category: 'news',
      date: 'Thứ Bảy, 07/06/2025',
      featured: true
    },
    {
      id: 2,
      title: 'Razer Phantom: Giới Thiệu Bộ Sưu Tập Thiết Kế Đích Thực Tỏa Sáng',
      excerpt: 'Khám phá bộ sưu tập Razer Phantom mới nhất với thiết kế RGB Chroma đẳng cấp',
      image: 'https://images.unsplash.com/photo-1527814050087-3793815479db?w=400&q=80',
      category: 'news',
      date: 'Thứ Sáu, 06/06/2025'
    },
    {
      id: 3,
      title: 'MSI khẩy động Computex 2025: Công nghệ đột phá & sản phẩm hợp tác ấn tượng',
      excerpt: 'MSI ra mắt loạt sản phẩm gaming và workstation mới tại Computex 2025',
      image: 'https://images.unsplash.com/photo-1587202372775-e229f172b9d7?w=400&q=80',
      category: 'news',
      date: 'Thứ Tư, 21/05/2025'
    },
    {
      id: 4,
      title: 'ASUS ROG Gây Bão Thị Trường Với Dòng Laptop Gaming RTX 50 Series',
      excerpt: 'ASUS ROG công bố dòng laptop gaming mới với card đồ họa RTX 50 Series',
      image: 'https://images.unsplash.com/photo-1603302576837-37561b2e2302?w=400&q=80',
      category: 'news',
      date: 'Thứ Năm, 08/05/2025'
    },
    {
      id: 5,
      title: 'ROG Zephyrus G16 với RTX 50 Series chính thức ra mắt tại Việt Nam',
      excerpt: 'Laptop gaming mỏng nhẹ cao cấp ROG Zephyrus G16 chính thức có mặt tại VN',
      image: 'https://images.unsplash.com/photo-1625948515291-69613efd103f?w=400&q=80',
      category: 'news',
      date: 'Thứ Ba, 15/04/2025'
    },
    {
      id: 6,
      title: 'Đánh Giá Intel Core Ultra 5 245K: Sự Lựa Chọn Tối Ưu Cho Hiệu Năng và Giá Thành',
      excerpt: 'Review chi tiết Intel Core Ultra 5 245K - CPU thế hệ mới với hiệu năng ấn tượng',
      image: 'https://images.unsplash.com/photo-1555617981-dac3880eac6e?w=400&q=80',
      category: 'guide',
      date: 'Thứ Ba, 25/03/2025'
    },
    {
      id: 7,
      title: 'Top 5 Card Đồ Họa RTX 4080 Super Tốt Nhất Năm 2025',
      excerpt: 'Đánh giá và so sánh các dòng card RTX 4080 Super từ ASUS, MSI, Gigabyte',
      image: 'https://images.unsplash.com/photo-1591488320449-011701bb6704?w=400&q=80',
      category: 'review',
      date: 'Thứ Hai, 10/03/2025'
    },
    {
      id: 8,
      title: 'Logitech G Pro X Superlight 2: Chuột Gaming Wireless Hoàn Hảo',
      excerpt: 'Trải nghiệm chuột gaming không dây nhẹ nhất thế giới từ Logitech',
      image: 'https://images.unsplash.com/photo-1527864550417-7fd91fc51a46?w=400&q=80',
      category: 'review',
      date: 'Thứ Bảy, 01/03/2025'
    },
    {
      id: 9,
      title: 'Khuyến Mãi Mùa Hè: Giảm Đến 50% Gaming Gear',
      excerpt: 'Chương trình khuyến mãi lớn nhất năm với hàng nghìn sản phẩm gaming',
      image: 'https://images.unsplash.com/photo-1607083206869-4c7672e72a8a?w=400&q=80',
      category: 'promotion',
      date: 'Thứ Tư, 15/02/2025'
    },
    {
      id: 10,
      title: 'AMD Ryzen 9 9950X: Chip Xử Lý Đỉnh Cao Cho Creator',
      excerpt: 'Đánh giá hiệu năng Ryzen 9 9950X trong công việc sáng tạo nội dung',
      image: 'https://images.unsplash.com/photo-1591799264318-7e6ef8ddb7ea?w=400&q=80',
      category: 'guide',
      date: 'Thứ Năm, 05/02/2025'
    },
    {
      id: 11,
      title: 'Hướng Dẫn Build PC Gaming 30 Triệu Chiến Mọi Game',
      excerpt: 'Cấu hình PC gaming tối ưu với ngân sách 30 triệu đồng năm 2025',
      image: 'https://images.unsplash.com/photo-1587202372583-49330a15584d?w=400&q=80',
      category: 'guide',
      date: 'Thứ Ba, 20/01/2025'
    },
    {
      id: 12,
      title: 'Elden Ring DLC Shadow of the Erdtree: Ngày Ra Mắt Chính Thức',
      excerpt: 'FromSoftware công bố thông tin chi tiết về bản mở rộng Elden Ring',
      image: 'https://images.unsplash.com/photo-1538481199705-c710c4e965fc?w=400&q=80',
      category: 'gaming',
      date: 'Thứ Sáu, 10/01/2025'
    }
  ];

  const filteredArticles = selectedCategory === 'all' 
    ? newsArticles 
    : newsArticles.filter(article => article.category === selectedCategory);

  const featuredArticle = newsArticles.find(article => article.featured);
  const sidebarArticles = newsArticles.filter(article => !article.featured).slice(0, 5);

  return (
    <div className="news-page">
      {/* Breadcrumb */}
      <div className="breadcrumb-container">
        <div className="breadcrumb">
          <Link to="/">Trang chủ</Link>
          <span className="separator">/</span>
          <span className="current">Tin tức</span>
        </div>
      </div>

      <div className="news-container">
        <div className="news-main">
          {/* Featured Article */}
          {featuredArticle && (
            <div className="featured-article">
              <Link to={`/news/${featuredArticle.id}`} className="featured-link">
                <div className="featured-image">
                  <img src={featuredArticle.image} alt={featuredArticle.title} />
                  <div className="featured-overlay">
                    <div className="memoryzone-badge">
                      <span className="badge-text">MemoryZone</span>
                      <span className="badge-subtext">TIN TỨC</span>
                    </div>
                  </div>
                </div>
                <div className="featured-content">
                  <h1 className="featured-title">{featuredArticle.title}</h1>
                  <p className="featured-excerpt">{featuredArticle.excerpt}</p>
                </div>
              </Link>
            </div>
          )}

          {/* Category Hot Section */}
          <div className="category-hot-section">
            <h2 className="section-title">
              <span className="fire-icon">🔥</span> Chủ đề Hot
            </h2>
            <div className="category-grid">
              {categories.map(category => (
                <div 
                  key={category.id}
                  className={`category-card ${selectedCategory === category.id ? 'active' : ''}`}
                  onClick={() => setSelectedCategory(category.id)}
                >
                  <div className="category-icon">{category.icon}</div>
                  <div className="category-info">
                    <h3 className="category-name">{category.name}</h3>
                    {category.count > 0 && (
                      <p className="category-count">{category.count} bài tin</p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Articles Grid */}
          <div className="articles-section">
            <h2 className="section-title">
              📰 {selectedCategory === 'all' ? 'Tất Cả Tin Tức' : categories.find(c => c.id === selectedCategory)?.name}
            </h2>
            <div className="articles-grid">
              {filteredArticles.map(article => (
                <Link 
                  key={article.id} 
                  to={`/news/${article.id}`} 
                  className="article-card"
                >
                  <div className="article-image">
                    <img src={article.image} alt={article.title} />
                    <span className="article-category-badge">
                      {categories.find(c => c.id === article.category)?.icon} {categories.find(c => c.id === article.category)?.name}
                    </span>
                  </div>
                  <div className="article-content">
                    <h3 className="article-title">{article.title}</h3>
                    <p className="article-excerpt">{article.excerpt}</p>
                    <div className="article-meta">
                      <span className="article-date">📅 {article.date}</span>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        </div>

        {/* Sidebar */}
        <aside className="news-sidebar">
          <div className="sidebar-section">
            <h3 className="sidebar-title">📌 Tin Tức Nổi Bật</h3>
            <div className="sidebar-articles">
              {sidebarArticles.map(article => (
                <Link 
                  key={article.id} 
                  to={`/news/${article.id}`}
                  className="sidebar-article"
                >
                  <div className="sidebar-article-image">
                    <img src={article.image} alt={article.title} />
                  </div>
                  <div className="sidebar-article-content">
                    <h4 className="sidebar-article-title">{article.title}</h4>
                    <p className="sidebar-article-date">{article.date}</p>
                  </div>
                </Link>
              ))}
            </div>
          </div>

          {/* Popular Tags */}
          <div className="sidebar-section tags-section">
            <h3 className="sidebar-title">🏷️ Tags Phổ Biến</h3>
            <div className="tags-cloud">
              {['Gaming', 'Laptop', 'PC Build', 'Review', 'Graphics Card', 'CPU', 'Monitor', 'Keyboard', 'Mouse', 'Headset'].map(tag => (
                <span key={tag} className="tag-item">{tag}</span>
              ))}
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
};

export default NewsPage;



