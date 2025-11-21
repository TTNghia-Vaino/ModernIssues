import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  BarController,
  ArcElement,
  DoughnutController,
  PieController,
  Title,
  Tooltip,
  Legend
} from 'chart.js';
import { getProductReport, getBestSellingProducts } from '../services/productService';
import { getOrderReport, getRevenueReport, getPaymentMethodReport, getOrderStatusReport } from '../services/orderService';
import { getUserReport } from '../services/userService';
import './AdminDashboard.css';

// Register Chart.js components
ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  BarController,
  ArcElement,
  DoughnutController,
  PieController,
  Title,
  Tooltip,
  Legend
);

// Report type configurations - moved outside component as constant
const reportTypes = [
  { value: 'product', label: 'Báo cáo Sản phẩm', color: '#3498db' },
  { value: 'order', label: 'Báo cáo Đơn hàng', color: '#2ecc71' },
  { value: 'user', label: 'Báo cáo Người dùng', color: '#f39c12' },
  { value: 'revenue', label: 'Báo cáo Doanh thu', color: '#e74c3c' }
];

// Transform report data to chart format - moved outside component as pure function
const transformReportData = (data, type) => {
  const currentReport = reportTypes.find(r => r.value === type);
  
  let labels = [];
  let values = [];

  if (Array.isArray(data) && data.length > 0) {
    switch (type) {
      case 'product':
      case 'order':
      case 'user':
        labels = data.map(item => item.period || 'N/A');
        values = data.map(item => item.count || 0);
        break;
      case 'revenue':
        labels = data.map(item => item.period || 'N/A');
        values = data.map(item => item.revenue || 0);
        break;
      default:
        break;
    }
  }

  const formattedLabels = labels.length > 0 ? labels : ['Không có dữ liệu'];
  const formattedValues = values.length > 0 ? values : [0];

  return {
    labels: formattedLabels,
    datasets: [{
      label: currentReport?.label || 'Dữ liệu',
      data: formattedValues,
      backgroundColor: currentReport?.color || '#3498db',
      borderColor: currentReport?.color || '#3498db',
      borderWidth: 1,
    }]
  };
};

const AdminDashboard = () => {
  const { isInTokenGracePeriod } = useAuth();
  const [loading, setLoading] = useState(true);
  const [reportType, setReportType] = useState('product'); // 'product', 'order', 'user', 'revenue'
  const [period, setPeriod] = useState('month'); // 'day', 'month', 'quarter', 'year'
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [chartData, setChartData] = useState(null);
  // Cache data by reportType and period: { reportType: { period: data } }
  const [reportsData, setReportsData] = useState({
    product: { day: null, month: null, quarter: null, year: null },
    order: { day: null, month: null, quarter: null, year: null },
    user: { day: null, month: null, quarter: null, year: null },
    revenue: { day: null, month: null, quarter: null, year: null }
  });
  const [error, setError] = useState(null);
  const chartRef = useRef(null);
  const chartInstanceRef = useRef(null);
  const abortControllerRef = useRef(null);
  
  // Secondary charts data
  const [secondaryChartType, setSecondaryChartType] = useState('payment'); // 'payment' or 'status'
  const [secondaryPeriod, setSecondaryPeriod] = useState('month');
  const [secondaryStartDate, setSecondaryStartDate] = useState('');
  const [secondaryEndDate, setSecondaryEndDate] = useState('');
  const [paymentData, setPaymentData] = useState([]);
  const [statusData, setStatusData] = useState([]);
  const [bestSellingProducts, setBestSellingProducts] = useState([]);
  const [secondaryLoading, setSecondaryLoading] = useState(false);
  const secondaryChartRef = useRef(null);
  const secondaryChartInstanceRef = useRef(null);

  const periodLabels = {
    day: 'Ngày',
    month: 'Tháng',
    quarter: 'Quý',
    year: 'Năm'
  };

  // Update chart when switching tabs or period - use cached data (instant switch, no loading)
  useEffect(() => {
    const cachedData = reportsData[reportType]?.[period];
    if (cachedData) {
      setChartData(cachedData);
      setLoading(false);
      setError(null);
    } else {
      // Check if any data has been loaded
      const hasAnyData = Object.values(reportsData).some(report => 
        Object.values(report).some(data => data !== null)
      );
      if (!hasAnyData) {
        // Only show loading if no data has been loaded yet
        setLoading(true);
      }
    }
  }, [reportType, period, reportsData]);

  // Create/update chart when chartData changes
  useEffect(() => {
    if (!chartData || !chartRef.current) {
      return;
    }

    const currentReport = reportTypes.find(r => r.value === reportType);

    // Destroy existing chart
    if (chartInstanceRef.current) {
      chartInstanceRef.current.destroy();
      chartInstanceRef.current = null;
    }

    // Create new chart
    chartInstanceRef.current = new ChartJS(chartRef.current, {
      type: 'bar',
      data: chartData,
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            display: true,
            position: 'top',
          },
          title: {
            display: true,
            text: currentReport?.label || 'Báo cáo',
            font: {
              size: 18,
              weight: 'bold'
            }
          },
          tooltip: {
            mode: 'index',
            intersect: false,
            callbacks: {
              label: function(context) {
                if (reportType === 'revenue') {
                  return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(context.parsed.y);
                }
                return context.parsed.y.toLocaleString('vi-VN');
              }
            }
          }
        },
        scales: {
          y: {
            beginAtZero: true,
            suggestedMax: chartData && chartData.datasets && chartData.datasets[0] && chartData.datasets[0].data.length > 0
              ? (() => {
                  const maxValue = Math.max(...chartData.datasets[0].data.filter(val => val != null && !isNaN(val)));
                  return maxValue > 0 ? maxValue * 1.2 : undefined;
                })()
              : undefined,
            ticks: {
              callback: function(value) {
                if (reportType === 'revenue') {
                  return `${(value / 1000).toFixed(0)}K`;
                }
                return value.toString();
              }
            }
          },
          x: {
            ticks: {
              maxRotation: 45,
              minRotation: 45
            }
          }
        }
      }
    });

    // Cleanup on unmount
    return () => {
      if (chartInstanceRef.current) {
        chartInstanceRef.current.destroy();
        chartInstanceRef.current = null;
      }
    };
  }, [chartData, reportType]);

  // Create/update secondary pie chart
  useEffect(() => {
    if (!secondaryChartRef.current) {
      return;
    }
    
    const data = secondaryChartType === 'payment' ? paymentData : statusData;
    
    if (!data || data.length === 0) {
      // Destroy existing chart if no data
      if (secondaryChartInstanceRef.current) {
        secondaryChartInstanceRef.current.destroy();
        secondaryChartInstanceRef.current = null;
      }
      return;
    }
    
    // Destroy existing chart
    if (secondaryChartInstanceRef.current) {
      secondaryChartInstanceRef.current.destroy();
      secondaryChartInstanceRef.current = null;
    }
    
    // Create new donut chart with animation
    secondaryChartInstanceRef.current = new ChartJS(secondaryChartRef.current, {
      type: 'doughnut',
      data: {
        labels: data.map(item => item.name),
        datasets: [{
          data: data.map(item => item.value),
          backgroundColor: data.map(item => item.color),
          borderWidth: 2,
          borderColor: '#fff',
          hoverBorderWidth: 3,
          hoverOffset: 8
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        cutout: '60%', // Creates donut shape (60% inner radius)
        plugins: {
          legend: {
            position: 'bottom',
            labels: {
              padding: 15,
              font: {
                size: 12
              },
              usePointStyle: true,
              pointStyle: 'circle'
            }
          },
          tooltip: {
            callbacks: {
              label: function(context) {
                const label = context.label || '';
                const value = context.parsed || 0;
                const total = context.dataset.data.reduce((a, b) => a + b, 0);
                const percentage = ((value / total) * 100).toFixed(1);
                return `${label}: ${value} (${percentage}%)`;
              }
            }
          },
          // Percentage will be shown in tooltip instead
        },
        animation: {
          animateRotate: true,
          animateScale: true,
          duration: 1000,
          easing: 'easeOutQuart'
        },
        elements: {
          arc: {
            borderRadius: 4,
            borderJoinStyle: 'round'
          }
        }
      }
    });
    
    // Cleanup on unmount
    return () => {
      if (secondaryChartInstanceRef.current) {
        secondaryChartInstanceRef.current.destroy();
        secondaryChartInstanceRef.current = null;
      }
    };
  }, [secondaryChartType, paymentData, statusData]);

  // Load all reports for all periods in parallel - wrapped in useCallback
  const loadAllReportsForAllPeriods = useCallback(async (signal = null) => {
    try {
      if (signal && signal.aborted) {
        return;
      }
      
      setLoading(true);
      setError(null);

      const periods = ['day', 'month', 'quarter', 'year'];
      const reportTypesArray = ['product', 'order', 'user', 'revenue'];
      
      // Build base params
      const baseParams = {};
      if (startDate) baseParams.startDate = startDate;
      if (endDate) baseParams.endDate = endDate;

      // Create all API calls for all combinations
      const apiCalls = [];
      const callKeys = [];
      
      periods.forEach(periodValue => {
        reportTypesArray.forEach(reportTypeValue => {
          const params = { ...baseParams, period: periodValue };
          
          let apiCall;
          switch (reportTypeValue) {
            case 'product':
              apiCall = getProductReport(params);
              break;
            case 'order':
              apiCall = getOrderReport(params);
              break;
            case 'user':
              apiCall = getUserReport(params);
              break;
            case 'revenue':
              apiCall = getRevenueReport(params);
              break;
            default:
              apiCall = Promise.resolve([]);
          }
          
          apiCalls.push(
            apiCall.catch(err => {
              if (signal && signal.aborted) return [];
              console.warn(`[AdminDashboard] Error loading ${reportTypeValue} report (${periodValue}):`, err);
              return [];
            })
          );
          
          callKeys.push({ reportType: reportTypeValue, period: periodValue });
        });
      });

      // Load all in parallel
      const results = await Promise.all(apiCalls);

      if (signal && signal.aborted) {
        return;
      }

      // Transform and cache all reports by type and period
      const newReportsData = {
        product: { day: null, month: null, quarter: null, year: null },
        order: { day: null, month: null, quarter: null, year: null },
        user: { day: null, month: null, quarter: null, year: null },
        revenue: { day: null, month: null, quarter: null, year: null }
      };

      results.forEach((data, index) => {
        const { reportType: type, period: periodValue } = callKeys[index];
        newReportsData[type][periodValue] = transformReportData(data, type);
      });

      setReportsData(newReportsData);
      
      // Update current chart with selected report type and period
      const currentData = newReportsData[reportType]?.[period];
      if (currentData) {
        setChartData(currentData);
      }
      
      setError(null);

    } catch (error) {
      if (signal && signal.aborted) {
        return;
      }
      
      if (error.name === 'AbortError' || error.message?.includes('aborted')) {
        return;
      }
      
      console.error('[AdminDashboard] Error loading reports:', error);
      setError(error.message || 'Không thể tải dữ liệu báo cáo');
    } finally {
      if (!signal || !signal.aborted) {
        setLoading(false);
      }
    }
  }, [startDate, endDate, reportType, period]);

  // Load all reports for all periods when component mounts or date changes
  useEffect(() => {
    // Cancel previous request if exists
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    
    // Create new AbortController for this request
    abortControllerRef.current = new AbortController();
    const signal = abortControllerRef.current.signal;
    
    let cancelled = false;
    
    const attemptLoad = async () => {
      if (isInTokenGracePeriod) {
        console.log('[AdminDashboard] Waiting for token grace period to end');
        await new Promise(resolve => setTimeout(resolve, 6000));
        if (cancelled || signal.aborted) return;
      }
      
      if (!cancelled && !signal.aborted) {
        // Load all report types for all periods in parallel
        loadAllReportsForAllPeriods(signal);
      }
    };
    
    attemptLoad();
    
    return () => {
      cancelled = true;
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, [startDate, endDate, isInTokenGracePeriod, loadAllReportsForAllPeriods]); // Load when date changes, not when period/reportType changes

  // Load secondary charts data and best selling products
  useEffect(() => {
    const loadSecondaryData = async () => {
      try {
        setSecondaryLoading(true);
        
        const params = { period: secondaryPeriod };
        if (secondaryStartDate) params.startDate = secondaryStartDate;
        if (secondaryEndDate) params.endDate = secondaryEndDate;
        
        // Load payment method report, order status report, and best selling products in parallel
        const [paymentResult, statusResult, bestSellingResult] = await Promise.all([
          getPaymentMethodReport(params).catch(err => {
            console.warn('[AdminDashboard] Error loading payment method report:', err);
            return [];
          }),
          getOrderStatusReport(params).catch(err => {
            console.warn('[AdminDashboard] Error loading order status report:', err);
            return [];
          }),
          getBestSellingProducts({ limit: 5, ...params }).catch(err => {
            console.warn('[AdminDashboard] Error loading best selling products:', err);
            return [];
          })
        ]);
        
        // Transform payment data
        if (Array.isArray(paymentResult) && paymentResult.length > 0) {
          const transformed = paymentResult.map(item => {
            const paymentMethod = item.paymentMethod || '';
            const getColor = (method) => {
              switch (method) {
                case 'COD': return '#3b82f6';
                case 'VNPay': return '#10b981';
                case 'Momo': return '#f59e0b';
                case 'TRANSFER': return '#8b5cf6';
                default: return '#6b7280';
              }
            };
            
            return {
              name: item.paymentMethodDisplay || item.paymentMethod || 'N/A',
              value: item.orderCount || item.count || 0,
              color: getColor(paymentMethod)
            };
          });
          setPaymentData(transformed);
        } else {
          setPaymentData([]);
        }
        
        // Transform status data
        if (Array.isArray(statusResult) && statusResult.length > 0) {
          const transformed = statusResult.map(item => {
            const status = item.status || '';
            const getColor = (statusValue) => {
              switch (statusValue) {
                case 'delivered': return '#10b981'; // Green
                case 'shipped': return '#3b82f6'; // Blue
                case 'processing': return '#6366f1'; // Indigo
                case 'pending': return '#f59e0b'; // Orange
                case 'cancelled': return '#ef4444'; // Red
                case 'returned': return '#f97316'; // Orange-red
                default: return '#6b7280'; // Gray
              }
            };
            
            return {
              name: item.statusDisplay || item.status || 'N/A',
              value: item.orderCount || item.count || 0,
              color: getColor(status)
            };
          });
          setStatusData(transformed);
        } else {
          setStatusData([]);
        }
        
        // Transform best selling products
        if (Array.isArray(bestSellingResult) && bestSellingResult.length > 0) {
          const transformed = bestSellingResult.map(item => ({
            id: item.productId || item.id,
            name: item.productName || item.name || 'N/A',
            sales: item.quantitySold || item.sales || 0,
            revenue: item.totalRevenue || item.revenue || 0
          }));
          setBestSellingProducts(transformed);
        } else {
          setBestSellingProducts([]);
        }
        
      } catch (error) {
        console.error('[AdminDashboard] Error loading secondary data:', error);
      } finally {
        setSecondaryLoading(false);
      }
    };
    
    loadSecondaryData();
  }, [secondaryPeriod, secondaryStartDate, secondaryEndDate]);



  const currentReport = reportTypes.find(r => r.value === reportType);
  
  // Calculate stats from chart data
  const totalValue = chartData && chartData.datasets && chartData.datasets[0] 
    ? chartData.datasets[0].data.reduce((sum, val) => sum + (val || 0), 0)
    : 0;
  const dataLength = chartData && chartData.datasets && chartData.datasets[0] 
    ? chartData.datasets[0].data.length 
    : 0;
  const averageValue = dataLength > 0 ? Math.round(totalValue / dataLength) : 0;
  const maxValue = chartData && chartData.datasets && chartData.datasets[0] && chartData.datasets[0].data.length > 0
    ? Math.max(...chartData.datasets[0].data.map(val => val || 0))
    : 0;

  if (loading && !chartData) {
    return (
      <div className="admin-dashboard">
        <div className="dashboard-header">
          <h2>Dashboard</h2>
          <p>Chào mừng trở lại, Admin!</p>
        </div>
        <div style={{ textAlign: 'center', padding: '40px' }}>Đang tải dữ liệu...</div>
      </div>
    );
  }

  return (
    <div className="admin-dashboard">
      <div className="dashboard-header">
        <h2>Dashboard</h2>
        <p>Chào mừng trở lại, Admin!</p>
      </div>

      <div className="dashboard-card">
        <div className="card-header">
          <div className="report-tabs">
            {reportTypes.map(type => (
              <button
                key={type.value}
                className={`report-tab ${reportType === type.value ? 'active' : ''}`}
                onClick={() => setReportType(type.value)}
                style={{
                  borderBottomColor: reportType === type.value ? type.color : 'transparent',
                  color: reportType === type.value ? type.color : '#666'
                }}
              >
                {type.label}
              </button>
            ))}
          </div>

          {/* Controls */}
          <div className="report-controls">
            {/* Date Range */}
            <div className="control-group">
              <label>Từ ngày:</label>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="date-input"
              />
            </div>

            <div className="control-group">
              <label>Đến ngày:</label>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="date-input"
              />
            </div>

            {/* Period Selector */}
            <div className="control-group">
              <label>Chu kỳ:</label>
              <div className="period-buttons">
                {Object.entries(periodLabels).map(([key, label]) => (
                  <button
                    key={key}
                    className={`period-btn ${period === key ? 'active' : ''}`}
                    onClick={() => setPeriod(key)}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>

          </div>
        </div>

        <div className="card-content">
          {error && (
            <div className="error-message">
              {error}
            </div>
          )}

          {/* Chart */}
          <div className="chart-section">
            <h3 className="chart-title">
              {currentReport?.label} - Biểu đồ cột
            </h3>
            
            <div className="chart-container">
              <canvas ref={chartRef}></canvas>
            </div>
          </div>

          {/* Summary Stats */}
          <div className="summary-stats">
            <div className="stat-card stat-card-blue">
              <p className="stat-label">Tổng cộng</p>
              <p className="stat-value">
                {reportType === 'revenue' 
                  ? new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(totalValue)
                  : totalValue.toLocaleString('vi-VN')
                }
              </p>
            </div>

            <div className="stat-card stat-card-green">
              <p className="stat-label">Trung bình</p>
              <p className="stat-value">
                {reportType === 'revenue' 
                  ? new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(averageValue)
                  : averageValue.toLocaleString('vi-VN')
                }
              </p>
            </div>

            <div className="stat-card stat-card-purple">
              <p className="stat-label">Cao nhất</p>
              <p className="stat-value">
                {reportType === 'revenue' 
                  ? new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(maxValue)
                  : maxValue.toLocaleString('vi-VN')
                }
              </p>
            </div>
          </div>
        </div>

        {/* Secondary Charts and Best Selling Products */}
        <div className="secondary-charts-grid">
          {/* Left: Secondary Charts with tabs */}
          <div className="dashboard-card">
            <div className="card-header">
              <div className="space-y-4">
                <div className="report-tabs">
                  <button
                    className={`report-tab ${secondaryChartType === 'payment' ? 'active' : ''}`}
                    onClick={() => setSecondaryChartType('payment')}
                    style={{
                      borderBottomColor: secondaryChartType === 'payment' ? '#3498db' : 'transparent',
                      color: secondaryChartType === 'payment' ? '#3498db' : '#666'
                    }}
                  >
                    Tỷ lệ phương thức thanh toán
                  </button>
                  <button
                    className={`report-tab ${secondaryChartType === 'status' ? 'active' : ''}`}
                    onClick={() => setSecondaryChartType('status')}
                    style={{
                      borderBottomColor: secondaryChartType === 'status' ? '#3498db' : 'transparent',
                      color: secondaryChartType === 'status' ? '#3498db' : '#666'
                    }}
                  >
                    Số lượng đơn theo trạng thái
                  </button>
                </div>

                <div className="report-controls">
                  <div className="control-group">
                    <label>Từ ngày:</label>
                    <input
                      type="date"
                      value={secondaryStartDate}
                      onChange={(e) => setSecondaryStartDate(e.target.value)}
                      className="date-input"
                    />
                  </div>

                  <div className="control-group">
                    <label>Đến ngày:</label>
                    <input
                      type="date"
                      value={secondaryEndDate}
                      onChange={(e) => setSecondaryEndDate(e.target.value)}
                      className="date-input"
                    />
                  </div>

                  <div className="control-group">
                    <label>Chu kỳ:</label>
                    <div className="period-buttons">
                      {Object.entries(periodLabels).map(([key, label]) => (
                        <button
                          key={key}
                          className={`period-btn ${secondaryPeriod === key ? 'active' : ''}`}
                          onClick={() => setSecondaryPeriod(key)}
                        >
                          {label}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="card-content">
              {secondaryLoading ? (
                <div style={{ textAlign: 'center', padding: '40px' }}>Đang tải dữ liệu...</div>
              ) : (
                <div className="chart-container" style={{ height: '400px' }}>
                  <canvas ref={secondaryChartRef}></canvas>
                </div>
              )}
            </div>
          </div>

          {/* Right: Best Selling Products */}
          <div className="dashboard-card">
            <div className="card-header">
              <h3 className="card-title">Danh sách bán chạy</h3>
              <p className="card-description">Top 5 sản phẩm bán chạy nhất</p>
            </div>

            <div className="card-content">
              {secondaryLoading ? (
                <div style={{ textAlign: 'center', padding: '40px' }}>Đang tải dữ liệu...</div>
              ) : bestSellingProducts.length > 0 ? (
                <div className="best-selling-list">
                  {bestSellingProducts.map((product, index) => (
                    <div key={product.id} className="best-selling-item">
                      <div className="best-selling-rank">{index + 1}</div>
                      <div className="best-selling-info">
                        <p className="best-selling-name">{product.name}</p>
                        <p className="best-selling-sales">{product.sales} đã bán</p>
                      </div>
                      <div className="best-selling-revenue">
                        {new Intl.NumberFormat('vi-VN').format(product.revenue)} ₫
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div style={{ textAlign: 'center', padding: '40px', color: '#666' }}>
                  Không có dữ liệu
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminDashboard;
