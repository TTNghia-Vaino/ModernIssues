-- ============================================
-- Migration: Thêm banner_url và bảng promotion_categories
-- Chạy script này trong pgAdmin 4
-- ============================================

-- 1. Thêm cột banner_url vào bảng promotions (nếu chưa có)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'promotions' 
        AND column_name = 'banner_url'
    ) THEN
        ALTER TABLE promotions ADD COLUMN banner_url TEXT NULL;
    END IF;
END $$;

-- Thêm comment cho cột banner_url
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'promotions' 
        AND column_name = 'banner_url'
    ) THEN
        EXECUTE 'COMMENT ON COLUMN promotions.banner_url IS ''URL banner khuyến mãi (tùy chọn)''';
    END IF;
END $$;

-- 2. Tạo bảng promotion_categories (liên kết nhiều-nhiều giữa promotions và categories)
CREATE TABLE IF NOT EXISTS promotion_categories (
    promotion_id INTEGER NOT NULL,
    category_id INTEGER NOT NULL,
    CONSTRAINT promotion_categories_pkey PRIMARY KEY (promotion_id, category_id),
    CONSTRAINT promotion_categories_promotion_id_fkey 
        FOREIGN KEY (promotion_id) 
        REFERENCES promotions(promotion_id) 
        ON DELETE CASCADE,
    CONSTRAINT promotion_categories_category_id_fkey 
        FOREIGN KEY (category_id) 
        REFERENCES categories(category_id) 
        ON DELETE CASCADE
);

-- 3. Thêm comment cho bảng
COMMENT ON TABLE promotion_categories IS 'Liên kết nhiều danh mục với nhiều chương trình khuyến mãi';

-- 4. Tạo index để tối ưu truy vấn (nếu chưa tồn tại)
CREATE INDEX IF NOT EXISTS idx_promotion_categories_promotion_id 
    ON promotion_categories(promotion_id);
    
CREATE INDEX IF NOT EXISTS idx_promotion_categories_category_id 
    ON promotion_categories(category_id);

