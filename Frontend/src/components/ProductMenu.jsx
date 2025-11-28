import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useCategories } from '../context/CategoryContext';
import './ProductMenu.css';

const DEFAULT_CATEGORIES = [
  { icon: 'fas fa-mouse', label: 'Chuột-Bàn phím-Tai nghe', children: { 'Chuột': ['Razer','Logitech','Rapoo','Corsair'], 'Bàn phím': ['AKKO','Keychron','DareU'], 'Tai nghe': ['HyperX','Razer','Logitech'], 'Sản phẩm nổi bật': ['Chuột Pro M1','RAM 16GB DDR4'] } },
  { icon: 'fas fa-laptop', label: 'Laptop', children: { 'Thương hiệu': ['Acer','Asus','MSI','Dell'], 'Nhu cầu': ['Gaming','Văn phòng','Mỏng nhẹ'], 'Sản phẩm nổi bật': ['Laptop Gaming X'] } },
  { icon: 'fas fa-desktop', label: 'PC / Máy Bộ', children: { 'PC Gaming': ['RTX 4060','RTX 4070'], 'PC Văn phòng': ['Core i5','Ryzen 5'] } },
  { icon: 'fas fa-tools', label: 'PC Tự Build', children: { 'Mainboard': ['Intel','AMD'], 'Case': ['ATX','mATX'] } },
  { icon: 'fas fa-microchip', label: 'Linh kiện PC / Laptop', children: { 'CPU': ['Intel','AMD'], 'GPU': ['NVIDIA','AMD'] } },
  { icon: 'fas fa-tv', label: 'Màn hình - Loa', children: { 'Màn hình': ['144Hz','240Hz'], 'Loa': ['2.0','2.1'] } },
  { icon: 'fas fa-video', label: 'Lifestyle - Livestream setup', children: { 'Mic': ['USB','XLR'], 'Webcam': ['1080p','4K'] } },
  { icon: 'fas fa-sd-card', label: 'SSD gắn trong', children: { 'Chuẩn': ['SATA','NVMe'], 'Dung lượng': ['512GB','1TB','2TB'], 'Sản phẩm nổi bật': ['SSD NVMe 1TB'] } },
  { icon: 'fas fa-memory', label: 'RAM Laptop, PC', children: { 'Dung lượng': ['8GB','16GB','32GB'], 'Bus': ['3200','3600'] } },
  { icon: 'far fa-clone', label: 'Thẻ nhớ', children: { 'Chuẩn': ['SD','microSD'], 'Dung lượng': ['64GB','128GB','256GB'] } },
  { icon: 'fas fa-hdd', label: 'Ổ cứng SSD di động', children: { 'Dung lượng': ['500GB','1TB','2TB'] } },
  { icon: 'fas fa-compact-disc', label: 'Ổ cứng HDD di động', children: { 'Dung lượng': ['1TB','2TB','4TB'] } },
  { icon: 'fas fa-usb', label: 'USB', children: { 'Chuẩn': ['2.0','3.0','Type-C'] } },
  { icon: 'fas fa-database', label: 'HDD', children: { '3.5 inch': ['1TB','2TB'], '2.5 inch': ['1TB'] } },
  { icon: 'fas fa-network-wired', label: 'GIẢI PHÁP NAS', children: { 'NAS': ['Synology','QNAP'], 'Ổ cứng NAS': ['Seagate','WD Red'] } },
  { icon: 'fas fa-plug', label: 'Phụ kiện', children: { 'Cáp': ['HDMI','DisplayPort'], 'Hub': ['USB-C','Ethernet'] } },
  { icon: 'fas fa-tools', label: 'Dịch vụ thu phí', children: { 'Dịch vụ': ['Cài đặt','Vệ sinh','Bảo hành'] } },
];

const getCategoryIcon = (name) => {
  // Handle undefined or null name
  if (!name || typeof name !== 'string') {
    return 'fas fa-box';
  }
  const lower = name.toLowerCase();
  const iconMap = {
    laptop: 'fas fa-laptop',
    pc: 'fas fa-desktop', 'máy bộ': 'fas fa-desktop',
    chuột: 'fas fa-mouse', 'bàn phím': 'fas fa-mouse', 'tai nghe': 'fas fa-mouse',
    ssd: 'fas fa-sd-card',
    ram: 'fas fa-memory',
    'màn hình': 'fas fa-tv', loa: 'fas fa-tv',
    'phụ kiện': 'fas fa-plug',
    usb: 'fas fa-usb',
    hdd: 'fas fa-database'
  };
  return Object.entries(iconMap).find(([key]) => lower.includes(key))?.[1] || 'fas fa-box';
};

const transformCategories = (apiCategories) => {
  if (!Array.isArray(apiCategories)) return null;
  return apiCategories.map(cat => {
    // Try multiple possible name fields
    const name = cat.name || cat.categoryName || cat.label || 'Unnamed Category';
    return {
      id: cat.id || cat.categoryId,
      icon: cat.icon || getCategoryIcon(name),
      label: name,
      children: cat.children?.length > 0 
        ? { 'Danh mục con': cat.children.map(c => c.name || c.categoryName || c.label || c) }
        : { 'Sản phẩm': [] }
    };
  });
};

const ProductMenu = ({ title = 'DANH MỤC SẢN PHẨM', categories: propCategories }) => {
  const [open, setOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);
  const [categories, setCategories] = useState(propCategories || DEFAULT_CATEGORIES);
  const navigate = useNavigate();
  const { categories: apiCategories } = useCategories();

  useEffect(() => {
    if (propCategories) {
      setCategories(propCategories);
      return;
    }
    // Use categories from context instead of direct API call
    if (apiCategories && Array.isArray(apiCategories) && apiCategories.length > 0) {
      const transformed = transformCategories(apiCategories);
      if (transformed?.length > 0) {
        setCategories(transformed);
      }
    }
  }, [propCategories, apiCategories]);

  const ITEM_TO_PRODUCT_ID = { 'Laptop Gaming X': 'p1', 'Chuột Pro M1': 'p2', 'SSD NVMe 1TB': 'p3', 'RAM 16GB DDR4': 'p4' };

  const navigateTo = (path) => {
    window.scrollTo({ top: 0, behavior: 'instant' });
    navigate(path);
    setOpen(false);
  };

  const handleSubItemClick = (item, categoryId) => {
    const productId = ITEM_TO_PRODUCT_ID[item];
    if (productId) navigateTo(`/products/${productId}`);
    else if (categoryId) navigateTo(`/products?category=${categoryId}`);
    else navigateTo(`/products?q=${encodeURIComponent(item)}`);
  };

  const handleCategoryClick = (category) => {
    const path = category.id ? `/products?category=${category.id}` : `/products?q=${encodeURIComponent(category.label)}`;
    navigateTo(path);
  };

  return (
    <div className="product-menu">
      <button className="product-menu__toggle" onClick={() => setOpen(!open)}>
        <i className="fas fa-bars"></i>
        <span>{title}</span>
        <i className={`fas fa-chevron-${open ? 'up' : 'down'} caret`}></i>
      </button>

      {open && (
        <>
          <div className="product-menu__backdrop" onClick={() => setOpen(false)} aria-hidden="true"></div>
          <div className="product-menu__dropdown" role="menu" aria-label="Product categories">
            <div className="pmenu-left">
              {categories.map((c, idx) => {
                const hasChildren = c.children && Object.values(c.children).some(items => Array.isArray(items) && items.length > 0);
                return (
                  <button 
                    key={c.id || idx} 
                    className={`product-menu__item ${idx === activeIndex ? 'active' : ''}`} 
                    onMouseEnter={() => setActiveIndex(idx)}
                    onClick={() => !hasChildren && c.id && handleCategoryClick(c)}
                  >
                    <i className={c.icon} aria-hidden="true"></i>
                    <span className="label">{c.label}</span>
                    <i className="fas fa-angle-right arrow" aria-hidden="true"></i>
                  </button>
                );
              })}
            </div>
            <div className="pmenu-right">
              {Object.entries(categories[activeIndex]?.children || {}).map(([group, items]) => (
                <div key={group} className="pmenu-group">
                  <div className="pmenu-group-title">{group}</div>
                  <div className="pmenu-links">
                    {(items || []).map(it => {
                      const item = typeof it === 'object' ? it : { name: it };
                      return (
                        <a 
                          key={item.id || item.name} 
                          href="#" 
                          className="pmenu-link" 
                          onClick={(e) => {
                            e.preventDefault();
                            handleSubItemClick(item.name, item.id || categories[activeIndex]?.id);
                          }}
                        >
                          {item.name}
                        </a>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default ProductMenu;
