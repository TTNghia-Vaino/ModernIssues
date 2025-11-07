# ⚡ Quick Start - Payment System

## 🎯 TL;DR

Hệ thống thanh toán với:
- Gencode ngắn: `PAY_ABC123` (10 ký tự)
- Cache order trong 30 phút
- Webhook từ ngân hàng → Parse gencode → Update order
- SignalR notify FE real-time

---

## 🚀 5-Minute Setup

### 1. Run Migrations (2 mins)

```bash
cd Backend
psql -U postgres -d your_database -f migrations_add_balance_changes.sql
psql -U postgres -d your_database -f update_orders_gencode_column.sql
```

### 2. Build & Run (1 min)

```bash
dotnet build
dotnet run
# Server: http://localhost:5000
```

### 3. Test Flow (2 mins)

```bash
# Step 1: Tạo order
POST http://localhost:5000/v1/Checkout/Transfer
{
  "items": [{"product_id": 1, "quantity": 2}]
}

# Step 2: Gen QR (dùng orderId từ step 1)
POST http://localhost:5000/v1/Payment/GenerateQr
{
  "orderId": 123,
  "amount": 50000
}
# → Lấy gencode: PAY_ABC123

# Step 3: Test webhook
POST http://localhost:5000/v1/Payment/WebhookBalance
{
  "TransactionId": "TEST123",
  "Amount": 50000,
  "Description": "Thanh toan PAY_ABC123",
  "TransactionType": "IN"
}
# → Order status = "paid" ✅
```

---

## 📝 Core Concepts

### 1. Gencode Generation

```csharp
var gencode = PaymentCodeGenerator.GeneratePaymentCode();
// Output: "PAY_ABC123" (10 ký tự)
```

### 2. Cache Order

```csharp
var orderCache = new OrderCacheDto
{
    UserId = 1001,
    OrderId = 123,
    TotalAmount = 50000,
    ExpiresAt = DateTime.UtcNow.AddMinutes(30),
    Items = [...]
};

_cache.Set(gencode, orderCache, options);
```

### 3. Webhook Processing

```csharp
// Parse gencode từ description
var gencode = ParseGencodeFromDescription("Thanh toan PAY_ABC123");

// Tìm trong cache hoặc DB
var orderCache = GetOrderFromCache(gencode);

// Update order = paid
order.status = "paid";
```

---

## 🗂️ Key Files

```
Backend/
├── Services/PaymentService.cs           ← Main logic
├── Controllers/PaymentController.cs     ← API endpoints
├── Models/DTOs/WebhookBalanceDto.cs    ← DTOs
├── Models/Entities/balance_change.cs    ← DB entity
└── test_webhook_balance.http            ← Test cases
```

---

## 🔍 Debug Commands

### Check Cache (Logs)

```bash
dotnet run | grep "Order cached"
# [PaymentService] Order cached with key: PAY_ABC123, expires at: ...
```

### Check DB

```sql
-- Xem balance_changes
SELECT * FROM balance_changes ORDER BY created_at DESC LIMIT 10;

-- Xem orders paid
SELECT * FROM orders WHERE status = 'paid' AND gencode IS NOT NULL;

-- Xem gencode parse
SELECT gencode, description FROM balance_changes WHERE gencode IS NOT NULL;
```

---

## ⚠️ Common Issues

### Issue 1: Cache không hoạt động
```csharp
// Check Program.cs có dòng này:
builder.Services.AddMemoryCache();
```

### Issue 2: Gencode parse fail
```
Description phải chứa: PAY_XXXXXX (6-10 ký tự A-Z, 0-9)
Ví dụ: "Thanh toan don hang PAY_ABC123"
```

### Issue 3: Duplicate webhook
```
System tự động check:
if (order.status == "paid") → Skip
```

---

## 📚 Full Documentation

- **README_PAYMENT_FLOW.md** - Complete flow
- **CACHE_SYSTEM_DOCUMENTATION.md** - Cache details
- **IMPROVEMENTS_SUMMARY.md** - What's new
- **MIGRATION_GUIDE.md** - Production deploy

---

## 💡 Pro Tips

1. **Cache TTL = 30 mins** - Đủ cho user chuyển khoản
2. **High Priority Cache** - Ít bị evict
3. **Validate trước khi cache** - Prevent invalid data
4. **Fallback to DB** - Graceful degradation
5. **Log everything** - Easy debugging

---

## 🎯 Flow Diagram

```
┌──────────────┐
│  Gen Gencode │ PAY_ABC123
└──────┬───────┘
       ↓
┌──────────────┐
│  Cache Order │ TTL 30 min
└──────┬───────┘
       ↓
┌──────────────┐
│   User Pay   │ QR Code / Manual
└──────┬───────┘
       ↓
┌──────────────┐
│   Webhook    │ Bank → Server
└──────┬───────┘
       ↓
┌──────────────┐
│ Parse Gencode│ Regex: PAY_[A-Z0-9]{6,10}
└──────┬───────┘
       ↓
┌──────────────┐
│  Get Cache   │ Fast path
└──────┬───────┘
       ↓
┌──────────────┐
│ Update Order │ status = paid
└──────┬───────┘
       ↓
┌──────────────┐
│ SignalR FE   │ Real-time notify
└──────────────┘
```

---

Ready to go! 🚀

**Next:** Read `README_PAYMENT_FLOW.md` for complete understanding.

