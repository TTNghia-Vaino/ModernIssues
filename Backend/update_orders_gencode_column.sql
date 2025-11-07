-- ================================================
-- Migration: Update orders.gencode column
-- Description: Thay đổi gencode từ lưu EMV string sang lưu mã ngắn (PAY_ABC123)
-- Date: 2025-11-07
-- ================================================

-- Cập nhật độ dài cột gencode từ 1024 về 20 ký tự (đủ cho PAY_XXXXXXXXXX)
ALTER TABLE orders 
    ALTER COLUMN gencode TYPE VARCHAR(20);

-- Cập nhật comment cho column
COMMENT ON COLUMN orders.gencode IS 'Mã thanh toán ngắn gọn (PAY_ABC123) - 6-10 ký tự';

-- Tạo index cho gencode để tìm kiếm nhanh
CREATE INDEX IF NOT EXISTS orders_gencode_idx ON orders(gencode);

-- ================================================
-- Optional: Clean up data nếu có EMV string cũ
-- ================================================

-- Xem các order có gencode dài (EMV string cũ)
-- SELECT order_id, gencode, LENGTH(gencode) as gencode_length 
-- FROM orders 
-- WHERE gencode IS NOT NULL AND LENGTH(gencode) > 20;

-- Xóa gencode cũ nếu cần (tùy chọn)
-- UPDATE orders 
-- SET gencode = NULL 
-- WHERE gencode IS NOT NULL AND LENGTH(gencode) > 20;

-- ================================================
-- Test queries
-- ================================================

-- Xem các order có gencode mới
-- SELECT order_id, user_id, gencode, types, status, total_amount, created_at 
-- FROM orders 
-- WHERE gencode IS NOT NULL 
-- ORDER BY created_at DESC 
-- LIMIT 10;

-- Kiểm tra order theo gencode
-- SELECT * FROM orders WHERE gencode = 'PAY_ABC123';

-- ================================================
-- Rollback script (if needed)
-- ================================================

-- ALTER TABLE orders 
--     ALTER COLUMN gencode TYPE VARCHAR(1024);
-- 
-- COMMENT ON COLUMN orders.gencode IS 'Mã thanh toán VietQR EMV hoặc nội dung QR code (tối đa 1024 ký tự)';
-- 
-- DROP INDEX IF EXISTS orders_gencode_idx;

