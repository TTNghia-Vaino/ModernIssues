-- ============================================
-- UPDATE ORDER TABLE: ENUM TO STRING
-- ============================================

-- 1. Xóa enum type cũ (nếu tồn tại)
DROP TYPE IF EXISTS payment_type CASCADE;

-- 2. Cập nhật cột types từ enum sang varchar
-- Trước tiên, backup dữ liệu hiện tại
CREATE TABLE IF NOT EXISTS orders_backup AS 
SELECT * FROM orders;

-- 3. Cập nhật cột types thành varchar
ALTER TABLE orders 
ALTER COLUMN types TYPE VARCHAR(20);

-- 4. Cập nhật default value
ALTER TABLE orders 
ALTER COLUMN types SET DEFAULT 'COD';

-- 5. Thêm comment cho cột
COMMENT ON COLUMN orders.types IS 'Loại thanh toán: COD, Transfer, ATM';

-- 6. Cập nhật dữ liệu hiện tại (nếu có)
-- Chuyển đổi các giá trị enum cũ sang string
UPDATE orders 
SET types = CASE 
    WHEN types = '0' THEN 'COD'
    WHEN types = '1' THEN 'Transfer' 
    WHEN types = '2' THEN 'ATM'
    ELSE 'COD'
END
WHERE types IN ('0', '1', '2');

-- 7. Đảm bảo tất cả records có giá trị hợp lệ
UPDATE orders 
SET types = 'COD' 
WHERE types IS NULL OR types NOT IN ('COD', 'Transfer', 'ATM');

-- 8. Thêm constraint để đảm bảo chỉ chấp nhận các giá trị hợp lệ
ALTER TABLE orders 
ADD CONSTRAINT check_payment_types 
CHECK (types IN ('COD', 'Transfer', 'ATM'));

-- 9. Tạo index cho cột types (nếu cần)
CREATE INDEX IF NOT EXISTS idx_orders_types ON orders(types);

-- 10. Xóa bảng backup (sau khi đã kiểm tra)
-- DROP TABLE IF EXISTS orders_backup;
