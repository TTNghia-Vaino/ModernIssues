# Test Authentication cho ProductController

## Các phương thức đã được cập nhật với kiểm tra authentication:

### 1. CreateProduct (POST /api/v1/Product/CreateProduct)
- **Yêu cầu**: Đăng nhập + Role Admin
- **Test cases**:
  - ✅ Chưa đăng nhập → 401 Unauthorized
  - ✅ Đã đăng nhập nhưng không phải admin → 403 Forbidden  
  - ✅ Đã đăng nhập và là admin → 201 Created

### 2. UpdateProduct (PUT /api/v1/Product/{id})
- **Yêu cầu**: Đăng nhập + Role Admin
- **Test cases**:
  - ✅ Chưa đăng nhập → 401 Unauthorized
  - ✅ Đã đăng nhập nhưng không phải admin → 403 Forbidden
  - ✅ Đã đăng nhập và là admin → 200 OK

### 3. SoftDeleteProduct (DELETE /api/v1/Product/{id})
- **Yêu cầu**: Đăng nhập + Role Admin
- **Test cases**:
  - ✅ Chưa đăng nhập → 401 Unauthorized
  - ✅ Đã đăng nhập nhưng không phải admin → 403 Forbidden
  - ✅ Đã đăng nhập và là admin → 200 OK

### 4. GetCurrentUser (GET /api/v1/Product/CurrentUser)
- **Yêu cầu**: Đăng nhập
- **Test cases**:
  - ✅ Chưa đăng nhập → 401 Unauthorized
  - ✅ Đã đăng nhập → 200 OK (trả về thông tin user)

## Các phương thức KHÔNG cần authentication:
- **GetProducts** (POST /api/v1/Product/ListProducts) - Public access
- **GetProductById** (GET /api/v1/Product/{id}) - Public access

## Cách test:

### 1. Test với Postman/Thunder Client:

#### Test CreateProduct (chưa đăng nhập):
```http
POST http://localhost:5000/api/v1/Product/CreateProduct
Content-Type: application/json

{
  "categoryId": 1,
  "productName": "Test Product",
  "description": "Test Description",
  "price": 100000,
  "stock": 10,
  "warrantyPeriod": 12,
  "imageUrl": "https://example.com/image.jpg"
}
```
**Expected**: 401 Unauthorized

#### Test CreateProduct (đã đăng nhập nhưng không phải admin):
1. Đăng nhập với tài khoản customer
2. Gọi API CreateProduct
**Expected**: 403 Forbidden

#### Test CreateProduct (đã đăng nhập và là admin):
1. Đăng nhập với tài khoản admin
2. Gọi API CreateProduct
**Expected**: 201 Created

### 2. Test với curl:

```bash
# Test chưa đăng nhập
curl -X POST http://localhost:5000/api/v1/Product/CreateProduct \
  -H "Content-Type: application/json" \
  -d '{"categoryId": 1, "productName": "Test", "price": 100000}'

# Expected: 401 Unauthorized
```

## Lưu ý:
- Tất cả các phương thức CRUD (Create, Update, Delete) đều yêu cầu đăng nhập và role admin
- Các phương thức đọc (Read) vẫn public để khách hàng có thể xem sản phẩm
- AuthHelper được sử dụng để kiểm tra session và role
- Response codes được cập nhật để phản ánh đúng trạng thái authentication/authorization
