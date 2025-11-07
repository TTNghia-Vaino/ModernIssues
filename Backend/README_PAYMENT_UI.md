# Hướng dẫn sử dụng Payment UI

## Cách chạy:

1. **Chạy Backend Server:**
   ```bash
   cd Backend
   dotnet run
   ```

2. **Truy cập Payment UI:**
   - Nếu chạy HTTP: `http://localhost:5273/payment.html`
   - Nếu chạy HTTPS: `https://localhost:7051/payment.html`
   - Hoặc kiểm tra port trong terminal khi chạy `dotnet run`

## Lưu ý:

- Đảm bảo backend server đang chạy trước khi mở payment.html
- Nếu dùng HTTPS, browser có thể cảnh báo về certificate. Bấm "Advanced" > "Proceed to localhost"
- URL sẽ tự động detect từ window.location.origin nên không cần config thủ công

## Test Payment Flow:

1. Nhập User ID (ví dụ: 1)
2. Nhập Order ID (ví dụ: 1) - đơn hàng phải có type = "Transfer"
3. Nhập số tiền (ví dụ: 50000)
4. Click "Tạo QR Code"
5. QR code sẽ hiển thị và SignalR sẽ nhận notification real-time

## Test Webhook:

```bash
curl -X POST http://localhost:5273/v1/Payment/Webhook \
  -H "Content-Type: application/json" \
  -d '{
    "gencode": "PAY_1_20251031142000_ABC123",
    "status": "paid",
    "amount": 50000,
    "paidAt": "2025-10-31T14:20:00Z"
  }'
```

