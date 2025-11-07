# 📦 Migration Guide - Payment System Refactor

## 🎯 Mục đích

Refactor hệ thống thanh toán:
- ✅ Gencode ngắn gọn (10 ký tự): `PAY_ABC123`
- ✅ Cache order data theo gencode
- ✅ Bảng biến động số dư (balance_changes)
- ✅ Parse gencode từ webhook description
- ✅ Auto-match order và cập nhật status

---

## 🔧 Bước 1: Chạy Migration SQL

### Option A: PostgreSQL (Production)

```bash
# 1. Backup database trước
pg_dump -U postgres -d modernissues_db > backup_before_migration.sql

# 2. Chạy migration bảng balance_changes
psql -U postgres -d modernissues_db -f migrations_add_balance_changes.sql

# 3. Cập nhật cột gencode trong orders
psql -U postgres -d modernissues_db -f update_orders_gencode_column.sql

# 4. Verify migration
psql -U postgres -d modernissues_db -c "\d balance_changes"
psql -U postgres -d modernissues_db -c "\d orders"
```

### Option B: Development (Local)

```bash
# Kết nối vào PostgreSQL
psql -U your_username -d your_database

# Paste nội dung từ migration files
# Hoặc dùng \i command:
\i migrations_add_balance_changes.sql
\i update_orders_gencode_column.sql

# Kiểm tra
SELECT * FROM balance_changes LIMIT 1;
SELECT order_id, gencode FROM orders WHERE gencode IS NOT NULL LIMIT 5;
```

---

## 📝 Bước 2: Kiểm tra Code Changes

### Files đã thay đổi:

```
✅ Helpers/PaymentCodeGenerator.cs          (Refactor gen mã ngắn)
✅ Models/Entities/balance_change.cs        (Entity mới)
✅ Models/Entities/WebDbContext.cs          (Thêm DbSet)
✅ Models/DTOs/WebhookBalanceDto.cs         (DTO mới)
✅ Services/PaymentService.cs               (Cache + ProcessBalanceChange)
✅ Services/IPaymentService.cs              (Interface mới)
✅ Controllers/PaymentController.cs         (Endpoint /WebhookBalance)
```

### Verify không có linter errors:

```bash
dotnet build
# Hoặc trong VS: Build > Build Solution
```

---

## 🧪 Bước 3: Test Locally

### 3.1 Test Generate Gencode

```bash
dotnet run
```

Mở file `test_checkout_transfer.http` hoặc Postman:

```http
# 1. Login
POST http://localhost:5000/v1/Auth/Login
{
  "username": "testuser",
  "password": "password123"
}

# 2. Add to cart
POST http://localhost:5000/v1/Cart/Add
{
  "productId": 1,
  "quantity": 2
}

# 3. Checkout Transfer
POST http://localhost:5000/v1/Checkout/Transfer

# 4. Generate QR (copy orderId từ step 3)
POST http://localhost:5000/v1/Payment/GenerateQr
{
  "orderId": 123,
  "amount": 50000
}

Response sẽ có gencode ngắn:
{
  "gencode": "PAY_ABC123",  // ← Mã ngắn
  "qrImage": "data:image/png;base64,...",
  ...
}
```

### 3.2 Test Webhook

Mở file `test_webhook_balance.http`:

```http
POST http://localhost:5000/v1/Payment/WebhookBalance
Content-Type: application/json

{
  "TransactionId": "TXN123456789",
  "Amount": 50000,
  "Description": "Thanh toan don hang PAY_ABC123",  // ← Dùng gencode vừa gen
  "SenderAccount": "0123456789",
  "SenderName": "NGUYEN VAN A",
  "ReceiverAccount": "9876543210",
  "ReceiverName": "MODERN ISSUES",
  "BankCode": "VCB",
  "TransactionDate": "2025-11-07T14:30:00Z",
  "TransactionType": "IN"
}

Response:
{
  "success": true,
  "message": "Payment processed successfully"
}
```

### 3.3 Verify Database

```sql
-- Xem balance_change vừa tạo
SELECT * FROM balance_changes ORDER BY created_at DESC LIMIT 5;

-- Xem order đã được paid
SELECT order_id, user_id, gencode, status, total_amount 
FROM orders 
WHERE gencode = 'PAY_ABC123';

-- Kiểm tra gencode parsing
SELECT 
    gencode, 
    description, 
    status, 
    amount,
    created_at
FROM balance_changes 
WHERE gencode IS NOT NULL 
ORDER BY created_at DESC;
```

---

## 🚀 Bước 4: Deploy lên Production

### 4.1 Pre-deployment Checklist

- [ ] Backup database production
- [ ] Test migrations trên staging environment
- [ ] Review code changes
- [ ] Update webhook URL trên payment gateway (nếu cần)
- [ ] Chuẩn bị rollback plan

### 4.2 Deploy Steps

```bash
# 1. Pull code mới
git pull origin main-be-add-column

# 2. Stop application
systemctl stop modernissues-backend

# 3. Run migrations
psql -U postgres -d modernissues_db -f migrations_add_balance_changes.sql
psql -U postgres -d modernissues_db -f update_orders_gencode_column.sql

# 4. Build application
dotnet publish -c Release -o /var/www/modernissues

# 5. Start application
systemctl start modernissues-backend

# 6. Check logs
journalctl -u modernissues-backend -f
```

### 4.3 Post-deployment Verification

```bash
# Test health endpoint
curl http://your-domain.com/health

# Test webhook endpoint
curl -X POST http://your-domain.com/v1/Payment/WebhookBalance \
  -H "Content-Type: application/json" \
  -d '{
    "TransactionId": "TEST123",
    "Amount": 10000,
    "Description": "Test PAY_TEST01"
  }'
```

---

## ⚠️ Troubleshooting

### Issue 1: Migration failed

```bash
# Rollback
psql -U postgres -d modernissues_db -c "DROP TABLE IF EXISTS balance_changes CASCADE;"

# Restore backup
psql -U postgres -d modernissues_db < backup_before_migration.sql
```

### Issue 2: Gencode parse không ra

Kiểm tra regex pattern trong logs:

```
[PaymentService] Description: "abc xyz"
[WARNING] No valid gencode found in description
```

→ Đảm bảo description có format `PAY_XXXXXX`

### Issue 3: Cache không hoạt động

```csharp
// Check trong Program.cs
builder.Services.AddMemoryCache();  // ← Phải có dòng này
```

### Issue 4: SignalR không gửi notification

```
[PaymentService] Sending PaymentConfirmed to user_1001
```

→ Check FE đã kết nối SignalR chưa

---

## 🔄 Rollback Plan (Nếu cần)

### Rollback Database

```sql
-- Drop bảng balance_changes
DROP TABLE IF EXISTS balance_changes CASCADE;

-- Restore gencode column về varchar(1024)
ALTER TABLE orders ALTER COLUMN gencode TYPE VARCHAR(1024);
DROP INDEX IF EXISTS orders_gencode_idx;
```

### Rollback Code

```bash
# Revert git commit
git revert HEAD

# Rebuild
dotnet build
```

---

## 📊 Monitoring

### Queries cần chạy định kỳ

```sql
-- 1. Số lượng balance_changes mỗi ngày
SELECT 
    DATE(created_at) as date,
    COUNT(*) as total,
    COUNT(CASE WHEN status = 'processed' THEN 1 END) as processed,
    COUNT(CASE WHEN status = 'pending' THEN 1 END) as pending,
    COUNT(CASE WHEN status = 'failed' THEN 1 END) as failed
FROM balance_changes
GROUP BY DATE(created_at)
ORDER BY date DESC;

-- 2. Các giao dịch pending quá 1 giờ
SELECT * FROM balance_changes 
WHERE status = 'pending' 
  AND created_at < NOW() - INTERVAL '1 hour';

-- 3. Orders paid hôm nay
SELECT COUNT(*), SUM(total_amount) 
FROM orders 
WHERE status = 'paid' 
  AND DATE(updated_at) = CURRENT_DATE;
```

---

## ✅ Success Criteria

Migration thành công khi:

1. ✅ Bảng `balance_changes` tạo thành công
2. ✅ Column `orders.gencode` update thành công (VARCHAR(20))
3. ✅ Generate gencode trả về mã 10 ký tự (PAY_XXXXXX)
4. ✅ Webhook parse được gencode từ description
5. ✅ Order status update thành `paid` sau webhook
6. ✅ SignalR gửi notification lên FE
7. ✅ Không có linter errors

---

## 📞 Contact

Nếu gặp vấn đề trong quá trình migration:
- Check logs trong console
- Query database để verify data
- Review code changes
- Test lại flow end-to-end

