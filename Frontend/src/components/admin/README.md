# Admin Shared Components

Các components tái sử dụng cho các trang quản lý admin, được tạo dựa trên AdminWarranty làm tiêu chuẩn.

## Components

### 1. AdminPageHeader
Header component với title và nút thêm mới.

```jsx
<AdminPageHeader
  title="Quản lý Bảo hành"
  subtitle="Quản lý các yêu cầu bảo hành sản phẩm"
  onAdd={handleAdd}
  addButtonText="Thêm yêu cầu bảo hành"
  showAddButton={true}
  extraActions={<Button>Extra Action</Button>}
/>
```

### 2. AdminFiltersBar
Thanh tìm kiếm và lọc.

```jsx
<AdminFiltersBar
  searchValue={searchTerm}
  onSearchChange={setSearchTerm}
  searchPlaceholder="🔍 Tìm kiếm..."
  filters={[
    {
      key: 'status',
      value: filterStatus,
      onChange: setFilterStatus,
      options: [
        { value: 'all', label: 'Tất cả' },
        { value: 'active', label: 'Hoạt động' }
      ]
    }
  ]}
/>
```

### 3. AdminDataTable
Component hiển thị bảng dữ liệu.

**Cách 1: Dùng columns config**
```jsx
<AdminDataTable
  columns={[
    { key: 'name', label: 'Tên', className: 'col-name' },
    { key: 'status', label: 'Trạng thái', className: 'col-status' }
  ]}
  data={items}
  loading={loading}
  totalItems={items.length}
/>
```

**Cách 2: Dùng renderRow custom**
```jsx
<AdminDataTable
  columns={tableColumns}
  data={items}
  renderRow={(item) => (
    <div className="table-row">
      {/* Custom row content */}
    </div>
  )}
  expandedContent={(item) => <div>Expanded content</div>}
  expandedRowId={expandedId}
/>
```

### 4. AdminPagination
Component phân trang.

```jsx
<AdminPagination
  currentPage={currentPage}
  totalPages={totalPages}
  pageSize={pageSize}
  totalItems={totalItems}
  startIndex={startIndex}
  endIndex={endIndex}
  onPageChange={(page) => setCurrentPage(page)}
  onPageSizeChange={(size) => setPageSize(size)}
  itemName="yêu cầu bảo hành"
/>
```

### 5. AdminActionDropdown
Dropdown menu cho các actions.

```jsx
<AdminActionDropdown
  actions={[
    {
      label: 'Chi tiết',
      icon: Eye,
      onClick: () => handleView(item)
    },
    {
      label: 'Chỉnh sửa',
      icon: Edit,
      onClick: () => handleEdit(item)
    },
    {
      label: 'Xóa',
      icon: Trash2,
      onClick: () => handleDelete(item.id),
      className: 'text-red-600'
    }
  ]}
/>
```

### 6. AdminLoadingOverlay
Component hiển thị loading state.

```jsx
<AdminLoadingOverlay
  loading={loading}
  hasData={items.length > 0}
  message="Đang tải danh sách..."
>
  {/* Content */}
</AdminLoadingOverlay>
```

## Ví dụ sử dụng đầy đủ

```jsx
import {
  AdminPageHeader,
  AdminFiltersBar,
  AdminDataTable,
  AdminPagination,
  AdminActionDropdown,
  AdminLoadingOverlay
} from '../components/admin'

function AdminPage() {
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')
  const [filterStatus, setFilterStatus] = useState('all')
  const [currentPage, setCurrentPage] = useState(1)
  const [pageSize, setPageSize] = useState(10)

  // ... logic code ...

  return (
    <div className="admin-page">
      <AdminLoadingOverlay loading={loading} hasData={items.length > 0}>
        <AdminPageHeader
          title="Quản lý Items"
          onAdd={handleAdd}
        />

        <AdminFiltersBar
          searchValue={searchTerm}
          onSearchChange={setSearchTerm}
          filters={[
            {
              key: 'status',
              value: filterStatus,
              onChange: setFilterStatus,
              options: statusOptions
            }
          ]}
        />

        <AdminDataTable
          columns={columns}
          data={paginatedItems}
          loading={loading}
          totalItems={items.length}
        />

        <AdminPagination
          currentPage={currentPage}
          totalPages={totalPages}
          pageSize={pageSize}
          totalItems={filteredItems.length}
          startIndex={startIndex}
          endIndex={endIndex}
          onPageChange={setCurrentPage}
          onPageSizeChange={setPageSize}
        />
      </AdminLoadingOverlay>
    </div>
  )
}
```

## Lưu ý

- Tất cả components đều hỗ trợ custom className
- Các components được thiết kế để dễ dàng customize
- CSS classes giữ nguyên từ AdminWarranty để đảm bảo styling nhất quán

