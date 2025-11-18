-- ============================================
-- SCRIPT TỔNG HỢP ĐỂ CHẠY TRONG PGADMIN 4
-- Copy toàn bộ file này và chạy một lần
-- ============================================

-- ============================================
-- 1. SỬA BẢNG product_serials (XÓA CỘT STATUS)
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

-- Tạo index mới cho is_disabled
CREATE INDEX IF NOT EXISTS idx_product_serials_is_disabled 
    ON product_serials(is_disabled);

-- Comment cho cột is_disabled
COMMENT ON COLUMN product_serials.is_disabled IS 'Trạng thái bảo hành: false = còn bảo hành, true = hết bảo hành';


-- ============================================
-- 2. TẠO BẢNG warranty_details (MỚI)
-- ============================================

-- Tạo sequence cho detail_id (auto-increment)
CREATE SEQUENCE IF NOT EXISTS warranty_details_detail_id_seq;

-- Tạo bảng warranty_details
CREATE TABLE IF NOT EXISTS warranty_details (
    detail_id INTEGER NOT NULL DEFAULT nextval('warranty_details_detail_id_seq'),
    warranty_id INTEGER NOT NULL,
    claim_number INTEGER NOT NULL,
    status VARCHAR(50) NOT NULL DEFAULT 'pending'::character varying,
    description VARCHAR(1000) NULL,
    solution VARCHAR(1000) NULL,
    request_date TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    service_date TIMESTAMP NULL,
    completed_date TIMESTAMP NULL,
    cost NUMERIC(15, 2) NULL,
    created_by INTEGER NOT NULL,
    handled_by INTEGER NULL,
    notes VARCHAR(500) NULL,
    image_urls TEXT NULL,
    created_at TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,
    updated_by INTEGER NULL,
    is_disabled BOOLEAN NULL DEFAULT FALSE,
    
    CONSTRAINT warranty_details_pkey PRIMARY KEY (detail_id),
    CONSTRAINT warranty_details_warranty_claim_unique UNIQUE (warranty_id, claim_number)
);

-- Comment cho bảng
COMMENT ON TABLE warranty_details IS 'Chi tiết từng lần bảo hành của một warranty (lần 1, 2, 3, 4...)';

-- Comments cho các cột
COMMENT ON COLUMN warranty_details.claim_number IS 'Số thứ tự lần bảo hành (1, 2, 3, 4...)';
COMMENT ON COLUMN warranty_details.status IS 'Trạng thái: pending (chờ xử lý), approved (đã duyệt), processing (đang xử lý), completed (hoàn thành), rejected (từ chối), cancelled (đã hủy)';
COMMENT ON COLUMN warranty_details.description IS 'Mô tả vấn đề/yêu cầu bảo hành';
COMMENT ON COLUMN warranty_details.solution IS 'Giải pháp/công việc đã thực hiện (admin điền sau khi xử lý)';
COMMENT ON COLUMN warranty_details.request_date IS 'Ngày yêu cầu bảo hành';
COMMENT ON COLUMN warranty_details.service_date IS 'Ngày bắt đầu xử lý (nullable)';
COMMENT ON COLUMN warranty_details.completed_date IS 'Ngày hoàn thành (nullable)';
COMMENT ON COLUMN warranty_details.cost IS 'Chi phí sửa chữa (nếu có, nullable) - có thể là 0 nếu trong bảo hành';
COMMENT ON COLUMN warranty_details.created_by IS 'Người yêu cầu bảo hành (user_id)';
COMMENT ON COLUMN warranty_details.handled_by IS 'Người xử lý bảo hành (admin_id, nullable)';
COMMENT ON COLUMN warranty_details.notes IS 'Ghi chú thêm (nullable)';
COMMENT ON COLUMN warranty_details.image_urls IS 'Ảnh minh chứng (có thể lưu JSON array)';

-- Tạo Foreign Keys (chỉ thêm nếu chưa tồn tại)
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'warranty_details_warranty_id_fkey'
    ) THEN
        ALTER TABLE warranty_details
            ADD CONSTRAINT warranty_details_warranty_id_fkey 
            FOREIGN KEY (warranty_id) 
            REFERENCES warranty(warranty_id) 
            ON DELETE CASCADE;
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'warranty_details_created_by_fkey'
    ) THEN
        ALTER TABLE warranty_details
            ADD CONSTRAINT warranty_details_created_by_fkey 
            FOREIGN KEY (created_by) 
            REFERENCES users(user_id) 
            ON DELETE RESTRICT;
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'warranty_details_handled_by_fkey'
    ) THEN
        ALTER TABLE warranty_details
            ADD CONSTRAINT warranty_details_handled_by_fkey 
            FOREIGN KEY (handled_by) 
            REFERENCES users(user_id) 
            ON DELETE SET NULL;
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'warranty_details_updated_by_fkey'
    ) THEN
        ALTER TABLE warranty_details
            ADD CONSTRAINT warranty_details_updated_by_fkey 
            FOREIGN KEY (updated_by) 
            REFERENCES users(user_id) 
            ON DELETE SET NULL;
    END IF;
END $$;

-- Tạo Indexes
CREATE INDEX IF NOT EXISTS idx_warranty_details_warranty_id 
    ON warranty_details(warranty_id);

CREATE INDEX IF NOT EXISTS idx_warranty_details_status 
    ON warranty_details(status);

CREATE INDEX IF NOT EXISTS idx_warranty_details_created_by 
    ON warranty_details(created_by);

CREATE INDEX IF NOT EXISTS idx_warranty_details_handled_by 
    ON warranty_details(handled_by);

-- Gán sequence owner
ALTER SEQUENCE warranty_details_detail_id_seq OWNED BY warranty_details.detail_id;


-- ============================================
-- HOÀN TẤT
-- ============================================

-- Kiểm tra các bảng đã được tạo
SELECT 'product_serials' as table_name, 
       EXISTS(SELECT 1 FROM information_schema.tables WHERE table_name = 'product_serials') as exists
UNION ALL
SELECT 'warranty_details' as table_name,
       EXISTS(SELECT 1 FROM information_schema.tables WHERE table_name = 'warranty_details') as exists;

