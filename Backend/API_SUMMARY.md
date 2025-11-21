# Tổng hợp các API mới và đã cập nhật

## 📋 Danh sách API mới và cập nhật

### 1. **POST /v1/Checkout** - Checkout với QR Code và Gencode
**Controller:** `CheckoutController`  
**Method:** `POST /v1/Checkout`  
**Authentication:** Required (Session-based)

#### Request Body:
```json
{
  "paymentType": "Transfer" | "ATM" | "COD"
}
```

#### Response (200 OK):
```json
{
  "success": true,
  "message": "Checkout thành công. Đơn hàng đã được tạo.",
  "data": {
    "orderId": 123,
    "userId": 1,
    "username": "user123",
    "orderDate": "2024-01-15T10:30:00Z",
    "status": "pending",
    "totalAmount": 1500000,
    "types": "Transfer",
    "typesDisplay": "Chuyển khoản",
    "qrUrl": "https://qr.sepay.vn/img?acc=0886224909&bank=MB&amount=1500000&des=ORDER_123_20240115103000_ABC12345",
    "gencode": "ORDER_123_20240115103000_ABC12345",
    "createdAt": "2024-01-15T10:30:00Z",
    "updatedAt": "2024-01-15T10:30:00Z",
    "orderDetails": [...]
  }
}
```

#### Tính năng mới:
- ✅ Tạo **gencode unique** khi payment type là Transfer/ATM
- ✅ **Lưu thông tin đơn hàng vào cache** với key `gencode_{gencode}` (24 giờ)
- ✅ Trả về **QrUrl** với gencode khóa cứng trong nội dung chuyển khoản
- ✅ Trả về **Gencode** để frontend có thể hiển thị
- ✅ Gencode format: `ORDER_{order_id}_{timestamp}_{uniqueId}`

---

### 2. **POST /Hooks/transaction** - Webhook nhận biến động số dư từ SePay
**Controller:** `HooksController`  
**Method:** `POST /Hooks/transaction`  
**Authentication:** API Key trong header

#### Headers:
```
Authorization: Apikey {ApiKey}
Content-Type: application/json
```

#### Request Body:
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

#### Response (200 OK):
```json
{
  "message": "Balance change saved: REF123456 - 1500000 - ORDER_123_20240115103000_ABC12345. Payment successful! Order 123 status updated to 'paid'",
  "orderUpdated": true,
  "orderId": 123
}
```

#### Tính năng:
- ✅ **Xác thực API key** từ config (`HooksConfig.ApiKey`) trong header `Authorization: Apikey {key}`
- ✅ **Lưu biến động số dư** vào bảng `BankTransactions`
- ✅ **Kiểm tra duplicate transaction** (Referencecode + Transactiondate + Amount)
- ✅ **Extract gencode** từ `Description` hoặc `Content` bằng regex pattern `ORDER_\d+_\d+_[A-Z0-9]+`
- ✅ **Đối chiếu gencode** với cache key `gencode_{gencode}`
- ✅ **Kiểm tra order status** phải là "pending" mới cập nhật
- ✅ **Kiểm tra số tiền khớp** với tolerance từ config
- ✅ **Kiểm tra payment type** phải là "Transfer" hoặc "ATM"
- ✅ **Tự động cập nhật order status** thành "paid" khi tất cả điều kiện thỏa mãn
- ✅ **Xóa gencode khỏi cache** sau khi xử lý thành công

---

### 3. **GET /v1/Payment/GenerateQr** - Generate QR Code URL (Optional)
**Controller:** `PaymentController`  
**Method:** `GET /v1/Payment/GenerateQr`  
**Authentication:** None (Public API)

#### Query Parameters:
- `amount` (decimal, required): Số tiền thanh toán
- `gencode` (string, required): Mã gencode

#### Response (200 OK):
```json
{
  "qrUrl": "https://qr.sepay.vn/img?acc=0886224909&bank=MB&amount=1500000&des=ORDER_123_20240115103000_ABC12345"
}
```

#### Lưu ý:
- API này là optional, vì `/v1/Checkout` đã trả về `QrUrl` sẵn
- Có thể dùng để generate QR riêng nếu cần

---

## 🔧 Cấu hình mới

### `appsettings.json` - HooksConfig
```json
{
  "HooksConfig": {
    "ApiKey": "Acer-Aspire7-Vaino",
    "OrderIdPattern": "ORDER_",
    "AmountTolerance": 0
  }
}
```

### `appsettings.json` - SepayConfig (đã có)
```json
{
  "SepayConfig": {
    "AccountNumber": "0886224909",
    "BankName": "MB"
  }
}
```

---

## 📦 DTOs mới và cập nhật

### 1. **OrderDto** (đã cập nhật)
- ✅ Thêm `QrUrl` - Đường link QR code thanh toán
- ✅ Thêm `Gencode` - Mã gencode để đối chiếu

### 2. **OrderCacheInfo** (mới)
```csharp
public class OrderCacheInfo
{
    public int OrderId { get; set; }
    public int? UserId { get; set; }
    public decimal TotalAmount { get; set; }
    public string PaymentType { get; set; }
    public string Status { get; set; }
    public DateTime CreatedAt { get; set; }
}
```

### 3. **CheckoutDto** (không đổi)
```csharp
public class CheckoutDto
{
    public string PaymentType { get; set; } = "COD";
}
```

### 4. **BankTransactionDto** (đã có)
- Dùng để nhận webhook từ SePay

### 5. **TransactionProcessResult** (mới trong IHooksService)
```csharp
public class TransactionProcessResult
{
    public string Message { get; set; }
    public bool OrderUpdated { get; set; }
    public int? OrderId { get; set; }
}
```

---

## 🔄 Flow hoàn chỉnh

### 1. Checkout Flow
```
User → POST /v1/Checkout {paymentType: "Transfer"}
  ↓
Backend tạo order + gencode unique
  ↓
Lưu OrderCacheInfo vào cache (24h)
  ↓
Trả về OrderDto với QrUrl + Gencode
  ↓
Frontend hiển thị QR image từ QrUrl
```

### 2. Payment Flow
```
User quét QR code
  ↓
App banking mở với số tiền + gencode (khóa cứng)
  ↓
User xác nhận chuyển khoản
  ↓
SePay gửi webhook → POST /Hooks/transaction
  ↓
Backend lưu vào BankTransactions
  ↓
Đối chiếu Description với gencode trong cache
  ↓
Nếu trùng → Cập nhật order status = "paid"
  ↓
Xóa gencode khỏi cache
```

---

## 🎯 Điểm quan trọng

1. **Gencode được khóa cứng** trong QR URL, không thể chỉnh sửa
2. **Cache expiration:** 24 giờ
3. **Duplicate protection:** Kiểm tra Referencecode + Transactiondate + Amount
4. **Amount tolerance:** Có thể cấu hình trong `HooksConfig.AmountTolerance`
5. **Auto order update:** Tự động cập nhật status khi payment thành công
