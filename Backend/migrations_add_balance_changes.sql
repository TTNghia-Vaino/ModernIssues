-- ================================================
-- Migration: Add balance_changes table
-- Description: Bảng biến động số dư từ webhook ngân hàng/payment gateway
-- Date: 2025-11-07
-- ================================================

-- Create balance_changes table
CREATE TABLE IF NOT EXISTS balance_changes (
    id SERIAL PRIMARY KEY,
    transaction_id VARCHAR(100),
    amount DECIMAL(15, 2) NOT NULL,
    description VARCHAR(500),
    sender_account VARCHAR(50),
    sender_name VARCHAR(255),
    receiver_account VARCHAR(50),
    receiver_name VARCHAR(255),
    bank_code VARCHAR(20),
    transaction_date TIMESTAMP,
    transaction_type VARCHAR(10),
    gencode VARCHAR(20),
    status VARCHAR(20) DEFAULT 'pending',
    order_id INTEGER,
    raw_webhook_data TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    -- Foreign key
    CONSTRAINT balance_changes_order_id_fkey 
        FOREIGN KEY (order_id) 
        REFERENCES orders(order_id) 
        ON DELETE SET NULL
);

-- Add indexes for better performance
CREATE INDEX IF NOT EXISTS balance_changes_transaction_id_idx ON balance_changes(transaction_id);
CREATE INDEX IF NOT EXISTS balance_changes_gencode_idx ON balance_changes(gencode);
CREATE INDEX IF NOT EXISTS balance_changes_status_idx ON balance_changes(status);
CREATE INDEX IF NOT EXISTS balance_changes_order_id_idx ON balance_changes(order_id);
CREATE INDEX IF NOT EXISTS balance_changes_created_at_idx ON balance_changes(created_at);

-- Add comment to table
COMMENT ON TABLE balance_changes IS 'Bảng biến động số dư từ webhook ngân hàng';

-- Add comments to columns
COMMENT ON COLUMN balance_changes.id IS 'ID tự tăng';
COMMENT ON COLUMN balance_changes.transaction_id IS 'Transaction ID từ ngân hàng';
COMMENT ON COLUMN balance_changes.amount IS 'Số tiền giao dịch';
COMMENT ON COLUMN balance_changes.description IS 'Nội dung chuyển khoản (Description) - chứa gencode';
COMMENT ON COLUMN balance_changes.sender_account IS 'Số tài khoản người gửi';
COMMENT ON COLUMN balance_changes.sender_name IS 'Tên người gửi';
COMMENT ON COLUMN balance_changes.receiver_account IS 'Số tài khoản nhận';
COMMENT ON COLUMN balance_changes.receiver_name IS 'Tên người nhận';
COMMENT ON COLUMN balance_changes.bank_code IS 'Mã ngân hàng';
COMMENT ON COLUMN balance_changes.transaction_date IS 'Thời gian giao dịch';
COMMENT ON COLUMN balance_changes.transaction_type IS 'Loại giao dịch: IN (tiền vào), OUT (tiền ra)';
COMMENT ON COLUMN balance_changes.gencode IS 'Gencode được parse từ description (nếu có)';
COMMENT ON COLUMN balance_changes.status IS 'Trạng thái xử lý: pending, processed, failed';
COMMENT ON COLUMN balance_changes.order_id IS 'Order ID được match (nếu có)';
COMMENT ON COLUMN balance_changes.raw_webhook_data IS 'Nội dung webhook gốc (JSON)';
COMMENT ON COLUMN balance_changes.created_at IS 'Thời gian tạo bản ghi';
COMMENT ON COLUMN balance_changes.updated_at IS 'Thời gian cập nhật';

-- ================================================
-- Test queries (optional)
-- ================================================

-- Xem cấu trúc bảng
-- \d balance_changes;

-- Xem dữ liệu mẫu
-- SELECT * FROM balance_changes ORDER BY created_at DESC LIMIT 10;

-- Kiểm tra các giao dịch chưa xử lý
-- SELECT * FROM balance_changes WHERE status = 'pending';

-- Kiểm tra các giao dịch theo gencode
-- SELECT * FROM balance_changes WHERE gencode IS NOT NULL ORDER BY created_at DESC;

-- ================================================
-- Rollback script (if needed)
-- ================================================

-- DROP TABLE IF EXISTS balance_changes CASCADE;

