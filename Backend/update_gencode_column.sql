-- Tăng kích thước column gencode từ VARCHAR(100) sang VARCHAR(500)
-- Để lưu EMV QR string từ VietQR API

ALTER TABLE orders 
ALTER COLUMN gencode TYPE VARCHAR(500);

-- Cập nhật comment
COMMENT ON COLUMN orders.gencode IS 'Mã QR code EMV cho thanh toán Transfer (VietQR EMVCo standard)';

-- Kiểm tra kết quả
SELECT column_name, data_type, character_maximum_length 
FROM information_schema.columns 
WHERE table_name = 'orders' AND column_name = 'gencode';


