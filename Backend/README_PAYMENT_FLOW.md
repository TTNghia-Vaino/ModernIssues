# 🔐 Payment Flow - Gencode & Balance Change

## 📋 Tổng quan

Hệ thống thanh toán với gencode ngắn gọn và biến động số dư.

### Flow hoạt động

```
┌─────────────────────────────────────────────────────────────────┐
│  1. USER TẠO ORDER (Type = Transfer)                            │
└─────────────────┬───────────────────────────────────────────────┘
                  ▼
┌─────────────────────────────────────────────────────────────────┐
│  2. GEN GENCODE (PAY_ABC123)                                    │
│     - Generate mã ngắn 10 ký tự                                 │
│     - Lưu vào orders.gencode                                    │
│     - Cache order data với key = gencode (TTL: 30 phút)        │
└─────────────────┬───────────────────────────────────────────────┘
                  ▼
┌─────────────────────────────────────────────────────────────────┐
│  3. TẠO QR CODE (VietQR API)                                    │
│     - Nội dung QR: "Thanh toan don hang #123 - PAY_ABC123"     │
│     - Return QR image (base64) + EMV string                     │
└─────────────────┬───────────────────────────────────────────────┘
                  ▼
┌─────────────────────────────────────────────────────────────────┐
│  4. USER CHUYỂN KHOẢN                                           │
│     - Quét QR hoặc nhập thủ công                               │
│     - Nội dung chứa: PAY_ABC123                                 │
└─────────────────┬───────────────────────────────────────────────┘
                  ▼
┌─────────────────────────────────────────────────────────────────┐
│  5. WEBHOOK TỪ NGÂN HÀNG                                        │
│     - POST /v1/Payment/WebhookBalance                           │
│     - Payload: transaction_id, amount, description, ...         │
└─────────────────┬───────────────────────────────────────────────┘
                  ▼
┌─────────────────────────────────────────────────────────────────┐
│  6. XỬ LÝ WEBHOOK                                               │
│     a. Parse gencode từ Description (Regex: PAY_[A-Z0-9]{6,10})│
│     b. Lưu vào bảng balance_changes                             │
│     c. Tìm order trong cache hoặc DB                            │
│     d. Verify amount (optional)                                 │
│     e. Update order.status = "paid"                             │
│     f. Update balance_change.status = "processed"               │
│     g. SignalR notify FE                                        │
└─────────────────┬───────────────────────────────────────────────┘
                  ▼
┌─────────────────────────────────────────────────────────────────┐
│  7. FE NHẬN THÔNG BÁO                                           │
│     - SignalR event: "PaymentConfirmed"                         │
│     - Hiển thị thông báo thanh toán thành công                 │
└─────────────────────────────────────────────────────────────────┘
```

---

## 🗂️ Database Schema

### Bảng `balance_changes`

```sql
CREATE TABLE balance_changes (
    id SERIAL PRIMARY KEY,
    transaction_id VARCHAR(100),           -- ID giao dịch từ ngân hàng
    amount DECIMAL(15, 2) NOT NULL,        -- Số tiền
    description VARCHAR(500),              -- Nội dung CK (chứa gencode)
    sender_account VARCHAR(50),            -- Tài khoản người gửi
    sender_name VARCHAR(255),              -- Tên người gửi
    receiver_account VARCHAR(50),          -- Tài khoản nhận
    receiver_name VARCHAR(255),            -- Tên người nhận
    bank_code VARCHAR(20),                 -- Mã ngân hàng
    transaction_date TIMESTAMP,            -- Thời gian giao dịch
    transaction_type VARCHAR(10),          -- IN/OUT
    gencode VARCHAR(20),                   -- Gencode parse được
    status VARCHAR(20) DEFAULT 'pending',  -- pending/processed/failed
    order_id INTEGER,                      -- Order được match
    raw_webhook_data TEXT,                 -- Raw JSON
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    
    FOREIGN KEY (order_id) REFERENCES orders(order_id) ON DELETE SET NULL
);
```

### Cập nhật bảng `orders`

```sql
ALTER TABLE orders 
    ALTER COLUMN gencode TYPE VARCHAR(20);
    
COMMENT ON COLUMN orders.gencode IS 'Mã thanh toán ngắn gọn (PAY_ABC123)';
```

---

## 🔧 Implementation

### 1. PaymentCodeGenerator

```csharp
// Generate: PAY_ABC123 (10 ký tự)
var gencode = PaymentCodeGenerator.GeneratePaymentCode();
```

### 2. Cache Order Data

```csharp
var orderCache = new OrderCacheDto
{
    UserId = userId,
    OrderId = orderId,
    TotalAmount = order.total_amount ?? 0,
    Status = order.status ?? "pending",
    CreatedAt = order.created_at ?? DateTime.UtcNow,
    Orders = orderItems
};

_cache.Set(gencode, orderCache, new MemoryCacheEntryOptions
{
    AbsoluteExpirationRelativeToNow = TimeSpan.FromMinutes(30)
});
```

### 3. Parse Gencode từ Description

```csharp
private string? ParseGencodeFromDescription(string? description)
{
    if (string.IsNullOrWhiteSpace(description))
        return null;

    // Pattern: PAY_XXXXXX (6-10 ký tự sau PAY_)
    var match = Regex.Match(description, @"PAY_[A-Z0-9]{6,10}", RegexOptions.IgnoreCase);
    
    if (match.Success)
        return match.Value.ToUpper();

    return null;
}
```

### 4. Process Webhook

```csharp
public async Task<bool> ProcessBalanceChangeAsync(WebhookBalanceDto webhook, string rawWebhookData)
{
    // 1. Parse gencode
    var gencode = ParseGencodeFromDescription(webhook.Description);
    
    // 2. Lưu balance_change
    var balanceChange = new balance_change { ... };
    _context.balance_changes.Add(balanceChange);
    await _context.SaveChangesAsync();
    
    // 3. Tìm trong cache
    if (_cache.TryGetValue<OrderCacheDto>(gencode, out var orderCache))
    {
        // Update order từ cache
    }
    else
    {
        // Fallback: tìm trong DB
        var order = await _context.orders.FirstOrDefaultAsync(o => o.gencode == gencode);
    }
    
    // 4. Update order.status = "paid"
    // 5. SignalR notify
    // 6. Return true
}
```

---

## 🧪 Testing

### 1. Chạy Migration

```bash
psql -U postgres -d your_database -f migrations_add_balance_changes.sql
psql -U postgres -d your_database -f update_orders_gencode_column.sql
```

### 2. Test Flow End-to-End

#### Step 1: Tạo order (Transfer)
```http
POST /v1/Checkout/Transfer
{
  "items": [
    { "product_id": 1, "quantity": 2 }
  ]
}
```

#### Step 2: Generate QR
```http
POST /v1/Payment/GenerateQr
{
  "orderId": 123,
  "amount": 50000
}

Response:
{
  "gencode": "PAY_ABC123",  // ← Gencode ngắn
  "qrImage": "data:image/png;base64,...",
  "qrUrl": "00020101021238...",  // EMV string
  ...
}
```

#### Step 3: Giả lập webhook
```http
POST /v1/Payment/WebhookBalance
{
  "TransactionId": "TXN123456",
  "Amount": 50000,
  "Description": "Thanh toan don hang PAY_ABC123",
  "SenderAccount": "0123456789",
  "SenderName": "NGUYEN VAN A",
  ...
}
```

#### Step 4: Kiểm tra kết quả
```sql
-- Xem balance_changes
SELECT * FROM balance_changes ORDER BY created_at DESC LIMIT 10;

-- Xem order đã paid
SELECT * FROM orders WHERE gencode = 'PAY_ABC123';

-- Xem các gencode được parse
SELECT gencode, status, amount, description 
FROM balance_changes 
WHERE gencode IS NOT NULL;
```

---

## 📊 Monitoring & Debugging

### Logs cần theo dõi

```
[PaymentService] Generated gencode: PAY_ABC123
[PaymentService] Order cached with key: PAY_ABC123
[PaymentController] WebhookBalance received
[PaymentService] Parsed gencode: PAY_ABC123
[PaymentService] Gencode found in cache. OrderId: 123
[PaymentService] Order 123 marked as paid (from cache)
[PaymentService] Sending PaymentConfirmed to user_1001
```

### Queries hữu ích

```sql
-- Xem các giao dịch chưa xử lý
SELECT * FROM balance_changes WHERE status = 'pending';

-- Xem các giao dịch failed
SELECT * FROM balance_changes WHERE status = 'failed';

-- Thống kê theo gencode
SELECT 
    gencode, 
    COUNT(*) as count,
    SUM(amount) as total_amount,
    MAX(created_at) as last_transaction
FROM balance_changes
WHERE gencode IS NOT NULL
GROUP BY gencode
ORDER BY last_transaction DESC;

-- Tìm orders chưa paid nhưng có balance_change
SELECT o.order_id, o.gencode, o.status, bc.amount, bc.created_at
FROM orders o
JOIN balance_changes bc ON o.gencode = bc.gencode
WHERE o.status != 'paid' AND bc.status = 'processed';
```

---

## ⚠️ Lưu ý

1. **Cache TTL**: Order cache tự động xóa sau 30 phút
2. **Fallback**: Nếu cache hết hạn, system vẫn tìm được order trong DB
3. **Gencode Format**: `PAY_` + 6-10 ký tự (A-Z, 0-9)
4. **Case Insensitive**: `PAY_abc123` = `PAY_ABC123`
5. **Regex**: Chỉ lấy gencode đầu tiên nếu có nhiều
6. **Amount Verify**: Warning nếu sai lệch >1 VND (không block)

---

## 🚀 Production Checklist

- [ ] Chạy migrations
- [ ] Test gencode generation
- [ ] Test cache (TTL 30 phút)
- [ ] Test webhook với gencode hợp lệ
- [ ] Test webhook với gencode không tồn tại
- [ ] Test webhook không có gencode
- [ ] Test SignalR notification
- [ ] Setup monitoring/alerting cho balance_changes
- [ ] Backup DB trước khi deploy
- [ ] Document webhook URL cho payment gateway

---

## 📞 Support

Nếu có vấn đề:
1. Check logs: `[PaymentService]`, `[PaymentController]`
2. Check DB: `balance_changes`, `orders`
3. Check cache: Redis/Memory (không thể query trực tiếp)
4. Test regex: https://regex101.com với pattern `PAY_[A-Z0-9]{6,10}`

