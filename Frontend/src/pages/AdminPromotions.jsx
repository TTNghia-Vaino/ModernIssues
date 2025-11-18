import React, { useState } from 'react'
import { Button } from '../components/ui/button'
import { Input } from '../components/ui/input'
import { Badge } from '../components/ui/badge'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '../components/ui/dialog'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '../components/ui/dropdown-menu'
import { Label } from '../components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select'
import { MoreVertical, Plus, X } from 'lucide-react'
import './AdminPromotions.css'

const statusLabels = {
  active: 'Đang hoạt động',
  inactive: 'Chưa kích hoạt',
  expired: 'Đã hết hạn'
}

const statusColors = {
  active: 'bg-green-100 text-green-800 border-green-300',
  inactive: 'bg-gray-100 text-gray-800 border-gray-300',
  expired: 'bg-red-100 text-red-800 border-red-300'
}

const mockPromotions = [
  {
    id: 1,
    name: 'Flash Sale Cuối Tuần',
    description: 'Giảm giá sốc cho các sản phẩm điện thoại',
    discountPercent: 20,
    products: ['iPhone 15 Pro Max', 'Samsung Galaxy S24'],
    startDate: '2025-01-15',
    endDate: '2025-01-17',
    status: 'active',
    banner: '/flash-sale-banner.jpg'
  },
  {
    id: 2,
    name: 'Khuyến Mãi Laptop',
    description: 'Mua laptop tặng kèm phụ kiện',
    discountPercent: 15,
    products: ['MacBook Pro M3', 'Dell XPS 15'],
    startDate: '2025-01-10',
    endDate: '2025-01-31',
    status: 'active',
    banner: '/laptop-promo.jpg'
  },
  {
    id: 3,
    name: 'Giảm Giá Tết',
    description: 'Chương trình khuyến mãi Tết Nguyên Đán',
    discountPercent: 30,
    products: ['iPad Air M2', 'AirPods Pro 2'],
    startDate: '2025-01-01',
    endDate: '2025-01-10',
    status: 'expired',
    banner: '/tet-sale.jpg'
  },
]

const availableProducts = [
  'iPhone 15 Pro Max',
  'Samsung Galaxy S24',
  'MacBook Pro M3',
  'Dell XPS 15',
  'iPad Air M2',
  'AirPods Pro 2',
  'Apple Watch Series 9',
  'Sony WH-1000XM5',
]

const AdminPromotions = () => {
  const [promotions, setPromotions] = useState(mockPromotions)
  const [searchQuery, setSearchQuery] = useState('')
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false)
  const [isDetailDialogOpen, setIsDetailDialogOpen] = useState(false)
  const [selectedPromotion, setSelectedPromotion] = useState(null)
  const [filterStatus, setFilterStatus] = useState('all')
  
  // Pagination state
  const [currentPage, setCurrentPage] = useState(1)
  const [pageSize, setPageSize] = useState(10)

  // Form states
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    discountPercent: 0,
    products: [],
    startDate: '',
    endDate: '',
    status: 'inactive',
    banner: ''
  })
  const [bannerFile, setBannerFile] = useState(null)
  const [bannerPreview, setBannerPreview] = useState('')

  const filteredPromotions = promotions.filter(promo => {
    const matchesSearch = promo.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         promo.description.toLowerCase().includes(searchQuery.toLowerCase())
    const matchesStatus = filterStatus === 'all' || promo.status === filterStatus
    return matchesSearch && matchesStatus
  })

  // Pagination calculation
  const totalPages = Math.ceil(filteredPromotions.length / pageSize)
  const startIndex = (currentPage - 1) * pageSize
  const endIndex = startIndex + pageSize
  const paginatedPromotions = filteredPromotions.slice(startIndex, endIndex)

  // Reset to page 1 when filters change
  React.useEffect(() => {
    setCurrentPage(1)
  }, [searchQuery, filterStatus, filteredPromotions.length])

  const handleAddPromotion = () => {
    const newPromotion = {
      id: Math.max(...promotions.map(p => p.id)) + 1,
      ...formData,
      banner: bannerPreview
    }
    setPromotions([...promotions, newPromotion])
    resetForm()
    setIsAddDialogOpen(false)
  }

  const handleEditPromotion = () => {
    if (!selectedPromotion) return
    setPromotions(promotions.map(p => 
      p.id === selectedPromotion.id 
        ? { ...selectedPromotion, ...formData, banner: bannerPreview || formData.banner }
        : p
    ))
    resetForm()
    setIsAddDialogOpen(false)
  }

  const handleDeletePromotion = (id) => {
    setPromotions(promotions.filter(p => p.id !== id))
  }

  const openEditDialog = (promotion) => {
    setSelectedPromotion(promotion)
    setFormData(promotion)
    setBannerPreview(promotion.banner || '')
    setIsAddDialogOpen(true)
  }

  const openDetailDialog = (promotion) => {
    setSelectedPromotion(promotion)
    setIsDetailDialogOpen(true)
  }

  const resetForm = () => {
    setFormData({
      name: '',
      description: '',
      discountPercent: 0,
      products: [],
      startDate: '',
      endDate: '',
      status: 'inactive',
      banner: ''
    })
    setBannerFile(null)
    setBannerPreview('')
    setSelectedPromotion(null)
  }

  const handleBannerUpload = (e) => {
    const file = e.target.files?.[0]
    if (file) {
      setBannerFile(file)
      const reader = new FileReader()
      reader.onloadend = () => {
        setBannerPreview(reader.result)
      }
      reader.readAsDataURL(file)
    }
  }

  const toggleProductSelection = (product) => {
    setFormData(prev => ({
      ...prev,
      products: prev.products.includes(product)
        ? prev.products.filter(p => p !== product)
        : [...prev.products, product]
    }))
  }

  const getStatusBadge = (status) => {
    return (
      <Badge className={statusColors[status] || statusColors.inactive}>
        {statusLabels[status] || statusLabels.inactive}
      </Badge>
    )
  }

  return (
    <div className="admin-promotions">
      <div className="page-header">
        <h2>Quản lý Khuyến mãi</h2>
        <button 
          className="add-btn"
          onClick={() => {
            resetForm()
            setIsAddDialogOpen(true)
          }}
        >
          <Plus className="w-4 h-4" style={{ marginRight: '8px' }} />
          Thêm khuyến mãi mới
        </button>
      </div>

      {/* Filters Bar */}
      {promotions.length > 0 && (
        <div className="filters-bar">
          <div className="filter-item search">
            <input
              type="text"
              placeholder="🔍 Tìm kiếm theo tên hoặc mô tả..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          <div className="filter-item">
            <select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)}>
              <option value="all">Tất cả trạng thái</option>
              <option value="active">Đang hoạt động</option>
              <option value="inactive">Chưa kích hoạt</option>
              <option value="expired">Đã hết hạn</option>
            </select>
          </div>
        </div>
      )}

      {/* Data Table */}
      <div className="data-table-container">
        {paginatedPromotions.length > 0 ? (
          <div className="promotions-table">
            <div className="table-header">
              <div className="col-id">ID</div>
              <div className="col-name">Tên chương trình</div>
              <div className="col-discount">Giảm giá</div>
              <div className="col-products">Sản phẩm</div>
              <div className="col-dates">Thời gian</div>
              <div className="col-status">Trạng thái</div>
              <div className="col-actions">Thao tác</div>
            </div>

            {paginatedPromotions.map((promotion) => (
              <div key={promotion.id} className="table-row">
                <div className="col-id">#{promotion.id}</div>
                <div className="col-name">
                  <div>
                    <p className="promotion-name">{promotion.name}</p>
                    <p className="promotion-description">{promotion.description}</p>
                  </div>
                </div>
                <div className="col-discount">
                  <span className="discount-badge">{promotion.discountPercent}%</span>
                </div>
                <div className="col-products">
                  <p>{promotion.products.length} sản phẩm</p>
                </div>
                <div className="col-dates">
                  <div>
                    <p>{promotion.startDate}</p>
                    <p className="date-to">đến {promotion.endDate}</p>
                  </div>
                </div>
                <div className="col-status">
                  {getStatusBadge(promotion.status)}
                </div>
                <div className="col-actions">
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon" className="action-btn">
                        <MoreVertical className="w-4 h-4 text-black" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => openDetailDialog(promotion)}>
                        Chi tiết
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => openEditDialog(promotion)}>
                        Chỉnh sửa
                      </DropdownMenuItem>
                      <DropdownMenuItem 
                        onClick={() => handleDeletePromotion(promotion.id)}
                        className="text-red-600"
                      >
                        Xóa
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="no-results">
            <p>{promotions.length === 0 ? 'Chưa có chương trình khuyến mãi nào.' : 'Không tìm thấy chương trình khuyến mãi nào phù hợp với bộ lọc.'}</p>
          </div>
        )}
      </div>

      {/* Pagination Controls */}
      {filteredPromotions.length > 0 && (
        <div className="pagination-controls">
          <div className="pagination-info">
            Hiển thị {startIndex + 1}-{Math.min(endIndex, filteredPromotions.length)} / {filteredPromotions.length} chương trình khuyến mãi
          </div>
          
          <div className="pagination-buttons">
            <button 
              className="pg-btn"
              onClick={() => setCurrentPage(1)}
              disabled={currentPage === 1}
            >
              «
            </button>
            <button 
              className="pg-btn"
              onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
              disabled={currentPage === 1}
            >
              ‹
            </button>
            
            <span className="page-indicator">
              Trang {currentPage} / {totalPages || 1}
            </span>
            
            <button 
              className="pg-btn"
              onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
              disabled={currentPage >= totalPages}
            >
              ›
            </button>
            <button 
              className="pg-btn"
              onClick={() => setCurrentPage(totalPages)}
              disabled={currentPage >= totalPages}
            >
              »
            </button>
          </div>
        </div>
      )}

      {/* Add/Edit Dialog */}
      <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
        <DialogContent className="promotion-form-modal max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
          <DialogHeader className="flex-shrink-0 promotion-form-header">
            <DialogTitle className="promotion-form-title">
              {selectedPromotion ? 'Chỉnh sửa khuyến mãi' : 'Thêm khuyến mãi mới'}
            </DialogTitle>
            <DialogDescription className="promotion-form-description">
              {selectedPromotion 
                ? 'Cập nhật thông tin chương trình khuyến mãi' 
                : 'Tạo chương trình khuyến mãi mới cho sản phẩm'}
            </DialogDescription>
          </DialogHeader>
          
          <div className="promotion-form-content space-y-6 py-4 overflow-y-auto flex-1">
            {/* Thông tin cơ bản */}
            <div className="form-section">
              <h3 className="form-section-title">Thông tin cơ bản</h3>
              <div className="form-grid">
                <div className="form-item" style={{ gridColumn: '1 / -1' }}>
                  <Label htmlFor="name" className="form-label">Tên chương trình *</Label>
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="VD: Flash Sale Cuối Tuần"
                    className="form-input"
                  />
                </div>
                
                <div className="form-item" style={{ gridColumn: '1 / -1' }}>
                  <Label htmlFor="description" className="form-label">Mô tả</Label>
                  <Input
                    id="description"
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    placeholder="Mô tả ngắn về chương trình"
                    className="form-input"
                  />
                </div>
                
                <div className="form-item">
                  <Label htmlFor="discount" className="form-label">Phần trăm giảm giá *</Label>
                  <Input
                    id="discount"
                    type="number"
                    min="0"
                    max="100"
                    value={formData.discountPercent}
                    onChange={(e) => setFormData({ ...formData, discountPercent: Number(e.target.value) })}
                    placeholder="VD: 20"
                    className="form-input"
                  />
                </div>
                
                <div className="form-item">
                  <Label htmlFor="status" className="form-label">Trạng thái</Label>
                  <Select 
                    value={formData.status} 
                    onValueChange={(value) => setFormData({ ...formData, status: value })}
                  >
                    <SelectTrigger className="form-select">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="inactive">Chưa kích hoạt</SelectItem>
                      <SelectItem value="active">Đang hoạt động</SelectItem>
                      <SelectItem value="expired">Đã hết hạn</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>

            {/* Sản phẩm áp dụng */}
            <div className="form-section">
              <h3 className="form-section-title">Sản phẩm áp dụng</h3>
              <div className="form-item" style={{ gridColumn: '1 / -1' }}>
                <Label className="form-label">Chọn sản phẩm áp dụng *</Label>
                <div className="products-selection">
                  {availableProducts.map((product) => (
                    <div key={product} className="product-checkbox-item">
                      <input
                        type="checkbox"
                        id={`product-${product}`}
                        checked={formData.products.includes(product)}
                        onChange={() => toggleProductSelection(product)}
                        className="product-checkbox"
                      />
                      <label htmlFor={`product-${product}`} className="product-label">
                        {product}
                      </label>
                    </div>
                  ))}
                </div>
                {formData.products.length > 0 && (
                  <p className="form-description">
                    Đã chọn {formData.products.length} sản phẩm
                  </p>
                )}
              </div>
            </div>

            {/* Thời gian */}
            <div className="form-section">
              <h3 className="form-section-title">Thời gian</h3>
              <div className="form-grid">
                <div className="form-item">
                  <Label htmlFor="startDate" className="form-label">Ngày bắt đầu *</Label>
                  <Input
                    id="startDate"
                    type="date"
                    value={formData.startDate}
                    onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
                    className="form-input"
                  />
                </div>
                
                <div className="form-item">
                  <Label htmlFor="endDate" className="form-label">Ngày kết thúc *</Label>
                  <Input
                    id="endDate"
                    type="date"
                    value={formData.endDate}
                    onChange={(e) => setFormData({ ...formData, endDate: e.target.value })}
                    className="form-input"
                  />
                </div>
              </div>
            </div>

            {/* Banner */}
            <div className="form-section">
              <h3 className="form-section-title">Banner khuyến mãi</h3>
              <div className="form-item" style={{ gridColumn: '1 / -1' }}>
                <Label htmlFor="banner" className="form-label">Upload banner</Label>
                <div className="banner-upload-area">
                  {bannerPreview ? (
                    <div className="banner-preview-container">
                      <img 
                        src={bannerPreview || "/placeholder.svg"} 
                        alt="Banner preview" 
                        className="banner-preview"
                      />
                      <Button
                        variant="destructive"
                        size="icon"
                        className="banner-remove-btn"
                        onClick={() => {
                          setBannerPreview('')
                          setBannerFile(null)
                        }}
                      >
                        <X className="w-4 h-4" />
                      </Button>
                    </div>
                  ) : (
                    <label htmlFor="banner" className="banner-upload-label">
                      <div className="banner-upload-icon">📤</div>
                      <span className="banner-upload-text">Click để tải lên banner</span>
                      <span className="banner-upload-hint">PNG, JPG (tối đa 5MB)</span>
                      <input
                        id="banner"
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={handleBannerUpload}
                      />
                    </label>
                  )}
                </div>
              </div>
            </div>
          </div>
          
          <DialogFooter className="promotion-form-footer flex-shrink-0">
            <Button 
              variant="outline" 
              onClick={() => {
                setIsAddDialogOpen(false)
                resetForm()
              }}
              className="cancel-form-btn"
            >
              Hủy
            </Button>
            <Button 
              onClick={selectedPromotion ? handleEditPromotion : handleAddPromotion}
              className="submit-form-btn"
            >
              {selectedPromotion ? 'Cập nhật' : 'Thêm mới'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Detail Dialog */}
      <Dialog open={isDetailDialogOpen} onOpenChange={setIsDetailDialogOpen}>
        <DialogContent className="promotion-detail-modal max-w-5xl max-h-[90vh] overflow-hidden flex flex-col">
          <DialogHeader className="flex-shrink-0 promotion-modal-header">
            <DialogTitle className="promotion-modal-title">Chi tiết khuyến mãi</DialogTitle>
            <DialogDescription className="promotion-modal-description">
              Hiển thị thông tin chi tiết của chương trình khuyến mãi
            </DialogDescription>
          </DialogHeader>
          
          {selectedPromotion && (
            <div className="promotion-detail-content space-y-6 py-4 overflow-y-auto flex-1">
              {selectedPromotion.banner && (
                <div className="detail-section">
                  <div className="banner-display">
                    <img 
                      src={selectedPromotion.banner || "/placeholder.svg"} 
                      alt={selectedPromotion.name}
                      className="banner-image"
                    />
                  </div>
                </div>
              )}
              
              <div className="detail-section">
                <h3 className="section-title">Thông tin chương trình</h3>
                <div className="detail-grid">
                  <div className="detail-item">
                    <label className="detail-label">Tên chương trình</label>
                    <p className="detail-value">{selectedPromotion.name}</p>
                  </div>
                  
                  <div className="detail-item">
                    <label className="detail-label">Giảm giá</label>
                    <p className="detail-value discount-value">{selectedPromotion.discountPercent}%</p>
                  </div>
                  
                  <div className="detail-item">
                    <label className="detail-label">Ngày bắt đầu</label>
                    <p className="detail-value">{selectedPromotion.startDate}</p>
                  </div>
                  
                  <div className="detail-item">
                    <label className="detail-label">Ngày kết thúc</label>
                    <p className="detail-value">{selectedPromotion.endDate}</p>
                  </div>
                  
                  <div className="detail-item">
                    <label className="detail-label">Trạng thái</label>
                    <div>{getStatusBadge(selectedPromotion.status)}</div>
                  </div>
                  
                  <div className="detail-item full-width">
                    <label className="detail-label">Mô tả</label>
                    <p className="detail-value">{selectedPromotion.description}</p>
                  </div>
                </div>
              </div>

              <div className="detail-section">
                <h3 className="section-title">Sản phẩm áp dụng ({selectedPromotion.products.length})</h3>
                <div className="products-list">
                  {selectedPromotion.products.map((product, idx) => (
                    <div key={idx} className="product-item">
                      <span className="product-number">{idx + 1}</span>
                      <span className="product-name">{product}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
          
          <DialogFooter className="promotion-modal-footer flex-shrink-0">
            <Button onClick={() => setIsDetailDialogOpen(false)} className="close-modal-btn">
              Đóng
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

export default AdminPromotions

