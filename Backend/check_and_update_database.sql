-- ============================================
-- CHECK AND UPDATE DATABASE FOR ORDER TABLE
-- ============================================

-- 1. Kiểm tra cấu trúc bảng orders hiện tại
SELECT 
    column_name, 
    data_type, 
    is_nullable, 
    column_default,
    character_maximum_length
FROM information_schema.columns 
WHERE table_name = 'orders' 
AND column_name = 'types';

-- 2. Kiểm tra enum type hiện tại (nếu có)
SELECT 
    t.typname as enum_name,
    e.enumlabel as enum_value
FROM pg_type t 
JOIN pg_enum e ON t.oid = e.enumtypid  
WHERE t.typname = 'payment_type'
ORDER BY e.enumsortorder;

-- 3. Kiểm tra dữ liệu hiện tại trong bảng orders
SELECT 
    types,
    COUNT(*) as count
FROM orders 
GROUP BY types;

-- ============================================
-- UPDATE SCRIPT (chỉ chạy nếu cần)
-- ============================================

-- 4. Backup dữ liệu trước khi thay đổi
CREATE TABLE IF NOT EXISTS orders_backup_$(date +%Y%m%d) AS 
SELECT * FROM orders;

-- 5. Xóa enum type cũ (nếu tồn tại)
DROP TYPE IF EXISTS payment_type CASCADE;

-- 6. Cập nhật cột types từ enum sang varchar
ALTER TABLE orders 
ALTER COLUMN types TYPE VARCHAR(20);

-- 7. Cập nhật default value
ALTER TABLE orders 
ALTER COLUMN types SET DEFAULT 'COD';

-- 8. Thêm comment cho cột
COMMENT ON COLUMN orders.types IS 'Loại thanh toán: COD, Transfer, ATM';

-- 9. Cập nhật dữ liệu hiện tại (nếu có giá trị số)
UPDATE orders 
SET types = CASE 
    WHEN types = '0' THEN 'COD'
    WHEN types = '1' THEN 'Transfer' 
    WHEN types = '2' THEN 'ATM'
    ELSE COALESCE(types, 'COD')
END
WHERE types IN ('0', '1', '2') OR types IS NULL;

-- 10. Đảm bảo tất cả records có giá trị hợp lệ
UPDATE orders 
SET types = 'COD' 
WHERE types IS NULL OR types NOT IN ('COD', 'Transfer', 'ATM');

-- 11. Thêm constraint để đảm bảo chỉ chấp nhận các giá trị hợp lệ
ALTER TABLE orders 
ADD CONSTRAINT check_payment_types 
CHECK (types IN ('COD', 'Transfer', 'ATM'));

-- 12. Tạo index cho cột types (nếu cần)
CREATE INDEX IF NOT EXISTS idx_orders_types ON orders(types);

-- 13. Kiểm tra kết quả sau khi cập nhật
SELECT 
    types,
    COUNT(*) as count
FROM orders 
GROUP BY types;

-- 14. Kiểm tra constraint
SELECT 
    conname as constraint_name,
    contype as constraint_type,
    consrc as constraint_definition
FROM pg_constraint 
WHERE conrelid = 'orders'::regclass 
AND conname = 'check_payment_types';
