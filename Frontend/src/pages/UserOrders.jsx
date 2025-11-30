import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useNotification } from '../context/NotificationContext';
import * as orderService from '../services/orderService';
import * as paymentCacheService from '../services/paymentCacheService';
import ConfirmationDialog from '../components/ConfirmationDialog';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { Badge } from '../components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../components/ui/table';
import { Button } from '../components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '../components/ui/dropdown-menu';
import { Package, ArrowLeft, MoreVertical } from 'lucide-react';
import './UserOrders.css';

const UserOrders = () => {
  const navigate = useNavigate();
  const { isAuthenticated } = useAuth();
  const { error: showError, warning: showWarning, success: showSuccess } = useNotification();
  
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(false);
  
  // Cancel dialog state
  const [cancelDialogOpen, setCancelDialogOpen] = useState(false);
  const [orderToCancel, setOrderToCancel] = useState(null);
  
  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  useEffect(() => {
    if (!isAuthenticated) {
      navigate('/login');
      return;
    }
    loadOrders();
  }, [isAuthenticated]);

  const loadOrders = async () => {
    try {
      setLoading(true);
      const ordersData = await orderService.getOrders();
      
      // Handle different response formats
      let ordersList = [];
      if (Array.isArray(ordersData)) {
        ordersList = ordersData;
      } else if (ordersData && typeof ordersData === 'object') {
        // Check if response has data property
        if (Array.isArray(ordersData.data)) {
          ordersList = ordersData.data;
        } else if (Array.isArray(ordersData.orders)) {
          ordersList = ordersData.orders;
        } else if (ordersData.message && ordersData.message === "Người dùng chưa có đơn hàng") {
          ordersList = [];
        }
      }
      
      // Map API response to UI format
      const mappedOrders = ordersList.map(order => ({
        orderId: order.order_id || order.orderId || order.id,
        id: order.order_id || order.orderId || order.id,
        orderDate: order.order_date || order.orderDate || order.date,
        date: order.order_date || order.orderDate || order.date,
        status: order.status || 'pending',
        total: order.total_amount || order.total || order.totalPrice || order.amount || 0,
        totalPrice: order.total_amount || order.total || order.totalPrice || order.amount || 0,
        amount: order.total_amount || order.total || order.totalPrice || order.amount || 0,
        paymentMethod: order.types || order.paymentMethod || 'COD',
        paymentMethodDisplay: order.types_display || order.typesDisplay || 
          (order.types === 'COD' ? 'Thanh toán khi nhận hàng' :
           order.types === 'Transfer' ? 'Chuyển khoản' :
           order.types === 'ATM' ? 'Thẻ ATM' : order.types || 'COD'),
        typesDisplay: order.types_display || order.typesDisplay || 
          (order.types === 'COD' ? 'Thanh toán khi nhận hàng' :
           order.types === 'Transfer' ? 'Chuyển khoản' :
           order.types === 'ATM' ? 'Thẻ ATM' : order.types || 'COD'),
        customerName: order.customer_name || order.customerName,
        createdAt: order.created_at || order.createdAt,
        updatedAt: order.updated_at || order.updatedAt
      }));
      
      setOrders(mappedOrders);
    } catch (err) {
      console.error('[UserOrders] Error loading orders:', err);
      showError(err.message || 'Không thể tải danh sách đơn hàng');
      setOrders([]);
    } finally {
      setLoading(false);
    }
  };

  // Pagination calculation
  const totalPages = Math.ceil(orders.length / pageSize);
  const startIndex = (currentPage - 1) * pageSize;
  const endIndex = startIndex + pageSize;
  const paginatedOrders = orders.slice(startIndex, endIndex);

  // Reset to page 1 when orders change
  useEffect(() => {
    setCurrentPage(1);
  }, [orders.length]);

  // Handle payment button click
  const handlePay = (order) => {
    const orderId = order.orderId || order.id;
    
    // Check if cache exists and is valid
    const hasValidCache = paymentCacheService.hasValidCache(orderId);
    
    if (hasValidCache) {
      // Load from cache and navigate to payment page
      const cachedData = paymentCacheService.getPaymentCache(orderId);
      if (cachedData) {
        console.log('[UserOrders] Loading payment from cache for order:', orderId);
        // Navigate to QR payment page with orderId
        navigate(`/qr-payment?orderId=${orderId}`);
        return;
      }
    }
    
    // If no cache or cache expired, check if order is pending and payment method is Transfer/ATM
    const isPending = (order.status || '').toLowerCase() === 'pending';
    const paymentMethod = (order.paymentMethod || order.types || '').toLowerCase();
    const isQrPayment = paymentMethod === 'transfer' || paymentMethod === 'atm';
    
    if (isPending && isQrPayment) {
      // Try to load from API and navigate
      console.log('[UserOrders] Cache not found, navigating to payment page to load from API');
      navigate(`/qr-payment?orderId=${orderId}`);
    } else {
      showWarning('Đơn hàng này không thể thanh toán. Vui lòng kiểm tra trạng thái đơn hàng.');
    }
  };

  // Check if order can be paid (pending status and Transfer/ATM payment)
  const canPay = (order) => {
    const isPending = (order.status || '').toLowerCase() === 'pending';
    const paymentMethod = (order.paymentMethod || order.types || '').toLowerCase();
    const isQrPayment = paymentMethod === 'transfer' || paymentMethod === 'atm';
    return isPending && isQrPayment;
  };

  // Check if order can be cancelled (only pending orders)
  const canCancel = (order) => {
    const status = (order.status || '').toLowerCase();
    return status === 'pending';
  };

  // Handle cancel button click
  const handleCancelClick = (order) => {
    setOrderToCancel(order);
    setCancelDialogOpen(true);
  };

  // Handle confirm cancel
  const handleConfirmCancel = async () => {
    if (!orderToCancel) return;

    const orderId = orderToCancel.orderId || orderToCancel.id;
    const originalOrders = [...orders];

    try {
      setLoading(true);
      
      // Update order status to cancelled
      await orderService.updateOrderStatus(orderId, 'cancelled');
      
      // Remove payment cache if exists
      paymentCacheService.removePaymentCache(orderId);
      
      // Update local state
      setOrders(orders.map(order => {
        const currentOrderId = order.orderId || order.id;
        return currentOrderId === orderId 
          ? { ...order, status: 'cancelled' }
          : order;
      }));
      
      showSuccess(`Đã hủy đơn hàng #${String(orderId).padStart(6, '0')} thành công!`);
      setCancelDialogOpen(false);
      setOrderToCancel(null);
    } catch (error) {
      console.error('[UserOrders] Error cancelling order:', error);
      // Revert on error
      setOrders(originalOrders);
      showError('Không thể hủy đơn hàng: ' + (error.message || 'Lỗi không xác định'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="user-orders-page">
      <div className="container mx-auto px-4 py-8 max-w-7xl">
        <div className="mb-6 flex items-center gap-4">
          <button
            onClick={() => navigate(-1)}
            className="text-gray-600 hover:text-gray-900"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Đơn hàng của tôi</h1>
            <p className="text-gray-600 mt-1">Theo dõi trạng thái đơn hàng của bạn</p>
          </div>
        </div>

        <Card className="shadow-lg border-0">
          <CardHeader className="text-white" style={{ background: 'linear-gradient(to right, #0a804a, #086b3d)' }}>
            <CardTitle>Danh sách đơn hàng</CardTitle>
            <CardDescription className="text-white/80">
              Tổng cộng: {orders.length} đơn hàng
              {orders.length > 0 && ` - Hiển thị ${startIndex + 1}-${Math.min(endIndex, orders.length)}`}
            </CardDescription>
          </CardHeader>
          <CardContent className="pt-6">
            {loading ? (
              <div className="text-center py-8 text-gray-500">
                <p>Đang tải...</p>
              </div>
            ) : orders.length === 0 ? (
              <div className="text-center py-12">
                <Package className="w-16 h-16 mx-auto text-gray-300 mb-4" />
                <p className="text-gray-500 mb-4">Bạn chưa có đơn hàng nào</p>
              </div>
            ) : (
              <div className="rounded-lg border border-gray-200 overflow-hidden">
                <Table>
                  <TableHeader className="bg-gray-50">
                      <TableRow>
                        <TableHead>Mã đơn hàng</TableHead>
                        <TableHead>Ngày đặt</TableHead>
                        <TableHead>Tổng tiền</TableHead>
                        <TableHead>Phương thức thanh toán</TableHead>
                        <TableHead>Trạng thái</TableHead>
                        <TableHead>Thao tác</TableHead>
                      </TableRow>
                  </TableHeader>
                  <TableBody>
                    {paginatedOrders.map((order) => (
                      <TableRow key={order.orderId || order.id} className="hover:bg-gray-50">
                        <TableCell className="font-mono text-sm">
                          #{String(order.orderId || order.id || 0).padStart(6, '0')}
                        </TableCell>
                        <TableCell>
                          {order.orderDate || order.date
                            ? new Date(order.orderDate || order.date).toLocaleDateString('vi-VN')
                            : '-'}
                        </TableCell>
                        <TableCell className="font-medium">
                          {new Intl.NumberFormat('vi-VN').format(order.total || order.totalPrice || order.amount || 0)} VNĐ
                        </TableCell>
                        <TableCell>
                          {order.paymentMethodDisplay || order.typesDisplay || order.paymentMethod || 'COD'}
                        </TableCell>
                        <TableCell>
                          <Badge className={
                            order.status === 'completed' || order.status === 'delivered' || order.status === 'paid' ? 'bg-green-100 text-green-700' :
                            order.status === 'processing' || order.status === 'shipping' ? 'bg-blue-100 text-blue-700' :
                            order.status === 'cancelled' || order.status === 'canceled' ? 'bg-red-100 text-red-700' :
                            order.status === 'pending' ? 'bg-yellow-100 text-yellow-700' :
                            'bg-gray-100 text-gray-700'
                          }>
                            {order.status === 'completed' ? 'Hoàn thành' :
                             order.status === 'delivered' ? 'Đã giao' :
                             order.status === 'paid' ? 'Đã thanh toán' :
                             order.status === 'processing' ? 'Đang xử lý' :
                             order.status === 'shipping' ? 'Đang giao' :
                             order.status === 'cancelled' || order.status === 'canceled' ? 'Đã hủy' :
                             order.status === 'pending' ? 'Chờ xử lý' :
                             order.status || 'Chờ xử lý'}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-8 w-8 p-0"
                              >
                                <span className="sr-only">Mở menu</span>
                                <MoreVertical className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem
                                onClick={() => navigate(`/order-confirmation?orderId=${order.orderId || order.id}`)}
                              >
                                Xem chi tiết
                              </DropdownMenuItem>
                              {canPay(order) && (
                                <>
                                  <DropdownMenuSeparator />
                                  <DropdownMenuItem
                                    onClick={() => handlePay(order)}
                                    className="text-green-600"
                                  >
                                    Thanh toán
                                  </DropdownMenuItem>
                                </>
                              )}
                              {canCancel(order) && (
                                <>
                                  <DropdownMenuSeparator />
                                  <DropdownMenuItem
                                    onClick={() => handleCancelClick(order)}
                                    className="text-red-600"
                                  >
                                    Hủy đơn
                                  </DropdownMenuItem>
                                </>
                              )}
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}

            {/* Pagination Controls */}
            {orders.length > 0 && (
              <div className="pagination-controls">
                <div className="pagination-info">
                  Hiển thị {startIndex + 1}-{Math.min(endIndex, orders.length)} / {orders.length} đơn hàng
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
                    onClick={() => setCurrentPage(currentPage - 1)}
                    disabled={currentPage === 1}
                  >
                    ‹
                  </button>
                  
                  <span className="page-indicator">
                    Trang {currentPage} / {totalPages || 1}
                  </span>
                  
                  <button 
                    className="pg-btn"
                    onClick={() => setCurrentPage(currentPage + 1)}
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
                
                <div className="page-size-selector">
                  <label>Hiển thị: </label>
                  <select value={pageSize} onChange={(e) => {
                    setPageSize(Number(e.target.value));
                    setCurrentPage(1);
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
      </div>

      {/* Cancel Confirmation Dialog */}
      <ConfirmationDialog
        open={cancelDialogOpen}
        onOpenChange={setCancelDialogOpen}
        title="Xác nhận hủy đơn hàng"
        message={
          orderToCancel
            ? `Bạn có chắc chắn muốn hủy đơn hàng #${String(orderToCancel.orderId || orderToCancel.id || '').padStart(6, '0')}? Hành động này không thể hoàn tác.`
            : 'Bạn có chắc chắn muốn hủy đơn hàng này?'
        }
        confirmText="Xác nhận hủy"
        cancelText="Không"
        onConfirm={handleConfirmCancel}
        variant="danger"
      />
    </div>
  );
};

export default UserOrders;

