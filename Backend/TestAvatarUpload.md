# Test Upload Avatar cho Khách hàng

## Tổng quan
Đã implement thành công tính năng upload ảnh avatar cho CRUD khách hàng với các endpoint sau:

## Các Endpoint mới:

### 1. Upload Avatar riêng biệt
```
POST /v1/User/{userId}/avatar
Content-Type: multipart/form-data

Form Data:
- avatarFile: (file) - File ảnh đại diện
- currentAvatarUrl: (string, optional) - URL ảnh hiện tại để xóa
```

### 2. Xóa Avatar (trở về ảnh mặc định)
```
DELETE /v1/User/{userId}/avatar
```

### 3. Đăng ký với Avatar
```
POST /v1/User/register
Content-Type: multipart/form-data

Form Data:
- username: (string)
- password: (string)
- email: (string)
- phone: (string)
- address: (string)
- avatarFile: (file, optional) - File ảnh đại diện
```

### 4. Cập nhật Profile với Avatar
```
PUT /v1/User/{userId}
Content-Type: multipart/form-data

Form Data:
- phone: (string)
- address: (string)
- email: (string)
- avatarFile: (file, optional) - File ảnh đại diện mới
```

## Các thay đổi đã thực hiện:

### 1. Database/Entity
- ✅ Thêm trường `avatar_url` vào entity `user`
- ✅ Cập nhật các SQL query để bao gồm `avatar_url`

### 2. DTOs
- ✅ `UserDto`: Thêm `AvatarUrl` property
- ✅ `UserRegisterDto`: Thêm `AvatarFile` và `AvatarUrl` properties
- ✅ `UserUpdateProfileDto`: Thêm `AvatarFile`, `CurrentAvatarUrl`, và `AvatarUrl` properties
- ✅ `UserUploadAvatarDto`: DTO mới cho upload avatar riêng biệt

### 3. Repository Layer
- ✅ `UserRepository`: Cập nhật tất cả methods để hỗ trợ `avatar_url`
- ✅ Thêm method `UpdateAvatarAsync()` riêng biệt
- ✅ `IUserRepository`: Thêm method signature mới

### 4. Service Layer
- ✅ `UserService`: Thêm method `UpdateCustomerAvatarAsync()`
- ✅ `IUserService`: Thêm method signature mới

### 5. Controller Layer
- ✅ `UserController`: 
  - Cập nhật endpoint `Register` để hỗ trợ upload avatar
  - Cập nhật endpoint `UpdateProfile` để hỗ trợ upload avatar
  - Thêm endpoint `UploadAvatar` riêng biệt
  - Thêm endpoint `DeleteAvatar` để xóa avatar
- ✅ Inject `IWebHostEnvironment` để xử lý file upload

## Tính năng đã implement:

### ✅ Upload Avatar
- Hỗ trợ các định dạng: jpg, jpeg, png, gif, bmp, webp
- Giới hạn kích thước: 5MB
- Tự động tạo tên file unique với timestamp
- Xóa ảnh cũ khi upload ảnh mới
- Validation đầy đủ

### ✅ Xóa Avatar
- Xóa file ảnh từ server
- Cập nhật database về ảnh mặc định "default-avatar.jpg"

### ✅ Ảnh mặc định
- Sử dụng "default-avatar.jpg" làm ảnh mặc định
- File đã có sẵn trong `wwwroot/Uploads/Images/`

### ✅ Bảo mật
- Kiểm tra authentication
- Kiểm tra authorization (user chỉ được cập nhật avatar của chính mình)
- Validation file upload

## Cách test:

### Test 1: Đăng ký với avatar
```bash
curl -X POST "http://localhost:5000/v1/User/register" \
  -F "username=testuser" \
  -F "password=123456" \
  -F "email=test@example.com" \
  -F "phone=0123456789" \
  -F "address=123 Test Street" \
  -F "avatarFile=@/path/to/avatar.jpg"
```

### Test 2: Upload avatar riêng biệt
```bash
curl -X POST "http://localhost:5000/v1/User/1/avatar" \
  -F "avatarFile=@/path/to/new-avatar.jpg" \
  -F "currentAvatarUrl=old-avatar.jpg"
```

### Test 3: Cập nhật profile với avatar
```bash
curl -X PUT "http://localhost:5000/v1/User/1" \
  -F "phone=0987654321" \
  -F "address=456 New Street" \
  -F "email=newemail@example.com" \
  -F "avatarFile=@/path/to/profile-avatar.jpg"
```

### Test 4: Xóa avatar
```bash
curl -X DELETE "http://localhost:5000/v1/User/1/avatar"
```

## Lưu ý:
- Cần đăng nhập để sử dụng các endpoint (trừ register)
- User chỉ được cập nhật avatar của chính mình
- Admin có thể cập nhật avatar cho tất cả user
- File ảnh được lưu trong `wwwroot/Uploads/Images/`
- URL ảnh có thể truy cập qua: `http://localhost:5000/Uploads/Images/{filename}`

## Kết luận:
✅ **HOÀN THÀNH** - Tính năng upload ảnh avatar cho CRUD khách hàng đã được implement đầy đủ với tất cả các chức năng cần thiết.
