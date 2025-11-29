import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useNotification } from '../context/NotificationContext';
import { useAuth } from '../context/AuthContext';
import * as warrantyService from '../services/warrantyService';
import { Button } from '../components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { Badge } from '../components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../components/ui/table';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '../components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
import { Input } from '../components/ui/input';
import { ShieldCheck, ArrowLeft, Eye, Clock, User, Package, FileText, Image as ImageIcon, Calendar, Search, List } from 'lucide-react';
import { normalizeImageUrl } from '../utils/productUtils';
import './UserWarrantyTracking.css';

const UserWarrantyTracking = () => {
  const navigate = useNavigate();
  const { success, error: showError } = useNotification();
  const { isAuthenticated } = useAuth();
  
  const [activeTab, setActiveTab] = useState('products'); // 'products' or 'claims'
  
  // Warranty products (Tab 1)
  const [warrantyProducts, setWarrantyProducts] = useState([]);
  const [loadingProducts, setLoadingProducts] = useState(false);
  const [searchProduct, setSearchProduct] = useState('');
  const [currentPageProducts, setCurrentPageProducts] = useState(1);
  const [pageSizeProducts, setPageSizeProducts] = useState(10);
  
  // Warranty claims (Tab 2)
  const [claims, setClaims] = useState([]);
  const [loading, setLoading] = useState(false);
  const [selectedClaim, setSelectedClaim] = useState(null);
  const [isDetailDialogOpen, setIsDetailDialogOpen] = useState(false);
  const [claimHistory, setClaimHistory] = useState([]);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [filterStatus, setFilterStatus] = useState('all');
  const [searchClaim, setSearchClaim] = useState('');
  const [currentPageClaims, setCurrentPageClaims] = useState(1);
  const [pageSizeClaims, setPageSizeClaims] = useState(10);

  useEffect(() => {
    if (!isAuthenticated) {
      navigate('/login');
      return;
    }
    if (activeTab === 'products') {
      loadWarrantyProducts();
    } else {
      loadClaims();
    }
  }, [isAuthenticated, activeTab, filterStatus]);

  const loadWarrantyProducts = async () => {
    try {
      setLoadingProducts(true);
      const data = await warrantyService.getMyWarranties();
      setWarrantyProducts(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error('[UserWarrantyTracking] Error loading warranty products:', err);
      showError(err.message || 'Không thể tải danh sách sản phẩm bảo hành');
    } finally {
      setLoadingProducts(false);
    }
  };

  const loadClaims = async () => {
    try {
      setLoading(true);
      const data = await warrantyService.getMyWarrantyClaims();
      const claimsList = Array.isArray(data) ? data : [];
      
      // Filter by status if needed
      let filtered = claimsList;
      if (filterStatus !== 'all') {
        filtered = claimsList.filter(claim => claim.status === filterStatus);
      }
      
      setClaims(filtered);
    } catch (err) {
      console.error('[UserWarrantyTracking] Error loading claims:', err);
      showError(err.message || 'Không thể tải danh sách yêu cầu bảo hành');
    } finally {
      setLoading(false);
    }
  };

  const loadClaimHistory = async (detailId) => {
    try {
      setLoadingHistory(true);
      const history = await warrantyService.getWarrantyDetailHistory(detailId);
      setClaimHistory(Array.isArray(history) ? history : []);
    } catch (err) {
      console.error('[UserWarrantyTracking] Error loading history:', err);
      showError(err.message || 'Không thể tải lịch sử xử lý');
      setClaimHistory([]);
    } finally {
      setLoadingHistory(false);
    }
  };

  const handleViewDetail = async (claim) => {
    setSelectedClaim(claim);
    setIsDetailDialogOpen(true);
    await loadClaimHistory(claim.detailId || claim.detail_id);
  };

  const getStatusBadge = (status) => {
    const statusConfig = {
      pending: { label: 'Chờ xử lý', className: 'bg-yellow-100 text-yellow-700' },
      approved: { label: 'Đã duyệt', className: 'bg-blue-100 text-blue-700' },
      processing: { label: 'Đang xử lý', className: 'bg-purple-100 text-purple-700' },
      inspecting: { label: 'Đang kiểm tra', className: 'bg-indigo-100 text-indigo-700' },
      repairing: { label: 'Đang sửa chữa', className: 'bg-orange-100 text-orange-700' },
      completed: { label: 'Hoàn thành', className: 'bg-green-100 text-green-700' },
      rejected: { label: 'Từ chối', className: 'bg-red-100 text-red-700' },
      cancelled: { label: 'Đã hủy', className: 'bg-gray-100 text-gray-700' }
    };

    const config = statusConfig[status] || { label: status, className: 'bg-gray-100 text-gray-700' };
    return (
      <Badge className={config.className}>
        {config.label}
      </Badge>
    );
  };

  const formatDate = (dateString) => {
    if (!dateString) return '-';
    try {
      const date = new Date(dateString);
      return date.toLocaleString('vi-VN', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch {
      return dateString;
    }
  };

  // Parse image URLs from JSON string
  const parseImageUrls = (imageUrlsString) => {
    if (!imageUrlsString) return [];
    try {
      if (typeof imageUrlsString === 'string') {
        const parsed = JSON.parse(imageUrlsString);
        return Array.isArray(parsed) ? parsed : [];
      }
      return Array.isArray(imageUrlsString) ? imageUrlsString : [];
    } catch {
      return [];
    }
  };

  // Get image URL helper
  const getImageUrl = (imageUrl) => {
    if (!imageUrl) return '/placeholder.svg';
    return normalizeImageUrl(imageUrl) || '/placeholder.svg';
  };

  // Filter warranty products by search
  const filteredWarrantyProducts = warrantyProducts.filter((product) => {
    if (!searchProduct) return true;
    const searchLower = searchProduct.toLowerCase();
    return (
      product.productName?.toLowerCase().includes(searchLower) ||
      product.serialNumber?.toLowerCase().includes(searchLower) ||
      product.warrantyId?.toString().includes(searchLower)
    );
  });

  // Pagination for products
  const totalPagesProducts = Math.ceil(filteredWarrantyProducts.length / pageSizeProducts);
  const startIndexProducts = (currentPageProducts - 1) * pageSizeProducts;
  const endIndexProducts = startIndexProducts + pageSizeProducts;
  const paginatedProducts = filteredWarrantyProducts.slice(startIndexProducts, endIndexProducts);

  // Reset products page when search changes
  useEffect(() => {
    setCurrentPageProducts(1);
  }, [searchProduct, filteredWarrantyProducts.length]);

  // Filter claims by search
  const filteredClaims = claims.filter((claim) => {
    if (!searchClaim) return true;
    const searchLower = searchClaim.toLowerCase();
    return (
      claim.productName?.toLowerCase().includes(searchLower) ||
      claim.description?.toLowerCase().includes(searchLower) ||
      claim.serialNumber?.toLowerCase().includes(searchLower) ||
      (claim.detailId || claim.detail_id)?.toString().includes(searchLower)
    );
  });

  // Pagination for claims
  const totalPagesClaims = Math.ceil(filteredClaims.length / pageSizeClaims);
  const startIndexClaims = (currentPageClaims - 1) * pageSizeClaims;
  const endIndexClaims = startIndexClaims + pageSizeClaims;
  const paginatedClaims = filteredClaims.slice(startIndexClaims, endIndexClaims);

  // Reset claims page when search or filter changes
  useEffect(() => {
    setCurrentPageClaims(1);
  }, [searchClaim, filterStatus, filteredClaims.length]);

  return (
    <div className="user-warranty-tracking-page">
      <div className="container mx-auto px-4 py-8 max-w-7xl">
        <div className="mb-6 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              onClick={() => navigate(-1)}
              className="mb-4"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Quay lại
            </Button>
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Theo dõi bảo hành</h1>
              <p className="text-gray-600 mt-1">Xem chi tiết và trạng thái các yêu cầu bảo hành của bạn</p>
            </div>
          </div>
          <Button
            onClick={() => navigate('/warranty-request')}
            className="bg-emerald-600 hover:bg-emerald-700"
          >
            <ShieldCheck className="w-4 h-4 mr-2" />
            Tạo yêu cầu mới
          </Button>
        </div>

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="grid w-full grid-cols-2 bg-white shadow-md p-1 h-auto">
            <TabsTrigger
              value="products"
              className="flex items-center gap-2 data-[state=active]:bg-emerald-500 data-[state=active]:text-white py-3"
            >
              <Package className="h-4 w-4" />
              <span>Sản phẩm bảo hành</span>
            </TabsTrigger>
            <TabsTrigger
              value="claims"
              className="flex items-center gap-2 data-[state=active]:bg-emerald-500 data-[state=active]:text-white py-3"
            >
              <List className="h-4 w-4" />
              <span>Yêu cầu bảo hành</span>
            </TabsTrigger>
          </TabsList>

          {/* Tab 1: Warranty Products */}
          <TabsContent value="products" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Sản phẩm bảo hành</CardTitle>
                <CardDescription>Danh sách sản phẩm đang trong thời hạn bảo hành</CardDescription>
              </CardHeader>
              <CardContent>
                {/* Search */}
                <div className="mb-4 relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <Input
                    placeholder="Tìm kiếm theo tên sản phẩm, số serial..."
                    value={searchProduct}
                    onChange={(e) => setSearchProduct(e.target.value)}
                    className="pl-10 border-gray-300"
                  />
                </div>

                {loadingProducts ? (
                  <div className="text-center py-8 text-gray-500">
                    <p>Đang tải...</p>
                  </div>
                ) : filteredWarrantyProducts.length === 0 ? (
                  <div className="text-center py-12">
                    <ShieldCheck className="w-16 h-16 mx-auto text-gray-300 mb-4" />
                    <p className="text-gray-500 mb-4">
                      {searchProduct ? 'Không tìm thấy sản phẩm' : 'Chưa có sản phẩm bảo hành'}
                    </p>
                    {!searchProduct && (
                      <Button
                        onClick={() => navigate('/warranty-request')}
                        variant="outline"
                      >
                        Tạo yêu cầu bảo hành
                      </Button>
                    )}
                  </div>
                ) : (
                  <div className="rounded-lg border border-gray-200 overflow-hidden">
                    <Table>
                      <TableHeader className="bg-gray-50">
                        <TableRow>
                          <TableHead className="w-[100px]">Hình ảnh</TableHead>
                          <TableHead>Sản phẩm</TableHead>
                          <TableHead>Số Serial</TableHead>
                          <TableHead>Ngày mua</TableHead>
                          <TableHead>Hết hạn BH</TableHead>
                          <TableHead>Trạng thái</TableHead>
                          <TableHead>Thao tác</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {paginatedProducts.map((product) => {
                          const isValid = !product.isExpired && product.status === 'active';
                          return (
                            <TableRow key={product.warrantyId || product.id} className="hover:bg-gray-50">
                              <TableCell>
                                <img
                                  src={getImageUrl(product.productImageUrl || product.imageUrl)}
                                  alt={product.productName}
                                  className="w-16 h-16 object-cover rounded"
                                  onError={(e) => {
                                    e.target.src = '/placeholder.svg';
                                  }}
                                />
                              </TableCell>
                              <TableCell className="font-medium">{product.productName}</TableCell>
                              <TableCell className="font-mono text-sm text-gray-600">
                                {product.serialNumber}
                              </TableCell>
                              <TableCell>
                                {product.startDate
                                  ? new Date(product.startDate).toLocaleDateString('vi-VN')
                                  : '-'}
                              </TableCell>
                              <TableCell>
                                {product.endDate
                                  ? new Date(product.endDate).toLocaleDateString('vi-VN')
                                  : '-'}
                                {product.daysRemaining !== undefined && product.daysRemaining > 0 && (
                                  <span className="block text-xs text-gray-500 mt-1">
                                    (Còn {product.daysRemaining} ngày)
                                  </span>
                                )}
                              </TableCell>
                              <TableCell>
                                {product.isExpired ? (
                                  <Badge className="bg-red-100 text-red-700 hover:bg-red-100">
                                    Hết hạn
                                  </Badge>
                                ) : product.status === 'active' || product.statusDisplay === 'Còn hạn' ? (
                                  <Badge className="bg-emerald-100 text-emerald-700 hover:bg-emerald-100">
                                    {product.statusDisplay || 'Còn hạn'}
                                  </Badge>
                                ) : (
                                  <Badge className="bg-amber-100 text-amber-700 hover:bg-amber-100">
                                    {product.statusDisplay || 'Đang bảo hành'}
                                  </Badge>
                                )}
                              </TableCell>
                              <TableCell>
                                {isValid && (
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={() => navigate('/warranty-request')}
                                  >
                                    Yêu cầu BH
                                  </Button>
                                )}
                              </TableCell>
                            </TableRow>
                          );
                        })}
                      </TableBody>
                    </Table>
                  </div>
                )}

                {/* Pagination Controls for Products */}
                {filteredWarrantyProducts.length > 0 && (
                  <div className="pagination-controls">
                    <div className="pagination-info">
                      Hiển thị {startIndexProducts + 1}-{Math.min(endIndexProducts, filteredWarrantyProducts.length)} / {filteredWarrantyProducts.length} sản phẩm
                    </div>
                    
                    <div className="pagination-buttons">
                      <button 
                        className="pg-btn"
                        onClick={() => setCurrentPageProducts(1)}
                        disabled={currentPageProducts === 1}
                      >
                        «
                      </button>
                      <button 
                        className="pg-btn"
                        onClick={() => setCurrentPageProducts(currentPageProducts - 1)}
                        disabled={currentPageProducts === 1}
                      >
                        ‹
                      </button>
                      
                      <span className="page-indicator">
                        Trang {currentPageProducts} / {totalPagesProducts || 1}
                      </span>
                      
                      <button 
                        className="pg-btn"
                        onClick={() => setCurrentPageProducts(currentPageProducts + 1)}
                        disabled={currentPageProducts >= totalPagesProducts}
                      >
                        ›
                      </button>
                      <button 
                        className="pg-btn"
                        onClick={() => setCurrentPageProducts(totalPagesProducts)}
                        disabled={currentPageProducts >= totalPagesProducts}
                      >
                        »
                      </button>
                    </div>
                    
                    <div className="page-size-selector">
                      <label>Hiển thị: </label>
                      <select value={pageSizeProducts} onChange={(e) => {
                        setPageSizeProducts(Number(e.target.value));
                        setCurrentPageProducts(1);
                      }}>
                        <option value={10}>10</option>
                        <option value={20}>20</option>
                        <option value={50}>50</option>
                      </select>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Tab 2: Warranty Claims */}
          <TabsContent value="claims" className="space-y-6">
            {/* Filter */}
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center gap-4 flex-wrap">
                  <div className="flex-1 relative min-w-[200px]">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                    <Input
                      placeholder="Tìm kiếm theo mã, tên sản phẩm, mô tả..."
                      value={searchClaim}
                      onChange={(e) => setSearchClaim(e.target.value)}
                      className="pl-10 border-gray-300"
                    />
                  </div>
                  <div className="flex items-center gap-2">
                    <label className="text-sm font-medium text-gray-700 whitespace-nowrap">Lọc theo trạng thái:</label>
                    <Select value={filterStatus} onValueChange={setFilterStatus}>
                      <SelectTrigger className="w-48">
                        <SelectValue placeholder="Tất cả trạng thái" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">Tất cả</SelectItem>
                        <SelectItem value="pending">Chờ xử lý</SelectItem>
                        <SelectItem value="approved">Đã duyệt</SelectItem>
                        <SelectItem value="processing">Đang xử lý</SelectItem>
                        <SelectItem value="inspecting">Đang kiểm tra</SelectItem>
                        <SelectItem value="repairing">Đang sửa chữa</SelectItem>
                        <SelectItem value="completed">Hoàn thành</SelectItem>
                        <SelectItem value="rejected">Từ chối</SelectItem>
                        <SelectItem value="cancelled">Đã hủy</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Claims List */}
            <Card>
              <CardHeader>
                <CardTitle>Danh sách yêu cầu bảo hành</CardTitle>
                <CardDescription>
                  Tổng cộng: {filteredClaims.length} yêu cầu
                </CardDescription>
              </CardHeader>
              <CardContent>
                {loading ? (
                  <div className="text-center py-8 text-gray-500">
                    <p>Đang tải...</p>
                  </div>
                ) : filteredClaims.length === 0 ? (
                  <div className="text-center py-12">
                    <ShieldCheck className="w-16 h-16 mx-auto text-gray-300 mb-4" />
                    <p className="text-gray-500 mb-4">
                      {searchClaim || filterStatus !== 'all' 
                        ? 'Không tìm thấy yêu cầu bảo hành' 
                        : 'Bạn chưa có yêu cầu bảo hành nào'}
                    </p>
                    {!searchClaim && filterStatus === 'all' && (
                      <Button
                        onClick={() => navigate('/warranty-request')}
                        variant="outline"
                      >
                        Tạo yêu cầu bảo hành
                      </Button>
                    )}
                  </div>
                ) : (
                  <div className="rounded-lg border border-gray-200 overflow-hidden">
                    <Table>
                      <TableHeader className="bg-gray-50">
                        <TableRow>
                          <TableHead>Mã yêu cầu</TableHead>
                          <TableHead>Sản phẩm</TableHead>
                          <TableHead>Ngày yêu cầu</TableHead>
                          <TableHead>Mô tả vấn đề</TableHead>
                          <TableHead>Trạng thái</TableHead>
                          <TableHead>Thao tác</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {paginatedClaims.map((claim) => (
                          <TableRow key={claim.detailId || claim.detail_id} className="hover:bg-gray-50">
                            <TableCell className="font-mono text-sm">
                              BH{String(claim.detailId || claim.detail_id || 0).padStart(3, '0')}
                            </TableCell>
                            <TableCell>
                              <div className="flex items-center gap-2">
                                {claim.productImageUrl && (
                                  <img
                                    src={normalizeImageUrl(claim.productImageUrl)}
                                    alt={claim.productName}
                                    className="w-10 h-10 object-cover rounded"
                                    onError={(e) => {
                                      e.target.src = '/placeholder.svg';
                                    }}
                                  />
                                )}
                                <div>
                                  <div className="font-medium">{claim.productName || '-'}</div>
                                  {claim.serialNumber && (
                                    <div className="text-xs text-gray-500">Serial: {claim.serialNumber}</div>
                                  )}
                                </div>
                              </div>
                            </TableCell>
                            <TableCell>
                              {formatDate(claim.requestDate)}
                            </TableCell>
                            <TableCell className="max-w-xs truncate">
                              {claim.description || '-'}
                            </TableCell>
                            <TableCell>
                              {getStatusBadge(claim.status)}
                            </TableCell>
                            <TableCell>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => handleViewDetail(claim)}
                              >
                                <Eye className="w-4 h-4 mr-1" />
                                Chi tiết
                              </Button>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                )}

                {/* Pagination Controls for Claims */}
                {filteredClaims.length > 0 && (
                  <div className="pagination-controls">
                    <div className="pagination-info">
                      Hiển thị {startIndexClaims + 1}-{Math.min(endIndexClaims, filteredClaims.length)} / {filteredClaims.length} yêu cầu
                    </div>
                    
                    <div className="pagination-buttons">
                      <button 
                        className="pg-btn"
                        onClick={() => setCurrentPageClaims(1)}
                        disabled={currentPageClaims === 1}
                      >
                        «
                      </button>
                      <button 
                        className="pg-btn"
                        onClick={() => setCurrentPageClaims(currentPageClaims - 1)}
                        disabled={currentPageClaims === 1}
                      >
                        ‹
                      </button>
                      
                      <span className="page-indicator">
                        Trang {currentPageClaims} / {totalPagesClaims || 1}
                      </span>
                      
                      <button 
                        className="pg-btn"
                        onClick={() => setCurrentPageClaims(currentPageClaims + 1)}
                        disabled={currentPageClaims >= totalPagesClaims}
                      >
                        ›
                      </button>
                      <button 
                        className="pg-btn"
                        onClick={() => setCurrentPageClaims(totalPagesClaims)}
                        disabled={currentPageClaims >= totalPagesClaims}
                      >
                        »
                      </button>
                    </div>
                    
                    <div className="page-size-selector">
                      <label>Hiển thị: </label>
                      <select value={pageSizeClaims} onChange={(e) => {
                        setPageSizeClaims(Number(e.target.value));
                        setCurrentPageClaims(1);
                      }}>
                        <option value={10}>10</option>
                        <option value={20}>20</option>
                        <option value={50}>50</option>
                      </select>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* Detail Dialog */}
        <Dialog open={isDetailDialogOpen} onOpenChange={setIsDetailDialogOpen}>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Chi tiết yêu cầu bảo hành</DialogTitle>
              <DialogDescription>
                Mã yêu cầu: BH{String(selectedClaim?.detailId || selectedClaim?.detail_id || 0).padStart(3, '0')}
              </DialogDescription>
            </DialogHeader>

            {selectedClaim && (
              <div className="space-y-6 mt-4">
                {/* Basic Info */}
                <div className="grid grid-cols-2 gap-4">
                  <Card>
                    <CardHeader className="pb-3">
                      <CardTitle className="text-sm flex items-center gap-2">
                        <Package className="w-4 h-4" />
                        Sản phẩm
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="flex items-center gap-3">
                        {selectedClaim.productImageUrl && (
                          <img
                            src={normalizeImageUrl(selectedClaim.productImageUrl)}
                            alt={selectedClaim.productName}
                            className="w-16 h-16 object-cover rounded"
                            onError={(e) => {
                              e.target.src = '/placeholder.svg';
                            }}
                          />
                        )}
                        <div>
                          <div className="font-medium">{selectedClaim.productName || '-'}</div>
                          {selectedClaim.serialNumber && (
                            <div className="text-sm text-gray-500">Serial: {selectedClaim.serialNumber}</div>
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader className="pb-3">
                      <CardTitle className="text-sm flex items-center gap-2">
                        <Calendar className="w-4 h-4" />
                        Thông tin yêu cầu
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-2">
                      <div>
                        <span className="text-sm text-gray-500">Ngày yêu cầu:</span>
                        <div className="font-medium">{formatDate(selectedClaim.requestDate)}</div>
                      </div>
                      {selectedClaim.serviceDate && (
                        <div>
                          <span className="text-sm text-gray-500">Ngày xử lý:</span>
                          <div className="font-medium">{formatDate(selectedClaim.serviceDate)}</div>
                        </div>
                      )}
                      {selectedClaim.completedDate && (
                        <div>
                          <span className="text-sm text-gray-500">Ngày hoàn thành:</span>
                          <div className="font-medium">{formatDate(selectedClaim.completedDate)}</div>
                        </div>
                      )}
                      <div>
                        <span className="text-sm text-gray-500">Trạng thái:</span>
                        <div>{getStatusBadge(selectedClaim.status)}</div>
                      </div>
                    </CardContent>
                  </Card>
                </div>

                {/* Description */}
                {selectedClaim.description && (
                  <Card>
                    <CardHeader className="pb-3">
                      <CardTitle className="text-sm flex items-center gap-2">
                        <FileText className="w-4 h-4" />
                        Mô tả vấn đề
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <p className="text-sm whitespace-pre-wrap">{selectedClaim.description}</p>
                    </CardContent>
                  </Card>
                )}

                {/* Notes */}
                {selectedClaim.notes && (
                  <Card>
                    <CardHeader className="pb-3">
                      <CardTitle className="text-sm flex items-center gap-2">
                        <FileText className="w-4 h-4" />
                        Ghi chú
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <p className="text-sm whitespace-pre-wrap">{selectedClaim.notes}</p>
                    </CardContent>
                  </Card>
                )}

                {/* Solution */}
                {selectedClaim.solution && (
                  <Card>
                    <CardHeader className="pb-3">
                      <CardTitle className="text-sm flex items-center gap-2">
                        <ShieldCheck className="w-4 h-4" />
                        Giải pháp
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <p className="text-sm whitespace-pre-wrap">{selectedClaim.solution}</p>
                    </CardContent>
                  </Card>
                )}

                {/* Cost */}
                {selectedClaim.cost !== null && selectedClaim.cost !== undefined && (
                  <Card>
                    <CardHeader className="pb-3">
                      <CardTitle className="text-sm">Chi phí</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <p className="text-lg font-semibold text-green-600">
                        {new Intl.NumberFormat('vi-VN').format(selectedClaim.cost)} VNĐ
                      </p>
                    </CardContent>
                  </Card>
                )}

                {/* Images */}
                {(() => {
                  const images = parseImageUrls(selectedClaim.imageUrls);
                  if (images.length > 0) {
                    return (
                      <Card>
                        <CardHeader className="pb-3">
                          <CardTitle className="text-sm flex items-center gap-2">
                            <ImageIcon className="w-4 h-4" />
                            Ảnh minh chứng ({images.length})
                          </CardTitle>
                        </CardHeader>
                        <CardContent>
                          <div className="grid grid-cols-3 gap-4">
                            {images.map((imgUrl, index) => (
                              <div key={index} className="relative group">
                                <img
                                  src={normalizeImageUrl(imgUrl)}
                                  alt={`Minh chứng ${index + 1}`}
                                  className="w-full h-32 object-cover rounded-lg border border-gray-200"
                                  onError={(e) => {
                                    e.target.src = '/placeholder.svg';
                                  }}
                                />
                              </div>
                            ))}
                          </div>
                        </CardContent>
                      </Card>
                    );
                  }
                  return null;
                })()}

                {/* Timeline */}
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm flex items-center gap-2">
                      <Clock className="w-4 h-4" />
                      Lịch sử xử lý
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    {loadingHistory ? (
                      <p className="text-center py-4 text-gray-500">Đang tải lịch sử...</p>
                    ) : claimHistory.length === 0 ? (
                      <p className="text-center py-4 text-gray-500">Chưa có lịch sử xử lý</p>
                    ) : (
                      <div className="warranty-timeline">
                        {claimHistory.map((entry, index) => (
                          <div key={index} className="timeline-item">
                            <div className="timeline-marker">
                              <Clock className="w-4 h-4" />
                            </div>
                            <div className="timeline-content">
                              <div className="timeline-header">
                                {getStatusBadge(entry.status)}
                                <span className="timeline-date">{formatDate(entry.date)}</span>
                              </div>
                              {entry.handledBy && (
                                <div className="timeline-handler">
                                  <User className="w-3 h-3 inline mr-1" />
                                  Kỹ thuật viên: {entry.handledBy}
                                </div>
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
                    )}
                  </CardContent>
                </Card>
              </div>
            )}
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
};

export default UserWarrantyTracking;

