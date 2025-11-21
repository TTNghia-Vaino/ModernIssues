# API PROMOTION

## 1. GET /v1/Promotion/GetAllPromotions
**Query Params:** `page`, `limit`, `search`, `status` (active/inactive/expired)

**Response:**
```json
{
  "success": true,
  "message": "Lấy danh sách 10 khuyến mãi thành công.",
  "data": {
    "totalCount": 50,
    "currentPage": 1,
    "limit": 10,
    "data": [
      {
        "promotionId": 1,
        "promotionName": "Giảm giá 20%",
        "description": "Khuyến mãi lớn",
        "discountType": "percentage",
        "discountValue": 20,
        "discountDisplay": "20%",
        "startDate": "2024-01-01T00:00:00Z",
        "endDate": "2024-12-31T23:59:59Z",
        "status": "Đang hoạt động",
        "isActive": true,
        "productCount": 15,
        "bannerUrl": "banner_123.jpg"
      }
    ]
  }
}
```

## 2. GET /v1/Promotion/{id}
**Response:**
```json
{
  "success": true,
  "message": "Lấy chi tiết khuyến mãi thành công.",
  "data": {
    "promotionId": 1,
    "promotionName": "Giảm giá 20%",
    "description": "Khuyến mãi lớn",
    "discountType": "percentage",
    "discountValue": 20,
    "startDate": "2024-01-01T00:00:00Z",
    "endDate": "2024-12-31T23:59:59Z",
    "isActive": true,
    "bannerUrl": "banner_123.jpg",
    "createdAt": "2024-01-01T00:00:00Z",
    "updatedAt": "2024-01-01T00:00:00Z",
    "products": [
      {
        "productId": 1,
        "productName": "Laptop Dell",
        "imageUrl": "laptop.jpg",
        "price": 15000000,
        "categoryId": 1,
        "categoryName": "Laptop"
      }
    ],
    "productIds": [1, 2, 3]
  }
}
```

## 3. POST /v1/Promotion
**Content-Type:** `multipart/form-data`

**Request Body:**
```
PromotionName: "Giảm giá 20%"
Description: "Khuyến mãi lớn"
DiscountType: "percentage"
DiscountValue: 20
StartDate: "2024-01-01T00:00:00Z"
EndDate: "2024-12-31T23:59:59Z"
IsActive: true
CategoryIds: "[1,2,3]" hoặc "1,2,3"
ProductIds: "[4,5,6]" hoặc "4,5,6"
BannerFile: (file)
```

**Response:**
```json
{
  "success": true,
  "message": "Tạo khuyến mãi thành công. Đã thêm 15 sản phẩm vào khuyến mãi.",
  "data": {
    "promotionId": 1,
    "promotionName": "Giảm giá 20%",
    "description": "Khuyến mãi lớn",
    "discountType": "percentage",
    "discountValue": 20,
    "startDate": "2024-01-01T00:00:00Z",
    "endDate": "2024-12-31T23:59:59Z",
    "isActive": true,
    "bannerUrl": "banner_123.jpg",
    "createdAt": "2024-01-01T00:00:00Z",
    "updatedAt": "2024-01-01T00:00:00Z",
    "products": [...],
    "productIds": [1, 2, 3]
  }
}
```

## 4. PUT /v1/Promotion/{id}
**Content-Type:** `multipart/form-data`

**Request Body:** (giống POST)

**Response:**
```json
{
  "success": true,
  "message": "Cập nhật khuyến mãi thành công. Đã cập nhật 15 sản phẩm trong khuyến mãi.",
  "data": {
    "promotionId": 1,
    "promotionName": "Giảm giá 20%",
    "description": "Khuyến mãi lớn",
    "discountType": "percentage",
    "discountValue": 20,
    "startDate": "2024-01-01T00:00:00Z",
    "endDate": "2024-12-31T23:59:59Z",
    "isActive": true,
    "bannerUrl": "banner_123.jpg",
    "createdAt": "2024-01-01T00:00:00Z",
    "updatedAt": "2024-01-02T00:00:00Z",
    "products": [...],
    "productIds": [1, 2, 3]
  }
}
```

## 5. PUT /v1/Promotion/{id}/toggle
**Response:**
```json
{
  "success": true,
  "message": "Đã kích hoạt khuyến mãi thành công.",
  "data": {
    "promotionId": 1,
    "promotionName": "Giảm giá 20%",
    "description": "Khuyến mãi lớn",
    "discountType": "percentage",
    "discountValue": 20,
    "startDate": "2024-01-01T00:00:00Z",
    "endDate": "2024-12-31T23:59:59Z",
    "isActive": true,
    "bannerUrl": "banner_123.jpg",
    "createdAt": "2024-01-01T00:00:00Z",
    "updatedAt": "2024-01-02T00:00:00Z",
    "products": [...],
    "productIds": [1, 2, 3]
  }
}
```

## 6. POST /v1/Promotion/UpdatePrices
**Query Params:** `promotionId` (optional)

**Response:**
```json
{
  "success": true,
  "message": "Đã cập nhật giá cho 50 sản phẩm và reset 10 sản phẩm từ 5 promotions.",
  "data": {
    "processedPromotionCount": 5,
    "updatedProductCount": 50,
    "resetProductCount": 10,
    "totalAffectedProducts": 60,
    "promotionDetails": [
      {
        "promotionId": 1,
        "promotionName": "Giảm giá 20%",
        "updatedProductCount": 15,
        "status": "updated"
      }
    ],
    "processedAt": "2024-01-15T10:30:00Z"
  }
}
```

## 7. DELETE /v1/Promotion/{id}
**Response:**
```json
{
  "success": true,
  "message": "Xóa khuyến mãi thành công. Giá sản phẩm đã được reset về giá gốc.",
  "data": {
    "promotionId": 1
  }
}
```

## 8. GET /v1/Promotion/AvailableProducts
**Query Params:** `promotionId`, `discountType`, `discountValue`, `categoryId`, `search`, `page`, `limit`

**Response:**
```json
{
  "success": true,
  "message": "Tìm thấy 100 sản phẩm có thể thêm vào khuyến mãi. 5 sản phẩm đã có khuyến mãi tốt hơn.",
  "data": {
    "totalCount": 100,
    "currentPage": 1,
    "limit": 10,
    "availableProducts": [
      {
        "productId": 1,
        "productName": "Laptop Dell",
        "imageUrl": "laptop.jpg",
        "price": 15000000,
        "categoryId": 1,
        "categoryName": "Laptop",
        "currentPromotionId": null,
        "currentPromotionName": null,
        "currentDiscountDisplay": null
      },
      {
        "productId": 2,
        "productName": "Mouse Logitech",
        "imageUrl": "mouse.jpg",
        "price": 500000,
        "categoryId": 2,
        "categoryName": "Phụ kiện",
        "currentPromotionId": 2,
        "currentPromotionName": "Giảm 10%",
        "currentDiscountDisplay": "10%"
      }
    ],
    "skippedCount": 5,
    "skippedProducts": [...]
  }
}
```

## Error Response
```json
{
  "success": false,
  "message": "Lỗi hệ thống khi lấy danh sách khuyến mãi.",
  "errors": ["Error details here"]
}
```

## Authentication
- Tất cả API đều yêu cầu đăng nhập (trừ GET)
- API Create/Update/Delete/Toggle yêu cầu quyền Admin
- Status codes: 200, 201, 400, 401, 403, 404, 500

