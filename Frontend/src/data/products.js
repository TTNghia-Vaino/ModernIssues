// Centralized mock product catalog
export const products = [
  { id: 'p1', name: 'Laptop Gaming X', price: 25990000, brand: 'Acer', category: 'Laptop', specs: ['RTX 4060','16GB RAM','512GB SSD'] },
  { id: 'p2', name: 'Chuột Pro M1', price: 599000, brand: 'Logitech', category: 'Chuột', specs: ['Wireless','RGB','10000 DPI'] },
  { id: 'p3', name: 'SSD NVMe 1TB', price: 1699000, brand: 'Samsung', category: 'SSD', specs: ['PCIe 3.0','3500MB/s'] },
  { id: 'p4', name: 'RAM 16GB DDR4', price: 899000, brand: 'Kingston', category: 'RAM', specs: ['3200MHz','CL16'] },

  // More mock products
  { id: 'p5', name: 'Bàn phím AKKO 3068', price: 1599000, brand: 'AKKO', category: 'Bàn phím', specs: ['PBT','Hot-swap','Bluetooth 5.0'] },
  { id: 'p6', name: 'Tai nghe HyperX Cloud', price: 1499000, brand: 'HyperX', category: 'Tai nghe', specs: ['7.1','50mm Driver'] },
  { id: 'p7', name: 'USB 64GB 3.0', price: 159000, brand: 'Sandisk', category: 'USB', specs: ['USB 3.0','64GB'] },
  { id: 'p8', name: 'HDD 2TB 3.5"', price: 1499000, brand: 'Seagate', category: 'HDD', specs: ['7200RPM','3.5 inch'] },
  { id: 'p9', name: 'Màn hình 24" 144Hz', price: 3299000, brand: 'AOC', category: 'Màn hình', specs: ['144Hz','IPS','24 inch'] },
  { id: 'p10', name: 'Webcam 1080p', price: 699000, brand: 'Rapoo', category: 'Webcam', specs: ['1080p','Auto focus'] },
  { id: 'p11', name: 'Laptop Văn phòng Slim', price: 15990000, brand: 'Dell', category: 'Laptop', specs: ['i5','8GB','256GB SSD'] },
  { id: 'p12', name: 'SSD SATA 512GB', price: 899000, brand: 'WD', category: 'SSD', specs: ['SATA III','560MB/s'] },
  { id: 'p13', name: 'RAM 8GB DDR4', price: 499000, brand: 'Corsair', category: 'RAM', specs: ['2666MHz','CL19'] },
  { id: 'p14', name: 'Chuột Razer Viper Mini', price: 799000, brand: 'Razer', category: 'Chuột', specs: ['61g','8500 DPI'] },
  { id: 'p15', name: 'Bàn phím Keychron K2', price: 2199000, brand: 'Keychron', category: 'Bàn phím', specs: ['Hot-swap','Bluetooth','Aluminum frame'] },
];

export const productById = (id) => products.find(p => p.id === id);

export const searchProducts = ({ q = '', brand = '', category = '', maxPrice } = {}) => {
  return products.filter(p => (
    (!q || p.name.toLowerCase().includes(q.toLowerCase())) &&
    (!brand || p.brand === brand) &&
    (!category || p.category === category) &&
    (maxPrice === undefined || maxPrice === '' || p.price <= Number(maxPrice))
  ));
};

export const uniqueValues = (key) => Array.from(new Set(products.map(p => p[key])));



