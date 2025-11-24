import React from 'react';
import './PromotionsAndTips.css';
import promo1 from '../assets/thumbnail-blog-600x-400.webp';
import promo2 from '../assets/bd4-thumbnail-blog-600x400.webp';
import promo3 from '../assets/ctkm-qd-oled-thumbnail-blog-600x400.webp';
import tip1 from '../assets/edgexpert.png';
import tip2 from '../assets/laptop-hang-nao-ben-nhat.png';
import tip3 from '../assets/dgx-spark.webp';
import tip4 from '../assets/ex300u.webp';

const ArticleCard = ({ image, title, date, description }) => (
  <article className="article-card">
    <div className="article-image">
      <img src={image} alt={title} />
    </div>
    <div className="article-content">
      <h3 className="article-title">{title}</h3>
      <p className="article-date">
        <i className="far fa-calendar-alt"></i>
        <span>{date}</span>
      </p>
      <p className="article-description">{description}</p>
    </div>
  </article>
);

const Section = ({ title, items }) => (
  <div className={`${title.includes('KHUYẾN MÃI') ? 'promotions-section' : 'tips-section'}`}>
    <div className="section-header">
      <h2 className="section-title">{title}</h2>
    </div>
    <div className="articles-list">
      {items.map((item) => (
        <ArticleCard key={item.id} {...item} />
      ))}
    </div>
    <div className="view-all-wrapper">
      <button className="view-all-btn">
        Xem tất cả <i className="fas fa-chevron-right"></i>
      </button>
    </div>
  </div>
);

function PromotionsAndTips() {
  const promotions = [
    { id: 1, image: promo1, title: 'Fundiin x MemoryZone: Lên đời công nghệ - Trả sau nhẹ nhàng, nhận ưu đãi đến 50K!', date: 'Thứ Ba, 28/10/2025', description: 'Fundiin kết hợp cùng MemoryZone mang đến chương trình ưu đãi cực hấp dẫn dành cho khách hàng yêu công nghệ! Mua sắm laptop, PC,...' },
    { id: 2, image: promo2, title: 'BUILD PC NHẬN VOUCHER LÊN ĐẾN 200K', date: 'Thứ Ba, 09/09/2025', description: 'Nhắm trí ân Quý khách hàng và mang đến cơ hội sở hữu thêm các phụ kiện công nghệ hiện đại với mức giá ưu...' },
    { id: 3, image: promo2, title: 'Mua GeForce RTX 50 Series Nhận ngay Borderlands 4 (Standard Edition) và Gilded Glor...', date: 'Thứ Tư, 20/08/2025', description: 'Chương trình khuyến mãi cực hot dành cho game thủ khi mua card đồ họa MSI GeForce RTX 50 Series tại MemoryZone, bạn sẽ được...' },
    { id: 4, image: promo3, title: 'MUA MÀN HÌNH MSI QD-OLED – NHẬN NGAY GAME WUCHANG: Fallen Feathers!', date: 'Thứ Sáu, 15/08/2025', description: 'Chương trình độc quyền từ MSI dành cho khách hàng mua màn hình MSI QD-OLED chính hãng tại MemoryZone. Sở hữu ngay game...' }
  ];

  const tips = [
    { id: 1, image: tip1, title: 'PCIe 6.0 là gì? Chuẩn giao tiếp tốc độ cao cho SSD và GPU thế hệ mới', date: 'Thứ Tư, 12/11/2025', description: 'PCI Express 6.0 đã chính thức được công bố, mang đến tốc độ truyền tải dữ liệu gấp đôi so với PCIe 5.0. Chuẩn giao tiếp mới này sẽ...' },
    { id: 2, image: tip2, title: 'Kiểm tra sức khỏe ổ cứng SSD: Hướng dẫn 10+ phần mềm test tốt nhất', date: 'Thứ Tư, 12/11/2025', description: 'Việc kiểm tra sức khỏe ổ cứng SSD định kỳ là rất quan trọng để đảm bảo dữ liệu của bạn được an toàn. Bài viết này sẽ hướng dẫn...' },
    { id: 3, image: tip3, title: 'Windows 11 25H2 vs 24H2: So sánh hai bản cập nhật lớn của Microsoft', date: 'Thứ Ba, 11/11/2025', description: 'Cộng đồng công nghệ đang rất quan tâm đến hai bản cập nhật lớn của Microsoft: Windows 11 25H2 và 24H2. Hãy cùng so sánh các tính năng...' },
    { id: 4, image: tip4, title: 'PCIe 5.0 là gì? Top 5 SSD PCIe 5.0 tốt nhất 2026', date: 'Thứ Hai, 10/11/2025', description: 'PCIe 5.0 là chuẩn giao tiếp phần cứng mới nhất hiện nay, mang đến tốc độ truyền tải dữ liệu cực nhanh cho SSD và GPU. Bài viết này...' }
  ];

  return (
    <section className="promotions-and-tips">
      <div className="container">
        <div className="content-wrapper">
          <Section title="THÔNG TIN KHUYẾN MÃI" items={promotions} />
          <Section title="KINH NGHIỆM HAY - MẸO VẶT" items={tips} />
        </div>
      </div>
    </section>
  );
}

export default PromotionsAndTips;

