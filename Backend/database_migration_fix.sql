-- ============================================
-- Script SQL để sửa bảng product_serials
-- Xóa cột status, sử dụng is_disabled để xác định trạng thái bảo hành
-- is_disabled = false → có thể tiếp tục bảo hành
-- is_disabled = true → hết bảo hành
-- ============================================

-- Xóa cột status nếu đã tồn tại
DO $$ 
BEGIN
    IF EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'product_serials' 
        AND column_name = 'status'
    ) THEN
        ALTER TABLE product_serials DROP COLUMN status;
        RAISE NOTICE 'Đã xóa cột status từ product_serials';
    ELSE
        RAISE NOTICE 'Cột status không tồn tại trong product_serials';
    END IF;
END $$;

-- Đảm bảo cột is_disabled tồn tại và có default value
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'product_serials' 
        AND column_name = 'is_disabled'
    ) THEN
        ALTER TABLE product_serials 
        ADD COLUMN is_disabled BOOLEAN NULL DEFAULT FALSE;
        RAISE NOTICE 'Đã thêm cột is_disabled vào product_serials';
    ELSE
        -- Đảm bảo default value
        ALTER TABLE product_serials 
        ALTER COLUMN is_disabled SET DEFAULT FALSE;
        RAISE NOTICE 'Đã cập nhật default value cho is_disabled';
    END IF;
END $$;

-- Xóa index status nếu tồn tại
DROP INDEX IF EXISTS idx_product_serials_status;

-- Comment cho cột is_disabled
COMMENT ON COLUMN product_serials.is_disabled IS 'Trạng thái bảo hành: false = còn bảo hành, true = hết bảo hành';

-- ============================================
-- HOÀN TẤT
-- ============================================
-- Kiểm tra cấu trúc bảng sau khi sửa
-- SELECT column_name, data_type, is_nullable, column_default
-- FROM information_schema.columns
-- WHERE table_name = 'product_serials'
-- ORDER BY ordinal_position;

