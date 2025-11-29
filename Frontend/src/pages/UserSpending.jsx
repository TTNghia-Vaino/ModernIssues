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
      // Load consumption data
      const data = await userService.getConsumption();
      setConsumptionData(data);
      
      // Load purchases
      const purchases = await userService.getPurchases();
      setPurchasedProducts(purchases || []);
    } catch (err) {
      console.error('Error loading spending data:', err);
      showError(err.message || 'Không thể tải dữ liệu chi tiêu');
    } finally {
      setLoading(false);
    }
  };

  // Create chart when consumption data changes
  useEffect(() => {
    if (!consumptionData || !chartRef.current) {
      return;
    }

    // Destroy existing chart
    if (chartInstanceRef.current) {
      chartInstanceRef.current.destroy();
      chartInstanceRef.current = null;
    }

    const chartData = {
      labels: consumptionData.monthlyData?.map(d => d.month) || [],
      datasets: [
        {
          label: 'Chi tiêu (VNĐ)',
          data: consumptionData.monthlyData?.map(d => d.amount) || [],
          backgroundColor: 'rgba(16, 185, 129, 0.8)',
          borderColor: 'rgba(16, 185, 129, 1)',
          borderWidth: 1,
        },
      ],
    };

    // Create new chart
    chartInstanceRef.current = new ChartJS(chartRef.current, {
      type: 'bar',
      data: chartData,
      options: {
        responsive: true,
        maintainAspectRatio: false,
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
            ticks: {
              callback: function(value) {
                return value.toLocaleString('vi-VN') + 'đ';
              }
            }
          }
        }
      },
    });

    return () => {
      if (chartInstanceRef.current) {
        chartInstanceRef.current.destroy();
        chartInstanceRef.current = null;
      }
    };
  }, [consumptionData]);

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
            ) : consumptionData ? (
              <>
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
                <div className="h-80 w-full">
                  <canvas ref={chartRef}></canvas>
                </div>
              </>
            ) : (
              <div className="text-center py-8 text-gray-500">
                <p>Chưa có dữ liệu chi tiêu</p>
              </div>
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
                        {searchProduct ? 'Không tìm thấy sản phẩm' : 'Chưa có sản phẩm nào'}
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

