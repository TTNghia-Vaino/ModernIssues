# Hướng dẫn Setup Webhook Biến động Số dư từ SePay

## 📋 Tổng quan

Hệ thống nhận webhook từ SePay để tự động cập nhật trạng thái đơn hàng khi có biến động số dư (chuyển khoản thanh toán).

## 🔧 Backend Configuration

### 1. CORS Configuration (ĐÃ THÊM)

Backend đã được cấu hình CORS để cho phép SePay gửi webhook từ bên ngoài:

**File: `Backend/Program.cs`**
```csharp
// Add CORS to allow SePay webhook to send requests
builder.Services.AddCors(options =>
{
    options.AddPolicy("AllowSePayWebhook", policy =>
    {
        policy.AllowAnyOrigin()  // SePay webhook can come from any origin
              .AllowAnyMethod()   // Allow POST for webhook
              .AllowAnyHeader()   // Allow Authorization header
              .WithExposedHeaders("Content-Type", "Authorization");
    });
});

// In pipeline:
app.UseCors("AllowSePayWebhook"); // Must be before UseAuthorization
```

### 2. appsettings.json

Đã có sẵn cấu hình trong `Backend/appsettings.json`:

```json
{
  "HooksConfig": {
    "ApiKey": "Acer-Aspire7-Vaino",
    "OrderIdPattern": "ORDER_",
    "AmountTolerance": 0
  },
  "SepayConfig": {
    "AccountNumber": "0886224909",
    "BankName": "MB"
  }
}
```

**Giải thích:**
- `ApiKey`: API key để xác thực webhook từ SePay (phải khớp với SePay config)
- `OrderIdPattern`: Pattern để nhận diện gencode (mặc định "ORDER_")
- `AmountTolerance`: Số tiền chênh lệch cho phép (0 = phải khớp chính xác)
- `AccountNumber`: Số tài khoản nhận tiền
- `BankName`: Tên ngân hàng (MB = Military Bank)

### 3. Endpoint Webhook

**URL:** `POST /Hooks/transaction`

**Full URL:** `http://your-domain.com/Hooks/transaction` hoặc `https://your-domain.com/Hooks/transaction`

**Headers Required:**
```
Authorization: Apikey Acer-Aspire7-Vaino
Content-Type: application/json
```

**Request Body (từ SePay):**
```json
{
  "gateway": "sepay",
  "transactiondate": "2024-01-15 10:35:00",
  "accountnumber": "0886224909",
  "code": "ABC123",
  "content": "Chuyen tien",
  "transfertype": "IN",
  "transferamount": 1500000,
  "accumulated": 5000000,
  "subaccount": null,
  "referencecode": "REF123456",
  "description": "ORDER_123_20240115103000_ABC12345"
}
```

**Response (200 OK):**
```json
{
  "message": "Balance change saved: REF123456 - 1500000 - ORDER_123_20240115103000_ABC12345. Payment successful! Order 123 status updated to 'paid'",
  "orderUpdated": true,
  "orderId": 123
}
```

## 🔐 Setup trên SePay Dashboard

### Bước 1: Đăng nhập SePay Dashboard
1. Truy cập: https://sepay.vn
2. Đăng nhập với tài khoản SePay của bạn

### Bước 2: Cấu hình Webhook URL
1. Vào phần **Cài đặt** hoặc **Webhook Settings**
2. Thêm Webhook URL mới:
   - **URL:** `http://your-backend-domain.com/Hooks/transaction`
     - Ví dụ: `http://35.232.61.38:5000/Hooks/transaction`
     - Hoặc: `https://api.yourdomain.com/Hooks/transaction`
   - **Method:** POST
   - **API Key:** `Acer-Aspire7-Vaino` (phải khớp với HooksConfig.ApiKey)
   - **Events:** Chọn "Biến động số dư" hoặc "Transaction"

### Bước 3: Test Webhook
1. SePay thường có chức năng "Test Webhook" hoặc "Send Test"
2. Gửi test request để kiểm tra backend có nhận được không
3. Kiểm tra logs trên backend để xem có nhận được request

## 🗄️ Database

### Bảng `bank_transactions`

Backend tự động lưu tất cả biến động số dư vào bảng `bank_transactions`:

```sql
CREATE TABLE IF NOT EXISTS bank_transactions (
    id BIGSERIAL PRIMARY KEY,
    gateway VARCHAR(100) NOT NULL,
    transactiondate TIMESTAMP NOT NULL,
    accountnumber VARCHAR(50) NOT NULL,
    code VARCHAR(255),
    content TEXT,
    transfertype VARCHAR(50) NOT NULL,
    transferamount DECIMAL(18,2) NOT NULL,
    accumulated DECIMAL(18,2) NOT NULL,
    subaccount VARCHAR(255),
    referencecode VARCHAR(255),
    description TEXT
);
```

**Lưu ý:** Bảng này đã được tạo tự động bởi Entity Framework migrations.

## 🔄 Flow xử lý Webhook

```
1. User chuyển khoản với gencode trong nội dung
   ↓
2. SePay phát hiện biến động số dư
   ↓
3. SePay gửi POST /Hooks/transaction với:
   - Authorization: Apikey {ApiKey}
   - Body: BankTransactionDto
   ↓
4. Backend HooksController nhận request
   ↓
5. Kiểm tra API key trong header
   ↓
6. HooksService.ProcessTransactionAsync():
   a. Kiểm tra duplicate (Referencecode + Transactiondate + Amount)
   b. Lưu vào bank_transactions
   c. Extract gencode từ Description/Content
   d. Tìm OrderCacheInfo từ cache bằng gencode
   e. Tìm order từ database
   f. Kiểm tra order status = "pending"
   g. Kiểm tra số tiền khớp (với tolerance)
   h. Kiểm tra payment type = "Transfer" hoặc "ATM"
   i. Cập nhật order.status = "paid"
   j. Xóa gencode khỏi cache
   ↓
7. Trả về response với orderUpdated = true
```

## ✅ Validation & Security

### 1. API Key Authentication
- Webhook phải gửi header: `Authorization: Apikey {ApiKey}`
- API key phải khớp với `HooksConfig.ApiKey` trong appsettings.json
- Nếu không khớp → Trả về 401 Unauthorized

### 2. Duplicate Protection
- Kiểm tra: `Referencecode + Transactiondate + Transferamount`
- Nếu đã xử lý → Trả về message "already processed"
- Tránh xử lý lại cùng một giao dịch

### 3. Gencode Validation
- Regex pattern: `ORDER_\d+_\d+_[A-Z0-9]+`
- Tìm trong `Description` trước, sau đó `Content`
- Nếu không tìm thấy → Không cập nhật order

### 4. Amount Validation
- So sánh: `order.total_amount` vs `transaction.Transferamount`
- Cho phép chênh lệch: `HooksConfig.AmountTolerance`
- Mặc định: 0 (phải khớp chính xác)

### 5. Order Status Check
- Chỉ cập nhật nếu `order.status = "pending"`
- Nếu đã paid/cancelled → Không cập nhật

### 6. Payment Type Check
- Chỉ xử lý nếu `order.types = "Transfer"` hoặc `"ATM"`
- COD orders không cần webhook

## 🧪 Testing

### Test với Postman/curl

```bash
curl -X POST http://localhost:5273/Hooks/transaction \
  -H "Authorization: Apikey Acer-Aspire7-Vaino" \
  -H "Content-Type: application/json" \
  -d '{
    "gateway": "sepay",
    "transactiondate": "2024-01-15 10:35:00",
    "accountnumber": "0886224909",
    "code": "TEST123",
    "content": "Test payment",
    "transfertype": "IN",
    "transferamount": 1500000,
    "accumulated": 5000000,
    "subaccount": null,
    "referencecode": "TEST_REF_123",
    "description": "ORDER_123_20240115103000_ABC12345"
  }'
```

### Test với gencode thật

1. Tạo order với paymentType = "Transfer"
2. Lấy gencode từ response (ví dụ: `ORDER_123_20240115103000_ABC12345`)
3. Gửi webhook với gencode đó trong `description`
4. Kiểm tra order status đã chuyển thành "paid"

### Kiểm tra Database

```sql
-- Xem tất cả biến động số dư
SELECT * FROM bank_transactions ORDER BY transactiondate DESC;

-- Xem orders đã được cập nhật
SELECT order_id, status, types, total_amount, updated_at 
FROM orders 
WHERE status = 'paid' 
ORDER BY updated_at DESC;
```

## 🚨 Troubleshooting

### 1. Webhook không nhận được từ SePay
- ✅ Kiểm tra CORS đã được enable
- ✅ Kiểm tra URL webhook trên SePay đúng chưa
- ✅ Kiểm tra backend có accessible từ internet không
- ✅ Kiểm tra firewall/security group cho phép POST requests

### 2. 401 Unauthorized
- ✅ Kiểm tra API key trong header đúng chưa
- ✅ Kiểm tra format: `Authorization: Apikey {key}` (có space sau Apikey)
- ✅ Kiểm tra `HooksConfig.ApiKey` trong appsettings.json

### 3. Gencode not found in cache
- ✅ Gencode chỉ tồn tại 24 giờ trong cache
- ✅ Kiểm tra gencode format đúng: `ORDER_{order_id}_{timestamp}_{uniqueId}`
- ✅ Kiểm tra SePay gửi gencode trong `description` hoặc `content`

### 4. Amount mismatch
- ✅ Kiểm tra số tiền chuyển khoản khớp với order.total_amount
- ✅ Có thể tăng `AmountTolerance` nếu cần cho phép chênh lệch

### 5. Order không được cập nhật
- ✅ Kiểm tra order.status phải là "pending"
- ✅ Kiểm tra order.types phải là "Transfer" hoặc "ATM"
- ✅ Kiểm tra logs trong HooksService để xem lý do

## 📝 Checklist Setup

### Backend
- [x] CORS đã được enable trong Program.cs
- [x] HooksConfig trong appsettings.json
- [x] HooksController có endpoint POST /Hooks/transaction
- [x] HooksService xử lý logic đầy đủ
- [x] BankTransaction entity và DbSet
- [x] Database có bảng bank_transactions

### SePay Dashboard
- [ ] Đăng nhập SePay Dashboard
- [ ] Thêm Webhook URL: `http://your-domain.com/Hooks/transaction`
- [ ] Set API Key: `Acer-Aspire7-Vaino`
- [ ] Enable webhook cho "Biến động số dư"
- [ ] Test webhook từ SePay

### Testing
- [ ] Test với Postman/curl
- [ ] Test với gencode thật từ order
- [ ] Kiểm tra database có lưu biến động
- [ ] Kiểm tra order status được cập nhật

## 🔗 URLs quan trọng

- **Webhook Endpoint:** `POST /Hooks/transaction`
- **SePay Dashboard:** https://sepay.vn
- **Backend API:** http://35.232.61.38:5000 (hoặc domain của bạn)
- **Swagger:** http://your-domain.com/swagger

## ⚠️ Lưu ý

1. **API Key phải bảo mật**: Không commit API key vào public repo
2. **HTTPS recommended**: Nên dùng HTTPS cho production
3. **Cache expiration**: Gencode chỉ tồn tại 24 giờ
4. **Idempotency**: Webhook có duplicate protection
5. **Logging**: Nên log tất cả webhook requests để debug

