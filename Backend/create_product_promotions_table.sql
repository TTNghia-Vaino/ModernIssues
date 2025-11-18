-- ============================================
-- Tạo bảng product_promotions (nếu chưa có)
-- Bảng này dùng để liên kết many-to-many giữa products và promotions
-- ============================================

-- Kiểm tra và tạo bảng product_promotions (nếu chưa có)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'product_promotions'
    ) THEN
        CREATE TABLE product_promotions (
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

        COMMENT ON TABLE product_promotions IS 'Liên kết nhiều sản phẩm với nhiều chương trình khuyến mãi';
        
        RAISE NOTICE 'Đã tạo bảng product_promotions';
    ELSE
        RAISE NOTICE 'Bảng product_promotions đã tồn tại';
    END IF;
END $$;

-- Kiểm tra và tạo index nếu chưa có
CREATE INDEX IF NOT EXISTS idx_product_promotions_product_id 
    ON product_promotions(product_id);

CREATE INDEX IF NOT EXISTS idx_product_promotions_promotion_id 
    ON product_promotions(promotion_id);

-- Kiểm tra constraints (nếu bảng đã tồn tại nhưng thiếu constraints)
DO $$
BEGIN
    -- Kiểm tra primary key
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_schema = 'public' 
        AND table_name = 'product_promotions' 
        AND constraint_name = 'product_promotions_pkey'
    ) THEN
        ALTER TABLE product_promotions 
        ADD CONSTRAINT product_promotions_pkey 
        PRIMARY KEY (product_id, promotion_id);
        RAISE NOTICE 'Đã thêm primary key cho product_promotions';
    END IF;

    -- Kiểm tra foreign key product_id
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_schema = 'public' 
        AND table_name = 'product_promotions' 
        AND constraint_name = 'product_promotions_product_id_fkey'
    ) THEN
        ALTER TABLE product_promotions 
        ADD CONSTRAINT product_promotions_product_id_fkey 
        FOREIGN KEY (product_id) 
        REFERENCES products(product_id) 
        ON DELETE CASCADE;
        RAISE NOTICE 'Đã thêm foreign key product_id cho product_promotions';
    END IF;

    -- Kiểm tra foreign key promotion_id
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_schema = 'public' 
        AND table_name = 'product_promotions' 
        AND constraint_name = 'product_promotions_promotion_id_fkey'
    ) THEN
        ALTER TABLE product_promotions 
        ADD CONSTRAINT product_promotions_promotion_id_fkey 
        FOREIGN KEY (promotion_id) 
        REFERENCES promotions(promotion_id) 
        ON DELETE CASCADE;
        RAISE NOTICE 'Đã thêm foreign key promotion_id cho product_promotions';
    END IF;
END $$;

