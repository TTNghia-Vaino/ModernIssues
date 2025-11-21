-- ============================================
-- QUERY TẠO SERIAL CHO STOCK - Dựa trên cấu trúc database thực tế
-- Chạy trên PostgreSQL (pgAdmin 4)
-- ============================================
-- Tự động tạo serial numbers cho tất cả sản phẩm dựa trên stock hiện tại
-- Logic: Đếm serial chưa bán (is_sold = false) và còn bảo hành (is_disabled = false)
-- Format: PRD-{productId}-{yyyyMMddHHmmssfff}-{index:000000}
-- ============================================
-- Cấu trúc bảng product_serials thực tế:
-- - serial_id, product_id, serial_number, import_date, is_sold, is_disabled
-- - created_at, updated_at, created_by, updated_by
-- KHÔNG có: order_id, warranty_id
-- ============================================

DO $$
DECLARE
    product_record RECORD;
    serials_needed INT;
    existing_serials_count INT;
    i INT;
    serial_number TEXT;
    base_timestamp TEXT;
    admin_id INT := 1;  -- SYSTEM_ADMIN_ID
    total_created INT := 0;
    current_index INT := 0;
BEGIN
    -- Lấy timestamp với milliseconds (format: yyyyMMddHHmmssfff)
    base_timestamp := TO_CHAR(NOW(), 'YYYYMMDDHH24MISS') || LPAD(EXTRACT(MILLISECONDS FROM NOW())::INT::TEXT, 3, '0');
    
    RAISE NOTICE '========================================';
    RAISE NOTICE 'Bắt đầu tạo serial numbers...';
    RAISE NOTICE 'Timestamp: %', base_timestamp;
    RAISE NOTICE 'Admin ID: %', admin_id;
    RAISE NOTICE '========================================';
    
    -- Lặp qua tất cả sản phẩm có stock > 0 và không bị disabled
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
        -- Đếm số serial hiện có: chưa bán (is_sold = false) và còn bảo hành (is_disabled = false)
        SELECT COUNT(*) INTO existing_serials_count
        FROM product_serials
        WHERE product_id = product_record.product_id
            AND (is_sold IS NULL OR is_sold = FALSE)
            AND (is_disabled IS NULL OR is_disabled = FALSE);
        
        -- Tính số serial cần tạo: stock - existing_serials
        serials_needed := product_record.stock - existing_serials_count;
        
        IF serials_needed > 0 THEN
            -- Tạo serial numbers với format: PRD-{productId}-{timestamp}-{index:000000}
            FOR i IN 1..serials_needed LOOP
                current_index := current_index + 1;
                serial_number := 'PRD-' || product_record.product_id || '-' || base_timestamp || '-' || LPAD(current_index::TEXT, 6, '0');
                
                -- Insert vào product_serials với cấu trúc thực tế
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
            
            RAISE NOTICE '✓ Product ID % (%): Tạo % serial | Stock: %, Có: %, Thiếu: %', 
                product_record.product_id, 
                product_record.product_name,
                serials_needed,
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

-- ============================================
-- Kiểm tra kết quả sau khi chạy
-- ============================================
SELECT 
    'Kết quả tạo serial' AS info,
    COUNT(*) AS total_serials_created,
    COUNT(DISTINCT product_id) AS products_affected,
    MIN(created_at) AS first_created,
    MAX(created_at) AS last_created
FROM product_serials
WHERE created_at >= NOW() - INTERVAL '2 minutes';
