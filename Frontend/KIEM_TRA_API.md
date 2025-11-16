# ✅ Kiểm tra API gọi sản phẩm từ Database

## 🚀 Cách 1: Test trực tiếp bằng HTML (Khuyên dùng)

1. **Mở file test-api.html trong browser:**
   - Double-click vào file `test-api.html` 
   - Hoặc mở trong browser: `file:///D:/ModernIssues/Frontend/test-api.html`

2. **Click nút "🚀 Test API Call"** để test API

3. **Xem kết quả:**
   - ✅ Nếu thành công: Sẽ hiển thị danh sách sản phẩm từ database
   - ❌ Nếu lỗi: Sẽ hiển thị lỗi chi tiết (CORS, Network, Server, etc.)

## 🔍 Cách 2: Kiểm tra trong Console (Dev Server đang chạy)

1. **Mở browser và vào:** `http://localhost:5173` (hoặc port Vite hiển thị)

2. **Mở Developer Tools (F12)**

3. **Xem tab Console** - Bạn sẽ thấy các logs:
   ```
   [API Config] { API_BASE_URL: "...", API_URL: "..." }
   [ProductService.listProducts] Request params: ...
   [ProductService.listProducts] Full URL: ...
   [API Request] POST ...
   [ProductService.listProducts] Response received: ...
   ```

4. **Xem tab Network:**
   - Tìm request đến `ListProducts`
   - Kiểm tra Status code (200 = OK)
   - Xem Response body để kiểm tra data

## 📋 Checklist kiểm tra

### ✅ Kết nối API
- [ ] API URL đúng: `http://35.232.61.38:5000/v1/Product/ListProducts`
- [ ] Method đúng: `POST`
- [ ] Request được gửi thành công (Network tab hiển thị request)

### ✅ Response
- [ ] Status code: `200 OK`
- [ ] Response có format: `{ success: true, data: { ... } }`
- [ ] Response có `data.data` là array chứa sản phẩm
- [ ] Array có ít nhất 1 sản phẩm

### ✅ Console Logs
- [ ] Không có errors (màu đỏ)
- [ ] Có logs từ `[ProductService.listProducts]`
- [ ] Có logs về products được tìm thấy

## 🐛 Các lỗi thường gặp

### ❌ CORS Error
**Triệu chứng:** Console có lỗi "CORS policy" hoặc "Access-Control-Allow-Origin"

**Giải pháp:** 
- Backend phải cấu hình CORS để allow origin của frontend
- Hoặc thử dùng proxy trong Vite (đã config sẵn trong vite.config.js)

### ❌ Failed to fetch / Network Error
**Triệu chứng:** Console có lỗi "Failed to fetch" hoặc "Network request failed"

**Nguyên nhân:**
- Backend server chưa chạy
- Backend URL sai
- Firewall chặn

**Kiểm tra:**
1. Mở browser và vào: `http://35.232.61.38:5000` - xem có phản hồi không
2. Kiểm tra backend server có đang chạy không

### ❌ 404 Not Found
**Triệu chứng:** Network tab hiển thị status 404

**Giải pháp:** 
- Kiểm tra endpoint trong backend code phải là `/v1/Product/ListProducts`
- Kiểm tra routing trong backend

### ❌ 500 Internal Server Error
**Triệu chứng:** Network tab hiển thị status 500

**Giải pháp:**
- Kiểm tra backend logs để xem lỗi chi tiết
- Có thể là lỗi database connection hoặc SQL query

### ❌ Response format không đúng
**Triệu chứng:** Console có logs nhưng products không hiển thị

**Kiểm tra:**
1. Xem Response body trong Network tab
2. So sánh với format mong đợi:
   ```json
   {
     "success": true,
     "data": {
       "totalCount": 10,
       "currentPage": 1,
       "limit": 10,
       "data": [
         {
           "productId": 1,
           "productName": "...",
           "price": 1000,
           ...
         }
       ]
     }
   }
   ```

### ❌ Empty array / No products
**Triệu chứng:** Response thành công nhưng `data.data` là array rỗng `[]`

**Nguyên nhân:**
- Database chưa có sản phẩm
- Filter quá strict (tìm "Laptop" nhưng không có)

**Giải pháp:**
1. Thử test với search parameter rỗng (bỏ search)
2. Thêm sản phẩm từ Admin page
3. Kiểm tra database có sản phẩm không

## 🧪 Test nhanh trong Console

Mở Console (F12) và chạy:

```javascript
// Test API call trực tiếp
fetch('http://35.232.61.38:5000/v1/Product/ListProducts?page=1&limit=10', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({})
})
.then(res => res.json())
.then(data => {
  console.log('✅ Response:', data);
  console.log('Success:', data.success);
  console.log('Total products:', data.data?.totalCount || 0);
  console.log('Products array:', data.data?.data?.length || 0);
  console.log('First product:', data.data?.data?.[0]);
})
.catch(err => {
  console.error('❌ Error:', err);
  console.error('Error message:', err.message);
});
```

## 📊 Kết quả mong đợi

Nếu API hoạt động đúng, bạn sẽ thấy:

1. **Console logs:**
   ```
   [ProductService.listProducts] Request params: { page: 1, limit: 50, search: "Laptop" }
   [ProductService.listProducts] Full URL: http://35.232.61.38:5000/v1/Product/ListProducts?page=1&limit=50&search=Laptop
   [ProductService.listProducts] Response received: { success: true, data: {...} }
   [BestSellingLaptops] Found products in productsData.data: 10
   ```

2. **Network tab:**
   - Request: `POST /v1/Product/ListProducts?page=1&limit=50&search=Laptop`
   - Status: `200 OK`
   - Response: JSON với format đúng

3. **UI:**
   - Sản phẩm hiển thị trên trang web
   - BestSellingLaptops component hiển thị laptops

## 🎯 Kết luận

**Nếu tất cả đều ✅:** API đã gọi được sản phẩm từ database thành công!

**Nếu có lỗi:** Làm theo hướng dẫn ở trên để fix từng lỗi cụ thể.
