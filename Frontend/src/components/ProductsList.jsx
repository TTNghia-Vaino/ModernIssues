import React, { useMemo, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { products, uniqueValues, searchProducts } from '../data/products';

const formatPrice = v => v.toLocaleString('vi-VN') + '₫';

const ProductsList = () => {
  const { search } = useLocation();
  const params = new URLSearchParams(search);
  const initialQ = params.get('q') || '';

  const [q, setQ] = useState(initialQ);
  const [brand, setBrand] = useState('');
  const [category, setCategory] = useState('');
  const [maxPrice, setMaxPrice] = useState('');

  const brands = useMemo(() => uniqueValues('brand'), []);
  const categories = useMemo(() => uniqueValues('category'), []);

  const filtered = useMemo(() => searchProducts({ q, brand, category, maxPrice }), [q, brand, category, maxPrice]);

  return (
    <div className="container" style={{maxWidth: '1200px', margin: '20px auto', padding: '0 20px'}}>
      <h2 style={{margin: '10px 0'}}>Sản phẩm</h2>
      <div style={{display: 'grid', gridTemplateColumns: '260px 1fr', gap: '20px'}}>
        <aside style={{border:'1px solid #eee', padding:'12px', borderRadius:'8px'}}>
          <div style={{display:'grid', gap:'10px'}}>
            <input placeholder="Tìm kiếm" value={q} onChange={e=>setQ(e.target.value)} style={{padding:'8px 10px'}} />
            <select value={brand} onChange={e=>setBrand(e.target.value)}>
              <option value="">Thương hiệu</option>
              {brands.map(b=> <option key={b} value={b}>{b}</option>)}
            </select>
            <select value={category} onChange={e=>setCategory(e.target.value)}>
              <option value="">Danh mục</option>
              {categories.map(c=> <option key={c} value={c}>{c}</option>)}
            </select>
            <input type="number" placeholder="Giá tối đa" value={maxPrice} onChange={e=>setMaxPrice(e.target.value)} />
            <button onClick={()=>{setQ('');setBrand('');setCategory('');setMaxPrice('');}}>Xóa bộ lọc</button>
          </div>
        </aside>

        <section style={{display:'grid', gridTemplateColumns:'repeat(auto-fill, minmax(200px, 1fr))', gap:'16px'}}>
          {filtered.map(p => (
            <Link key={p.id} to={`/products/${p.id}`} style={{border:'1px solid #eee', borderRadius:'8px', padding:'12px', textDecoration:'none', color:'#2c3e50'}}>
              <div style={{height:120, background:'#f7f7f7', borderRadius:6, marginBottom:8}}></div>
              <div style={{fontWeight:600}}>{p.name}</div>
              <div style={{color:'#0a804a', fontWeight:700}}>{formatPrice(p.price)}</div>
              <div style={{fontSize:12, color:'#6b7280'}}>{p.brand} · {p.category}</div>
            </Link>
          ))}
        </section>
      </div>
    </div>
  );
};

export default ProductsList;


