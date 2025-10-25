import React from 'react';
import './PromotionsAndTips.css';
import promo1 from '../assets/thumbnail-blog-600x-400.webp';
import promo2 from '../assets/bd4-thumbnail-blog-600x400.webp';
import promo3 from '../assets/ctkm-qd-oled-thumbnail-blog-600x400.webp';
import promo4 from '../assets/thumbnail-blog.webp';
import tip1 from '../assets/edgexpert.png';
import tip2 from '../assets/laptop-hang-nao-ben-nhat.png';
import tip3 from '../assets/dgx-spark.webp';
import tip4 from '../assets/ex300u.webp';

function PromotionsAndTips() {
  const promotions = [
    {
      id: 1,
      image: promo1,
      title: 'BUILD PC NHẬN VOUCHER LÊN ĐẾN 200K',
      date: 'Thứ Ba, 09/09/2025',
      description: 'Nhắm trí ân Quý khách hàng và mang đến cơ hội sở hữu thêm các phụ kiện công nghệ hiện đại với mức giá ưu...'
    },
    {
      id: 2,
      image: promo2,
      title: 'Mua GeForce RTX 50 Series Nhận ngay Borderlands 4 (Standard Edition) và Gilded Glor...',
      date: 'Thứ Tư, 20/08/2025',
      description: 'Chương trình khuyến mãi cực hot dành cho game thủ khi mua MSI GeForce RTX 50 Series tại TechZone, bạn sẽ được...'
    },
    {
      id: 3,
      image: promo3,
      title: 'MUA MÀN HÌNH MSI QD-OLED – NHẬN NGAY GAME WUCHANG: Fallen Feathers!',
      date: 'Thứ Sáu, 15/08/2025',
      description: 'Chương trình khuyến mãi độc quyền từ MSI dành riêng cho khách hàng mua màn hình MSI QD-OLED chính hãng, chỉ có mua...'
    },
    {
      id: 4,
      image: promo4,
      title: 'POWERED BY MSI BACK TO SCHOOL - BUILD LÀ CHILL QUÀ SIÊU KHỦNG',
      date: 'Thứ Ba, 05/08/2025',
      description: 'Bạn đang lên kế hoạch build PC mùa tựu trường 2025? TechZone mời bạn tham khảo chương trình khuyến mãi cực hấp dẫn mang tên POWERED BY MSI...'
    }
  ];

  const tips = [
    {
      id: 1,
      image: tip1,
      title: 'MSI EdgeXpert MS-C931 chính thức trình làng tại Việt Nam',
      date: 'Thứ Sáu, 24/10/2025',
      description: 'MSI EdgeXpert MS-C931 chính thức ra mắt tại Việt Nam, đánh dấu bước ngoặt khi sức mạnh siêu tính AI này gỡi gọn trong...'
    },
    {
      id: 2,
      image: tip2,
      title: 'TOP 6 hãng laptop bền nhất 2025: Chuẩn quán đội, hiệu năng vượt trội',
      date: 'Thứ Năm, 23/10/2025',
      description: 'Chắc hẳn "độ bền" luôn là một trong những tiêu chí không thể thiếu khi tìm kiếm một chiếc máy tính xách tay. Vậy laptop...'
    },
    {
      id: 3,
      image: tip3,
      title: 'NVIDIA ra mắt DGX Spark: Siêu máy tính AI đế bản giá 3.999 USD',
      date: 'Thứ Năm, 16/10/2025',
      description: 'Ra mắt tại GTC 2025, NVIDIA DGX Spark được xem là "siêu máy tính AI nhỏ nhất thế giới", kết hợp sức mạnh Grace Blackwell...'
    },
    {
      id: 4,
      image: tip4,
      title: 'SSD EX300U - Ổ cứng di động tốc độ 1.100MB/s, hỗ trợ MagSafe tiện lợi',
      date: 'Thứ Tư, 15/10/2025',
      description: 'Corsair chính thức giới thiệu SSD EX300U - ổ cứng di động tích hợp MagSafe đầu tiên, mang đến tốc độ truyền tải lên đến...'
    }
  ];

  return (
    <section className="promotions-and-tips">
      <div className="container">
        <div className="content-wrapper">
          {/* Promotions Section */}
          <div className="promotions-section">
            <div className="section-header">
              <h2 className="section-title">THÔNG TIN KHUYẾN MÃI</h2>
            </div>
            <div className="articles-list">
              {promotions.map((promo) => (
                <article key={promo.id} className="article-card">
                  <div className="article-image">
                    <img src={promo.image} alt={promo.title} />
                  </div>
                  <div className="article-content">
                    <h3 className="article-title">{promo.title}</h3>
                    <p className="article-date">{promo.date}</p>
                    <p className="article-description">{promo.description}</p>
                  </div>
                </article>
              ))}
            </div>
            <div className="view-all-wrapper">
              <button className="view-all-btn">
                Xem tất cả <i className="fas fa-chevron-right"></i>
              </button>
            </div>
          </div>

          {/* Tips Section */}
          <div className="tips-section">
            <div className="section-header">
              <h2 className="section-title">KINH NGHIỆM HAY - MẸO VẶT</h2>
            </div>
            <div className="articles-list">
              {tips.map((tip) => (
                <article key={tip.id} className="article-card">
                  <div className="article-image">
                    <img src={tip.image} alt={tip.title} />
                  </div>
                  <div className="article-content">
                    <h3 className="article-title">{tip.title}</h3>
                    <p className="article-date">{tip.date}</p>
                    <p className="article-description">{tip.description}</p>
                  </div>
                </article>
              ))}
            </div>
            <div className="view-all-wrapper">
              <button className="view-all-btn">
                Xem tất cả <i className="fas fa-chevron-right"></i>
              </button>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

export default PromotionsAndTips;

