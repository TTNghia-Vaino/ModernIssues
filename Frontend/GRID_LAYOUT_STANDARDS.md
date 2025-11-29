# Quy Định Chung Cho Grid Layout - Admin Tables

## Tổng Quan
Tài liệu này quy định các tiêu chuẩn chung cho grid layout và kích thước container của tất cả các admin pages trong hệ thống.

## Quy Định Chung

### 0. Container Width (Kích thước container của admin page)
- **Max-width**: `1600px` (tất cả admin pages)
- **Margin**: `0 auto` (căn giữa)
- **Padding**: `40px 20px` (vertical horizontal)
- **Box-sizing**: `border-box`
- **Width**: `100%`

### 1. Gap (Khoảng cách giữa các cột)
- **Desktop**: `20px`
- **Mobile** (≤768px): `12px`

### 2. Padding (Padding của header và row)
- **Desktop**: `16px 20px` (vertical horizontal)
- **Mobile** (≤768px): `12px 16px`

### 3. Column Padding (Padding bên trong mỗi cột)
- **Desktop**: `0 8px`
- **Mobile** (≤768px): `0 4px`

### 4. Box-sizing
- Tất cả các elements: `border-box`

### 5. Min-height của Row
- **Desktop**: `60px`

### 6. Grid Template Columns
- Sử dụng `fr` units cho responsive design
- Có thể kết hợp với fixed values (px) cho các cột có kích thước cố định (ID, Actions)
- Ví dụ:
  - `100px 2.5fr 1.2fr 1.5fr 1.2fr 1.3fr 150px` (AdminOrders - 7 cột)
  - `0.9fr 4.25fr 1.35fr 1.35fr 1.1fr 0.65fr` (AdminUsers - 6 cột)
  - `100px 2fr 1.5fr 1fr 1fr 1.5fr 1fr 120px` (AdminWarranty - 8 cột)
  - `0.7fr 3fr 1.2fr 1.3fr 1.5fr 0.8fr 0.9fr 0.6fr` (AdminPromotions - 8 cột)
  - `120px 2.5fr 1.3fr 1.3fr 1.3fr 1.5fr 120px` (AdminProducts - 7 cột)

## Implementation

### Base Styles (AdminDataTable.css)
```css
.table-header {
  gap: 20px;
  padding: 16px 20px;
  box-sizing: border-box;
}

.table-row {
  gap: 20px;
  padding: 16px 20px;
  box-sizing: border-box;
  min-height: 60px;
}

.table-header > div,
.table-row > div {
  padding: 0 8px;
  box-sizing: border-box;
}
```

### Responsive (Mobile)
```css
@media (max-width: 768px) {
  .table-header,
  .table-row {
    gap: 12px;
    padding: 12px 16px;
  }

  .table-header > div,
  .table-row > div {
    padding: 0 4px;
  }
}
```

## Các Pages Đã Áp Dụng
- ✅ AdminUsers (max-width: 1600px, 6 cột)
- ✅ AdminOrders (max-width: 1600px, 7 cột)
- ✅ AdminWarranty (max-width: 1600px, 8 cột)
- ✅ AdminPromotions (max-width: 1600px, 8 cột)
- ✅ AdminProducts (max-width: 1600px, 7 cột)
- ✅ AdminCategories (max-width: 1600px)

## Lưu Ý
- Tất cả các tables phải override với `!important` nếu cần thiết để đảm bảo quy định chung được áp dụng
- Grid columns có thể khác nhau tùy theo số lượng và loại cột của từng table
- Luôn đảm bảo `box-sizing: border-box` để padding không làm tăng width

