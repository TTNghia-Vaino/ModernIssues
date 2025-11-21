-- ============================================
-- Script SQL ĐƠN GIẢN để tạo serial cho stock
-- Chạy trực tiếp trên pgAdmin 4
-- ============================================
-- Phiên bản đơn giản sử dụng DO block
-- Tạo serial cho tất cả sản phẩm có stock > 0 và thiếu serial
-- Dựa trên cấu trúc database thực tế: is_sold, import_date (KHÔNG có order_id, warranty_id)
-- ============================================

DO $$
DECLARE
    product_record RECORD;
    serials_needed INT;
    existing_serials_count INT;
    i INT;
    serial_number TEXT;
    base_timestamp TEXT;
    admin_id INT := 1;  -- Thay đổi admin_id nếu cần
    total_created INT := 0;
    current_index INT := 0;  -- Index tổng để đảm bảo unique across products
BEGIN
    -- Lấy timestamp một lần cho toàn bộ batch
    base_timestamp := TO_CHAR(NOW(), 'YYYYMMDDHH24MISS') || LPAD(EXTRACT(MILLISECONDS FROM NOW())::INT::TEXT, 3, '0');
    
    RAISE NOTICE 'Bắt đầu tạo serial numbers...';
    RAISE NOTICE 'Timestamp: %', base_timestamp;
    
    -- Lặp qua tất cả sản phẩm có stock > 0
    FOR product_record IN 
        SELECT 
            p.product_id,
            p.product_name,
            p.stock
        FROM products p
        WHERE p.stock > 0 
            AND (p.is_disabled IS NULL OR p.is_disabled = FALSE)
        ORDER BY p.product_id
    LOOP
        -- Đếm số serial hiện có (chưa bán: is_sold = false, còn bảo hành: is_disabled = false)
        -- KHÔNG dùng order_id vì không có cột này trong database thực tế
        SELECT COUNT(*) INTO existing_serials_count
        FROM product_serials
        WHERE product_id = product_record.product_id
            AND (is_sold IS NULL OR is_sold = FALSE)
            AND (is_disabled IS NULL OR is_disabled = FALSE);
        
        -- Tính số serial cần tạo thêm
        serials_needed := product_record.stock - existing_serials_count;
        
        -- Chỉ tạo serial nếu thiếu
        IF serials_needed > 0 THEN
            -- Tạo serial numbers với index riêng cho mỗi sản phẩm
            FOR i IN 1..serials_needed LOOP
                current_index := current_index + 1;
                -- Format: PRD-{productId}-{timestamp}-{index:000000}
                serial_number := 'PRD-' || product_record.product_id || '-' || base_timestamp || '-' || LPAD(current_index::TEXT, 6, '0');
                
                -- Insert vào product_serials với cấu trúc thực tế
                -- Các cột: serial_id, product_id, serial_number, import_date, is_sold, is_disabled, created_at, updated_at, created_by, updated_by
                INSERT INTO product_serials (
                    product_id,
                    serial_number,
                    import_date,
                    is_sold,
                    is_disabled,
                    created_at,
                    updated_at,
                    created_by,
                    updated_by
                ) VALUES (
                    product_record.product_id,
                    serial_number,
                    NOW(),  -- import_date
                    FALSE,  -- is_sold = false (chưa bán)
                    FALSE,  -- is_disabled = false (còn bảo hành)
                    NOW(),  -- created_at
                    NOW(),  -- updated_at
                    admin_id,
                    admin_id
                );
                
                total_created := total_created + 1;
            END LOOP;
            
            RAISE NOTICE '✓ Đã tạo % serial cho sản phẩm: % (ID: %, Stock: %, Có: %, Thiếu: %)', 
                serials_needed, 
                product_record.product_name, 
                product_record.product_id,
                product_record.stock,
                existing_serials_count,
                serials_needed;
        ELSE
            RAISE NOTICE '  Product ID % (%): Đủ serial (Stock: %, Có: %)', 
                product_record.product_id,
                product_record.product_name,
                product_record.stock,
                existing_serials_count;
        END IF;
    END LOOP;
    
    RAISE NOTICE '========================================';
    RAISE NOTICE 'Hoàn thành! Tổng cộng đã tạo % serial numbers', total_created;
    RAISE NOTICE '========================================';
END $$;

-- Xem kết quả
SELECT 
    'Đã tạo serial thành công!' AS message,
    COUNT(*) AS total_serials_created,
    COUNT(DISTINCT product_id) AS products_affected
FROM product_serials
WHERE created_at >= NOW() - INTERVAL '2 minutes';
