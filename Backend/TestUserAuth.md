# Test Authentication cho UserController

## Các phương thức đã được cập nhật với kiểm tra authentication:

### 1. Register (POST /api/v1/User/register)
- **Yêu cầu**: Không cần đăng nhập (Public)
- **Mục đích**: Đăng ký tài khoản mới
- **Test cases**:
  - ✅ Đăng ký thành công → 201 Created
  - ✅ Username/Email đã tồn tại → 400 Bad Request

### 2. GetProfile (GET /api/v1/User/{userId})
- **Yêu cầu**: Đăng nhập + Chỉ xem được profile của chính mình (trừ admin)
- **Test cases**:
  - ✅ Chưa đăng nhập → 401 Unauthorized
  - ✅ Đã đăng nhập nhưng xem profile người khác → 403 Forbidden
  - ✅ Đã đăng nhập và xem profile của chính mình → 200 OK
  - ✅ Admin xem profile bất kỳ → 200 OK

### 3. UpdateProfile (PUT /api/v1/User/{userId})
- **Yêu cầu**: Đăng nhập + Chỉ cập nhật được profile của chính mình (trừ admin)
- **Test cases**:
  - ✅ Chưa đăng nhập → 401 Unauthorized
  - ✅ Đã đăng nhập nhưng cập nhật profile người khác → 403 Forbidden
  - ✅ Đã đăng nhập và cập nhật profile của chính mình → 200 OK
  - ✅ Admin cập nhật profile bất kỳ → 200 OK

### 4. GetAllUsers (GET /api/v1/User/ListUsers)
- **Yêu cầu**: Đăng nhập + Role Admin
- **Test cases**:
  - ✅ Chưa đăng nhập → 401 Unauthorized
  - ✅ Đã đăng nhập nhưng không phải admin → 403 Forbidden
  - ✅ Đã đăng nhập và là admin → 200 OK (trả về danh sách người dùng)

### 5. DeleteUser (DELETE /api/v1/User/{userId})
- **Yêu cầu**: Đăng nhập + Role Admin
- **Test cases**:
  - ✅ Chưa đăng nhập → 401 Unauthorized
  - ✅ Đã đăng nhập nhưng không phải admin → 403 Forbidden
  - ✅ Đã đăng nhập và là admin → 200 OK (vô hiệu hóa người dùng thành công)

### 6. GetCurrentUser (GET /api/v1/User/CurrentUser)
- **Yêu cầu**: Đăng nhập
- **Test cases**:
  - ✅ Chưa đăng nhập → 401 Unauthorized
  - ✅ Đã đăng nhập → 200 OK

## Cách test:

### 1. Test với Postman/Thunder Client:

#### Test Register (Public):
```http
POST http://localhost:5000/api/v1/User/register
Content-Type: application/json

{
  "username": "testuser",
  "email": "test@example.com",
  "password": "password123",
  "phone": "0123456789",
  "address": "123 Test Street"
}
```
**Expected**: 201 Created

#### Test GetProfile (chưa đăng nhập):
```http
GET http://localhost:5000/api/v1/User/1
```
**Expected**: 401 Unauthorized

#### Test GetProfile (đã đăng nhập nhưng xem profile người khác):
1. Đăng nhập với tài khoản customer
2. Gọi API GetProfile với userId khác
**Expected**: 403 Forbidden

#### Test GetAllUsers (chưa đăng nhập):
```http
GET http://localhost:5000/api/v1/User/ListUsers
```
**Expected**: 401 Unauthorized

#### Test GetAllUsers (đã đăng nhập nhưng không phải admin):
1. Đăng nhập với tài khoản customer
2. Gọi API GetAllUsers
**Expected**: 403 Forbidden

#### Test GetAllUsers (đã đăng nhập và là admin):
1. Đăng nhập với tài khoản admin
2. Gọi API GetAllUsers
**Expected**: 200 OK

### 2. Test với curl:

```bash
# Test Register (Public)
curl -X POST http://localhost:5000/api/v1/User/register \
  -H "Content-Type: application/json" \
  -d '{"username": "testuser", "email": "test@example.com", "password": "password123"}'

# Expected: 201 Created

# Test GetProfile (chưa đăng nhập)
curl -X GET http://localhost:5000/api/v1/User/1

# Expected: 401 Unauthorized

# Test GetAllUsers (chưa đăng nhập)
curl -X GET http://localhost:5000/api/v1/User/ListUsers

# Expected: 401 Unauthorized
```

## Lưu ý quan trọng:

### 🔐 **Phân quyền chi tiết:**

1. **Register**: Public - Ai cũng có thể đăng ký
2. **GetProfile**: 
   - User chỉ xem được profile của chính mình
   - Admin có thể xem profile của bất kỳ ai
3. **UpdateProfile**: 
   - User chỉ cập nhật được profile của chính mình
   - Admin có thể cập nhật profile của bất kỳ ai
4. **GetAllUsers**: Chỉ admin
5. **DeleteUser**: Chỉ admin
6. **GetCurrentUser**: Cần đăng nhập

### ✅ **Đã hoàn thiện:**

1. **GetAllUsersAsync**: Đã implement trong UserService và UserRepository
2. **DeleteUserAsync**: Đã implement trong UserService và UserRepository
3. **Authentication & Authorization**: Đã áp dụng đầy đủ cho tất cả phương thức

### ⚠️ **TODO còn lại:**

1. **Logic lấy userId từ session**: Hiện tại đang giả lập userId = 1
2. **Session management**: Cần lưu userId vào session khi đăng nhập

### 🛡️ **Bảo mật đã áp dụng:**

- Kiểm tra đăng nhập cho tất cả các phương thức trừ Register
- Phân quyền admin cho các chức năng quản lý
- User chỉ được truy cập thông tin của chính mình
- Response codes phù hợp với từng trường hợp
