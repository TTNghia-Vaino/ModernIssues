import React, { useState, useEffect } from 'react'
import * as warrantyService from '../services/warrantyService'
import { useNotification } from '../context/NotificationContext'
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
import { Textarea } from '../components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select'
import { Plus, MoreVertical, Eye, Edit, Trash2 } from 'lucide-react'
import './AdminWarranty.css'

const statusLabels = {
  pending: 'Chờ xử lý',
  processing: 'Đang xử lý',
  completed: 'Hoàn thành',
  rejected: 'Từ chối'
}

const statusColors = {
  pending: 'bg-yellow-100 text-yellow-800',
  processing: 'bg-blue-100 text-blue-800',
  completed: 'bg-green-100 text-green-800',
  rejected: 'bg-red-100 text-red-800'
}

// Helper function to map API response to UI format
const mapApiToUi = (apiData) => {
  if (!apiData || typeof apiData !== 'object') {
    console.warn('[mapApiToUi] Invalid apiData:', apiData)
    return null
  }
  
  // Format date from ISO string to DD/MM/YYYY
  const formatDate = (dateString) => {
    if (!dateString) return ''
    try {
      const date = new Date(dateString)
      if (isNaN(date.getTime())) return dateString
      const day = String(date.getDate()).padStart(2, '0')
      const month = String(date.getMonth() + 1).padStart(2, '0')
      const year = date.getFullYear()
      return `${day}/${month}/${year}`
    } catch {
      return dateString
    }
  }

  // Map status from API to UI format
  const mapStatus = (status) => {
    if (!status || status === 'string') return 'pending'
    if (status === 'false' || status === false) return 'pending'
    if (status === 'active' || status === true) return 'processing'
    if (status === 'inactive') return 'rejected'
    if (status === 'completed') return 'completed'
    if (status === 'rejected') return 'rejected'
    return status
  }

  try {
    return {
      id: apiData.warrantyId,
      code: `BH${String(apiData.warrantyId || 0).padStart(3, '0')}`,
      customerName: apiData.username || '',
      phone: apiData.phone || '', // May not be in API response
      product: apiData.productName || '',
      purchaseDate: formatDate(apiData.startDate),
      warrantyDate: formatDate(apiData.endDate),
      status: mapStatus(apiData.status),
      statusDisplay: apiData.statusDisplay || apiData.status || 'Chờ xử lý',
      issue: apiData.issue || '', // May not be in API response
      notes: apiData.notes || '', // May not be in API response
      serial: apiData.serialNumber || '',
      // productImageUrl là ảnh tình trạng máy do khách hàng cung cấp (ví dụ: máy bị vỡ màn hình, đen màn)
      conditionImages: Array.isArray(apiData.productImageUrl) 
        ? apiData.productImageUrl 
        : (apiData.productImageUrl ? [apiData.productImageUrl] : []),
      images: Array.isArray(apiData.productImageUrl) 
        ? apiData.productImageUrl 
        : (apiData.productImageUrl ? [apiData.productImageUrl] : []), // Keep for backward compatibility
      // Keep original API data for reference
      _apiData: apiData
    }
  } catch (err) {
    console.error('[mapApiToUi] Error mapping data:', err, apiData)
    return null
  }
}

// Helper function to map UI format to API format
const mapUiToApi = (uiData) => {
  // Parse date from DD/MM/YYYY to ISO string
  const parseDate = (dateString) => {
    if (!dateString) return null
    try {
      const [day, month, year] = dateString.split('/')
      if (day && month && year) {
        return new Date(`${year}-${month}-${day}T00:00:00Z`).toISOString()
      }
      return dateString
    } catch {
      return dateString
    }
  }

  // Map status from UI to API format
  const mapStatus = (status) => {
    if (status === 'processing') return 'active'
    if (status === 'pending') return 'pending'
    if (status === 'completed') return 'completed'
    if (status === 'rejected') return 'rejected'
    return status
  }

  return {
    serialNumber: uiData.serial || '',
    status: mapStatus(uiData.status),
    // Add other fields that API might need
    ...(uiData._apiData && {
      productId: uiData._apiData.productId,
      userId: uiData._apiData.userId,
      orderId: uiData._apiData.orderId,
    })
  }
}

export default function WarrantyPage() {
  const { success, error } = useNotification()
  const [warranties, setWarranties] = useState([])
  const [loading, setLoading] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')
  const [filterStatus, setFilterStatus] = useState('all')
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [isViewDialogOpen, setIsViewDialogOpen] = useState(false)
  const [expandedRowId, setExpandedRowId] = useState(null)
  const [selectedWarranty, setSelectedWarranty] = useState(null)
  const [formData, setFormData] = useState({})
  const [imageFiles, setImageFiles] = useState([]) // Array of File objects
  const [imagePreviews, setImagePreviews] = useState([]) // Array of preview URLs
  const [pagination, setPagination] = useState({
    currentPage: 1,
    limit: 10,
    totalCount: 0
  })

  // Load warranties from API
  useEffect(() => {
    loadWarranties()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filterStatus, pagination.currentPage])

  const loadWarranties = async () => {
    try {
      setLoading(true)
      const params = {
        page: pagination.currentPage,
        limit: pagination.limit,
        status: filterStatus !== 'all' ? filterStatus : undefined
      }
      
      const response = await warrantyService.listWarranties(params)
      
      console.log('[AdminWarranty] API Response:', response)
      
      // Handle paginated response: { totalCount, currentPage, limit, data: [] }
      if (response && typeof response === 'object') {
        // Check if response has nested data array (from GetAllWarranties)
        if (response.data && Array.isArray(response.data)) {
          const mappedWarranties = response.data.map(mapApiToUi).filter(Boolean)
          setWarranties(mappedWarranties)
          setPagination(prev => ({
            ...prev,
            totalCount: response.totalCount || 0,
            currentPage: response.currentPage || prev.currentPage,
            limit: response.limit || prev.limit
          }))
        } 
        // If response is directly an array
        else if (Array.isArray(response)) {
          const mappedWarranties = response.map(mapApiToUi).filter(Boolean)
          setWarranties(mappedWarranties)
        }
        // If response is empty object or unexpected format
        else {
          console.warn('[AdminWarranty] Unexpected response format:', response)
          setWarranties([])
        }
      } else {
        console.warn('[AdminWarranty] Invalid response:', response)
        setWarranties([])
      }
    } catch (err) {
      console.error('[AdminWarranty] Error loading warranties:', err)
      error(err.message || 'Không thể tải danh sách bảo hành')
      setWarranties([])
    } finally {
      setLoading(false)
    }
  }

  const filteredWarranties = warranties.filter(warranty => {
    if (!searchTerm) {
      const matchesStatus = filterStatus === 'all' || warranty.status === filterStatus
      return matchesStatus
    }
    
    const searchLower = searchTerm.toLowerCase()
    const matchesSearch = 
      (warranty.code || '').toLowerCase().includes(searchLower) ||
      (warranty.customerName || '').toLowerCase().includes(searchLower) ||
      (warranty.phone || '').includes(searchTerm) ||
      (warranty.product || '').toLowerCase().includes(searchLower) ||
      (warranty.serial || '').toLowerCase().includes(searchLower)
    
    const matchesStatus = filterStatus === 'all' || warranty.status === filterStatus
    
    return matchesSearch && matchesStatus
  })

  // Client-side pagination for filtered results
  const [clientPagination, setClientPagination] = useState({
    currentPage: 1,
    pageSize: 10
  })

  const totalPages = Math.ceil(filteredWarranties.length / clientPagination.pageSize)
  const startIndex = (clientPagination.currentPage - 1) * clientPagination.pageSize
  const endIndex = startIndex + clientPagination.pageSize
  const paginatedWarranties = filteredWarranties.slice(startIndex, endIndex)

  // Reset to page 1 when filters change
  useEffect(() => {
    setClientPagination(prev => ({ ...prev, currentPage: 1 }))
  }, [searchTerm, filterStatus, filteredWarranties.length])

  const handleAdd = () => {
    setSelectedWarranty(null)
    setFormData({
      status: 'pending'
    })
    setImageFiles([])
    setImagePreviews([])
    setIsDialogOpen(true)
  }

  const handleEdit = (warranty) => {
    setSelectedWarranty(warranty)
    setFormData(warranty)
    // Set preview images from existing warranty
    const existingImages = warranty.conditionImages || warranty.images || []
    setImagePreviews(existingImages)
    setImageFiles([]) // Clear new files, keep existing images in preview
    setIsDialogOpen(true)
  }

  const handleImageChange = (e) => {
    const files = Array.from(e.target.files || [])
    
    if (files.length === 0) return
    
    // Validate each file
    const validFiles = []
    const invalidFiles = []
    
    files.forEach(file => {
      // Validate file type
      if (!file.type.startsWith('image/')) {
        invalidFiles.push(`${file.name}: Không phải file ảnh`)
        return
      }
      
      // Validate file size (max 5MB per file)
      if (file.size > 5 * 1024 * 1024) {
        invalidFiles.push(`${file.name}: Kích thước vượt quá 5MB`)
        return
      }
      
      validFiles.push(file)
    })
    
    // Show error for invalid files
    if (invalidFiles.length > 0) {
      error(invalidFiles.join(', '))
    }
    
    if (validFiles.length > 0) {
      // Add new files to existing ones
      setImageFiles(prev => [...prev, ...validFiles])
      
      // Create previews for new files - append to existing previews
      validFiles.forEach((file) => {
        const reader = new FileReader()
        reader.onloadend = () => {
          setImagePreviews(prev => [...prev, reader.result])
        }
        reader.readAsDataURL(file)
      })
    }
    
    // Reset file input to allow selecting same file again
    e.target.value = ''
  }

  const handleRemoveImage = (index) => {
    const existingPreviewsCount = selectedWarranty ? (selectedWarranty.conditionImages || selectedWarranty.images || []).length : 0
    
    if (index < existingPreviewsCount) {
      // Remove existing image from warranty (remove from preview only, backend will handle)
      setImagePreviews(prev => prev.filter((_, i) => i !== index))
      // Note: If you need to track deleted existing images, you might want to add a state for that
    } else {
      // Remove new uploaded image (remove from both files and previews)
      const fileIndex = index - existingPreviewsCount
      setImageFiles(prev => prev.filter((_, i) => i !== fileIndex))
      setImagePreviews(prev => prev.filter((_, i) => i !== index))
    }
  }

  const handleView = async (warranty) => {
    try {
      // Fetch full warranty details from API
      const warrantyDetail = await warrantyService.getWarrantyById(warranty.id)
      const mappedWarranty = mapApiToUi(warrantyDetail)
      setSelectedWarranty(mappedWarranty)
      setIsViewDialogOpen(true)
    } catch (error) {
      console.error('Error loading warranty details:', error)
      error(error.message || 'Không thể tải chi tiết bảo hành')
      // Fallback to using warranty from list
      setSelectedWarranty(warranty)
      setIsViewDialogOpen(true)
    }
  }

  const handleDelete = async (id) => {
    if (!confirm('Bạn có chắc chắn muốn xóa yêu cầu bảo hành này?')) {
      return
    }

    try {
      setLoading(true)
      await warrantyService.deleteWarranty(id)
      success('Xóa bảo hành thành công')
      await loadWarranties()
    } catch (error) {
      console.error('Error deleting warranty:', error)
      error(error.message || 'Không thể xóa bảo hành')
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = async () => {
    try {
      setLoading(true)
      
      if (selectedWarranty) {
        // Update existing warranty
        const apiData = mapUiToApi({ ...selectedWarranty, ...formData })
        await warrantyService.updateWarranty(selectedWarranty.id, apiData, imageFiles)
        success('Cập nhật bảo hành thành công')
      } else {
        // Create new warranty - Note: API might need different fields for creation
        const apiData = mapUiToApi(formData)
        await warrantyService.createWarranty(apiData, imageFiles)
        success('Thêm bảo hành thành công')
      }
      
      // Reset form and close dialog
      setFormData({})
      setImageFiles([])
      setImagePreviews([])
      setIsDialogOpen(false)
      await loadWarranties()
    } catch (err) {
      console.error('Error saving warranty:', err)
      error(err.message || 'Không thể lưu bảo hành')
    } finally {
      setLoading(false)
    }
  }

  const toggleRowExpansion = (warrantyId) => {
    setExpandedRowId(expandedRowId === warrantyId ? null : warrantyId)
  }

  const getWarrantyHistory = (warrantyId) => {
    // TODO: Implement warranty history API if available
    // For now, return empty array
    return []
  }

  return (
    <div className="admin-warranty">
      {loading && warranties.length === 0 && (
        <div className="loading-overlay">
          <div className="loading-spinner">
            <div className="spinner"></div>
            <p>Đang tải danh sách bảo hành...</p>
          </div>
        </div>
      )}
      
      <div className="page-header">
        <div className="page-titles">
          <h2>Quản lý Bảo hành</h2>
          <p className="page-sub">Quản lý các yêu cầu bảo hành sản phẩm</p>
        </div>
        <button onClick={handleAdd} className="add-btn">
          <Plus className="w-4 h-4" />
          Thêm yêu cầu bảo hành
        </button>
      </div>

      {/* Thanh bộ lọc dạng bar */}
      <div className="filters-bar">
        <div className="filter-item search">
          <input
            type="text"
            placeholder="🔍 Tìm kiếm theo mã, tên khách hàng, số điện thoại, sản phẩm..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <div className="filter-item">
          <select 
            value={filterStatus} 
            onChange={(e) => setFilterStatus(e.target.value)}
          >
            <option value="all">Tất cả trạng thái</option>
            <option value="pending">Chờ xử lý</option>
            <option value="processing">Đang xử lý</option>
            <option value="completed">Hoàn thành</option>
            <option value="rejected">Từ chối</option>
          </select>
        </div>
      </div>

      <div className="data-table-container">
        {loading && warranties.length > 0 ? (
          <div className="loading-overlay-inline">
            <div className="spinner"></div>
            <p>Đang cập nhật...</p>
          </div>
        ) : paginatedWarranties.length > 0 ? (
          <div className="data-table">
            <div className="warranty-table">
              <div className="table-header">
                <div className="col-code">Mã BH</div>
                <div className="col-customer">Khách hàng</div>
                <div className="col-product">Sản phẩm</div>
                <div className="col-purchase-date">Ngày mua</div>
                <div className="col-warranty-date">Ngày yêu cầu</div>
                <div className="col-issue">Vấn đề</div>
                <div className="col-status">Trạng thái</div>
                <div className="col-actions">Thao tác</div>
              </div>
              {paginatedWarranties.map((warranty) => (
                <React.Fragment key={warranty.id}>
                  <div 
                    className="table-row"
                    onClick={() => toggleRowExpansion(warranty.id)}
                    style={{ cursor: 'pointer' }}
                  >
                    <div className="col-code">
                      <span className="code-badge">{warranty.code}</span>
                    </div>
                    <div className="col-customer">
                      <div className="customer-name">{warranty.customerName || '-'}</div>
                      {warranty.phone && <div className="customer-phone">{warranty.phone}</div>}
                    </div>
                    <div className="col-product">{warranty.product || '-'}</div>
                    <div className="col-purchase-date">{warranty.purchaseDate || '-'}</div>
                    <div className="col-warranty-date">{warranty.warrantyDate || '-'}</div>
                    <div className="col-issue">{warranty.issue || '-'}</div>
                    <div className="col-status">
                      <span className={`status-badge status-${warranty.status || 'pending'}`}>
                        {warranty.statusDisplay || statusLabels[warranty.status] || 'Chờ xử lý'}
                      </span>
                    </div>
                    <div className="col-actions" onClick={(e) => e.stopPropagation()}>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button size="sm" variant="ghost" className="action-btn">
                            <MoreVertical className="w-4 h-4 text-black" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => handleView(warranty)}>
                            <Eye className="w-4 h-4 mr-2" />
                            Chi tiết
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => handleEdit(warranty)}>
                            <Edit className="w-4 h-4 mr-2" />
                            Chỉnh sửa
                          </DropdownMenuItem>
                          <DropdownMenuItem 
                            onClick={() => handleDelete(warranty.id)}
                            className="text-red-600"
                          >
                            <Trash2 className="w-4 h-4 mr-2" />
                            Xóa
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </div>
                  {expandedRowId === warranty.id && (
                    <div className="expanded-row">
                      <div className="expanded-content">
                        <h3 style={{ marginBottom: '16px', fontSize: '18px', fontWeight: '600', color: '#1f2937' }}>
                          Lịch sử bảo hành - {warranty.customerName}
                        </h3>
                        {getWarrantyHistory(warranty.id).length === 0 ? (
                          <p style={{ textAlign: 'center', padding: '20px', color: '#6b7280' }}>
                            Chưa có lịch sử bảo hành
                          </p>
                        ) : (
                          <div className="history-table">
                            <div className="history-header">
                              <div>Ngày</div>
                              <div>Trạng thái</div>
                              <div>Mô tả</div>
                              <div>Kỹ thuật viên</div>
                            </div>
                            {getWarrantyHistory(warranty.id).map((history, idx) => (
                              <div key={idx} className="history-row">
                                <div>{history.date}</div>
                                <div>
                                  <span className={`status-badge status-${history.status}`}>
                                    {statusLabels[history.status]}
                                  </span>
                                </div>
                                <div>{history.description}</div>
                                <div>{history.technician}</div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </React.Fragment>
              ))}
            </div>
          </div>
        ) : (
          <div className="no-results">
            <p>{warranties.length === 0 ? 'Chưa có yêu cầu bảo hành nào.' : 'Không tìm thấy yêu cầu bảo hành nào phù hợp với bộ lọc.'}</p>
          </div>
        )}
      </div>

      {/* Pagination Controls */}
      {filteredWarranties.length > 0 && (
        <div className="pagination-controls">
          <div className="pagination-info">
            Hiển thị {startIndex + 1}-{Math.min(endIndex, filteredWarranties.length)} / {filteredWarranties.length} yêu cầu bảo hành
          </div>
          
          <div className="pagination-buttons">
            <button 
              className="pg-btn"
              onClick={() => setClientPagination(prev => ({ ...prev, currentPage: 1 }))}
              disabled={clientPagination.currentPage === 1}
            >
              «
            </button>
            <button 
              className="pg-btn"
              onClick={() => setClientPagination(prev => ({ ...prev, currentPage: prev.currentPage - 1 }))}
              disabled={clientPagination.currentPage === 1}
            >
              ‹
            </button>
            
            <span className="page-indicator">
              Trang {clientPagination.currentPage} / {totalPages || 1}
            </span>
            
            <button 
              className="pg-btn"
              onClick={() => setClientPagination(prev => ({ ...prev, currentPage: prev.currentPage + 1 }))}
              disabled={clientPagination.currentPage >= totalPages}
            >
              ›
            </button>
            <button 
              className="pg-btn"
              onClick={() => setClientPagination(prev => ({ ...prev, currentPage: totalPages }))}
              disabled={clientPagination.currentPage >= totalPages}
            >
              »
            </button>
          </div>
          
          <div className="page-size-selector">
            <label>Hiển thị: </label>
            <select value={clientPagination.pageSize} onChange={(e) => {
              setClientPagination({ currentPage: 1, pageSize: Number(e.target.value) })
            }}>
              <option value={10}>10</option>
              <option value={20}>20</option>
              <option value={50}>50</option>
              <option value={100}>100</option>
            </select>
          </div>
        </div>
      )}

      {/* Add/Edit Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="warranty-form-modal max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
          <DialogHeader className="flex-shrink-0 warranty-form-header">
            <DialogTitle className="warranty-form-title">
              {selectedWarranty ? 'Chỉnh sửa yêu cầu bảo hành' : 'Thêm yêu cầu bảo hành mới'}
            </DialogTitle>
            <DialogDescription className="warranty-form-description">
              {selectedWarranty ? 'Cập nhật thông tin yêu cầu bảo hành' : 'Điền thông tin yêu cầu bảo hành mới'}
            </DialogDescription>
          </DialogHeader>
          
          <div className="warranty-form-content space-y-6 py-4 overflow-y-auto flex-1">
            {/* Thông tin khách hàng */}
            <div className="form-section">
              <h3 className="form-section-title">Thông tin khách hàng</h3>
              <div className="form-grid">
                <div className="form-item">
                  <Label htmlFor="customerName" className="form-label">Tên khách hàng *</Label>
                  <Input
                    id="customerName"
                    value={formData.customerName || ''}
                    onChange={(e) => setFormData({ ...formData, customerName: e.target.value })}
                    placeholder="Nhập tên khách hàng"
                    className="form-input"
                  />
                </div>
                <div className="form-item">
                  <Label htmlFor="phone" className="form-label">Số điện thoại *</Label>
                  <Input
                    id="phone"
                    value={formData.phone || ''}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    placeholder="Nhập số điện thoại"
                    className="form-input"
                  />
                </div>
              </div>
            </div>

            {/* Thông tin sản phẩm */}
            <div className="form-section">
              <h3 className="form-section-title">Thông tin sản phẩm</h3>
              <div className="form-grid">
                <div className="form-item">
                  <Label htmlFor="product" className="form-label">Sản phẩm *</Label>
                  <Input
                    id="product"
                    value={formData.product || ''}
                    onChange={(e) => setFormData({ ...formData, product: e.target.value })}
                    placeholder="Nhập tên sản phẩm"
                    className="form-input"
                  />
                </div>
                <div className="form-item">
                  <Label htmlFor="serial" className="form-label">Số serial</Label>
                  <Input
                    id="serial"
                    value={formData.serial || ''}
                    onChange={(e) => setFormData({ ...formData, serial: e.target.value })}
                    placeholder="Nhập số serial sản phẩm"
                    className="form-input"
                  />
                </div>
              </div>
            </div>

            {/* Thông tin ngày tháng */}
            <div className="form-section">
              <h3 className="form-section-title">Thông tin ngày tháng</h3>
              <div className="form-grid">
                <div className="form-item">
                  <Label htmlFor="purchaseDate" className="form-label">Ngày mua *</Label>
                  <Input
                    id="purchaseDate"
                    value={formData.purchaseDate || ''}
                    onChange={(e) => setFormData({ ...formData, purchaseDate: e.target.value })}
                    placeholder="DD/MM/YYYY"
                    className="form-input"
                  />
                </div>
                <div className="form-item">
                  <Label htmlFor="warrantyDate" className="form-label">Ngày yêu cầu *</Label>
                  <Input
                    id="warrantyDate"
                    value={formData.warrantyDate || ''}
                    onChange={(e) => setFormData({ ...formData, warrantyDate: e.target.value })}
                    placeholder="DD/MM/YYYY"
                    className="form-input"
                  />
                </div>
              </div>
            </div>

            {/* Vấn đề và trạng thái */}
            <div className="form-section">
              <h3 className="form-section-title">Vấn đề và trạng thái</h3>
              <div className="form-grid">
                <div className="form-item full-width">
                  <Label htmlFor="issue" className="form-label">Vấn đề *</Label>
                  <Textarea
                    id="issue"
                    value={formData.issue || ''}
                    onChange={(e) => setFormData({ ...formData, issue: e.target.value })}
                    placeholder="Mô tả vấn đề cần bảo hành"
                    rows={3}
                    className="form-textarea"
                  />
                </div>
                <div className="form-item">
                  <Label htmlFor="status" className="form-label">Trạng thái *</Label>
                  <Select
                    value={formData.status || 'pending'}
                    onValueChange={(value) => setFormData({ ...formData, status: value })}
                  >
                    <SelectTrigger className="form-select">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="pending">Chờ xử lý</SelectItem>
                      <SelectItem value="processing">Đang xử lý</SelectItem>
                      <SelectItem value="completed">Hoàn thành</SelectItem>
                      <SelectItem value="rejected">Từ chối</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>

            {/* Ghi chú */}
            <div className="form-section">
              <h3 className="form-section-title">Ghi chú</h3>
              <div className="form-item">
                <Label htmlFor="notes" className="form-label">Ghi chú</Label>
                <Textarea
                  id="notes"
                  value={formData.notes || ''}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  placeholder="Ghi chú thêm"
                  rows={2}
                  className="form-textarea"
                />
              </div>
            </div>

            {/* Ảnh tình trạng máy */}
            <div className="form-section">
              <h3 className="form-section-title">Ảnh tình trạng máy</h3>
              <div className="form-item">
                <Label htmlFor="images" className="form-label">Upload ảnh</Label>
                <p className="form-description">
                  Upload ảnh mô tả tình trạng máy (ví dụ: vỡ màn hình, đen màn, v.v.). Có thể chọn nhiều ảnh.
                </p>
                <Input
                  id="images"
                  type="file"
                  accept="image/*"
                  multiple
                  onChange={handleImageChange}
                  className="form-file-input"
                />
                
                {/* Image Previews */}
                {imagePreviews.length > 0 && (
                  <div className="form-images-preview">
                    {imagePreviews.map((preview, index) => (
                      <div key={index} className="form-image-item">
                        <img
                          src={preview}
                          alt={`Preview ${index + 1}`}
                          className="form-image-preview"
                        />
                        <button
                          type="button"
                          onClick={() => handleRemoveImage(index)}
                          className="form-image-remove"
                          title="Xóa ảnh"
                        >
                          ×
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
          
          <DialogFooter className="warranty-form-footer flex-shrink-0">
            <Button 
              variant="outline" 
              onClick={() => {
                setIsDialogOpen(false)
                setFormData({})
                setImageFiles([])
                setImagePreviews([])
              }}
              className="cancel-form-btn"
            >
              Hủy
            </Button>
            <Button onClick={handleSubmit} className="submit-form-btn">
              {selectedWarranty ? 'Cập nhật' : 'Thêm mới'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* View Dialog */}
      <Dialog open={isViewDialogOpen} onOpenChange={setIsViewDialogOpen}>
        <DialogContent className="warranty-detail-modal max-w-5xl max-h-[90vh] overflow-hidden flex flex-col">
          <DialogHeader className="flex-shrink-0 warranty-modal-header">
            <DialogTitle className="warranty-modal-title">Chi tiết yêu cầu bảo hành</DialogTitle>
            <DialogDescription className="warranty-modal-description">
              Hiển thị thông tin chi tiết của yêu cầu bảo hành
            </DialogDescription>
            <DialogDescription className="warranty-modal-code">
              Mã bảo hành: <span className="code-highlight">{selectedWarranty?.code}</span>
            </DialogDescription>
          </DialogHeader>
          
          {selectedWarranty && (
            <div className="warranty-detail-content space-y-6 py-4 overflow-y-auto flex-1">
              {/* Thông tin khách hàng */}
              <div className="detail-section">
                <h3 className="section-title">Thông tin khách hàng</h3>
                <div className="detail-grid">
                  <div className="detail-item">
                    <label className="detail-label">Khách hàng</label>
                    <p className="detail-value">{selectedWarranty.customerName || '-'}</p>
                  </div>
                  {selectedWarranty.phone && (
                    <div className="detail-item">
                      <label className="detail-label">Số điện thoại</label>
                      <p className="detail-value">{selectedWarranty.phone}</p>
                    </div>
                  )}
                </div>
              </div>

              {/* Thông tin sản phẩm */}
              <div className="detail-section">
                <h3 className="section-title">Thông tin sản phẩm</h3>
                <div className="detail-grid">
                  <div className="detail-item">
                    <label className="detail-label">Sản phẩm</label>
                    <p className="detail-value">{selectedWarranty.product || '-'}</p>
                  </div>
                  {selectedWarranty.serial && (
                    <div className="detail-item">
                      <label className="detail-label">Số serial</label>
                      <p className="detail-value serial-number">{selectedWarranty.serial}</p>
                    </div>
                  )}
                </div>
              </div>

              {/* Thông tin ngày tháng */}
              <div className="detail-section">
                <h3 className="section-title">Thông tin ngày tháng</h3>
                <div className="detail-grid">
                  <div className="detail-item">
                    <label className="detail-label">Ngày mua</label>
                    <p className="detail-value">{selectedWarranty.purchaseDate || '-'}</p>
                  </div>
                  <div className="detail-item">
                    <label className="detail-label">Ngày yêu cầu bảo hành</label>
                    <p className="detail-value">{selectedWarranty.warrantyDate || '-'}</p>
                  </div>
                  {selectedWarranty._apiData?.daysRemaining !== undefined && (
                    <div className="detail-item">
                      <label className="detail-label">Số ngày còn lại</label>
                      <p className="detail-value days-remaining">{selectedWarranty._apiData.daysRemaining} ngày</p>
                    </div>
                  )}
                  {selectedWarranty._apiData?.isExpired !== undefined && (
                    <div className="detail-item">
                      <label className="detail-label">Trạng thái hết hạn</label>
                      <Badge className={selectedWarranty._apiData.isExpired ? statusColors.rejected : statusColors.completed}>
                        {selectedWarranty._apiData.isExpired ? 'Đã hết hạn' : 'Còn hiệu lực'}
                      </Badge>
                    </div>
                  )}
                </div>
              </div>

              {/* Vấn đề và trạng thái */}
              <div className="detail-section">
                <h3 className="section-title">Vấn đề và trạng thái</h3>
                <div className="detail-grid">
                  {selectedWarranty.issue && (
                    <div className="detail-item full-width">
                      <label className="detail-label">Vấn đề</label>
                      <p className="detail-value issue-text">{selectedWarranty.issue}</p>
                    </div>
                  )}
                  <div className="detail-item">
                    <label className="detail-label">Trạng thái</label>
                    <Badge className={statusColors[selectedWarranty.status] || statusColors.pending}>
                      {selectedWarranty.statusDisplay || statusLabels[selectedWarranty.status] || 'Chờ xử lý'}
                    </Badge>
                  </div>
                </div>
              </div>

              {/* Ghi chú */}
              {selectedWarranty.notes && (
                <div className="detail-section">
                  <h3 className="section-title">Ghi chú</h3>
                  <div className="notes-box">
                    <p className="notes-text">{selectedWarranty.notes}</p>
                  </div>
                </div>
              )}

              {/* Ảnh tình trạng máy */}
              {(selectedWarranty.conditionImages || selectedWarranty.images) && (selectedWarranty.conditionImages || selectedWarranty.images).length > 0 && (
                <div className="detail-section">
                  <h3 className="section-title">Ảnh tình trạng máy</h3>
                  <p className="image-description">Ảnh do khách hàng cung cấp mô tả tình trạng máy (ví dụ: vỡ màn hình, đen màn, v.v.)</p>
                  <div className="images-grid">
                    {(selectedWarranty.conditionImages || selectedWarranty.images || []).map((image, index) => (
                      <div key={index} className="image-item">
                        <img 
                          src={image || "/placeholder.svg"} 
                          alt={`Ảnh tình trạng máy ${index + 1}`}
                          className="condition-image"
                          onClick={() => window.open(image, '_blank')}
                          title="Click để xem ảnh gốc"
                        />
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
          
          <DialogFooter className="warranty-modal-footer flex-shrink-0">
            <Button onClick={() => setIsViewDialogOpen(false)} className="close-modal-btn">
              Đóng
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

