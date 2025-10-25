import React from 'react';
import './PoliciesAndServices.css';

function PoliciesAndServices() {
  const policies = [
    {
      id: 1,
      icon: "fas fa-shipping-fast",
      title: "Giao hàng Siêu Tốc 2 - 4H",
      description: "Giao hàng trong nội thành HCM & Hà Nội nhanh chóng từ 2 - 4H."
    },
    {
      id: 2,
      icon: "fas fa-undo-alt",
      title: "7 ngày đổi trả",
      description: "Yên tâm mua sắm với chính sách đổi trả trong vòng 7 ngày"
    },
    {
      id: 3,
      icon: "fas fa-certificate",
      title: "100% chính hãng",
      description: "Cam kết chất lượng sản phẩm chính hãng 100%"
    },
    {
      id: 4,
      icon: "fas fa-credit-card",
      title: "Thanh toán dễ dàng",
      description: "Đa dạng phương thức như COD, chuyển khoản, quẹt thẻ trả góp"
    }
  ];

  return (
    <section className="policies-and-services">
      <div className="container">
        <div className="policies-grid">
          {policies.map((policy) => (
            <div key={policy.id} className="policy-card">
              <div className="policy-icon">
                <i className={policy.icon}></i>
              </div>
              <div className="policy-content">
                <h3 className="policy-title">{policy.title}</h3>
                <p className="policy-description">{policy.description}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

export default PoliciesAndServices;

