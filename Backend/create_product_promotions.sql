-- ============================================
-- Tạo bảng product_promotions (nếu chưa tồn tại)
-- ============================================

-- Kiểm tra và tạo bảng product_promotions
CREATE TABLE IF NOT EXISTS product_promotions (
    product_id INTEGER NOT NULL,
    promotion_id INTEGER NOT NULL,
    CONSTRAINT product_promotions_pkey PRIMARY KEY (product_id, promotion_id),
    CONSTRAINT product_promotions_product_id_fkey 
        FOREIGN KEY (product_id) 
        REFERENCES products(product_id) 
        ON DELETE CASCADE,
    CONSTRAINT product_promotions_promotion_id_fkey 
        FOREIGN KEY (promotion_id) 
        REFERENCES promotions(promotion_id) 
        ON DELETE CASCADE
);

-- Thêm comment cho bảng
COMMENT ON TABLE product_promotions IS 'Liên kết nhiều sản phẩm với nhiều chương trình khuyến mãi';

-- Tạo index để tối ưu truy vấn (nếu chưa tồn tại)
CREATE INDEX IF NOT EXISTS idx_product_promotions_product_id 
    ON product_promotions(product_id);
    
CREATE INDEX IF NOT EXISTS idx_product_promotions_promotion_id 
    ON product_promotions(promotion_id);


