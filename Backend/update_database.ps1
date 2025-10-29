# Database Update Script for Order Table
# Chuyển từ enum sang string cho cột types

Write-Host "============================================" -ForegroundColor Green
Write-Host "DATABASE UPDATE: ENUM TO STRING" -ForegroundColor Green
Write-Host "============================================" -ForegroundColor Green

# Đọc connection string từ appsettings.json
$appSettingsPath = "appsettings.json"
$appSettings = Get-Content $appSettingsPath | ConvertFrom-Json
$connectionString = $appSettings.ConnectionStrings.DefaultConnection

Write-Host "Connection String: $connectionString" -ForegroundColor Yellow

# Tách thông tin connection string
$hostPattern = "Host=([^;]+)"
$portPattern = "Port=([^;]+)"
$databasePattern = "Database=([^;]+)"
$usernamePattern = "Username=([^;]+)"
$passwordPattern = "Password=([^;]+)"

$host = if ($connectionString -match $hostPattern) { $matches[1] } else { "localhost" }
$port = if ($connectionString -match $portPattern) { $matches[1] } else { "5432" }
$database = if ($connectionString -match $databasePattern) { $matches[1] } else { "modernissues" }
$username = if ($connectionString -match $usernamePattern) { $matches[1] } else { "postgres" }
$password = if ($connectionString -match $passwordPattern) { $matches[1] } else { "" }

Write-Host "Host: $host" -ForegroundColor Cyan
Write-Host "Port: $port" -ForegroundColor Cyan
Write-Host "Database: $database" -ForegroundColor Cyan
Write-Host "Username: $username" -ForegroundColor Cyan

# Tạo script SQL để kiểm tra
$checkScript = @"
-- Kiểm tra cấu trúc bảng orders
SELECT 
    column_name, 
    data_type, 
    is_nullable, 
    column_default,
    character_maximum_length
FROM information_schema.columns 
WHERE table_name = 'orders' 
AND column_name = 'types';

-- Kiểm tra enum type hiện tại
SELECT 
    t.typname as enum_name,
    e.enumlabel as enum_value
FROM pg_type t 
JOIN pg_enum e ON t.oid = e.enumtypid  
WHERE t.typname = 'payment_type'
ORDER BY e.enumsortorder;

-- Kiểm tra dữ liệu hiện tại
SELECT 
    types,
    COUNT(*) as count
FROM orders 
GROUP BY types;
"@

Write-Host "`n1. Kiểm tra cấu trúc database hiện tại..." -ForegroundColor Yellow
Write-Host "Chạy script SQL sau để kiểm tra:" -ForegroundColor Cyan
Write-Host $checkScript -ForegroundColor White

# Tạo script SQL để cập nhật
$updateScript = @"
-- Backup dữ liệu
CREATE TABLE IF NOT EXISTS orders_backup_$(Get-Date -Format 'yyyyMMdd') AS 
SELECT * FROM orders;

-- Xóa enum type cũ
DROP TYPE IF EXISTS payment_type CASCADE;

-- Cập nhật cột types
ALTER TABLE orders 
ALTER COLUMN types TYPE VARCHAR(20);

-- Cập nhật default value
ALTER TABLE orders 
ALTER COLUMN types SET DEFAULT 'COD';

-- Thêm comment
COMMENT ON COLUMN orders.types IS 'Loại thanh toán: COD, Transfer, ATM';

-- Cập nhật dữ liệu
UPDATE orders 
SET types = CASE 
    WHEN types = '0' THEN 'COD'
    WHEN types = '1' THEN 'Transfer' 
    WHEN types = '2' THEN 'ATM'
    ELSE COALESCE(types, 'COD')
END
WHERE types IN ('0', '1', '2') OR types IS NULL;

-- Đảm bảo giá trị hợp lệ
UPDATE orders 
SET types = 'COD' 
WHERE types IS NULL OR types NOT IN ('COD', 'Transfer', 'ATM');

-- Thêm constraint
ALTER TABLE orders 
ADD CONSTRAINT check_payment_types 
CHECK (types IN ('COD', 'Transfer', 'ATM'));

-- Tạo index
CREATE INDEX IF NOT EXISTS idx_orders_types ON orders(types);
"@

Write-Host "`n2. Script cập nhật database:" -ForegroundColor Yellow
Write-Host $updateScript -ForegroundColor White

Write-Host "`n3. Hướng dẫn thực hiện:" -ForegroundColor Yellow
Write-Host "1. Mở pgAdmin hoặc psql" -ForegroundColor Cyan
Write-Host "2. Kết nối đến database: $database" -ForegroundColor Cyan
Write-Host "3. Chạy script kiểm tra trước" -ForegroundColor Cyan
Write-Host "4. Nếu cần, chạy script cập nhật" -ForegroundColor Cyan
Write-Host "5. Kiểm tra kết quả" -ForegroundColor Cyan

Write-Host "`n4. Lưu ý:" -ForegroundColor Red
Write-Host "- Backup database trước khi chạy" -ForegroundColor Red
Write-Host "- Kiểm tra dữ liệu hiện tại" -ForegroundColor Red
Write-Host "- Test trên môi trường dev trước" -ForegroundColor Red

Write-Host "`n============================================" -ForegroundColor Green
Write-Host "SCRIPT HOÀN THÀNH" -ForegroundColor Green
Write-Host "============================================" -ForegroundColor Green
