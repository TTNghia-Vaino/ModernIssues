# Test Product API Fixes và Upload Image

## 🔧 **Các vấn đề đã được khắc phục:**

### 1. **Lỗi API lấy thông tin sản phẩm theo ID**
- **Vấn đề**: API trả về null mặc dù có đủ thông tin trong DB
- **Nguyên nhân**: Các cột trong SQL query không có alias phù hợp với properties trong ProductDto
- **Giải pháp**: Đã thêm alias cho tất cả các cột trong query

### 2. **Thêm chức năng upload ảnh**
- **Tính năng mới**: API upload ảnh cho sản phẩm
- **Bảo mật**: Chỉ admin mới được upload ảnh
- **Lưu trữ**: Ảnh được lưu vào thư mục `Backend/Uploads/Images/`
- **Tên file**: Tự động tạo tên file unique với timestamp

## 📋 **Cách test các chức năng:**

### 1. **Test API lấy thông tin sản phẩm (đã sửa):**

```http
GET http://localhost:5000/api/v1/Product/1
```

**Expected Response:**
```json
{
  "success": true,
  "message": "Success",
  "data": {
    "productId": 1,
    "categoryId": 1,
    "productName": "iPhone 15",
    "description": "Điện thoại thông minh",
    "price": 25000000,
    "stock": 10,
    "warrantyPeriod": 12,
    "imageUrl": "https://example.com/image.jpg",
    "onPrices": 0,
    "categoryName": "Điện thoại"
  }
}
```

### 2. **Test API upload ảnh:**

#### **Test upload ảnh (chưa đăng nhập):**
```bash
curl -X POST http://localhost:5000/api/v1/Product/UploadImage \
  -F "file=@/path/to/image.jpg"
```
**Expected**: 401 Unauthorized

#### **Test upload ảnh (đã đăng nhập nhưng không phải admin):**
1. Đăng nhập với tài khoản customer
2. Gọi API upload ảnh
**Expected**: 403 Forbidden

#### **Test upload ảnh (đã đăng nhập và là admin):**
```bash
curl -X POST http://localhost:5000/api/v1/Product/UploadImage \
  -H "Cookie: ASP.NET_SessionId=your_session_id" \
  -F "file=@/path/to/image.jpg"
```

**Expected Response:**
```json
{
  "success": true,
  "message": "Upload ảnh thành công.",
  "data": {
    "fileName": "image_20241226_020830_1234.jpg",
    "imageUrl": "http://localhost:5000/Uploads/Images/image_20241226_020830_1234.jpg"
  }
}
```

### 3. **Test với Postman/Thunder Client:**

#### **Upload Image:**
- **Method**: POST
- **URL**: `http://localhost:5000/api/v1/Product/UploadImage`
- **Body**: Form-data
  - Key: `file`
  - Type: File
  - Value: Chọn file ảnh (.jpg, .png, .gif, .bmp, .webp)
- **Headers**: Cookie với session đã đăng nhập

#### **Get Product by ID:**
- **Method**: GET
- **URL**: `http://localhost:5000/api/v1/Product/{id}`
- **Expected**: Trả về đầy đủ thông tin sản phẩm

## 🛡️ **Bảo mật và giới hạn:**

### **Upload Image:**
- ✅ **Authentication**: Yêu cầu đăng nhập
- ✅ **Authorization**: Chỉ admin mới được upload
- ✅ **File size**: Tối đa 5MB
- ✅ **File types**: Chỉ chấp nhận .jpg, .jpeg, .png, .gif, .bmp, .webp
- ✅ **Unique filename**: Tự động tạo tên file unique

### **Get Product by ID:**
- ✅ **Public access**: Không cần đăng nhập
- ✅ **Data integrity**: Trả về đầy đủ thông tin sản phẩm
- ✅ **Error handling**: 404 nếu không tìm thấy sản phẩm

## 📁 **Cấu trúc thư mục:**

```
Backend/
├── Uploads/
│   └── Images/
│       ├── product_20241226_020830_1234.jpg
│       ├── image_20241226_020830_5678.png
│       └── ...
├── Controllers/
│   └── ProductController.cs (đã cập nhật)
├── Helpers/
│   └── ImageUploadHelper.cs (mới)
└── Program.cs (đã cấu hình static files)
```

## 🔄 **Workflow sử dụng:**

### **Tạo sản phẩm với ảnh:**
1. **Bước 1**: Upload ảnh trước
   ```http
   POST /api/v1/Product/UploadImage
   ```
2. **Bước 2**: Lấy `fileName` từ response
3. **Bước 3**: Tạo sản phẩm với `imageUrl` = `fileName`
   ```http
   POST /api/v1/Product/CreateProduct
   {
     "categoryId": 1,
     "productName": "iPhone 15",
     "description": "Điện thoại thông minh",
     "price": 25000000,
     "stock": 10,
     "warrantyPeriod": 12,
     "imageUrl": "product_20241226_020830_1234.jpg"
   }
   ```

## ⚠️ **Lưu ý quan trọng:**

1. **Static Files**: Đã cấu hình `app.UseStaticFiles()` trong Program.cs
2. **File Storage**: Ảnh được lưu trong `Backend/Uploads/Images/`
3. **URL Access**: Ảnh có thể truy cập qua `http://localhost:5000/Uploads/Images/filename`
4. **File Naming**: Tên file được tạo unique với timestamp và random number
5. **Error Handling**: Đầy đủ xử lý lỗi cho các trường hợp file không hợp lệ

## 🧪 **Test Cases:**

### **Upload Image Test Cases:**
- ✅ File null/empty → 400 Bad Request
- ✅ File quá lớn (>5MB) → 400 Bad Request  
- ✅ File type không hỗ trợ → 400 Bad Request
- ✅ Chưa đăng nhập → 401 Unauthorized
- ✅ Không phải admin → 403 Forbidden
- ✅ Upload thành công → 200 OK

### **Get Product Test Cases:**
- ✅ Sản phẩm tồn tại → 200 OK với đầy đủ thông tin
- ✅ Sản phẩm không tồn tại → 404 Not Found
- ✅ Sản phẩm bị vô hiệu hóa → 404 Not Found
