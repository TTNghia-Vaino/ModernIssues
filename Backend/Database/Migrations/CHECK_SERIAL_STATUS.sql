-- ============================================
-- QUERY KIỂM TRA TRẠNG THÁI SERIAL - Dựa trên cấu trúc database thực tế
-- Chạy trên PostgreSQL (pgAdmin 4)
-- ============================================
-- Kiểm tra sản phẩm nào thiếu serial, đủ serial, hoặc thừa serial
-- Logic: Đếm serial với is_sold = false AND is_disabled = false
-- KHÔNG dùng order_id vì không có trong database thực tế
-- ============================================

-- Query kiểm tra chi tiết từng sản phẩm
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
ORDER BY 
    CASE 
        WHEN p.stock - COALESCE(
            COUNT(ps.serial_id) FILTER (
                WHERE (ps.is_sold IS NULL OR ps.is_sold = FALSE)
                AND (ps.is_disabled IS NULL OR ps.is_disabled = FALSE)
            ), 
            0
        ) > 0 THEN 1  -- Thiếu serial lên đầu
        ELSE 2
    END,
    p.product_id;

-- ============================================
-- Tổng hợp nhanh
-- ============================================
SELECT 
    'Tổng hợp' AS summary,
    COUNT(DISTINCT p.product_id) AS total_products,
    SUM(CASE 
        WHEN p.stock - COALESCE(
            COUNT(ps.serial_id) FILTER (
                WHERE (ps.is_sold IS NULL OR ps.is_sold = FALSE)
                AND (ps.is_disabled IS NULL OR ps.is_disabled = FALSE)
            ), 
            0
        ) > 0 THEN 1 
        ELSE 0 
    END) AS products_needing_serials,
    SUM(GREATEST(0, p.stock - COALESCE(
        COUNT(ps.serial_id) FILTER (
            WHERE (ps.is_sold IS NULL OR ps.is_sold = FALSE)
            AND (ps.is_disabled IS NULL OR ps.is_disabled = FALSE)
        ), 
        0
    ))) AS total_serials_needed
FROM products p
LEFT JOIN product_serials ps ON p.product_id = ps.product_id
WHERE p.stock > 0 
    AND (p.is_disabled IS NULL OR p.is_disabled = FALSE)
GROUP BY p.product_id, p.product_name, p.stock;
