import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useNotification } from '../context/NotificationContext';
import * as userService from '../services/userService';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { Input } from '../components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../components/ui/table';
import { Search, ArrowLeft, ShoppingCart } from 'lucide-react';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  BarController,
  Title,
  Tooltip,
  Legend,
} from 'chart.js';
import { getBaseURL } from '../config/api';
import { normalizeImageUrl } from '../utils/productUtils';
import './UserSpending.css';

// Register Chart.js components
ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  BarController,
  Title,
  Tooltip,
  Legend
);

const UserSpending = () => {
  const navigate = useNavigate();
  const { isAuthenticated } = useAuth();
  const { error: showError } = useNotification();
  
  const [consumptionData, setConsumptionData] = useState(null);
  const [purchasedProducts, setPurchasedProducts] = useState([]);
  const [searchProduct, setSearchProduct] = useState('');
  const [loading, setLoading] = useState(false);
  const [chartDataReady, setChartDataReady] = useState(false);
  
  // Chart refs
  const chartRef = useRef(null);
  const chartInstanceRef = useRef(null);

  useEffect(() => {
    if (!isAuthenticated) {
      navigate('/login');
      return;
    }
    loadData();
  }, [isAuthenticated]);

  const loadData = async () => {
    try {
      setLoading(true);
      
      if (import.meta.env.DEV) {
        console.log('[UserSpending] loadData() called');
      }
      
      // Load consumption data
      try {
        if (import.meta.env.DEV) {
          console.log('[UserSpending] About to call getConsumption()...');
        }
        const data = await userService.getConsumption();
        
        if (import.meta.env.DEV) {
          console.log('[UserSpending] getConsumption() returned:', data);
        }
        
        if (import.meta.env.DEV) {
          console.log('[UserSpending] Consumption data received:', data);
          console.log('[UserSpending] Data type:', typeof data);
          console.log('[UserSpending] Is null/undefined:', data === null || data === undefined);
          if (data) {
            console.log('[UserSpending] Data keys:', Object.keys(data));
            console.log('[UserSpending] Monthly data:', data?.monthlyData);
            console.log('[UserSpending] Monthly data type:', Array.isArray(data?.monthlyData) ? 'array' : typeof data?.monthlyData);
            console.log('[UserSpending] Monthly data length:', data?.monthlyData?.length);
          }
        }
        
        // API returns: { success: true, message: "...", data: { totalConsumption, averageMonthly, totalProducts, monthlyData: [...] } }
        // userService.getConsumption() returns response.data (the inner data object)
        // So data should be: { totalConsumption, averageMonthly, totalProducts, monthlyData: [...] }
        
        if (data && typeof data === 'object') {
          // Check if monthlyData exists (could be monthlyData, MonthlyData, or data.monthlyData)
          const monthlyData = data.monthlyData || data.MonthlyData || (data.data && data.data.monthlyData) || [];
          
          if (Array.isArray(monthlyData) && monthlyData.length > 0) {
            const normalizedData = {
              totalConsumption: data.totalConsumption || data.TotalConsumption || 0,
              averageMonthly: data.averageMonthly || data.AverageMonthly || 0,
              totalProducts: data.totalProducts || data.TotalProducts || 0,
              monthlyData: monthlyData
            };
            
            if (import.meta.env.DEV) {
              console.log('[UserSpending] Normalized data:', normalizedData);
              console.log('[UserSpending] First monthlyData item:', monthlyData[0]);
            }
            
            setConsumptionData(normalizedData);
          } else {
            console.warn('[UserSpending] Monthly data is empty or invalid:', monthlyData);
            console.warn('[UserSpending] Full data object:', data);
            setConsumptionData(null);
          }
        } else {
          console.warn('[UserSpending] Invalid consumption data format:', data);
          setConsumptionData(null);
        }
      } catch (consumptionErr) {
        console.error('[UserSpending] Error loading consumption data:', consumptionErr);
        console.error('[UserSpending] Error name:', consumptionErr.name);
        console.error('[UserSpending] Error message:', consumptionErr.message);
        console.error('[UserSpending] Error stack:', consumptionErr.stack);
        // Don't show error to user, just log it
        setConsumptionData(null);
      }
      
      // Load purchases
      if (import.meta.env.DEV) {
        console.log('[UserSpending] Calling getPurchases()...');
      }
      const purchases = await userService.getPurchases();
      
      if (import.meta.env.DEV) {
        console.log('[UserSpending] Purchases data received:', purchases);
      }
      
      setPurchasedProducts(purchases || []);
    } catch (err) {
      console.error('[UserSpending] Error loading spending data:', err);
      console.error('[UserSpending] Error name:', err.name);
      console.error('[UserSpending] Error message:', err.message);
      showError(err.message || 'Không thể tải dữ liệu chi tiêu');
    } finally {
      setLoading(false);
      if (import.meta.env.DEV) {
        console.log('[UserSpending] loadData() completed');
      }
    }
  };

  // Create chart when consumption data changes or component mounts
  useEffect(() => {
    // Wait a bit for chartRef to be ready (DOM might not be ready immediately)
    const timer = setTimeout(() => {
      if (!chartRef.current) {
        if (import.meta.env.DEV) {
          console.log('[UserSpending] Chart ref still not ready after timeout');
        }
        return;
      }

      if (import.meta.env.DEV) {
        console.log('[UserSpending] Chart useEffect triggered, consumptionData:', consumptionData);
        console.log('[UserSpending] Chart ref ready:', !!chartRef.current);
      }

      // Destroy existing chart
      if (chartInstanceRef.current) {
        chartInstanceRef.current.destroy();
        chartInstanceRef.current = null;
      }

    // Get monthlyData or create empty data
    let monthlyData = [];
    if (consumptionData) {
      monthlyData = consumptionData.monthlyData || consumptionData.MonthlyData || consumptionData.data || [];
    }
    
    // If monthlyData is not an array or empty, create empty chart with 12 months
    if (!Array.isArray(monthlyData) || monthlyData.length === 0) {
      if (import.meta.env.DEV) {
        console.log('[UserSpending] No monthly data, creating empty chart with 12 months');
      }
      monthlyData = Array.from({ length: 12 }, (_, i) => ({
        month: `T${i + 1}`,
        amount: 0
      }));
    }

    const labels = monthlyData.map(d => {
      if (typeof d === 'string') return d;
      return d.month || d.Month || d.label || d.name || '';
    });
    const data = monthlyData.map(d => {
      if (typeof d === 'number') return d;
      return d.amount || d.Amount || d.value || d.total || 0;
    });

    if (import.meta.env.DEV) {
      console.log('[UserSpending] Creating chart with labels:', labels, 'data:', data);
      console.log('[UserSpending] First monthlyData item:', monthlyData[0]);
    }

    // Calculate max value for better scaling (add 20% padding so bars don't hit the top)
    const maxValue = Math.max(...data, 0);
    const suggestedMax = maxValue > 0 ? Math.ceil(maxValue * 1.2) : 1000; // Default to 1000 if all zeros

    // Create initial data with all zeros
    const initialData = {
      labels: labels,
      datasets: [
        {
          label: 'Chi tiêu (VNĐ)',
          data: new Array(data.length).fill(0), // Start with zeros
          backgroundColor: 'rgba(16, 185, 129, 0.8)',
          borderColor: 'rgba(16, 185, 129, 1)',
          borderWidth: 1,
        },
      ],
    };

    // Final data with actual values
    const finalData = {
      labels: labels,
      datasets: [
        {
          label: 'Chi tiêu (VNĐ)',
          data: data, // Actual values
          backgroundColor: 'rgba(16, 185, 129, 0.8)',
          borderColor: 'rgba(16, 185, 129, 1)',
          borderWidth: 1,
        },
      ],
    };

      // Create chart with zeros first (no animation)
      try {
        chartInstanceRef.current = new ChartJS(chartRef.current, {
          type: 'bar',
          data: initialData,
          options: {
            responsive: true,
            maintainAspectRatio: false,
            animation: false, // No animation for initial render
            plugins: {
              legend: {
                display: false,
              },
              tooltip: {
                callbacks: {
                  label: function(context) {
                    return `${context.parsed.y.toLocaleString('vi-VN')} VNĐ`;
                  }
                }
              }
            },
            scales: {
              y: {
                beginAtZero: true,
                suggestedMax: suggestedMax, // Add padding so bars don't hit the top
                ticks: {
                  callback: function(value) {
                    return value.toLocaleString('vi-VN') + 'đ';
                  }
                }
              }
            }
          },
        });

        if (import.meta.env.DEV) {
          console.log('[UserSpending] Chart created with zeros, updating with real data...');
        }

        // Update chart with real data after a short delay to trigger animation from 0
        setTimeout(() => {
          if (chartInstanceRef.current) {
            // Enable animation
            chartInstanceRef.current.options.animation = {
              duration: 3000, // 3 seconds
              easing: 'easeOutCubic'
            };
            // Update data - Chart.js will animate from 0 (current) to actual values
            chartInstanceRef.current.data = finalData;
            chartInstanceRef.current.update('active'); // Update with animation
          }
        }, 100);
      } catch (chartErr) {
        console.error('[UserSpending] Error creating chart:', chartErr);
      }
    }, 100); // Small delay to ensure chartRef is ready

    return () => {
      clearTimeout(timer);
      if (chartInstanceRef.current) {
        chartInstanceRef.current.destroy();
        chartInstanceRef.current = null;
      }
    };
  }, [consumptionData, loading]); // Add loading as dependency to ensure chart is created after data loads

  const getImageUrl = (imageUrl) => {
    if (!imageUrl) return '/placeholder.svg';
    return normalizeImageUrl(imageUrl) || '/placeholder.svg';
  };

  const filteredProducts = purchasedProducts.filter((product) =>
    product.productName?.toLowerCase().includes(searchProduct.toLowerCase()) ||
    product.name?.toLowerCase().includes(searchProduct.toLowerCase())
  );

  return (
    <div className="user-spending-page">
      <div className="container mx-auto px-4 py-8 max-w-7xl">
        <div className="mb-6 flex items-center gap-4">
          <button
            onClick={() => navigate(-1)}
            className="text-gray-600 hover:text-gray-900"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Tiêu dùng</h1>
            <p className="text-gray-600 mt-1">Theo dõi chi tiêu và lịch sử mua hàng của bạn</p>
          </div>
        </div>

        {/* Consumption Chart */}
        <Card className="mb-6 shadow-lg border-0">
          <CardHeader className="text-white" style={{ background: 'linear-gradient(to right, #0a804a, #086b3d)' }}>
            <CardTitle>Biểu đồ chi tiêu 12 tháng gần nhất</CardTitle>
            <CardDescription className="text-white/80">Tổng quan chi tiêu của bạn</CardDescription>
          </CardHeader>
          <CardContent className="pt-6">
            {loading ? (
              <div className="text-center py-8 text-gray-500">
                <p>Đang tải...</p>
              </div>
            ) : (
              <>
                {/* Only show summary cards if we have consumption data */}
                {consumptionData && consumptionData.totalConsumption > 0 && (
                  <div className="grid gap-4 md:grid-cols-3 mb-6">
                    <Card className="bg-emerald-50 border-emerald-200">
                      <CardContent className="pt-6">
                        <div className="text-sm text-gray-600">Tổng chi tiêu</div>
                        <div className="text-2xl font-bold text-emerald-700">
                          {consumptionData.totalConsumption?.toLocaleString('vi-VN')}đ
                        </div>
                      </CardContent>
                    </Card>
                    <Card className="bg-teal-50 border-teal-200">
                      <CardContent className="pt-6">
                        <div className="text-sm text-gray-600">Trung bình/tháng</div>
                        <div className="text-2xl font-bold text-teal-700">
                          {Math.round(consumptionData.averageMonthly || 0).toLocaleString('vi-VN')}đ
                        </div>
                      </CardContent>
                    </Card>
                    <Card className="bg-blue-50 border-blue-200">
                      <CardContent className="pt-6">
                        <div className="text-sm text-gray-600">Sản phẩm đã mua</div>
                        <div className="text-2xl font-bold text-blue-700">
                          {consumptionData.totalProducts || 0} sản phẩm
                        </div>
                      </CardContent>
                    </Card>
                  </div>
                )}
                {/* Always show chart, even if no data */}
                <div className="h-80 w-full">
                  <canvas ref={chartRef}></canvas>
                </div>
              </>
            )}
          </CardContent>
        </Card>

        {/* Purchased Products */}
        <Card className="shadow-lg border-0">
          <CardHeader className="text-white" style={{ background: 'linear-gradient(to right, #0a804a, #086b3d)' }}>
            <CardTitle>Danh sách sản phẩm đã mua</CardTitle>
            <CardDescription className="text-white/80">Lịch sử mua hàng của bạn</CardDescription>
          </CardHeader>
          <CardContent className="pt-6">
            <div className="mb-4 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                placeholder="Tìm kiếm sản phẩm..."
                value={searchProduct}
                onChange={(e) => setSearchProduct(e.target.value)}
                className="pl-10 border-gray-300"
              />
            </div>
            <div className="rounded-lg border border-gray-200 overflow-hidden">
              <Table>
                <TableHeader className="bg-gray-50">
                  <TableRow>
                    <TableHead className="w-[100px]">Hình ảnh</TableHead>
                    <TableHead>Tên sản phẩm</TableHead>
                    <TableHead>Ngày mua</TableHead>
                    <TableHead className="text-right">Giá mua</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredProducts.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={4} className="text-center py-8 text-gray-500">
                        {searchProduct ? 'Không tìm thấy sản phẩm' : 'Danh sách mua hàng trống'}
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredProducts.map((product) => (
                      <TableRow key={product.orderId || product.id} className="hover:bg-gray-50">
                        <TableCell>
                          <img
                            src={getImageUrl(product.imageUrl || product.image)}
                            alt={product.productName || product.name}
                            className="w-16 h-16 object-cover rounded"
                            onError={(e) => {
                              e.target.src = '/placeholder.svg';
                            }}
                          />
                        </TableCell>
                        <TableCell className="font-medium">
                          {product.productName || product.name}
                        </TableCell>
                        <TableCell>
                          {product.purchaseDate
                            ? new Date(product.purchaseDate).toLocaleDateString('vi-VN')
                            : '-'}
                        </TableCell>
                        <TableCell className="text-right font-semibold text-emerald-700">
                          {product.priceAtPurchase?.toLocaleString('vi-VN')}đ
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default UserSpending;

