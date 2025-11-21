# Hướng dẫn Setup SignalR cho Thông báo Thanh toán Real-time

## 📋 Tổng quan

Hệ thống sử dụng **SignalR** để gửi thông báo real-time khi thanh toán thành công. Khi SePay gửi webhook về biến động số dư, backend sẽ tự động đối chiếu gencode với cache và gửi notification đến client đang chờ thanh toán.

## 🔄 Flow hoạt động

```
1. User checkout với payment type = "Transfer" hoặc "ATM"
   ↓
2. Backend tạo gencode unique: ORDER_{order_id}_{timestamp}_{uniqueId}
   ↓
3. Backend lưu OrderCacheInfo vào memory cache với key: gencode_{gencode}
   ↓
4. Backend trả về OrderDto với QrUrl và Gencode
   ↓
5. Frontend lưu order vào localStorage và navigate đến QRPaymentPage
   ↓
6. QRPaymentPage connect SignalR và join group: payment_{gencode}
   ↓
7. User quét QR và chuyển khoản với gencode trong nội dung
   ↓
8. SePay phát hiện biến động số dư → Gửi POST /Hooks/transaction
   ↓
9. Backend HooksService.ProcessTransactionAsync():
   a. Lưu vào bank_transactions
   b. Extract gencode từ Description/Content
   c. Tìm OrderCacheInfo từ cache bằng gencode
   d. Validate order status, amount, payment type
   e. Cập nhật order.status = "paid"
   f. 🆕 Gửi SignalR notification đến group payment_{gencode}
   ↓
10. Frontend nhận PaymentSuccess notification
    ↓
11. Hiển thị success banner và navigate đến order-confirmation
```

## 🔧 Backend Configuration

### 1. **PaymentHub.cs** (Mới tạo)

**Location:** `Backend/Hubs/PaymentHub.cs`

**Chức năng:**
- Hub để gửi thông báo thanh toán real-time
- Client join vào group theo gencode để nhận notification
- Methods:
  - `JoinPaymentGroup(string gencode)` - Client join group
  - `LeavePaymentGroup(string gencode)` - Client leave group

**Group naming:** `payment_{gencode}` (ví dụ: `payment_ORDER_123_20240115103000_ABC12345`)

### 2. **HooksService.cs** (Đã cập nhật)

**Changes:**
- Inject `IHubContext<PaymentHub>` vào constructor
- Sau khi cập nhật order status thành "paid", gửi SignalR notification:

```csharp
await _hubContext.Clients.Group($"payment_{gencode}").SendAsync("PaymentSuccess", new
{
    orderId = cacheInfo.OrderId,
    gencode = gencode,
    amount = transaction.Transferamount,
    message = "Thanh toán thành công! Đơn hàng của bạn đã được xác nhận.",
    timestamp = DateTime.UtcNow
});
```

### 3. **Program.cs** (Đã cập nhật)

**Changes:**
- Thêm `using Microsoft.AspNetCore.SignalR;` và `using ModernIssues.Hubs;`
- Register SignalR: `builder.Services.AddSignalR();`
- Map Hub endpoint: `app.MapHub<PaymentHub>("/paymentHub");`
- CORS đã được cấu hình để cho phép SignalR connections

**Endpoint:** `ws://your-domain.com/paymentHub` hoặc `wss://your-domain.com/paymentHub`

## 🎨 Frontend Configuration

### 1. **signalRService.js** (Mới tạo)

**Location:** `Frontend/src/services/signalRService.js`

**Chức năng:**
- Singleton service để quản lý SignalR connection
- Auto-reconnect với exponential backoff
- Methods:
  - `connect()` - Connect to SignalR hub
  - `disconnect()` - Disconnect from hub
  - `joinPaymentGroup(gencode)` - Join payment group
  - `leavePaymentGroup(gencode)` - Leave payment group
  - `onPaymentSuccess(callback)` - Subscribe to payment success events
  - `offPaymentSuccess(listenerId)` - Unsubscribe from events

**Transport:** WebSockets với fallback to ServerSentEvents

### 2. **QRPaymentPage.jsx** (Đã cập nhật)

**Changes:**
- Import `signalRService` và `useNotification`
- Thêm state `paymentStatus` ('pending', 'success', 'failed')
- useEffect để setup SignalR:
  - Connect to SignalR khi có orderData
  - Join payment group bằng gencode
  - Listen for `PaymentSuccess` notification
  - Cleanup on unmount
- Hiển thị success banner khi `paymentStatus === 'success'`
- Auto-navigate to order-confirmation sau 2 giây

### 3. **vite.config.js** (Đã cập nhật)

**Changes:**
- Thêm proxy cho `/paymentHub`:
  ```javascript
  '/paymentHub': {
    target: 'ws://35.232.61.38:5000',
    ws: true,
    changeOrigin: true,
    secure: false
  }
  ```

### 4. **package.json** (Đã cập nhật)

**Dependencies:**
- `@microsoft/signalr`: "^8.0.0" (hoặc version mới nhất)

## 🧪 Testing

### Test SignalR Connection

1. **Start backend:**
   ```bash
   cd Backend
   dotnet run
   ```

2. **Start frontend:**
   ```bash
   cd Frontend
   npm run dev
   ```

3. **Check browser console:**
   - Should see `[SignalR] Connecting to: ...`
   - Should see `[SignalR] Connected successfully`
   - Should see `[SignalR] Joined payment group for gencode: ...`

### Test Payment Notification

1. **Create order với payment type = "Transfer"**
2. **Navigate to QRPaymentPage**
3. **Check console:** Should see SignalR connected và joined group
4. **Simulate webhook từ SePay** (hoặc dùng Postman):
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
5. **Check frontend:** Should see success banner và auto-navigate

### Test với gencode thật

1. Tạo order và lấy gencode từ response
2. Join SignalR group với gencode đó
3. Gửi webhook với gencode trong `description`
4. Verify notification được nhận

## 🚨 Troubleshooting

### 1. SignalR không connect

**Symptoms:** Console shows connection errors

**Solutions:**
- ✅ Kiểm tra backend đang chạy và accessible
- ✅ Kiểm tra CORS đã được enable
- ✅ Kiểm tra proxy config trong vite.config.js
- ✅ Kiểm tra WebSocket được support (không phải HTTP-only)
- ✅ Thử fallback transport: ServerSentEvents hoặc LongPolling

### 2. Notification không được nhận

**Symptoms:** Webhook processed nhưng frontend không nhận notification

**Solutions:**
- ✅ Kiểm tra gencode trong webhook khớp với gencode trong cache
- ✅ Kiểm tra client đã join đúng group: `payment_{gencode}`
- ✅ Kiểm tra backend logs để xem có gửi notification không
- ✅ Kiểm tra SignalR connection vẫn active
- ✅ Verify order status được cập nhật thành "paid"

### 3. Multiple notifications

**Symptoms:** Nhận nhiều notifications cho cùng một payment

**Solutions:**
- ✅ Backend đã có duplicate protection (Referencecode + Transactiondate + Amount)
- ✅ Frontend cleanup listener on unmount
- ✅ Check không có multiple SignalR connections

### 4. WebSocket connection failed

**Symptoms:** `WebSocket connection failed` error

**Solutions:**
- ✅ Kiểm tra backend hỗ trợ WebSocket
- ✅ Kiểm tra firewall/security group cho phép WebSocket
- ✅ Thử dùng ServerSentEvents hoặc LongPolling fallback
- ✅ Check proxy config đúng với `ws: true`

## 📝 Checklist Setup

### Backend
- [x] SignalR được register trong Program.cs
- [x] PaymentHub được map tại `/paymentHub`
- [x] HooksService inject IHubContext và gửi notification
- [x] CORS cho phép SignalR connections
- [x] Notification được gửi sau khi order status = "paid"

### Frontend
- [x] @microsoft/signalr package installed
- [x] signalRService.js created và configured
- [x] QRPaymentPage connect SignalR và join group
- [x] Listen for PaymentSuccess notification
- [x] Show success banner và auto-navigate
- [x] Proxy config cho /paymentHub trong vite.config.js

### Testing
- [ ] Test SignalR connection từ frontend
- [ ] Test join payment group
- [ ] Test receive notification từ webhook
- [ ] Test success banner hiển thị
- [ ] Test auto-navigate to confirmation

## 🔗 URLs quan trọng

- **SignalR Hub:** `ws://your-domain.com/paymentHub` hoặc `wss://your-domain.com/paymentHub`
- **Webhook Endpoint:** `POST /Hooks/transaction`
- **Backend API:** http://35.232.61.38:5000
- **Swagger:** http://your-domain.com/swagger

## ⚠️ Lưu ý

1. **Gencode expiration:** Gencode chỉ tồn tại 24 giờ trong cache
2. **SignalR reconnection:** Auto-reconnect với exponential backoff
3. **Group cleanup:** Client tự động leave group on unmount
4. **Transport fallback:** WebSockets → ServerSentEvents → LongPolling
5. **Production:** Nên dùng HTTPS/WSS cho production
6. **Scaling:** SignalR cần sticky sessions nếu dùng multiple servers

## 🎯 Benefits

- ✅ **Real-time notifications:** User nhận thông báo ngay khi thanh toán thành công
- ✅ **No polling:** Không cần poll API để check payment status
- ✅ **Better UX:** Auto-navigate đến confirmation page
- ✅ **Efficient:** Chỉ gửi notification đến client đang chờ (group-based)
- ✅ **Reliable:** Auto-reconnect nếu connection lost

