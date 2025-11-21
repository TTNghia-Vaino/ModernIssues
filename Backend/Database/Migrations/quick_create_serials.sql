-- ============================================
-- QUERY NHANH - Tạo serial cho stock (Dựa trên cấu trúc database thực tế)
-- Chạy trên PostgreSQL (pgAdmin 4)
-- ============================================
-- Phiên bản nhanh nhất sử dụng CTE và generate_series
-- Logic: is_sold = false AND is_disabled = false
-- Format: PRD-{productId}-{yyyyMMddHHmmssfff}-{index:000000}
-- ============================================
-- Cấu trúc thực tế: KHÔNG có order_id, warranty_id
-- Có: is_sold, import_date
-- ============================================

WITH product_serial_counts AS (
    -- Đếm số serial hiện có cho mỗi sản phẩm
    SELECT 
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
        (p.stock - COALESCE(
            COUNT(ps.serial_id) FILTER (
                WHERE (ps.is_sold IS NULL OR ps.is_sold = FALSE)
                AND (ps.is_disabled IS NULL OR ps.is_disabled = FALSE)
            ), 
            0
        )) AS serials_needed
    FROM products p
    LEFT JOIN product_serials ps ON p.product_id = ps.product_id
    WHERE p.stock > 0 
        AND (p.is_disabled IS NULL OR p.is_disabled = FALSE)
    GROUP BY p.product_id, p.product_name, p.stock
    HAVING (p.stock - COALESCE(
        COUNT(ps.serial_id) FILTER (
            WHERE (ps.is_sold IS NULL OR ps.is_sold = FALSE)
            AND (ps.is_disabled IS NULL OR ps.is_disabled = FALSE)
        ), 
        0
    )) > 0
)
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
)
SELECT 
    psc.product_id,
    -- Format: PRD-{productId}-{timestamp}-{index:000000}
    'PRD-' || psc.product_id || '-' || 
    TO_CHAR(NOW(), 'YYYYMMDDHH24MISS') || 
    LPAD(EXTRACT(MILLISECONDS FROM NOW())::INT::TEXT, 3, '0') || '-' ||
    LPAD(gs::TEXT, 6, '0') AS serial_number,
    NOW() AS import_date,
    FALSE AS is_sold,  -- Chưa bán
    FALSE AS is_disabled,  -- Còn bảo hành
    NOW() AS created_at,
    NOW() AS updated_at,
    1 AS created_by,  -- SYSTEM_ADMIN_ID
    1 AS updated_by   -- SYSTEM_ADMIN_ID
FROM product_serial_counts psc
CROSS JOIN LATERAL generate_series(1, psc.serials_needed) AS gs;

-- Xem kết quả
SELECT 
    'Kết quả' AS info,
    COUNT(*) AS total_serials_created,
    COUNT(DISTINCT product_id) AS products_affected
FROM product_serials
WHERE created_at >= NOW() - INTERVAL '1 minute';
