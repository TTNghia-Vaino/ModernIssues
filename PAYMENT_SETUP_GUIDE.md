# Hướng dẫn Setup Hệ thống Thanh toán

## 📋 Tổng quan

Hệ thống thanh toán hỗ trợ 3 phương thức:
- **Transfer** - Chuyển khoản qua QR Code (VietQR)
- **ATM** - Thanh toán qua thẻ ATM
- **COD** - Thanh toán khi nhận hàng

## 🔧 Backend Configuration

### 1. appsettings.json

Đã được cấu hình sẵn trong `Backend/appsettings.json`:

```json
{
  "SepayConfig": {
    "AccountNumber": "0886224909",
    "BankName": "MB"
  },
  "HooksConfig": {
    "ApiKey": "Acer-Aspire7-Vaino",
    "OrderIdPattern": "ORDER_",
    "AmountTolerance": 0
  }
}
```

### 2. Services đã đăng ký trong Program.cs

✅ `ICheckoutRepository` → `CheckoutRepository`  
✅ `ICheckoutService` → `CheckoutService`  
✅ `IHooksService` → `HooksService`  
✅ `SepayConfig` - Configured  
✅ `HooksConfig` - Configured  
✅ `IMemoryCache` - Đã có sẵn

### 3. API Endpoints

#### POST /v1/Checkout
- **Request**: `{ "paymentType": "Transfer" | "ATM" | "COD" }`
- **Response**: `OrderDto` với `qrUrl`, `gencode`, `orderId`, `totalAmount`, etc.
- **Authentication**: Required (Session-based)
- **Tính năng**:
  - Tạo đơn hàng từ giỏ hàng
  - Tạo gencode unique: `ORDER_{order_id}_{timestamp}_{uniqueId}`
  - Lưu thông tin vào cache (24 giờ)
  - Trả về QR URL cho Transfer/ATM

#### POST /Hooks/transaction
- **Headers**: `Authorization: Apikey {ApiKey}`
- **Request**: `BankTransactionDto` từ SePay webhook
- **Response**: `{ message, orderUpdated, orderId }`
- **Tính năng**:
  - Xác thực API key
  - Lưu biến động số dư
  - Đối chiếu gencode với cache
  - Tự động cập nhật order status = "paid"
  - Xóa gencode khỏi cache

#### GET /v1/Payment/GenerateQr
- **Query**: `amount`, `gencode`
- **Response**: `{ qrUrl }`
- **Note**: Optional, vì `/v1/Checkout` đã trả về `qrUrl`

## 🎨 Frontend Configuration

### 1. Payment Method Mapping

Frontend → Backend mapping trong `checkoutService.js`:
- `vietqr` → `Transfer`
- `transfer` → `Transfer`
- `atm` → `ATM`
- `cod` → `COD`

### 2. Updated Files

#### `Frontend/src/services/checkoutService.js`
- ✅ Map payment method từ frontend sang backend
- ✅ Chỉ gửi `paymentType` trong request
- ✅ Handle response với `qrUrl` và `gencode`

#### `Frontend/src/pages/CheckoutPage.jsx`
- ✅ Gửi đúng `paymentType` cho backend
- ✅ Nhận và xử lý `qrUrl`, `gencode` từ response
- ✅ Redirect đến QR payment page nếu có `qrUrl`
- ✅ Redirect đến confirmation page cho COD

#### `Frontend/src/pages/QRPaymentPage.jsx`
- ✅ Ưu tiên sử dụng `qrUrl` từ checkout response
- ✅ Fallback: gọi API GenerateQr nếu không có `qrUrl`
- ✅ Hiển thị gencode và hướng dẫn thanh toán

### 3. Flow hoàn chỉnh

```
1. User chọn sản phẩm → Thêm vào giỏ hàng
2. User điền thông tin shipping → Chọn payment method
3. Frontend gọi POST /v1/Checkout với paymentType
4. Backend:
   - Tạo order từ cart
   - Tạo gencode unique
   - Lưu vào cache (24h)
   - Trả về qrUrl + gencode (nếu Transfer/ATM)
5. Frontend:
   - Nếu có qrUrl → Redirect đến QRPaymentPage
   - Nếu COD → Redirect đến OrderConfirmationPage
6. User quét QR → Chuyển khoản với gencode
7. SePay gửi webhook → POST /Hooks/transaction
8. Backend:
   - Đối chiếu gencode
   - Cập nhật order status = "paid"
   - Xóa gencode khỏi cache
```

## 🔐 Security

1. **API Key Authentication**: Webhook yêu cầu `Authorization: Apikey {ApiKey}`
2. **Gencode Validation**: Regex pattern `ORDER_\d+_\d+_[A-Z0-9]+`
3. **Amount Tolerance**: Có thể cấu hình trong `HooksConfig.AmountTolerance`
4. **Duplicate Protection**: Kiểm tra Referencecode + Transactiondate + Amount
5. **Cache Expiration**: 24 giờ tự động hết hạn

## 📝 Notes

- Gencode được **khóa cứng** trong QR URL, không thể chỉnh sửa
- Backend chỉ cần `paymentType`, không cần shipping info trong checkout request
- Shipping info có thể lưu riêng hoặc trong order notes
- QR URL format: `https://qr.sepay.vn/img?acc={AccountNumber}&bank={BankName}&amount={amount}&des={gencode}`

## ✅ Checklist Setup

### Backend
- [x] appsettings.json có SepayConfig và HooksConfig
- [x] Program.cs đăng ký đầy đủ services
- [x] **CORS đã được enable** để SePay có thể gửi webhook
- [x] CheckoutController có endpoint POST /v1/Checkout
- [x] HooksController có endpoint POST /Hooks/transaction
- [x] PaymentController có endpoint GET /v1/Payment/GenerateQr
- [x] CheckoutRepository tạo gencode và QR URL
- [x] HooksService xử lý webhook và đối chiếu gencode
- [x] Database có bảng bank_transactions để lưu biến động số dư

### Frontend
- [x] checkoutService.js map payment method đúng
- [x] CheckoutPage gửi paymentType và handle response
- [x] QRPaymentPage sử dụng qrUrl từ checkout response
- [x] Payment method options hiển thị đúng (vietqr, cod)

## 🚀 Testing

1. Test checkout với Transfer → Kiểm tra có qrUrl và gencode
2. Test checkout với COD → Kiểm tra redirect đến confirmation
3. Test webhook với valid gencode → Kiểm tra order status update
4. Test webhook với invalid gencode → Kiểm tra error handling
5. Test duplicate transaction → Kiểm tra không xử lý lại

