-- ============================================
-- Kiểm tra cấu trúc bảng product_promotions
-- ============================================

-- 1. Kiểm tra xem bảng có tồn tại không
SELECT 
    table_name,
    table_type
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name = 'product_promotions';

-- 2. Xem cấu trúc cột của bảng
SELECT 
    column_name,
    data_type,
    character_maximum_length,
    is_nullable,
    column_default
FROM information_schema.columns
WHERE table_schema = 'public' 
AND table_name = 'product_promotions'
ORDER BY ordinal_position;

-- 3. Xem constraints (foreign keys, primary key)
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

-- 4. Xem indexes trên bảng
SELECT
    indexname,
    indexdef
FROM pg_indexes
WHERE schemaname = 'public' 
AND tablename = 'product_promotions';

-- 5. Xem số lượng records trong bảng
SELECT COUNT(*) as total_records
FROM product_promotions;

-- 6. Xem sample data (nếu có)
SELECT *
FROM product_promotions
LIMIT 10;


