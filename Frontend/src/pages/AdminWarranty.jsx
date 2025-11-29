import React, { useState, useEffect } from 'react'
import * as warrantyService from '../services/warrantyService'
import { useNotification } from '../context/NotificationContext'
import { Button } from '../components/ui/button'
import { Input } from '../components/ui/input'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '../components/ui/dialog'
import { Label } from '../components/ui/label'
import { Textarea } from '../components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select'
import { Clock } from 'lucide-react'
import {
  AdminPageHeader,
  AdminFiltersBar,
  AdminDataTable,
  AdminPagination,
  AdminActionDropdown,
  AdminLoadingOverlay,
  AdminConfirmModal
} from '../components/admin'
import { AdminIcons, AdminActionLabels } from '../utils/adminConstants'
import './AdminWarranty.css'

// Warranty Timeline Component
const WarrantyTimeline = ({ warrantyId }) => {
  const [history, setHistory] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const loadHistory = async () => {
      try {
        setLoading(true)
        const data = await warrantyService.getWarrantyDetailHistory(warrantyId)
        setHistory(Array.isArray(data) ? data : [])
      } catch (err) {
        console.error('Error loading timeline:', err)
        setHistory([])
      } finally {
        setLoading(false)
      }
    }

    if (warrantyId) {
      loadHistory()
    }
  }, [warrantyId])

  const formatDate = (dateString) => {
    if (!dateString) return ''
    try {
      const date = new Date(dateString)
      const day = String(date.getDate()).padStart(2, '0')
      const month = String(date.getMonth() + 1).padStart(2, '0')
      const year = date.getFullYear()
      const hours = String(date.getHours()).padStart(2, '0')
      const minutes = String(date.getMinutes()).padStart(2, '0')
      return `${day}/${month}/${year} ${hours}:${minutes}`
    } catch {
      return dateString
    }
  }

  if (loading) {
    return <p className="text-center py-4 text-gray-500">Đang tải lịch sử...</p>
  }

  if (history.length === 0) {
    return <p className="text-center py-4 text-gray-500">Chưa có lịch sử xử lý</p>
  }

  return (
    <div className="warranty-timeline">
      {history.map((entry, index) => (
        <div key={index} className="timeline-item">
          <div className="timeline-marker">
            <Clock className="w-4 h-4" />
          </div>
          <div className="timeline-content">
            <div className="timeline-header">
              <span className={`status-badge status-${entry.status}`}>
                {entry.statusDisplay || statusLabels[entry.status] || entry.status}
              </span>
              <span className="timeline-date">{formatDate(entry.date)}</span>
            </div>
            {entry.handledBy && (
              <div className="timeline-handler">Kỹ thuật viên: {entry.handledBy}</div>
            )}
            {entry.notes && (
              <div className="timeline-notes">
                <strong>Ghi chú:</strong> {entry.notes}
              </div>
            )}
            {entry.solution && (
              <div className="timeline-solution">
                <strong>Giải pháp:</strong> {entry.solution}
              </div>
            )}
            {entry.cost !== null && entry.cost !== undefined && (
              <div className="timeline-cost">
                <strong>Chi phí:</strong> {new Intl.NumberFormat('vi-VN').format(entry.cost)} VNĐ
              </div>
            )}
          </div>
        </div>
      ))}
    </div>
  )
}

// Workflow status labels
const statusLabels = {
  waiting_reception: 'Chờ tiếp nhận',
  inspecting: 'Đang kiểm tra',
  repairing: 'Đang sửa chữa',
  quality_check: 'Kiểm tra chất lượng',
  completed: 'Hoàn tất bảo hành',
  returned: 'Đã trả khách',
  // Legacy statuses
  pending: 'Chờ xử lý',
  processing: 'Đang xử lý',
  rejected: 'Từ chối'
}

// Helper function to get status badge class
const getStatusBadgeClass = (status) => {
  // Map status to status-badge class
  const statusClassMap = {
    waiting_reception: 'status-waiting_reception',
    inspecting: 'status-inspecting',
    repairing: 'status-repairing',
    quality_check: 'status-quality_check',
    completed: 'status-completed',
    returned: 'status-returned',
    rejected: 'status-rejected',
    // Legacy statuses
    pending: 'status-pending',
    processing: 'status-processing'
  };
  
  return statusClassMap[status] || 'status-pending';
}

  // Helper function to map API response to UI format (WarrantyClaimListDto)
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

  // Map status from API to UI format (workflow status)
  const mapStatus = (status) => {
    if (!status) return 'waiting_reception'
    // Map database status to workflow status
    if (status === 'pending') return 'waiting_reception'
    if (status === 'approved') return 'inspecting'
    if (status === 'processing') return 'repairing'
    if (status === 'completed') return 'completed'
    if (status === 'rejected') return 'rejected'
    return status
  }

  try {
    // Parse imageUrls if it's a JSON string
    let conditionImages = []
    if (apiData.imageUrls) {
      try {
        if (typeof apiData.imageUrls === 'string') {
          const parsed = JSON.parse(apiData.imageUrls)
          conditionImages = Array.isArray(parsed) ? parsed : [parsed]
        } else if (Array.isArray(apiData.imageUrls)) {
          conditionImages = apiData.imageUrls
        }
      } catch {
        conditionImages = [apiData.imageUrls]
      }
    }

    return {
      id: apiData.detailId || apiData.detail_id, // Use detailId for claims
      warrantyId: apiData.warrantyId || apiData.warranty_id,
      code: `BH${String(apiData.detailId || apiData.detail_id || 0).padStart(3, '0')}`,
      claimNumber: apiData.claimNumber || apiData.claim_number,
      customerName: apiData.customerName || apiData.username || '',
      phone: apiData.customerPhone || apiData.phone || '',
      product: apiData.productName || '',
      purchaseDate: formatDate(apiData.purchaseDate || apiData.startDate),
      warrantyDate: formatDate(apiData.requestDate || apiData.endDate), // requestDate is the claim date
      status: mapStatus(apiData.status),
      statusDisplay: apiData.statusDisplay || statusLabels[mapStatus(apiData.status)] || 'Chờ tiếp nhận',
      issue: apiData.description || '', // Description is the issue
      notes: apiData.notes || '',
      serial: apiData.serialNumber || '',
      conditionImages: conditionImages,
      images: conditionImages, // Keep for backward compatibility
      // Additional fields
      solution: apiData.solution,
      cost: apiData.cost,
      serviceDate: apiData.serviceDate,
      completedDate: apiData.completedDate,
      handledByName: apiData.handledByName,
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
  const [isStatusUpdateDialogOpen, setIsStatusUpdateDialogOpen] = useState(false)
  const [expandedRowId, setExpandedRowId] = useState(null)
  const [selectedWarranty, setSelectedWarranty] = useState(null)
  const [formData, setFormData] = useState({})
  const [statusUpdateData, setStatusUpdateData] = useState({
    status: '',
    notes: '',
    solution: '',
    cost: ''
  })
  const [warrantyHistory, setWarrantyHistory] = useState([])
  const [imageFiles, setImageFiles] = useState([]) // Array of File objects
  const [imagePreviews, setImagePreviews] = useState([]) // Array of preview URLs
  // Confirm modal state
  const [confirmModal, setConfirmModal] = useState({
    open: false,
    title: '',
    message: '',
    onConfirm: null,
    variant: 'default'
  })
  
  const [pagination, setPagination] = useState({
    currentPage: 1,
    limit: 10,
    totalCount: 0
  })

  // Load warranties from API
  useEffect(() => {
    loadWarranties()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filterStatus, pagination.currentPage, searchTerm])

  const loadWarranties = async () => {
    try {
      setLoading(true)
      const params = {
        page: pagination.currentPage,
        limit: pagination.limit,
        status: filterStatus !== 'all' ? filterStatus : undefined,
        search: searchTerm || undefined
      }
      
      const response = await warrantyService.getWarrantyClaims(params)
      
      console.log('[AdminWarranty] API Response:', response)
      
      // Handle paginated response: { totalCount, currentPage, limit, data: [] }
      if (response && typeof response === 'object') {
        // Check if response has nested data array (from GetAllWarrantyClaims)
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
      // Fetch full warranty claim details from API
      const warrantyDetail = await warrantyService.getWarrantyClaimById(warranty.id)
      const mappedWarranty = mapApiToUi(warrantyDetail)
      setSelectedWarranty(mappedWarranty)
      
      // Load history
      try {
        const history = await warrantyService.getWarrantyDetailHistory(warranty.id)
        setWarrantyHistory(Array.isArray(history) ? history : [])
      } catch (err) {
        console.error('Error loading history:', err)
        setWarrantyHistory([])
      }
      
      setIsViewDialogOpen(true)
    } catch (error) {
      console.error('Error loading warranty details:', error)
      error(error.message || 'Không thể tải chi tiết bảo hành')
      // Fallback to using warranty from list
      setSelectedWarranty(warranty)
      setIsViewDialogOpen(true)
    }
  }

  const handleUpdateStatus = async () => {
    if (!selectedWarranty || !statusUpdateData.status) {
      error('Vui lòng chọn trạng thái')
      return
    }

    try {
      setLoading(true)
      await warrantyService.updateWarrantyStatus(selectedWarranty.id, {
        Status: statusUpdateData.status,
        Notes: statusUpdateData.notes || null,
        Solution: statusUpdateData.solution || null,
        Cost: statusUpdateData.cost ? parseFloat(statusUpdateData.cost) : null
      })
      
      success('Cập nhật trạng thái thành công')
      setIsStatusUpdateDialogOpen(false)
      setStatusUpdateData({ status: '', notes: '', solution: '', cost: '' })
      
      // Reload warranties and refresh view
      await loadWarranties()
      if (isViewDialogOpen) {
        await handleView(selectedWarranty)
      }
    } catch (err) {
      console.error('Error updating status:', err)
      error(err.message || 'Không thể cập nhật trạng thái')
    } finally {
      setLoading(false)
    }
  }

  const handleDelete = (id) => {
    const warranty = warranties.find(w => w.id === id)
    setConfirmModal({
      open: true,
      title: 'Xác nhận xóa',
      message: `Bạn có chắc chắn muốn xóa yêu cầu bảo hành này?`,
      variant: 'danger',
      onConfirm: async () => {
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
    })
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

  const getWarrantyHistory = async (detailId) => {
    try {
      const history = await warrantyService.getWarrantyDetailHistory(detailId)
      return Array.isArray(history) ? history : []
    } catch (err) {
      console.error('Error loading warranty history:', err)
      return []
    }
  }

  // Table columns config
  const tableColumns = [
    { key: 'code', label: 'MÃ BH', className: 'col-code' },
    { key: 'customer', label: 'KHÁCH HÀNG', className: 'col-customer' },
    { key: 'product', label: 'SẢN PHẨM', className: 'col-product' },
    { key: 'purchaseDate', label: 'NGÀY MUA', className: 'col-purchase-date' },
    { key: 'warrantyDate', label: 'NGÀY YÊU CẦU', className: 'col-warranty-date' },
    { key: 'issue', label: 'VẤN ĐỀ', className: 'col-issue' },
    { key: 'status', label: 'TRẠNG THÁI', className: 'col-status' },
    { key: 'actions', label: 'THAO TÁC', className: 'col-actions' }
  ]

  // Render custom row với expanded content
  const renderWarrantyRow = (warranty) => (
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
        <AdminActionDropdown
          actions={[
            {
              label: AdminActionLabels.view,
              icon: AdminIcons.view,
              onClick: () => handleView(warranty)
            },
            {
              label: AdminActionLabels.edit,
              icon: AdminIcons.edit,
              onClick: () => handleEdit(warranty)
            },
            {
              label: AdminActionLabels.delete,
              icon: AdminIcons.delete,
              onClick: () => handleDelete(warranty.id),
              className: 'text-red-600'
            }
          ]}
        />
      </div>
    </div>
  )

  // Expanded content cho warranty timeline
  const renderExpandedContent = (warranty) => (
    <div>
      <h3 style={{ marginBottom: '16px', fontSize: '18px', fontWeight: '600', color: '#1f2937' }}>
        Lịch sử bảo hành - {warranty.customerName}
      </h3>
      <WarrantyTimeline warrantyId={warranty.id} />
    </div>
  )

  // Filter options
  const statusFilterOptions = [
    { value: 'all', label: 'Tất cả trạng thái' },
    { value: 'waiting_reception', label: 'Chờ tiếp nhận' },
    { value: 'inspecting', label: 'Đang kiểm tra' },
    { value: 'repairing', label: 'Đang sửa chữa' },
    { value: 'quality_check', label: 'Kiểm tra chất lượng' },
    { value: 'completed', label: 'Hoàn tất bảo hành' },
    { value: 'returned', label: 'Đã trả khách' },
    { value: 'rejected', label: 'Từ chối' }
  ]

  return (
    <div className="admin-warranty">
      <AdminLoadingOverlay 
        loading={loading} 
        hasData={warranties.length > 0}
        message="Đang tải danh sách bảo hành..."
      >
        <AdminPageHeader
          title="Quản lý Bảo hành"
          subtitle="Quản lý các yêu cầu bảo hành sản phẩm"
          onAdd={handleAdd}
          addButtonText="Thêm yêu cầu bảo hành"
        />

        <AdminFiltersBar
          searchValue={searchTerm}
          onSearchChange={setSearchTerm}
          searchPlaceholder="🔍 Tìm kiếm theo mã, tên khách hàng, số điện thoại, sản phẩm..."
          filters={[
            {
              key: 'status',
              value: filterStatus,
              onChange: setFilterStatus,
              options: statusFilterOptions
            }
          ]}
        />

        <AdminDataTable
          columns={tableColumns}
          data={paginatedWarranties}
          renderRow={renderWarrantyRow}
          loading={loading}
          totalItems={warranties.length}
          emptyMessage="Chưa có yêu cầu bảo hành nào."
          noResultsMessage="Không tìm thấy yêu cầu bảo hành nào phù hợp với bộ lọc."
          expandedContent={renderExpandedContent}
          expandedRowId={expandedRowId}
          tableClassName="warranty-table"
        />

        {filteredWarranties.length > 0 && (
          <AdminPagination
            currentPage={clientPagination.currentPage}
            totalPages={totalPages}
            pageSize={clientPagination.pageSize}
            totalItems={filteredWarranties.length}
            startIndex={startIndex}
            endIndex={endIndex}
            onPageChange={(page) => setClientPagination(prev => ({ ...prev, currentPage: page }))}
            onPageSizeChange={(size) => setClientPagination({ currentPage: 1, pageSize: size })}
            pageSizeOptions={[10, 20, 50, 100]}
            itemName="yêu cầu bảo hành"
          />
        )}
      </AdminLoadingOverlay>

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

      {/* Status Update Dialog */}
      <Dialog open={isStatusUpdateDialogOpen} onOpenChange={setIsStatusUpdateDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Cập nhật trạng thái bảo hành</DialogTitle>
            <DialogDescription>
              Cập nhật trạng thái và thông tin xử lý cho yêu cầu bảo hành
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="status">Trạng thái *</Label>
              <Select
                value={statusUpdateData.status}
                onValueChange={(value) => setStatusUpdateData({ ...statusUpdateData, status: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Chọn trạng thái..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="waiting_reception">Chờ tiếp nhận</SelectItem>
                  <SelectItem value="inspecting">Đang kiểm tra</SelectItem>
                  <SelectItem value="repairing">Đang sửa chữa</SelectItem>
                  <SelectItem value="quality_check">Kiểm tra chất lượng</SelectItem>
                  <SelectItem value="completed">Hoàn tất bảo hành</SelectItem>
                  <SelectItem value="returned">Đã trả khách</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="notes">Ghi chú</Label>
              <Textarea
                id="notes"
                placeholder="Ghi chú về tình trạng xử lý..."
                value={statusUpdateData.notes}
                onChange={(e) => setStatusUpdateData({ ...statusUpdateData, notes: e.target.value })}
                rows={3}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="solution">Giải pháp đã thực hiện</Label>
              <Textarea
                id="solution"
                placeholder="Mô tả giải pháp/công việc đã thực hiện..."
                value={statusUpdateData.solution}
                onChange={(e) => setStatusUpdateData({ ...statusUpdateData, solution: e.target.value })}
                rows={3}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="cost">Chi phí (VNĐ)</Label>
              <Input
                id="cost"
                type="number"
                placeholder="0"
                value={statusUpdateData.cost}
                onChange={(e) => setStatusUpdateData({ ...statusUpdateData, cost: e.target.value })}
                min="0"
                step="1000"
              />
              <p className="text-sm text-gray-500">Để trống hoặc 0 nếu trong bảo hành</p>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => {
              setIsStatusUpdateDialogOpen(false)
              setStatusUpdateData({ status: '', notes: '', solution: '', cost: '' })
            }}>
              Hủy
            </Button>
            <Button onClick={handleUpdateStatus} disabled={loading || !statusUpdateData.status}>
              {loading ? 'Đang cập nhật...' : 'Cập nhật'}
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
                      <span className={`status-badge ${selectedWarranty._apiData.isExpired ? 'status-expired' : 'status-active'}`}>
                        {selectedWarranty._apiData.isExpired ? 'Đã hết hạn' : 'Còn hiệu lực'}
                      </span>
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
                    <span className={`status-badge ${getStatusBadgeClass(selectedWarranty.status)}`}>
                      {selectedWarranty.statusDisplay || statusLabels[selectedWarranty.status] || 'Chờ xử lý'}
                    </span>
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

              {/* Timeline Lịch sử */}
              <div className="detail-section">
                <h3 className="section-title">Lịch sử xử lý</h3>
                <WarrantyTimeline warrantyId={selectedWarranty.id} />
              </div>
            </div>
          )}
          
          <DialogFooter className="warranty-modal-footer flex-shrink-0">
            <Button 
              onClick={() => {
                setStatusUpdateData({ 
                  status: selectedWarranty.status || 'waiting_reception', 
                  notes: '', 
                  solution: selectedWarranty.solution || '', 
                  cost: selectedWarranty.cost ? String(selectedWarranty.cost) : '' 
                })
                setIsStatusUpdateDialogOpen(true)
              }}
              className="mr-2"
            >
              Cập nhật trạng thái
            </Button>
            <Button onClick={() => setIsViewDialogOpen(false)} className="close-modal-btn">
              Đóng
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Confirm Modal */}
      <AdminConfirmModal
        open={confirmModal.open}
        onOpenChange={(open) => setConfirmModal({ ...confirmModal, open })}
        title={confirmModal.title}
        message={confirmModal.message}
        variant={confirmModal.variant}
        confirmText={confirmModal.variant === 'danger' ? 'Xóa' : 'Xác nhận'}
        onConfirm={confirmModal.onConfirm}
      />
    </div>
  )
}

