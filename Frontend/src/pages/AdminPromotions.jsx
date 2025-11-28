import React, { useState, useEffect } from 'react'
import * as promotionService from '../services/promotionService'
import * as productService from '../services/productService'
import { getCategories } from '../services/categoryService'
import { useNotification } from '../context/NotificationContext'
import { useAuth } from '../context/AuthContext'
import { normalizeImageUrl } from '../utils/productUtils'
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
import ImageCrop from '../components/ImageCrop'
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


const AdminPromotions = () => {
  const { success, error } = useNotification()
  const { isInTokenGracePeriod } = useAuth()
  const [promotions, setPromotions] = useState([])
  const [availableProducts, setAvailableProducts] = useState([])
  const [categories, setCategories] = useState([])
  const [loading, setLoading] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false)
  const [isDetailDialogOpen, setIsDetailDialogOpen] = useState(false)
  const [selectedPromotion, setSelectedPromotion] = useState(null)
  const [filterStatus, setFilterStatus] = useState('all')
  
  // Filter states for product selection in modal
  const [productCategoryFilter, setProductCategoryFilter] = useState('all')
  const [productSearchQuery, setProductSearchQuery] = useState('')
  
  // Pagination state
  const [currentPage, setCurrentPage] = useState(1)
  const [pageSize, setPageSize] = useState(10)
  const [totalCount, setTotalCount] = useState(0)

  // Form states
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    discountType: 'percentage', // 'percentage' or 'fixed'
    discountPercent: 0,
    discountValue: 0, // For fixed amount
    products: [],
    startDate: '',
    endDate: '',
    status: 'inactive',
    banner: '',
    local: 'hero' // 'hero', 'left', 'right'
  })
  const [bannerFile, setBannerFile] = useState(null)
  const [bannerPreview, setBannerPreview] = useState('')
  const [showCropModal, setShowCropModal] = useState(false)
  const [cropImageSrc, setCropImageSrc] = useState('')
  
  // Kích thước banner theo vị trí (đúng với kích thước hiển thị trong frontend)
  const bannerSizes = {
    hero: { width: 1200, height: 600 }, // Banner lớn ở giữa (full width container)
    left: { width: 180, height: 500 },  // Banner bên trái
    right: { width: 180, height: 500 }   // Banner bên phải
  }

  // Load promotions and products from API on mount
  useEffect(() => {
    let cancelled = false
    
    const attemptLoad = async () => {
      // If in grace period, wait for it to end
      if (isInTokenGracePeriod) {
        console.log('[AdminPromotions] Waiting for token grace period to end before loading promotions')
        await new Promise(resolve => setTimeout(resolve, 6000))
        if (cancelled) return
      }
      
      if (!cancelled) {
        loadCategories()
        loadProducts()
        loadPromotions()
      }
    }
    
    attemptLoad()
    
    return () => {
      cancelled = true
    }
  }, []) // Only run on mount

  // Load promotions when page, filter, or search changes
  // Add debounce for searchQuery to avoid too many API calls
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      loadPromotions()
    }, searchQuery ? 500 : 0) // 500ms debounce when searching, immediate when clearing
    
    return () => clearTimeout(timeoutId)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentPage, pageSize, filterStatus, searchQuery])

  // Remove any rogue badge with "50%" text near the title
  useEffect(() => {
    const removeBadge = () => {
      const pageHeader = document.querySelector('.page-header')
      if (pageHeader) {
        // Find all elements in page-header that are not h2 and not button containers
        const allElements = pageHeader.querySelectorAll('*:not(h2):not(button):not(div:has(button))')
        allElements.forEach(el => {
          // Check if element contains "50%" text
          if (el.textContent && el.textContent.trim() === '50%') {
            el.style.display = 'none'
            el.remove() // Remove completely
          }
        })
      }
    }
    
    // Run immediately and after a short delay
    removeBadge()
    const timer = setTimeout(removeBadge, 100)
    
    return () => clearTimeout(timer)
  }, []) // Run once on mount

  const loadCategories = async () => {
    try {
      const apiCategories = await getCategories()
      // Flatten the tree structure for dropdown
      const flattenCategories = (cats, result = []) => {
        if (!Array.isArray(cats)) return result
        cats.forEach(cat => {
          const categoryId = cat.categoryId || cat.id
          const categoryName = cat.categoryName || cat.name || 'Chưa có tên'
          if (categoryId) {
            result.push({ id: categoryId, name: categoryName })
          }
          if (cat.children && Array.isArray(cat.children)) {
            flattenCategories(cat.children, result)
          }
        })
        return result
      }
      const flatCategories = flattenCategories(Array.isArray(apiCategories) ? apiCategories : [])
      setCategories(flatCategories)
    } catch (err) {
      console.error('[AdminPromotions] Error loading categories:', err)
      setCategories([])
    }
  }

  const loadProducts = async () => {
    try {
      const products = await productService.getAllListProducts()
      // Map products to array of objects with id, name, and category info
      if (Array.isArray(products)) {
        const productList = products.map(p => ({
          id: p.productId || p.id,
          name: p.productName || p.name || `Product ${p.productId || p.id}`,
          categoryId: p.categoryId || p.category,
          categoryName: p.categoryName || p.categoryName || 'Chưa phân loại'
        })).filter(p => p.id)
        setAvailableProducts(productList)
      }
    } catch (err) {
      console.error('[AdminPromotions] Error loading products:', err)
      // Fallback to empty array
      setAvailableProducts([])
    }
  }

  const loadPromotions = async () => {
    try {
      setLoading(true)
      const params = {
        page: currentPage,
        limit: pageSize,
        status: filterStatus !== 'all' ? filterStatus : undefined,
        search: searchQuery && searchQuery.trim() ? searchQuery.trim() : undefined
      }
      
      // Remove undefined params
      Object.keys(params).forEach(key => params[key] === undefined && delete params[key])
      
      const response = await promotionService.listPromotions(params)
      
      console.log('[AdminPromotions] API Response:', response)
      
      // Handle paginated response: { totalCount, currentPage, limit, data: [] }
      if (response && typeof response === 'object') {
        if (response.data && Array.isArray(response.data)) {
          setPromotions(response.data)
          setTotalCount(response.totalCount || response.data.length)
        } else if (Array.isArray(response)) {
          setPromotions(response)
          setTotalCount(response.length)
        } else {
          console.warn('[AdminPromotions] Unexpected response format:', response)
          setPromotions([])
          setTotalCount(0)
        }
      } else {
        console.warn('[AdminPromotions] Invalid response:', response)
        setPromotions([])
        setTotalCount(0)
      }
    } catch (err) {
      console.error('[AdminPromotions] Error loading promotions:', err)
      error(err.message || 'Không thể tải danh sách khuyến mãi')
      setPromotions([])
      setTotalCount(0)
    } finally {
      setLoading(false)
    }
  }

  // Search is now handled by API, no need for client-side filtering
  const filteredPromotions = promotions

  // Reset to page 1 when filters change
  useEffect(() => {
    setCurrentPage(1)
  }, [searchQuery, filterStatus])

  // Pagination calculation (server-side pagination)
  const totalPages = Math.ceil(totalCount / pageSize)
  const startIndex = (currentPage - 1) * pageSize
  const endIndex = Math.min(startIndex + promotions.length, totalCount)

  const handleAddPromotion = async () => {
    try {
      setLoading(true)
      
      // Validate required fields
      if (!formData.name || !formData.startDate || !formData.endDate) {
        error('Vui lòng điền đầy đủ thông tin bắt buộc')
        return
      }
      
      if (formData.products.length === 0) {
        error('Vui lòng chọn ít nhất một sản phẩm')
        return
      }
      
      // Validate discount value
      if (formData.discountType === 'percentage' && (formData.discountPercent <= 0 || formData.discountPercent > 100)) {
        error('Phần trăm giảm giá phải từ 1 đến 100')
        return
      }
      if (formData.discountType === 'fixed' && formData.discountValue <= 0) {
        error('Số tiền giảm phải lớn hơn 0')
        return
      }
      
      const promotionData = {
        ...formData,
        banner: bannerPreview
      }
      
      const created = await promotionService.createPromotion(promotionData, bannerFile)
      success('Thêm khuyến mãi thành công!')
      
      // Update product prices after creating promotion
      try {
        await promotionService.updatePromotionPrices()
        console.log('[AdminPromotions] Product prices updated after creating promotion')
      } catch (priceError) {
        console.warn('[AdminPromotions] Failed to update product prices:', priceError)
        // Don't show error to user, just log it
      }
      
      resetForm()
      setIsAddDialogOpen(false)
      loadPromotions() // Reload list
    } catch (err) {
      console.error('[AdminPromotions] Error adding promotion:', err)
      console.error('[AdminPromotions] Error details:', err.message)
      console.error('[AdminPromotions] Error data:', err.data)
      console.error('[AdminPromotions] Error errors array:', err.errors)
      
      // Show detailed error message including errors array
      const errorMessage = err.errors && Array.isArray(err.errors) && err.errors.length > 0
        ? `${err.message || 'Không thể thêm khuyến mãi'}\n${err.errors.join('\n')}`
        : (err.message || 'Không thể thêm khuyến mãi')
      
      error(errorMessage)
    } finally {
      setLoading(false)
    }
  }

  const handleEditPromotion = async () => {
    if (!selectedPromotion) return
    
    try {
      setLoading(true)
      
      // Validate required fields
      if (!formData.name || !formData.startDate || !formData.endDate) {
        error('Vui lòng điền đầy đủ thông tin bắt buộc')
        return
      }
      
      if (formData.products.length === 0) {
        error('Vui lòng chọn ít nhất một sản phẩm')
        return
      }
      
      // Validate discount value
      if (formData.discountType === 'percentage' && (formData.discountPercent <= 0 || formData.discountPercent > 100)) {
        error('Phần trăm giảm giá phải từ 1 đến 100')
        return
      }
      if (formData.discountType === 'fixed' && formData.discountValue <= 0) {
        error('Số tiền giảm phải lớn hơn 0')
        return
      }
      
      const promotionId = selectedPromotion.id || selectedPromotion.promotionId
      const promotionData = {
        ...formData,
        banner: bannerPreview || formData.banner
      }
      
      await promotionService.updatePromotion(promotionId, promotionData, bannerFile)
      success('Cập nhật khuyến mãi thành công!')
      
      // Update product prices after updating promotion
      try {
        await promotionService.updatePromotionPrices()
        console.log('[AdminPromotions] Product prices updated after updating promotion')
      } catch (priceError) {
        console.warn('[AdminPromotions] Failed to update product prices:', priceError)
        // Don't show error to user, just log it
      }
      
      resetForm()
      setIsAddDialogOpen(false)
      loadPromotions() // Reload list
    } catch (err) {
      console.error('[AdminPromotions] Error updating promotion:', err)
      error(err.message || 'Không thể cập nhật khuyến mãi')
    } finally {
      setLoading(false)
    }
  }

  const handleDeletePromotion = async (id) => {
    if (!window.confirm('Bạn có chắc chắn muốn xóa khuyến mãi này?')) {
      return
    }
    
    try {
      setLoading(true)
      await promotionService.deletePromotion(id)
      success('Xóa khuyến mãi thành công!')
      
      // Update product prices after deleting promotion
      try {
        await promotionService.updatePromotionPrices()
        console.log('[AdminPromotions] Product prices updated after deleting promotion')
      } catch (priceError) {
        console.warn('[AdminPromotions] Failed to update product prices:', priceError)
        // Don't show error to user, just log it
      }
      
      loadPromotions() // Reload list
    } catch (err) {
      console.error('[AdminPromotions] Error deleting promotion:', err)
      error(err.message || 'Không thể xóa khuyến mãi')
    } finally {
      setLoading(false)
    }
  }

  const openEditDialog = async (promotion) => {
    try {
      setLoading(true)
      // Reset filters when opening edit dialog
      setProductCategoryFilter('all')
      setProductSearchQuery('')
      
      // Load full promotion details from API
      const fullPromotion = await promotionService.getPromotionById(promotion.id || promotion.promotionId)
      
      console.log('[AdminPromotions] Loaded promotion for edit:', fullPromotion)
      
      setSelectedPromotion(fullPromotion)
      
      // Extract product IDs from products array (can be objects or IDs)
      const productIds = fullPromotion.productIds || 
        (Array.isArray(fullPromotion.products) 
          ? fullPromotion.products.map(p => typeof p === 'object' ? (p.productId || p.id) : p).filter(id => id)
          : [])
      
      // mapApiToUi already normalizes "fixed_amount" to "fixed" for UI
      const discountType = fullPromotion.discountType || 'percentage';
      const apiDiscountValue = fullPromotion.discountValue || fullPromotion.discountPercent || 0;
      
      setFormData({
        name: fullPromotion.name || '',
        description: fullPromotion.description || '',
        discountType: discountType, // Already normalized by mapApiToUi (fixed_amount -> fixed)
        // Set the correct value based on discountType
        discountPercent: discountType === 'percentage' ? apiDiscountValue : 0,
        discountValue: discountType === 'fixed' ? apiDiscountValue : 0,
        products: productIds,
        startDate: fullPromotion.startDate || '',
        endDate: fullPromotion.endDate || '',
        status: fullPromotion.status || 'inactive',
        banner: fullPromotion.banner || '',
        local: fullPromotion.local || 'hero'
      })
      
      // Set banner preview - handle full URL or relative path
      const bannerUrl = fullPromotion.bannerUrl || fullPromotion.banner
      if (bannerUrl) {
        const normalizedUrl = normalizeImageUrl(bannerUrl)
        setBannerPreview(normalizedUrl || '')
      } else {
        setBannerPreview('')
      }
      
      setIsAddDialogOpen(true)
    } catch (err) {
      console.error('[AdminPromotions] Error loading promotion details:', err)
      error(err.message || 'Không thể tải chi tiết khuyến mãi')
    } finally {
      setLoading(false)
    }
  }

  const openDetailDialog = async (promotion) => {
    try {
      setLoading(true)
      // Load full promotion details from API
      const fullPromotion = await promotionService.getPromotionById(promotion.id || promotion.promotionId)
      
      console.log('[AdminPromotions] Loaded promotion for detail:', fullPromotion)
      
      setSelectedPromotion(fullPromotion)
      setIsDetailDialogOpen(true)
    } catch (err) {
      console.error('[AdminPromotions] Error loading promotion details:', err)
      error(err.message || 'Không thể tải chi tiết khuyến mãi')
    } finally {
      setLoading(false)
    }
  }

  const resetForm = () => {
    setFormData({
      name: '',
      description: '',
      discountType: 'percentage',
      discountPercent: 0,
      discountValue: 0,
      products: [],
      startDate: '',
      endDate: '',
      status: 'inactive',
      banner: '',
      local: 'hero'
    })
    setBannerFile(null)
    setBannerPreview('')
    setSelectedPromotion(null)
    // Reset product filters when closing modal
    setProductCategoryFilter('all')
    setProductSearchQuery('')
  }

  const handleBannerUpload = (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    
    // Validate file type
    if (!file.type.startsWith('image/')) {
      error('Vui lòng chọn file ảnh hợp lệ')
      return
    }
    
    // Validate file size (max 10MB)
    if (file.size > 10 * 1024 * 1024) {
      error('Kích thước ảnh không được vượt quá 10MB')
      return
    }
    
    const reader = new FileReader()
    reader.onloadend = () => {
      const imageSrc = reader.result
      
      // Load image to check dimensions
      const img = new Image()
      img.onload = () => {
        const currentLocal = formData.local || 'hero'
        const requiredSize = bannerSizes[currentLocal]
        const imageWidth = img.width
        const imageHeight = img.height
        
        // Check if image is too small
        if (imageWidth < requiredSize.width || imageHeight < requiredSize.height) {
          error(`Ảnh quá nhỏ! Yêu cầu tối thiểu: ${requiredSize.width}x${requiredSize.height}px. Ảnh hiện tại: ${imageWidth}x${imageHeight}px. Vui lòng chọn ảnh lớn hơn.`)
          return
        }
        
        // If image is larger than required, show crop tool
        if (imageWidth > requiredSize.width || imageHeight > requiredSize.height) {
          setCropImageSrc(imageSrc)
          setShowCropModal(true)
        } else {
          // Image is exactly the right size, use it directly
          setBannerFile(file)
          setBannerPreview(imageSrc)
        }
      }
      img.onerror = () => {
        error('Không thể đọc file ảnh')
      }
      img.src = imageSrc
    }
    reader.onerror = () => {
      error('Không thể đọc file')
    }
    reader.readAsDataURL(file)
    
    // Reset input
    e.target.value = ''
  }
  
  const handleCropComplete = (croppedFile) => {
    setBannerFile(croppedFile)
    const reader = new FileReader()
    reader.onloadend = () => {
      setBannerPreview(reader.result)
    }
    reader.readAsDataURL(croppedFile)
    setShowCropModal(false)
    setCropImageSrc('')
    success('Đã cắt ảnh thành công!')
  }
  
  const handleCropCancel = () => {
    setShowCropModal(false)
    setCropImageSrc('')
  }

  const toggleProductSelection = (productId) => {
    setFormData(prev => ({
      ...prev,
      products: prev.products.includes(productId)
        ? prev.products.filter(p => p !== productId)
        : [...prev.products, productId]
    }))
  }

  // Filter products based on category and search query
  const filteredProducts = availableProducts.filter(product => {
    // Filter by category
    if (productCategoryFilter !== 'all') {
      const categoryId = product.categoryId || product.category
      if (String(categoryId) !== String(productCategoryFilter)) {
        return false
      }
    }
    
    // Filter by search query
    if (productSearchQuery && productSearchQuery.trim()) {
      const searchLower = productSearchQuery.toLowerCase().trim()
      const productName = (product.name || '').toLowerCase()
      const categoryName = (product.categoryName || '').toLowerCase()
      if (!productName.includes(searchLower) && !categoryName.includes(searchLower)) {
        return false
      }
    }
    
    return true
  })

  const getStatusBadge = (status) => {
    return (
      <Badge className={statusColors[status] || statusColors.inactive}>
        {statusLabels[status] || statusLabels.inactive}
      </Badge>
    )
  }

  const handleUpdatePrices = async () => {
    if (!window.confirm('Bạn có chắc chắn muốn cập nhật giá sản phẩm theo khuyến mãi? Thao tác này sẽ cập nhật giá cho tất cả sản phẩm có khuyến mãi đang hoạt động.')) {
      return
    }
    
    try {
      setLoading(true)
      const result = await promotionService.updatePromotionPrices()
      console.log('[AdminPromotions] Update prices result:', result)
      success(`Đã cập nhật giá cho ${result?.updatedProductCount || 0} sản phẩm từ ${result?.processedPromotionCount || 0} khuyến mãi`)
    } catch (err) {
      console.error('[AdminPromotions] Error updating prices:', err)
      error(err.message || 'Không thể cập nhật giá sản phẩm')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="admin-promotions">
      <div className="page-header">
        <h2>Quản lý Khuyến mãi</h2>
        <div style={{ display: 'flex', gap: '10px' }}>
          <button 
            className="add-btn"
            onClick={handleUpdatePrices}
            style={{ backgroundColor: '#10b981', marginRight: '8px' }}
            title="Cập nhật giá sản phẩm theo khuyến mãi"
          >
            🔄 Cập nhật giá sản phẩm
          </button>
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
      </div>

      {/* Filters Bar */}
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

      {/* Loading Overlay */}
      {loading && (
        <div className="loading-overlay">
          <div className="loading-spinner"></div>
          <p>Đang tải...</p>
        </div>
      )}

      {/* Data Table */}
      <div className="data-table-container">
        {filteredPromotions.length > 0 ? (
          <div className="promotions-table">
            <div className="table-header">
              <div className="col-id">ID</div>
              <div className="col-name">Tên chương trình</div>
              <div className="col-discount">Giảm giá</div>
              <div className="col-products">Sản phẩm</div>
              <div className="col-dates">Thời gian</div>
              <div className="col-local">Vị trí</div>
              <div className="col-status">Trạng thái</div>
              <div className="col-actions">Thao tác</div>
            </div>

            {filteredPromotions.map((promotion) => (
              <div key={promotion.id || promotion.promotionId} className="table-row">
                <div className="col-id">#{promotion.id || promotion.promotionId}</div>
                <div className="col-name">
                  <div>
                    <p className="promotion-name">{promotion.name || promotion.promotionName}</p>
                    <p className="promotion-description">{promotion.description || ''}</p>
                  </div>
                </div>
                <div className="col-discount">
                  <span className="discount-badge">
                    {promotion.discountDisplay || 
                      (promotion.discountType === 'fixed' 
                        ? new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(promotion.discountValue || promotion.discountPercent || 0)
                        : `${Math.round(promotion.discountPercent || promotion.discountValue || 0)}%`
                      )
                    }
                  </span>
                </div>
                <div className="col-products">
                  <p>{promotion.productCount || promotion.productIds?.length || promotion.products?.length || 0} sản phẩm</p>
                </div>
                <div className="col-dates">
                  <div>
                    <p>{promotion.startDateDisplay || promotion.startDate || ''}</p>
                    <p className="date-to">đến {promotion.endDateDisplay || promotion.endDate || ''}</p>
                  </div>
                </div>
                <div className="col-local">
                  <span className={`local-badge local-${promotion.local || 'hero'}`}>
                    {promotion.local === 'hero' ? '🎯 Hero' : promotion.local === 'left' ? '⬅️ Left' : promotion.local === 'right' ? '➡️ Right' : '🎯 Hero'}
                  </span>
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
                        onClick={() => handleDeletePromotion(promotion.id || promotion.promotionId)}
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
      {totalCount > 0 && (
        <div className="pagination-controls">
          <div className="pagination-info">
            Hiển thị {startIndex + 1}-{Math.min(startIndex + promotions.length, totalCount)} / {totalCount} chương trình khuyến mãi
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
      <Dialog 
        open={isAddDialogOpen && !showCropModal} 
        onOpenChange={(open) => {
          if (!showCropModal) {
            setIsAddDialogOpen(open)
            if (!open) {
              // Reset filters when closing dialog
              setProductCategoryFilter('all')
              setProductSearchQuery('')
            }
          }
        }}
      >
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
                  <Label htmlFor="discountType" className="form-label">Loại giảm giá *</Label>
                  <Select 
                    value={formData.discountType} 
                    onValueChange={(value) => setFormData({ ...formData, discountType: value, discountPercent: 0, discountValue: 0 })}
                  >
                    <SelectTrigger className="form-select">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="percentage">Giảm theo phần trăm (%)</SelectItem>
                      <SelectItem value="fixed">Giảm số tiền cố định (₫)</SelectItem>
                      {/* Note: UI uses "fixed" but backend expects "fixed_amount" - handled in service */}
                    </SelectContent>
                  </Select>
                </div>
                
                <div className="form-item">
                  <Label htmlFor="discount" className="form-label">
                    {formData.discountType === 'percentage' ? 'Phần trăm giảm giá (%) *' : 'Số tiền giảm (₫) *'}
                  </Label>
                  <Input
                    id="discount"
                    type="number"
                    min="0"
                    max={formData.discountType === 'percentage' ? '100' : undefined}
                    value={formData.discountType === 'percentage' ? formData.discountPercent : formData.discountValue}
                    onChange={(e) => {
                      const value = Number(e.target.value)
                      if (formData.discountType === 'percentage') {
                        setFormData({ ...formData, discountPercent: value })
                      } else {
                        setFormData({ ...formData, discountValue: value })
                      }
                    }}
                    placeholder={formData.discountType === 'percentage' ? 'VD: 20' : 'VD: 50000'}
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
                
                <div className="form-item">
                  <Label htmlFor="local" className="form-label">Vị trí hiển thị *</Label>
                  <Select 
                    value={formData.local} 
                    onValueChange={(value) => setFormData({ ...formData, local: value })}
                  >
                    <SelectTrigger className="form-select">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="hero">Hero - Banner lớn ở giữa</SelectItem>
                      <SelectItem value="left">Left - Banner bên trái</SelectItem>
                      <SelectItem value="right">Right - Banner bên phải</SelectItem>
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
                
                {/* Filter controls */}
                <div style={{ display: 'flex', gap: '12px', marginBottom: '16px', flexWrap: 'wrap' }}>
                  <div style={{ flex: '1', minWidth: '200px' }}>
                    <Input
                      type="text"
                      placeholder="Tìm kiếm sản phẩm..."
                      value={productSearchQuery}
                      onChange={(e) => setProductSearchQuery(e.target.value)}
                      className="form-input"
                      style={{ width: '100%' }}
                    />
                  </div>
                  <div style={{ flex: '1', minWidth: '200px' }}>
                    <Select 
                      value={productCategoryFilter} 
                      onValueChange={setProductCategoryFilter}
                    >
                      <SelectTrigger className="form-select" style={{ width: '100%' }}>
                        <SelectValue placeholder="Tất cả danh mục" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">Tất cả danh mục</SelectItem>
                        {categories.map(cat => (
                          <SelectItem key={cat.id} value={String(cat.id)}>
                            {cat.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                
                <div className="products-selection" style={{ maxHeight: '300px', overflowY: 'auto', border: '1px solid #e5e7eb', borderRadius: '8px', padding: '12px' }}>
                  {filteredProducts.length > 0 ? (
                    <>
                      {filteredProducts.map((product) => (
                        <div key={product.id} className="product-checkbox-item">
                          <input
                            type="checkbox"
                            id={`product-${product.id}`}
                            checked={formData.products.includes(product.id)}
                            onChange={() => toggleProductSelection(product.id)}
                            className="product-checkbox"
                          />
                          <label htmlFor={`product-${product.id}`} className="product-label" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <span>{product.name}</span>
                            {product.categoryName && (
                              <span style={{ fontSize: '12px', color: '#6b7280', fontWeight: 'normal' }}>
                                ({product.categoryName})
                              </span>
                            )}
                          </label>
                        </div>
                      ))}
                    </>
                  ) : availableProducts.length > 0 ? (
                    <p className="form-description" style={{ textAlign: 'center', padding: '20px', color: '#6b7280' }}>
                      Không tìm thấy sản phẩm nào phù hợp với bộ lọc
                    </p>
                  ) : (
                    <p className="form-description" style={{ textAlign: 'center', padding: '20px' }}>
                      Đang tải danh sách sản phẩm...
                    </p>
                  )}
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '12px' }}>
                  {formData.products.length > 0 && (
                    <p className="form-description" style={{ margin: 0 }}>
                      Đã chọn {formData.products.length} sản phẩm
                    </p>
                  )}
                  {filteredProducts.length !== availableProducts.length && (
                    <p className="form-description" style={{ margin: 0, color: '#6b7280' }}>
                      Hiển thị {filteredProducts.length} / {availableProducts.length} sản phẩm
                    </p>
                  )}
                </div>
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
                <div className="banner-size-info" style={{ marginBottom: '12px', padding: '12px', background: '#f0f9ff', borderRadius: '8px', fontSize: '14px' }}>
                  <strong>Kích thước yêu cầu cho "{formData.local === 'hero' ? 'Hero' : formData.local === 'left' ? 'Left' : 'Right'}":</strong>
                  <span style={{ marginLeft: '8px', color: '#667eea', fontWeight: '600' }}>
                    {bannerSizes[formData.local || 'hero'].width} x {bannerSizes[formData.local || 'hero'].height}px
                  </span>
                  <p style={{ margin: '4px 0 0 0', fontSize: '12px', color: '#6b7280' }}>
                    {formData.local === 'hero' 
                      ? 'Banner lớn ở giữa trang chủ (tỷ lệ 3:1)'
                      : 'Banner dọc bên trái/phải (tỷ lệ 1:2)'}
                  </p>
                </div>
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
                      <span className="banner-upload-hint">PNG, JPG (tối đa 10MB)</span>
                      <span className="banner-upload-hint" style={{ fontSize: '12px', marginTop: '4px' }}>
                        Ảnh sẽ được tự động cắt nếu lớn hơn kích thước yêu cầu
                      </span>
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
      <Dialog open={isDetailDialogOpen && !showCropModal} onOpenChange={(open) => {
        if (!showCropModal) {
          setIsDetailDialogOpen(open);
        }
      }}>
        <DialogContent className="promotion-detail-modal max-w-5xl max-h-[90vh] overflow-hidden flex flex-col">
          <DialogHeader className="flex-shrink-0 promotion-modal-header">
            <DialogTitle className="promotion-modal-title">Chi tiết khuyến mãi</DialogTitle>
            <DialogDescription className="promotion-modal-description">
              Hiển thị thông tin chi tiết của chương trình khuyến mãi
            </DialogDescription>
          </DialogHeader>
          
          {selectedPromotion && (
            <div className="promotion-detail-content space-y-6 py-4 overflow-y-auto flex-1">
              {(selectedPromotion.banner || selectedPromotion.bannerUrl) && (
                <div className="detail-section">
                  <div className="banner-display">
                    {(() => {
                      const bannerUrl = selectedPromotion.bannerUrl || selectedPromotion.banner
                      const imageUrl = bannerUrl ? normalizeImageUrl(bannerUrl) : null
                      
                      return (
                        <img 
                          src={imageUrl || "/placeholder.svg"} 
                          alt={selectedPromotion.name || selectedPromotion.promotionName}
                          className="banner-image"
                          onError={(e) => { e.target.src = "/placeholder.svg" }}
                        />
                      )
                    })()}
                  </div>
                </div>
              )}
              
              <div className="detail-section">
                <h3 className="section-title">Thông tin chương trình</h3>
                <div className="detail-grid">
                  <div className="detail-item">
                    <label className="detail-label">Tên chương trình</label>
                    <p className="detail-value">{selectedPromotion.name || selectedPromotion.promotionName}</p>
                  </div>
                  
                  <div className="detail-item">
                    <label className="detail-label">Giảm giá</label>
                    <p className="detail-value discount-value">
                      {selectedPromotion.discountDisplay || 
                        (selectedPromotion.discountType === 'fixed' 
                          ? new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(selectedPromotion.discountValue || selectedPromotion.discountPercent || 0)
                          : `${Math.round(selectedPromotion.discountPercent || selectedPromotion.discountValue || 0)}%`
                        )
                      }
                    </p>
                  </div>
                  
                  <div className="detail-item">
                    <label className="detail-label">Ngày bắt đầu</label>
                    <p className="detail-value">{selectedPromotion.startDateDisplay || selectedPromotion.startDate || ''}</p>
                  </div>
                  
                  <div className="detail-item">
                    <label className="detail-label">Ngày kết thúc</label>
                    <p className="detail-value">{selectedPromotion.endDateDisplay || selectedPromotion.endDate || ''}</p>
                  </div>
                  
                  <div className="detail-item">
                    <label className="detail-label">Trạng thái</label>
                    <div>{getStatusBadge(selectedPromotion.status)}</div>
                  </div>
                  
                  <div className="detail-item full-width">
                    <label className="detail-label">Mô tả</label>
                    <p className="detail-value">{selectedPromotion.description || ''}</p>
                  </div>
                </div>
              </div>

              <div className="detail-section">
                <h3 className="section-title">Sản phẩm áp dụng ({selectedPromotion.productCount || selectedPromotion.products?.length || selectedPromotion.productIds?.length || 0})</h3>
                <div className="products-list">
                  {selectedPromotion.products && selectedPromotion.products.length > 0 ? (
                    selectedPromotion.products.map((product, idx) => {
                      // Handle both object and ID formats
                      const productId = typeof product === 'object' ? (product.productId || product.id) : product
                      const productName = typeof product === 'object' 
                        ? (product.productName || product.name || `Product ${productId}`)
                        : (availableProducts.find(p => p.id === productId)?.name || `Product ID: ${productId}`)
                      const productImage = typeof product === 'object' ? (product.imageUrl || product.image) : null
                      const productPrice = typeof product === 'object' ? (product.price || 0) : 0
                      
                      // Construct image URL using utility
                      const imageUrl = productImage ? normalizeImageUrl(productImage) : null
                      
                      return (
                        <div key={productId || idx} className="product-item">
                          {imageUrl && (
                            <img 
                              src={imageUrl} 
                              alt={productName}
                              className="product-image"
                              onError={(e) => { e.target.style.display = 'none' }}
                            />
                          )}
                          <div className="product-info">
                            <span className="product-number">{idx + 1}</span>
                            <span className="product-name">{productName}</span>
                            {productPrice > 0 && (
                              <span className="product-price">
                                {new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(productPrice)}
                              </span>
                            )}
                          </div>
                        </div>
                      )
                    })
                  ) : (
                    <p className="detail-value">Chưa có sản phẩm nào được áp dụng</p>
                  )}
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
      
      {/* Image Crop Modal */}
      {showCropModal && cropImageSrc && (
        <ImageCrop
          imageSrc={cropImageSrc}
          targetWidth={bannerSizes[formData.local || 'hero'].width}
          targetHeight={bannerSizes[formData.local || 'hero'].height}
          onCrop={handleCropComplete}
          onCancel={handleCropCancel}
        />
      )}
    </div>
  )
}

export default AdminPromotions

