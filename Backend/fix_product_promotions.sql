-- ============================================
-- Kiểm tra và sửa bảng product_promotions
-- Chạy script này để đảm bảo bảng có đủ constraints
-- ============================================

-- 1. Kiểm tra bảng có tồn tại không
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'product_promotions'
    ) THEN
        RAISE NOTICE 'Bảng product_promotions không tồn tại. Vui lòng chạy script tạo bảng trước.';
    ELSE
        RAISE NOTICE 'Bảng product_promotions đã tồn tại.';
    END IF;
END $$;

-- 2. Kiểm tra và thêm primary key (nếu thiếu)
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'product_promotions'
    ) AND NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_schema = 'public' 
        AND table_name = 'product_promotions' 
        AND constraint_type = 'PRIMARY KEY'
    ) THEN
        ALTER TABLE product_promotions 
        ADD CONSTRAINT product_promotions_pkey 
        PRIMARY KEY (product_id, promotion_id);
        RAISE NOTICE 'Đã thêm primary key cho product_promotions';
    ELSE
        RAISE NOTICE 'Primary key đã tồn tại';
    END IF;
END $$;

-- 3. Kiểm tra và thêm foreign key product_id (nếu thiếu)
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'product_promotions'
    ) AND NOT EXISTS (
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
    ELSE
        RAISE NOTICE 'Foreign key product_id đã tồn tại';
    END IF;
END $$;

-- 4. Kiểm tra và thêm foreign key promotion_id (nếu thiếu)
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'product_promotions'
    ) AND NOT EXISTS (
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
    ELSE
        RAISE NOTICE 'Foreign key promotion_id đã tồn tại';
    END IF;
END $$;

-- 5. Tạo indexes (nếu chưa có)
CREATE INDEX IF NOT EXISTS idx_product_promotions_product_id 
    ON product_promotions(product_id);
    
CREATE INDEX IF NOT EXISTS idx_product_promotions_promotion_id 
    ON product_promotions(promotion_id);

-- 6. Xem cấu trúc bảng
SELECT 
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns
WHERE table_schema = 'public' 
AND table_name = 'product_promotions'
ORDER BY ordinal_position;

-- 7. Xem constraints
SELECT
    tc.constraint_name,
    tc.constraint_type,
    kcu.column_name,
    ccu.table_name AS foreign_table_name,
    ccu.column_name AS foreign_column_name
FROM information_schema.table_constraints AS tc
JOIN information_schema.key_column_usage AS kcu
    ON tc.constraint_name = kcu.constraint_name
    AND tc.table_schema = kcu.table_schema
LEFT JOIN information_schema.constraint_column_usage AS ccu
    ON ccu.constraint_name = tc.constraint_name
    AND ccu.table_schema = tc.table_schema
WHERE tc.table_schema = 'public' 
AND tc.table_name = 'product_promotions'
ORDER BY tc.constraint_type, tc.constraint_name;


