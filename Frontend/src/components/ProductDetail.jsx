import React from 'react';
import { useParams, Link } from 'react-router-dom';
import { productById } from '../data/products';

const formatPrice = v => v.toLocaleString('vi-VN') + '₫';

const ProductDetail = () => {
  const { id } = useParams();
  const product = productById(id);

  if (!product) {
    return (
      <div className="container" style={{maxWidth: '960px', margin: '20px auto', padding: '0 20px'}}>
        <p>Không tìm thấy sản phẩm.</p>
        <Link to="/products">Quay lại danh sách</Link>
      </div>
    );
  }

  return (
    <div className="container" style={{maxWidth:'960px', margin:'20px auto', padding:'0 20px'}}>
      <Link to="/products" style={{textDecoration:'none'}}>&larr; Trở lại</Link>
      <div style={{display:'grid', gridTemplateColumns:'1fr 1fr', gap:'20px', marginTop:'12px'}}>
        <div style={{background:'#f7f7f7', borderRadius:8, height:360}}></div>
        <div>
          <h2 style={{marginTop:0}}>{product.name}</h2>
          <div style={{color:'#0a804a', fontWeight:700, fontSize:20}}>{formatPrice(product.price)}</div>
          <div style={{marginTop:12}}>
            <h4>Thông số</h4>
            <ul>
              {product.specs.map((s, i)=>(<li key={i}>{s}</li>))}
            </ul>
          </div>
          <button style={{background:'#0a804a', color:'#fff', border:'none', padding:'10px 16px', borderRadius:6, cursor:'pointer'}}>Thêm vào giỏ</button>
        </div>
      </div>
    </div>
  );
};

export default ProductDetail;


