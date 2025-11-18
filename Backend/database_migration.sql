-- ============================================
-- Script SQL PostgreSQL để tạo bảng product_serials và warranty_details
-- Chạy script này trong pgAdmin 4 hoặc psql
-- ============================================

-- ============================================
-- 1. BẢNG product_serials
-- Quản lý serial numbers của sản phẩm trong kho
-- ============================================

-- Tạo sequence cho serial_id (auto-increment)
CREATE SEQUENCE IF NOT EXISTS product_serials_serial_id_seq;

-- Tạo bảng product_serials
CREATE TABLE IF NOT EXISTS product_serials (
    serial_id INTEGER NOT NULL DEFAULT nextval('product_serials_serial_id_seq'),
    product_id INTEGER NOT NULL,
    serial_number VARCHAR(100) NOT NULL,
    order_id INTEGER NULL,
    warranty_id INTEGER NULL,
    created_at TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,
    created_by INTEGER NULL,
    updated_by INTEGER NULL,
    is_disabled BOOLEAN NULL DEFAULT FALSE,
    
    CONSTRAINT product_serials_pkey PRIMARY KEY (serial_id),
    CONSTRAINT product_serials_serial_number_unique UNIQUE (serial_number)
);

-- Comment cho bảng
COMMENT ON TABLE product_serials IS 'Bảng quản lý serial numbers của sản phẩm trong kho';

-- Comments cho các cột
COMMENT ON COLUMN product_serials.serial_number IS 'Serial number của sản phẩm (unique, bắt buộc)';
COMMENT ON COLUMN product_serials.is_disabled IS 'Trạng thái bảo hành: false = còn bảo hành, true = hết bảo hành';
COMMENT ON COLUMN product_serials.order_id IS 'ID đơn hàng nếu đã bán (nullable)';
COMMENT ON COLUMN product_serials.warranty_id IS 'ID warranty nếu đã bán (nullable)';

-- Tạo Foreign Keys
ALTER TABLE product_serials
    ADD CONSTRAINT product_serials_product_id_fkey 
    FOREIGN KEY (product_id) 
    REFERENCES products(product_id) 
    ON DELETE CASCADE;

ALTER TABLE product_serials
    ADD CONSTRAINT product_serials_order_id_fkey 
    FOREIGN KEY (order_id) 
    REFERENCES orders(order_id) 
    ON DELETE SET NULL;

ALTER TABLE product_serials
    ADD CONSTRAINT product_serials_warranty_id_fkey 
    FOREIGN KEY (warranty_id) 
    REFERENCES warranty(warranty_id) 
    ON DELETE SET NULL;

ALTER TABLE product_serials
    ADD CONSTRAINT product_serials_created_by_fkey 
    FOREIGN KEY (created_by) 
    REFERENCES users(user_id) 
    ON DELETE SET NULL;

ALTER TABLE product_serials
    ADD CONSTRAINT product_serials_updated_by_fkey 
    FOREIGN KEY (updated_by) 
    REFERENCES users(user_id) 
    ON DELETE SET NULL;

-- Tạo Index cho serial_number (unique index đã được tạo qua UNIQUE constraint)
-- Tạo thêm index cho product_id để tăng tốc truy vấn
CREATE INDEX IF NOT EXISTS idx_product_serials_product_id 
    ON product_serials(product_id);

CREATE INDEX IF NOT EXISTS idx_product_serials_is_disabled 
    ON product_serials(is_disabled);

CREATE INDEX IF NOT EXISTS idx_product_serials_order_id 
    ON product_serials(order_id);

CREATE INDEX IF NOT EXISTS idx_product_serials_warranty_id 
    ON product_serials(warranty_id);

-- Gán sequence owner
ALTER SEQUENCE product_serials_serial_id_seq OWNED BY product_serials.serial_id;


-- ============================================
-- 2. BẢNG warranty_details
-- Chi tiết từng lần bảo hành của một warranty
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

-- Tạo Foreign Keys
ALTER TABLE warranty_details
    ADD CONSTRAINT warranty_details_warranty_id_fkey 
    FOREIGN KEY (warranty_id) 
    REFERENCES warranty(warranty_id) 
    ON DELETE CASCADE;

ALTER TABLE warranty_details
    ADD CONSTRAINT warranty_details_created_by_fkey 
    FOREIGN KEY (created_by) 
    REFERENCES users(user_id) 
    ON DELETE RESTRICT;

ALTER TABLE warranty_details
    ADD CONSTRAINT warranty_details_handled_by_fkey 
    FOREIGN KEY (handled_by) 
    REFERENCES users(user_id) 
    ON DELETE SET NULL;

ALTER TABLE warranty_details
    ADD CONSTRAINT warranty_details_updated_by_fkey 
    FOREIGN KEY (updated_by) 
    REFERENCES users(user_id) 
    ON DELETE SET NULL;

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
-- SELECT table_name FROM information_schema.tables 
-- WHERE table_schema = 'public' 
-- AND table_name IN ('product_serials', 'warranty_details');

