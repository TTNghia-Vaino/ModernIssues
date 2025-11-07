# TÀI LIỆU HỆ THỐNG THANH TOÁN - MODERN ISSUES E-COMMERCE

## 📋 MỤC LỤC
1. [Thông tin Ngân hàng](#1-thông-tin-ngân-hàng)
2. [Cấu trúc API Thanh toán](#2-cấu-trúc-api-thanh-toán)
3. [Flow Thanh toán](#3-flow-thanh-toán)
4. [Database Schema](#4-database-schema)
5. [SignalR Real-time](#5-signalr-real-time)
6. [Cách tích hợp VietQR](#6-cách-tích-hợp-vietqr)
7. [Testing](#7-testing)

---

## 1. THÔNG TIN NGÂN HÀNG

### 1.1 Cấu hình hiện tại (appsettings.json)
```json
{
  "SepayConfig": {
    "AccountNumber": "0888804118888",
    "BankName": "MB"
  }
}
```

### 1.2 Chi tiết tài khoản
- **Ngân hàng**: MB Bank (Military Commercial Joint Stock Bank)
- **Số tài khoản**: 0888804118888
- **Tên chủ tài khoản**: CONG TY TNHH MODERN ISSUES *(cần thêm vào config)*
- **Mã BIN ngân hàng**: 970422 *(cần thêm vào config)*

### 1.3 Mở rộng cấu hình (để tích hợp VietQR)
```csharp
// Models/Configurations/SepayConfig.cs
public class SepayConfig
{
    public string AccountNumber { get; set; }           // Số tài khoản
    public string BankName { get; set; }                // Tên ngân hàng (MB, VCB, TCB...)
    public string AccountName { get; set; }             // Tên chủ tài khoản
    public string BankBIN { get; set; }                 // Mã BIN ngân hàng (970422)
    public string VietQrApiEndpoint { get; set; }       // API endpoint VietQR
    public string? VietQrApiKey { get; set; }           // API key (nếu cần)
}
```

```json
// appsettings.json (mở rộng)
{
  "SepayConfig": {
    "AccountNumber": "0888804118888",
    "BankName": "MB",
    "AccountName": "CONG TY TNHH MODERN ISSUES",
    "BankBIN": "970422",
    "VietQrApiEndpoint": "https://api.vietqr.io/v2/generate",
    "VietQrApiKey": ""
  }
}
```

---

## 2. CẤU TRÚC API THANH TOÁN

### 2.1 API Endpoints

#### A. Generate QR Code
**POST** `/v1/Payment/GenerateQr`

**Request:**
```json
{
  "amount": 50000,
  "orderId": 123
}
```

**Response:**
```json
{
  "success": true,
  "message": "QR code đã được tạo.",
  "data": {
    "gencode": "PAY_156_20251104032433_M1VO4B",
    "qrUrl": "http://localhost:5273/api/v1/Payment/Qr/PAY_156_20251104032433_M1VO4B",
    "amount": 50000,
    "orderId": 123,
    "paymentData": {
      "user_id": 156,
      "orders": [
        {
          "id": 1,
          "name": "Product Name",
          "quantity": 2,
          "price": 25000,
          "subtotal": 50000
        }
      ],
      "total_amount": 50000,
      "status": "pending",
      "created_at": "2025-11-04T03:24:33Z"
    }
  }
}
```

**Yêu cầu:**
- User phải đăng nhập
- Order phải tồn tại và thuộc về user
- Order phải có `types = "Transfer"`

---

#### B. Get Payment Info
**GET** `/v1/Payment/Qr/{gencode}`

**Response:**
```json
{
  "user_id": 156,
  "orders": [
    {
      "id": 1,
      "name": "Product Name",
      "quantity": 2,
      "price": 25000,
      "subtotal": 50000
    }
  ],
  "total_amount": 50000,
  "status": "pending",
  "created_at": "2025-11-04T03:24:33Z"
}
```

**Mục đích:** API này được gọi khi quét QR code để hiển thị thông tin đơn hàng

---

#### C. Payment Webhook
**POST** `/v1/Payment/Webhook`

**Request:**
```json
{
  "gencode": "PAY_156_20251104032433_M1VO4B",
  "status": "paid",
  "amount": 50000,
  "paidAt": "2025-11-04T03:30:00Z"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Payment verified"
}
```

**Mục đích:** Nhận thông báo từ payment gateway khi khách hàng đã thanh toán

---

### 2.2 DTOs (Data Transfer Objects)

```csharp
// Models/DTOs/PaymentDto.cs

// Request để tạo QR code
public class GenerateQrRequestDto
{
    public decimal Amount { get; set; }
    public int OrderId { get; set; }
}

// Response sau khi tạo QR code
public class GenerateQrResponseDto
{
    public string Gencode { get; set; }          // Mã thanh toán duy nhất
    public string QrUrl { get; set; }            // URL để tạo QR code
    public decimal Amount { get; set; }          // Số tiền
    public int OrderId { get; set; }             // ID đơn hàng
    public object? PaymentData { get; set; }     // Thông tin chi tiết
}

// Webhook từ payment gateway
public class WebhookPaymentDto
{
    public string Gencode { get; set; }
    public string Status { get; set; }
    public decimal Amount { get; set; }
    public DateTime PaidAt { get; set; }
}
```

---

## 3. FLOW THANH TOÁN

### 3.1 Flow hiện tại (QR Code URL)

```
[User] → Checkout → [Order created with types="Transfer"]
   ↓
[User] → Click "Tạo QR Code" 
   ↓
[Frontend] → POST /v1/Payment/GenerateQr
   ↓
[Backend] → Generate gencode: "PAY_{userId}_{timestamp}_{random}"
   ↓
[Backend] → Save gencode to order.gencode
   ↓
[Backend] → Create QR URL: "http://localhost:5273/api/v1/Payment/Qr/{gencode}"
   ↓
[Backend] → Send to Frontend via API response + SignalR
   ↓
[Frontend] → Generate QR image from URL using qrserver.com API
   ↓
[User] → Scan QR code → Opens URL in browser → View payment info
   ↓
[User] → Transfer money manually
   ↓
[Payment Gateway] → POST /v1/Payment/Webhook (khi nhận được tiền)
   ↓
[Backend] → Update order.status = "paid"
   ↓
[Backend] → Send notification via SignalR
   ↓
[Frontend] → Show payment confirmed message
```

### 3.2 Flow tích hợp VietQR (Bank Transfer QR)

```
[User] → Checkout → [Order created with types="Transfer"]
   ↓
[User] → Click "Tạo QR Code"
   ↓
[Frontend] → POST /v1/Payment/GenerateQr
   ↓
[Backend] → Generate gencode
   ↓
[Backend] → Call VietQR API:
   {
     "accountNo": "0888804118888",
     "accountName": "CONG TY TNHH MODERN ISSUES",
     "acqId": "970422",
     "amount": 50000,
     "addInfo": "Thanh toan don hang #123 - PAY_156_20251104_ABC"
   }
   ↓
[VietQR API] → Return EMV QR string + QR image URL
   ↓
[Backend] → Save EMV string to order.gencode
   ↓
[Backend] → Send to Frontend:
   {
     "gencode": "00020101021238...",  // EMV string
     "qrUrl": "00020101021238...",     // EMV string
     "qrImage": "data:image/png;base64,..."  // QR image
   }
   ↓
[Frontend] → Display QR image (từ qrImage hoặc generate từ EMV string)
   ↓
[User] → Scan QR code bằng app ngân hàng
   ↓
[Banking App] → Auto-fill: Account, Amount, Content
   ↓
[User] → Confirm transfer
   ↓
[Bank] → Transfer money
   ↓
[SePay/Webhook] → POST /v1/Payment/Webhook
   ↓
[Backend] → Update order.status = "paid"
   ↓
[Frontend] → Payment confirmed
```

---

## 4. DATABASE SCHEMA

### 4.1 Table: orders
```sql
CREATE TABLE orders (
    order_id SERIAL PRIMARY KEY,
    user_id INT,
    gencode VARCHAR(255),           -- Mã thanh toán (QR code content)
    total_amount DECIMAL(18,2),
    status VARCHAR(50),             -- 'pending', 'paid', 'cancelled'
    types VARCHAR(50),              -- 'COD', 'Transfer', 'ATM'
    order_date TIMESTAMP,
    created_at TIMESTAMP,
    updated_at TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(user_id)
);
```

### 4.2 Trạng thái đơn hàng
- `pending`: Chờ thanh toán
- `paid`: Đã thanh toán
- `cancelled`: Đã hủy
- `refunded`: Đã hoàn tiền

---

## 5. SIGNALR REAL-TIME

### 5.1 Hub Configuration

```csharp
// Hubs/PaymentHub.cs
public class PaymentHub : Hub
{
    public async Task JoinPaymentGroup(string userId)
    {
        await Groups.AddToGroupAsync(Context.ConnectionId, $"user_{userId}");
    }

    public async Task LeavePaymentGroup(string userId)
    {
        await Groups.RemoveFromGroupAsync(Context.ConnectionId, $"user_{userId}");
    }
}
```

### 5.2 Events

#### Event 1: QrCodeGenerated
**Khi:** QR code được tạo thành công  
**Sent to:** `user_{userId}` group  
**Data:**
```javascript
{
  gencode: "PAY_156_20251104_ABC",
  qrUrl: "http://...",
  amount: 50000,
  orderId: 123,
  paymentData: { ... }
}
```

#### Event 2: PaymentConfirmed
**Khi:** Webhook xác nhận thanh toán thành công  
**Sent to:** `user_{userId}` group  
**Data:**
```javascript
{
  orderId: 123,
  status: "paid",
  gencode: "PAY_156_20251104_ABC"
}
```

### 5.3 Frontend Integration

```javascript
// Kết nối SignalR
const connection = new signalR.HubConnectionBuilder()
    .withUrl("http://localhost:5273/hubs/payment")
    .build();

// Join group
await connection.invoke("JoinPaymentGroup", userId.toString());

// Lắng nghe events
connection.on("QrCodeGenerated", (data) => {
    displayQRCode(data.qrUrl, data);
});

connection.on("PaymentConfirmed", (data) => {
    alert("Thanh toán thành công!");
});
```

---

## 6. CÁCH TÍCH HỢP VIETQR

### 6.1 Đăng ký VietQR API
1. Truy cập: https://vietqr.io
2. Đăng ký tài khoản
3. Lấy API key (nếu cần)
4. Cập nhật vào `appsettings.json`

### 6.2 Code Implementation

#### A. Cập nhật PaymentService

```csharp
// Services/PaymentService.cs
private readonly HttpClient _httpClient;
private readonly SepayConfig _sepayConfig;

public PaymentService(
    WebDbContext context,
    IHubContext<PaymentHub> hubContext,
    IHttpContextAccessor httpContextAccessor,
    IOptions<SepayConfig> sepayConfig,
    HttpClient httpClient)
{
    _context = context;
    _hubContext = hubContext;
    _httpContextAccessor = httpContextAccessor;
    _sepayConfig = sepayConfig.Value;
    _httpClient = httpClient;
}

private async Task<(string emvString, string qrImageUrl)> GenerateVietQrAsync(
    order order, decimal amount, string gencode)
{
    var payload = new
    {
        accountNo = _sepayConfig.AccountNumber,
        accountName = _sepayConfig.AccountName,
        acqId = _sepayConfig.BankBIN,
        amount = (long)amount,
        addInfo = $"Thanh toan don hang #{order.order_id} - {gencode}"
    };

    var response = await _httpClient.PostAsJsonAsync(
        _sepayConfig.VietQrApiEndpoint, payload);
    
    response.EnsureSuccessStatusCode();
    
    var result = await response.Content.ReadFromJsonAsync<VietQrResponseDto>();
    
    return (result.data.qrCode, result.data.qrDataURL);
}
```

#### B. Cập nhật Program.cs

```csharp
// Program.cs
builder.Services.AddHttpClient<IPaymentService, PaymentService>();
builder.Services.Configure<SepayConfig>(builder.Configuration.GetSection("SepayConfig"));
```

#### C. DTOs cho VietQR

```csharp
// Models/DTOs/PaymentDto.cs
public class VietQrRequestDto
{
    public string accountNo { get; set; }
    public string accountName { get; set; }
    public string acqId { get; set; }
    public long amount { get; set; }
    public string addInfo { get; set; }
}

public class VietQrResponseDto
{
    public string code { get; set; }
    public string desc { get; set; }
    public VietQrDataDto data { get; set; }
}

public class VietQrDataDto
{
    public string qrCode { get; set; }       // EMV string
    public string qrDataURL { get; set; }    // Base64 image
}
```

---

## 7. TESTING

### 7.1 Test Generate QR Code

**PowerShell:**
```powershell
$headers = @{
    "Content-Type" = "application/json"
    "Cookie" = "session_id=your_session_id"
}

$body = @{
    amount = 50000
    orderId = 123
} | ConvertTo-Json

Invoke-RestMethod -Uri "http://localhost:5273/v1/Payment/GenerateQr" `
    -Method POST `
    -Headers $headers `
    -Body $body
```

**cURL:**
```bash
curl -X POST http://localhost:5273/v1/Payment/GenerateQr \
  -H "Content-Type: application/json" \
  -H "Cookie: session_id=your_session_id" \
  -d '{
    "amount": 50000,
    "orderId": 123
  }'
```

### 7.2 Test Webhook

```bash
curl -X POST http://localhost:5273/v1/Payment/Webhook \
  -H "Content-Type: application/json" \
  -d '{
    "gencode": "PAY_156_20251104032433_M1VO4B",
    "status": "paid",
    "amount": 50000,
    "paidAt": "2025-11-04T03:30:00Z"
  }'
```

### 7.3 Test Frontend

1. Mở: `http://localhost:5273/payment.html`
2. Đăng nhập (hoặc nhập User ID)
3. Nhập Order ID (đơn hàng phải có `types = "Transfer"`)
4. Nhập số tiền
5. Click "Tạo QR Code"
6. Kiểm tra QR code hiển thị
7. Kiểm tra console log SignalR

---

## 8. BẢO MẬT

### 8.1 Authentication
- Tất cả API thanh toán yêu cầu đăng nhập
- Sử dụng Session-based authentication
- Kiểm tra `AuthHelper.IsLoggedIn(HttpContext)`

### 8.2 Authorization
- User chỉ có thể tạo QR cho đơn hàng của mình
- Kiểm tra `order.user_id == userId`

### 8.3 Webhook Security (cần implement)
- Verify signature từ payment gateway
- Whitelist IP của payment gateway
- Rate limiting

### 8.4 Ví dụ verify webhook signature

```csharp
private bool VerifyWebhookSignature(string payload, string signature)
{
    var secret = _configuration["SepayConfig:WebhookSecret"];
    var computedSignature = ComputeHMACSHA256(payload, secret);
    return signature == computedSignature;
}

private string ComputeHMACSHA256(string message, string secret)
{
    var keyBytes = Encoding.UTF8.GetBytes(secret);
    var messageBytes = Encoding.UTF8.GetBytes(message);
    
    using var hmac = new HMACSHA256(keyBytes);
    var hashBytes = hmac.ComputeHash(messageBytes);
    return Convert.ToBase64String(hashBytes);
}
```

---

## 9. MÃ NGÂN HÀNG VIỆT NAM (BANK BIN)

| Ngân hàng | Tên đầy đủ | Mã BIN |
|-----------|------------|--------|
| MB | Military Bank | 970422 |
| VCB | Vietcombank | 970436 |
| TCB | Techcombank | 970407 |
| BIDV | BIDV | 970418 |
| VTB | Vietinbank | 970415 |
| ACB | ACB | 970416 |
| VPBank | VPBank | 970432 |
| TPBank | TPBank | 970423 |
| MSB | Maritime Bank | 970426 |
| Sacombank | Sacombank | 970403 |

---

## 10. TROUBLESHOOTING

### 10.1 QR code không hiển thị
**Nguyên nhân:**
- Thư viện QRCode.js không load
- API qrserver.com bị chặn

**Giải pháp:**
- Sử dụng qrserver.com API: `https://api.qrserver.com/v1/create-qr-code/?size=256x256&data={url}`
- Hoặc dùng VietQR API để nhận QR image trực tiếp

### 10.2 SignalR không kết nối
**Nguyên nhân:**
- CORS chưa được cấu hình
- SignalR Hub chưa được map

**Giải pháp:**
```csharp
// Program.cs
builder.Services.AddCors(options => {
    options.AddPolicy("AllowAll", builder => {
        builder.AllowAnyOrigin()
               .AllowAnyMethod()
               .AllowAnyHeader();
    });
});

app.UseCors("AllowAll");
app.MapHub<PaymentHub>("/hubs/payment");
```

### 10.3 Webhook không hoạt động
**Kiểm tra:**
- Endpoint có public không?
- Signature có đúng không?
- IP có được whitelist không?
- Log request để debug

---

## 11. ROADMAP

### Phase 1 (Hoàn thành)
- ✅ Basic payment structure
- ✅ QR code generation (URL-based)
- ✅ SignalR real-time notifications
- ✅ Webhook endpoint

### Phase 2 (Đang phát triển)
- ⏳ VietQR API integration
- ⏳ Bank transfer QR code
- ⏳ Auto-fill bank info

### Phase 3 (Kế hoạch)
- ⬜ Payment gateway integration (SePay, VNPay)
- ⬜ Webhook signature verification
- ⬜ Payment reconciliation
- ⬜ Refund support
- ⬜ Payment analytics

### Phase 4 (Tương lai)
- ⬜ Multi-currency support
- ⬜ Installment payment
- ⬜ E-wallet integration (Momo, ZaloPay)
- ⬜ Payment link generation

---

## 12. LIÊN HỆ & HỖ TRỢ

### API Documentation
- Swagger UI: `http://localhost:5273/swagger`

### Source Code
- Controllers: `Controllers/PaymentController.cs`
- Services: `Services/PaymentService.cs`
- DTOs: `Models/DTOs/PaymentDto.cs`
- Config: `Models/Configurations/SepayConfig.cs`
- SignalR Hub: `Hubs/PaymentHub.cs`

### Logs
- Check console output khi chạy `dotnet run`
- Database logs trong EF Core queries

---

**Cập nhật lần cuối:** 2025-11-04  
**Phiên bản:** 1.0  
**Tác giả:** Modern Issues Development Team

