-- ============================================
-- Script SQL ĐẦY ĐỦ - Tạo serial cho stock (Dựa trên cấu trúc database thực tế)
-- Chạy trên PostgreSQL (pgAdmin 4)
-- ============================================
-- Bao gồm: Kiểm tra trước, tạo serial, kiểm tra sau
-- Cấu trúc thực tế: is_sold, import_date (KHÔNG có order_id, warranty_id)
-- ============================================

-- ============================================
-- BƯỚC 1: Kiểm tra trạng thái hiện tại
-- ============================================
-- Xem sản phẩm nào thiếu serial trước khi chạy script chính
SELECT 
    'KIỂM TRA TRƯỚC' AS step,
    p.product_id,
    p.product_name,
    p.stock,
    COALESCE(
        COUNT(ps.serial_id) FILTER (
            WHERE (ps.is_sold IS NULL OR ps.is_sold = FALSE)
            AND (ps.is_disabled IS NULL OR ps.is_disabled = FALSE)
        ), 
        0
    ) AS existing_serials,
    p.stock - COALESCE(
        COUNT(ps.serial_id) FILTER (
            WHERE (ps.is_sold IS NULL OR ps.is_sold = FALSE)
            AND (ps.is_disabled IS NULL OR ps.is_disabled = FALSE)
        ), 
        0
    ) AS serials_needed
FROM products p
LEFT JOIN product_serials ps ON p.product_id = ps.product_id
WHERE p.stock > 0 
    AND (p.is_disabled IS NULL OR p.is_disabled = FALSE)
GROUP BY p.product_id, p.product_name, p.stock
HAVING p.stock - COALESCE(
    COUNT(ps.serial_id) FILTER (
        WHERE (ps.is_sold IS NULL OR ps.is_sold = FALSE)
        AND (ps.is_disabled IS NULL OR ps.is_disabled = FALSE)
    ), 
    0
) > 0
ORDER BY p.product_id;

-- ============================================
-- BƯỚC 2: Tạo serial numbers
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
    -- Lấy timestamp với milliseconds (format yyyyMMddHHmmssfff)
    base_timestamp := TO_CHAR(NOW(), 'YYYYMMDDHH24MISS') || LPAD(EXTRACT(MILLISECONDS FROM NOW())::INT::TEXT, 3, '0');
    
    RAISE NOTICE '========================================';
    RAISE NOTICE 'Bắt đầu tạo serial numbers dựa trên cấu trúc database thực tế';
    RAISE NOTICE 'Timestamp: %', base_timestamp;
    RAISE NOTICE 'Admin ID: % (SYSTEM_ADMIN_ID)', admin_id;
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
        -- KHÔNG dùng order_id vì không có trong database thực tế
        SELECT COUNT(*) INTO existing_serials_count
        FROM product_serials
        WHERE product_id = product_record.product_id
            AND (is_sold IS NULL OR is_sold = FALSE)
            AND (is_disabled IS NULL OR is_disabled = FALSE);
        
        -- Tính số serial cần tạo thêm để đảm bảo số serial = stock
        serials_needed := product_record.stock - existing_serials_count;
        
        -- Chỉ tạo serial nếu thiếu (serialsNeeded > 0)
        IF serials_needed > 0 THEN
            -- Tạo serial numbers với format: PRD-{productId}-{timestamp}-{index:000000}
            FOR i IN 1..serials_needed LOOP
                current_index := current_index + 1;
                serial_number := 'PRD-' || product_record.product_id || '-' || base_timestamp || '-' || LPAD(current_index::TEXT, 6, '0');
                
                -- Insert vào product_serials với cấu trúc thực tế
                -- Các cột: product_id, serial_number, import_date, is_sold, is_disabled, created_at, updated_at, created_by, updated_by
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
-- BƯỚC 3: Kiểm tra kết quả sau khi chạy
-- ============================================
SELECT 
    'KIỂM TRA SAU' AS step,
    p.product_id,
    p.product_name,
    p.stock,
    COALESCE(
        COUNT(ps.serial_id) FILTER (
            WHERE (ps.is_sold IS NULL OR ps.is_sold = FALSE)
            AND (ps.is_disabled IS NULL OR ps.is_disabled = FALSE)
        ), 
        0
    ) AS existing_serials,
    p.stock - COALESCE(
        COUNT(ps.serial_id) FILTER (
            WHERE (ps.is_sold IS NULL OR ps.is_sold = FALSE)
            AND (ps.is_disabled IS NULL OR ps.is_disabled = FALSE)
        ), 
        0
    ) AS serials_needed,
    CASE 
        WHEN p.stock - COALESCE(
            COUNT(ps.serial_id) FILTER (
                WHERE (ps.is_sold IS NULL OR ps.is_sold = FALSE)
                AND (ps.is_disabled IS NULL OR ps.is_disabled = FALSE)
            ), 
            0
        ) = 0 THEN 'Đủ serial'
        WHEN p.stock - COALESCE(
            COUNT(ps.serial_id) FILTER (
                WHERE (ps.is_sold IS NULL OR ps.is_sold = FALSE)
                AND (ps.is_disabled IS NULL OR ps.is_disabled = FALSE)
            ), 
            0
        ) > 0 THEN 'Thiếu serial'
        ELSE 'Thừa serial'
    END AS status
FROM products p
LEFT JOIN product_serials ps ON p.product_id = ps.product_id
WHERE p.stock > 0 
    AND (p.is_disabled IS NULL OR p.is_disabled = FALSE)
GROUP BY p.product_id, p.product_name, p.stock
ORDER BY p.product_id;
