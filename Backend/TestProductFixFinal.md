# Test Product API Fixes - Final Version

## 🔧 **Các vấn đề đã được khắc phục:**

### 1. **✅ Lỗi dữ liệu trả về null trong UpdateProduct**
- **Vấn đề**: SQL query sử dụng `RETURNING *` không có alias phù hợp
- **Giải pháp**: Đã thêm alias cho tất cả các cột và lấy thêm CategoryName
- **Kết quả**: API bây giờ trả về đầy đủ thông tin sản phẩm

### 2. **✅ Tích hợp upload ảnh vào CreateProduct**
- **Thay đổi**: API CreateProduct bây giờ nhận cả form data và file ảnh
- **Loại bỏ**: API UploadImage riêng biệt (không cần thiết nữa)
- **Workflow**: Tạo sản phẩm và upload ảnh trong một request duy nhất

## 📋 **Cách test các chức năng:**

### 1. **Test UpdateProduct (đã sửa lỗi null):**

```http
PUT /v1/Product/1
Content-Type: application/json

{
  "categoryId": 1,
  "productName": "iPhone 15 Pro Max",
  "description": "Điện thoại thông minh cao cấp",
  "price": 30000000,
  "stock": 5,
  "warrantyPeriod": 24,
  "imageUrl": "iphone15pro.jpg"
}
```

**Expected Response (không còn null):**
```json
{
  "success": true,
  "message": "Cập nhật sản phẩm thành công.",
  "data": {
    "productId": 1,
    "categoryId": 1,
    "productName": "iPhone 15 Pro Max",
    "description": "Điện thoại thông minh cao cấp",
    "price": 30000000,
    "stock": 5,
    "warrantyPeriod": 24,
    "imageUrl": "iphone15pro.jpg",
    "onPrices": 0,
    "categoryName": "Điện thoại"
  }
}
```

### 2. **Test CreateProduct với upload ảnh:**

#### **Với Postman/Thunder Client:**
- **Method**: POST
- **URL**: `http://localhost:5000/v1/Product/CreateProduct`
- **Body**: Form-data
  - `categoryId`: 1
  - `productName`: "Samsung Galaxy S24"
  - `description`: "Điện thoại Android cao cấp"
  - `price`: 25000000
  - `stock`: 10
  - `warrantyPeriod`: 12
  - `imageFile`: [Chọn file ảnh]

#### **Với curl:**
```bash
curl -X POST http://localhost:5000/v1/Product/CreateProduct \
  -H "Cookie: ASP.NET_SessionId=your_session_id" \
  -F "categoryId=1" \
  -F "productName=Samsung Galaxy S24" \
  -F "description=Điện thoại Android cao cấp" \
  -F "price=25000000" \
  -F "stock=10" \
  -F "warrantyPeriod=12" \
  -F "imageFile=@/path/to/image.jpg"
```

**Expected Response:**
```json
{
  "success": true,
  "message": "Tạo sản phẩm thành công.",
  "data": {
    "productId": 2,
    "categoryId": 1,
    "productName": "Samsung Galaxy S24",
    "description": "Điện thoại Android cao cấp",
    "price": 25000000,
    "stock": 10,
    "warrantyPeriod": 12,
    "imageUrl": "samsung_20241226_020830_1234.jpg",
    "onPrices": 0,
    "categoryName": "Điện thoại"
  }
}
```

### 3. **Test CreateProduct không có ảnh:**

```bash
curl -X POST http://localhost:5000/v1/Product/CreateProduct \
  -H "Cookie: ASP.NET_SessionId=your_session_id" \
  -F "categoryId=1" \
  -F "productName=iPhone 15" \
  -F "description=Điện thoại thông minh" \
  -F "price=20000000" \
  -F "stock=15" \
  -F "warrantyPeriod=12"
```

**Expected**: Tạo sản phẩm thành công với `imageUrl` = null hoặc empty

## 🛡️ **Bảo mật và validation:**

### **CreateProduct với upload ảnh:**
- ✅ **Authentication**: Yêu cầu đăng nhập
- ✅ **Authorization**: Chỉ admin mới được tạo sản phẩm
- ✅ **File validation**: Kiểm tra file size (max 5MB) và file type
- ✅ **Optional image**: Ảnh là tùy chọn, không bắt buộc
- ✅ **Error handling**: Xử lý lỗi upload ảnh riêng biệt

### **UpdateProduct:**
- ✅ **Authentication**: Yêu cầu đăng nhập
- ✅ **Authorization**: Chỉ admin mới được cập nhật
- ✅ **Data integrity**: Trả về đầy đủ thông tin sản phẩm
- ✅ **Category info**: Bao gồm cả CategoryName

## 🔄 **Workflow mới:**

### **Tạo sản phẩm với ảnh (1 bước):**
1. **Gọi API CreateProduct** với form-data bao gồm cả file ảnh
2. **API tự động** upload ảnh và lưu tên file vào database
3. **Trả về** thông tin sản phẩm đầy đủ

### **Tạo sản phẩm không có ảnh:**
1. **Gọi API CreateProduct** với form-data (không có file)
2. **API tạo sản phẩm** với imageUrl = null
3. **Trả về** thông tin sản phẩm

## 📁 **Cấu trúc request mới:**

### **CreateProduct Request (Form-data):**
```
Content-Type: multipart/form-data

Fields:
- categoryId: number
- productName: string
- description: string
- price: number
- stock: number
- warrantyPeriod: number
- imageFile: file (optional)
```

### **UpdateProduct Request (JSON):**
```
Content-Type: application/json

{
  "categoryId": 1,
  "productName": "string",
  "description": "string",
  "price": 0,
  "stock": 0,
  "warrantyPeriod": 0,
  "imageUrl": "string"
}
```

## 🧪 **Test Cases:**

### **CreateProduct Test Cases:**
- ✅ Tạo sản phẩm với ảnh hợp lệ → 201 Created
- ✅ Tạo sản phẩm không có ảnh → 201 Created
- ✅ File ảnh quá lớn → 400 Bad Request
- ✅ File ảnh không hỗ trợ → 400 Bad Request
- ✅ Chưa đăng nhập → 401 Unauthorized
- ✅ Không phải admin → 403 Forbidden

### **UpdateProduct Test Cases:**
- ✅ Cập nhật thành công → 200 OK (với đầy đủ thông tin)
- ✅ Sản phẩm không tồn tại → 404 Not Found
- ✅ Chưa đăng nhập → 401 Unauthorized
- ✅ Không phải admin → 403 Forbidden

## ⚠️ **Lưu ý quan trọng:**

1. **Route đã thay đổi**: Từ `/api/v1/Product` thành `/v1/Product`
2. **CreateProduct**: Bây giờ sử dụng `[FromForm]` thay vì `[FromBody]`
3. **Upload ảnh**: Tích hợp trực tiếp vào CreateProduct
4. **UpdateProduct**: Đã sửa lỗi trả về null, bây giờ trả về đầy đủ thông tin
5. **File storage**: Ảnh vẫn được lưu trong `Backend/Uploads/Images/`

## 🎯 **Kết quả:**

- ✅ **UpdateProduct**: Không còn trả về null, có đầy đủ thông tin
- ✅ **CreateProduct**: Tích hợp upload ảnh, workflow đơn giản hơn
- ✅ **Bảo mật**: Vẫn duy trì authentication và authorization
- ✅ **Performance**: Giảm số lượng API calls cần thiết
