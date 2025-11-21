# Database Migration: Cập nhật cấu trúc bảng warranty

## Mục đích
Chuyển đổi cấu trúc bảng `warranty` từ composite primary key sang chỉ dùng `warranty_id` làm primary key, và đảm bảo `serial_number` là NOT NULL + UNIQUE.

## Thay đổi
- **Trước**: Primary key = `(warranty_id, product_id, user_id, order_id)`
- **Sau**: Primary key = `warranty_id` (auto-increment)
- **Serial number**: NOT NULL + UNIQUE index

## Cách chạy migration

### Cách 1: Chạy file SQL trực tiếp
```bash
psql -U your_username -d your_database -f UpdateWarrantyTable.sql
```

### Cách 2: Copy và paste vào pgAdmin hoặc psql
Mở file `UpdateWarrantyTable.sql` và chạy toàn bộ nội dung.

### Cách 3: Chạy từng bước thủ công
Xem chi tiết trong file `UpdateWarrantyTable.sql`

## Kiểm tra sau khi migration

```sql
-- 1. Kiểm tra primary key
SELECT 
    constraint_name, 
    constraint_type 
FROM information_schema.table_constraints 
WHERE table_name = 'warranty' 
AND constraint_type = 'PRIMARY KEY';

-- 2. Kiểm tra unique index cho serial_number
SELECT 
    indexname, 
    indexdef 
FROM pg_indexes 
WHERE tablename = 'warranty' 
AND indexname = 'warranty_serial_number_unique';

-- 3. Kiểm tra serial_number có NOT NULL không
SELECT 
    column_name, 
    is_nullable, 
    data_type 
FROM information_schema.columns 
WHERE table_name = 'warranty' 
AND column_name = 'serial_number';

-- 4. Kiểm tra dữ liệu
SELECT COUNT(*) as total_warranties,
       COUNT(DISTINCT serial_number) as unique_serials,
       COUNT(*) - COUNT(serial_number) as null_serials
FROM warranty;
```

## Rollback (nếu cần)

```sql
BEGIN;

-- Xóa unique index
DROP INDEX IF EXISTS warranty_serial_number_unique;

-- Xóa primary key mới
ALTER TABLE warranty DROP CONSTRAINT IF EXISTS warranty_pkey;

-- Khôi phục composite primary key (nếu cần)
ALTER TABLE warranty ADD CONSTRAINT warranty_pkey 
    PRIMARY KEY (warranty_id, product_id, user_id, order_id);

-- Cho phép serial_number null
ALTER TABLE warranty ALTER COLUMN serial_number DROP NOT NULL;

COMMIT;
```



