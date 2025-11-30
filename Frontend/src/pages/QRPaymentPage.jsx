import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { generateQr } from '../services/paymentService';
import { signalRService } from '../services/signalRService';
import { useNotification } from '../context/NotificationContext';
import * as orderService from '../services/orderService';
import * as paymentCacheService from '../services/paymentCacheService';
import { cancelOrder as cancelExpiredOrder } from '../services/paymentExpiryService';
import './QRPaymentPage.css';

const formatPrice = (price) => price.toLocaleString('vi-VN') + '₫';

const QRPaymentPage = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { success } = useNotification();
  const [orderData, setOrderData] = useState(null);
  const [qrCodeUrl, setQrCodeUrl] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [paymentStatus, setPaymentStatus] = useState('pending'); // pending, success, failed

  useEffect(() => {
    const loadOrderData = async () => {
      try {
        setLoading(true);
        const orderId = searchParams.get('orderId');
        
        // Nếu có orderId, thử load từ cache trước
        if (orderId) {
          // Kiểm tra cache có còn hạn không
          const hasValidCache = paymentCacheService.hasValidCache(orderId);
          
          if (!hasValidCache) {
            // Cache đã hết hạn, hủy đơn hàng hiện tại
            console.log('[QRPaymentPage] Cache expired for order:', orderId);
            try {
              await cancelExpiredOrder(orderId);
              setError('Đơn hàng đã hết hạn thanh toán (quá 30 phút). Đơn hàng đã được tự động hủy.');
              setTimeout(() => {
                navigate('/orders');
              }, 3000);
              return;
            } catch (cancelError) {
              console.error('[QRPaymentPage] Error cancelling expired order:', cancelError);
              setError('Đơn hàng đã hết hạn thanh toán. Vui lòng kiểm tra trạng thái đơn hàng.');
              setTimeout(() => {
                navigate('/orders');
              }, 3000);
              return;
            }
          }
          
          const cachedData = paymentCacheService.getPaymentCache(orderId);
          if (cachedData) {
            console.log('[QRPaymentPage] Loaded order data from cache:', orderId);
            setOrderData(cachedData);
            
            // Kiểm tra thời gian còn lại
            const timeRemaining = paymentCacheService.getCacheTimeRemaining(orderId);
            const minutesRemaining = Math.floor(timeRemaining / 60000);
            console.log(`[QRPaymentPage] Cache time remaining: ${minutesRemaining} minutes`);
            
            // Use qrUrl from cached order data if available
            const qrUrlFromOrder = cachedData.qrUrl || cachedData.qrCodeUrl;
            if (qrUrlFromOrder) {
              console.log('[QRPaymentPage] Using QR URL from cache:', qrUrlFromOrder);
              setQrCodeUrl(qrUrlFromOrder);
              setLoading(false);
              return;
            } else if (cachedData.totalAmount && cachedData.totalAmount > 0) {
              // Generate QR code if not available in cache
              const gencodeToUse = cachedData.gencode || String(orderId);
              try {
                const amount = Number(cachedData.totalAmount);
                if (!isNaN(amount) && amount > 0 && gencodeToUse) {
                  const qrData = await generateQr(amount, gencodeToUse);
                  setQrCodeUrl(qrData.qrCode || qrData.imageUrl || qrData.base64 || qrData);
                  setLoading(false);
                  return;
                }
              } catch (qrError) {
                console.error('[QRPaymentPage] Error generating QR from cache:', qrError);
                // Fall through to API load
              }
            }
          }
        }
        
        // If orderId is provided in URL, load from API
        if (orderId) {
          console.log('[QRPaymentPage] Loading order from API with orderId:', orderId);
          const apiResponse = await orderService.getOrderById(orderId);
          
          console.log('[QRPaymentPage] Raw API response:', JSON.stringify(apiResponse, null, 2));
          
          // Handle nested response format: { order: {...}, order_details: [...] }
          // Or flat format: { order_id, status, total_amount, types, ... }
          let orderDetails = apiResponse;
          if (apiResponse && typeof apiResponse === 'object' && apiResponse.order) {
            // Nested format: extract order object
            orderDetails = apiResponse.order;
            console.log('[QRPaymentPage] Using nested order object:', orderDetails);
          } else {
            console.log('[QRPaymentPage] Using flat response format');
          }
          
          console.log('[QRPaymentPage] Order details after extraction:', orderDetails);
          console.log('[QRPaymentPage] All keys in orderDetails:', Object.keys(orderDetails || {}));
          
          // Check if order is pending and payment method requires QR
          const orderStatus = orderDetails.status || orderDetails.order_status;
          const paymentType = orderDetails.types || orderDetails.paymentType || orderDetails.payment_type;
          
          console.log('[QRPaymentPage] Order status:', orderStatus, 'Payment type:', paymentType);
          
          if (orderStatus && orderStatus.toLowerCase() !== 'pending') {
            setError('Đơn hàng này không còn ở trạng thái chờ thanh toán.');
            navigate('/orders');
            return;
          }
          
          if (paymentType && paymentType !== 'Transfer' && paymentType !== 'ATM' && 
              paymentType.toLowerCase() !== 'transfer' && paymentType.toLowerCase() !== 'atm') {
            setError('Đơn hàng này không sử dụng phương thức thanh toán QR.');
            navigate('/orders');
            return;
          }
          
          // Extract order ID
          const extractedOrderId = orderDetails.order_id || orderDetails.orderId || orderId;
          
          // Prepare order data - try all possible field names
          const order = {
            orderId: extractedOrderId,
            totalPrice: orderDetails.total_amount || orderDetails.totalAmount || orderDetails.total || 0,
            totalAmount: orderDetails.total_amount || orderDetails.totalAmount || orderDetails.total || 0,
            status: orderDetails.status || orderDetails.order_status || 'pending',
            paymentType: orderDetails.types || orderDetails.paymentType || orderDetails.payment_type || 'Transfer',
            paymentTypeDisplay: orderDetails.types_display || orderDetails.typesDisplay || 'Chuyển khoản',
            qrUrl: orderDetails.qrUrl || orderDetails.qrCodeUrl || orderDetails.qr_code_url || orderDetails.qr_url,
            // Try to get gencode from various sources, fallback to orderId if not found
            gencode: orderDetails.gencode || orderDetails.genCode || orderDetails.gen_code || orderDetails.gencode_value || 
                     String(extractedOrderId), // Use orderId as fallback for gencode
            orderDate: orderDetails.order_date || orderDetails.orderDate,
            items: apiResponse.order_details || orderDetails.order_details || orderDetails.orderDetails || orderDetails.items || []
          };
          
          console.log('[QRPaymentPage] Prepared order data:', order);
          console.log('[QRPaymentPage] QR URL:', order.qrUrl);
          console.log('[QRPaymentPage] Gencode:', order.gencode);
          console.log('[QRPaymentPage] Total Amount:', order.totalAmount);
          console.log('[QRPaymentPage] Order ID:', order.orderId);
          
          setOrderData(order);
          console.log('[QRPaymentPage] Loaded order data from API:', order);
          
          // Use qrUrl from order data if available
          const qrUrlFromOrder = order.qrUrl || order.qrCodeUrl;
          if (qrUrlFromOrder) {
            console.log('[QRPaymentPage] Using QR URL from order:', qrUrlFromOrder);
            setQrCodeUrl(qrUrlFromOrder);
            setLoading(false);
          } else if (order.totalAmount && order.totalAmount > 0) {
            // Generate QR code if not available
            // Use gencode if available, otherwise use orderId
            const gencodeToUse = order.gencode || String(order.orderId);
            
            console.log('[QRPaymentPage] Generating QR code with:', {
              amount: order.totalAmount,
              gencode: gencodeToUse,
              amountType: typeof order.totalAmount,
              gencodeType: typeof gencodeToUse
            });
            
            try {
              // Ensure amount is a valid number
              const amount = Number(order.totalAmount);
              if (isNaN(amount) || amount <= 0) {
                throw new Error(`Invalid amount: ${order.totalAmount}`);
              }
              
              // Ensure gencode is valid
              if (!gencodeToUse || String(gencodeToUse).trim() === '') {
                throw new Error(`Invalid gencode: ${gencodeToUse}`);
              }
              
              console.log('[QRPaymentPage] Calling generateQr with:', { amount, gencode: gencodeToUse });
              const qrData = await generateQr(amount, gencodeToUse);
              console.log('[QRPaymentPage] QR code generated successfully:', qrData);
              setQrCodeUrl(qrData.qrCode || qrData.imageUrl || qrData.base64 || qrData);
              setLoading(false);
            } catch (qrError) {
              console.error('[QRPaymentPage] Error generating QR:', qrError);
              console.error('[QRPaymentPage] QR Error details:', {
                message: qrError.message,
                stack: qrError.stack,
                amount: order.totalAmount,
                gencode: gencodeToUse
              });
              setError(`Không thể tạo mã QR: ${qrError.message || 'Vui lòng thử lại.'}`);
            }
          } else {
            console.error('[QRPaymentPage] Missing required data for QR:', {
              hasGencode: !!order.gencode,
              hasTotalAmount: !!order.totalAmount,
              totalAmount: order.totalAmount,
              gencode: order.gencode,
              orderId: order.orderId
            });
            setError('Không tìm thấy thông tin thanh toán cho đơn hàng này. Vui lòng liên hệ hỗ trợ.');
          }
        } else {
          // Fallback to localStorage (for direct checkout flow)
          const savedOrder = localStorage.getItem('pendingOrder');
          if (savedOrder) {
            try {
              const order = JSON.parse(savedOrder);
              setOrderData(order);
              console.log('[QRPaymentPage] Loaded order data from localStorage:', order);
              
              const qrUrlFromOrder = order.qrUrl || order.qrCodeUrl;
              if (qrUrlFromOrder) {
                console.log('[QRPaymentPage] Using QR URL from localStorage:', qrUrlFromOrder);
                setQrCodeUrl(qrUrlFromOrder);
                setLoading(false);
              } else {
                console.log('[QRPaymentPage] No QR URL in order data, will fetch from API');
                setLoading(true);
              }
            } catch (error) {
              console.error('[QRPaymentPage] Error parsing order data:', error);
              setError('Lỗi khi tải thông tin đơn hàng.');
              navigate('/checkout');
            }
          } else {
            console.warn('[QRPaymentPage] No orderId or pending order found');
            setError('Không tìm thấy thông tin đơn hàng.');
            navigate('/orders');
          }
        }
      } catch (err) {
        console.error('[QRPaymentPage] Error loading order:', err);
        setError(err.message || 'Lỗi khi tải thông tin đơn hàng.');
        navigate('/orders');
      } finally {
        setLoading(false);
      }
    };
    
    loadOrderData();
  }, [navigate, searchParams]);

  // Connect SignalR and listen for payment notifications
  useEffect(() => {
    let listenerId = null;
    let gencode = null;
    let isSetupComplete = false;

    const setupSignalR = async () => {
      // Prevent multiple setups
      if (isSetupComplete) {
        console.log('[QRPaymentPage] SignalR already setup, skipping');
        return;
      }

      try {
        // Use orderData from state instead of re-reading from localStorage
        if (!orderData) {
          console.log('[QRPaymentPage] No orderData, skipping SignalR setup');
          return;
        }

        gencode = orderData.gencode || orderData.genCode;
        
        if (!gencode || typeof gencode !== 'string' || gencode.trim() === '') {
          console.log('[QRPaymentPage] No valid gencode found in orderData, skipping SignalR');
          console.log('[QRPaymentPage] orderData:', orderData);
          return;
        }

        console.log('[QRPaymentPage] ===== Setting up SignalR =====');
        console.log('[QRPaymentPage] Gencode:', gencode);
        console.log('[QRPaymentPage] OrderId:', orderData.orderId || orderData.order_id || orderData.id);
        
        // Step 1: Connect to SignalR first
        console.log('[QRPaymentPage] Step 1: Connecting to SignalR...');
        await signalRService.connect();
        console.log('[QRPaymentPage] Step 1: SignalR connected');
        
        // Step 2: Register listener BEFORE joining group to ensure we don't miss notifications
        console.log('[QRPaymentPage] Step 2: Registering payment success listener...');
        listenerId = signalRService.onPaymentSuccess((data) => {
          console.log('[QRPaymentPage] ===== Payment success notification received =====');
          console.log('[QRPaymentPage] Notification data:', JSON.stringify(data, null, 2));
          console.log('[QRPaymentPage] Current gencode:', gencode);
          console.log('[QRPaymentPage] Notification gencode:', data?.gencode);
          console.log('[QRPaymentPage] Notification orderId:', data?.orderId, 'type:', typeof data?.orderId);
          
          const orderId = orderData.orderId || orderData.order_id || orderData.id;
          console.log('[QRPaymentPage] Current orderId from orderData:', orderId, 'type:', typeof orderId);
          
          // Check if gencode matches or orderId matches
          const gencodeMatch = data?.gencode === gencode;
          const orderIdMatch = data?.orderId == orderId ||  // Use == for type coercion
                               String(data?.orderId) === String(orderId) ||
                               Number(data?.orderId) === Number(orderId);
          
          console.log('[QRPaymentPage] Gencode match:', gencodeMatch, 'OrderId match:', orderIdMatch);
          console.log('[QRPaymentPage] Comparison details:', {
            'data.gencode': data?.gencode,
            'gencode': gencode,
            'data.orderId': data?.orderId,
            'orderId': orderId,
            'String(data.orderId)': String(data?.orderId),
            'String(orderId)': String(orderId)
          });
          
          // Accept notification if gencode matches OR orderId matches
          if (gencodeMatch || orderIdMatch) {
            console.log('[QRPaymentPage] ✅ Payment confirmed! Setting success status...');
            setPaymentStatus('success');
            success('Thanh toán thành công! Đơn hàng của bạn đã được xác nhận.');
            
            // Save order to lastOrder for confirmation page
            const savedOrder = localStorage.getItem('pendingOrder');
            if (savedOrder) {
              localStorage.setItem('lastOrder', savedOrder);
            }
            localStorage.removeItem('pendingOrder');
            
            // Xóa cache thanh toán khi thanh toán thành công
            const orderId = orderData.orderId || orderData.id || orderData.order_id;
            if (orderId) {
              paymentCacheService.removePaymentCache(orderId);
              console.log('[QRPaymentPage] Removed payment cache after successful payment');
            }
            
            // Navigate to order confirmation after 2 seconds
            setTimeout(() => {
              navigate('/order-confirmation');
            }, 2000);
          } else {
            console.warn('[QRPaymentPage] ⚠️ Payment notification received but gencode/orderId does not match');
            console.warn('[QRPaymentPage] Will not update payment status');
          }
        });
        console.log('[QRPaymentPage] Step 2: Registered payment success listener with ID:', listenerId);
        
        // Step 3: Join payment group AFTER listener is registered
        console.log('[QRPaymentPage] Step 3: Joining payment group...');
        await signalRService.joinPaymentGroup(gencode);
        console.log('[QRPaymentPage] Step 3: Successfully joined payment group');
        
        isSetupComplete = true;
        console.log('[QRPaymentPage] ===== SignalR setup completed successfully =====');
      } catch (error) {
        console.error('[QRPaymentPage] SignalR setup error:', error);
        console.error('[QRPaymentPage] Error details:', {
          message: error.message,
          stack: error.stack,
          gencode: gencode
        });
        // Continue without SignalR - user can still manually check
        isSetupComplete = false;
      }
    };

    // Only setup SignalR if we have order data and gencode
    if (orderData && (orderData.gencode || orderData.genCode)) {
      setupSignalR();
    }

    // Cleanup on unmount
    return () => {
      console.log('[QRPaymentPage] Cleaning up SignalR...');
      if (listenerId) {
        signalRService.offPaymentSuccess(listenerId);
        console.log('[QRPaymentPage] Removed payment success listener');
      }
      if (gencode) {
        signalRService.leavePaymentGroup(gencode).catch(err => {
          console.error('[QRPaymentPage] Error leaving payment group:', err);
        });
        console.log('[QRPaymentPage] Left payment group for gencode:', gencode);
      }
      isSetupComplete = false;
    };
  }, [orderData, navigate, success]);

  useEffect(() => {
    // Only fetch QR code from API if qrUrl is not already set from checkout response
    const fetchQrCode = async () => {
      if (!orderData || qrCodeUrl) {
        // Skip if already have QR URL from checkout response
        console.log('[QRPaymentPage] Skipping API fetch - already have QR URL or no order data');
        return;
      }

      try {
        setLoading(true);
        setError(null);
        
        // Get amount - ensure it's a number
        const rawAmount = orderData.totalPrice || orderData.total || orderData.amount || 0;
        const amount = typeof rawAmount === 'string' ? parseFloat(rawAmount) : Number(rawAmount);
        
        // Get gencode from order data (backend returns this in checkout response)
        const rawGencode = orderData.gencode || orderData.genCode || orderData.orderId || '';
        const gencode = String(rawGencode).trim();

        console.log('[QRPaymentPage] Order data:', orderData);
        console.log('[QRPaymentPage] Raw amount:', rawAmount, 'Processed amount:', amount);
        console.log('[QRPaymentPage] Raw gencode:', rawGencode, 'Processed gencode:', gencode);
        console.log('[QRPaymentPage] Amount type:', typeof amount, 'Gencode type:', typeof gencode);

        if (!gencode || gencode === '') {
          throw new Error('Mã đơn hàng không hợp lệ. Vui lòng quay lại trang checkout.');
        }

        if (!amount || amount <= 0 || isNaN(amount)) {
          throw new Error('Số tiền không hợp lệ. Vui lòng quay lại trang checkout.');
        }

        console.log('[QRPaymentPage] Fetching QR code with params:', { amount, gencode });
        const response = await generateQr(amount, gencode);
        
        console.log('[QRPaymentPage] QR API Response type:', typeof response);
        console.log('[QRPaymentPage] QR API Response:', response);
        
        // Handle different response formats
        // API might return: { qrCode: "url" }, { url: "..." }, { data: "..." }, or direct URL string
        let qrUrl = null;
        if (typeof response === 'string') {
          // If it's already a data URL or URL string
          if (response.startsWith('data:image/') || response.startsWith('http://') || response.startsWith('https://')) {
            qrUrl = response;
          } else {
            // Assume it's base64 string without prefix
            qrUrl = `data:image/png;base64,${response}`;
          }
        } else if (response && typeof response === 'object') {
          // Try different possible field names
          if (response.qrCode) {
            qrUrl = response.qrCode;
          } else if (response.imageUrl) {
            qrUrl = response.imageUrl;
          } else if (response.url) {
            qrUrl = response.url;
          } else if (response.data) {
            // If data is string, check if it's base64 or URL
            if (typeof response.data === 'string') {
              if (response.data.startsWith('data:image/') || response.data.startsWith('http')) {
                qrUrl = response.data;
              } else {
                qrUrl = `data:image/png;base64,${response.data}`;
              }
            } else {
              qrUrl = response.data;
            }
          } else if (response.qrCodeUrl) {
            qrUrl = response.qrCodeUrl;
          } else if (response.base64) {
            // Base64 string with or without prefix
            if (response.base64.startsWith('data:image/')) {
              qrUrl = response.base64;
            } else {
              qrUrl = `data:image/png;base64,${response.base64}`;
            }
          } else if (response.image) {
            // Base64 image string
            if (typeof response.image === 'string') {
              if (response.image.startsWith('data:image/')) {
                qrUrl = response.image;
              } else {
                qrUrl = `data:image/png;base64,${response.image}`;
              }
            }
          } else {
            // Last resort: if response has only one key, try to use its value
            const keys = Object.keys(response);
            if (keys.length === 1) {
              const firstKey = keys[0];
              const firstValue = response[firstKey];
              console.log(`[QRPaymentPage] Trying single key "${firstKey}" value`);
              
              if (typeof firstValue === 'string') {
                // If it's a string, treat as QR code data
                if (firstValue.startsWith('data:image/') || 
                    firstValue.startsWith('http://') || 
                    firstValue.startsWith('https://')) {
                  qrUrl = firstValue;
                } else if (firstValue.trim().length > 0) {
                  // Assume it's base64 without prefix
                  qrUrl = `data:image/png;base64,${firstValue}`;
                }
              } else if (firstValue && typeof firstValue === 'object') {
                // If value is an object, recursively check for QR fields
                if (firstValue.qrCode || firstValue.imageUrl || firstValue.url || firstValue.data) {
                  qrUrl = firstValue.qrCode || firstValue.imageUrl || firstValue.url || firstValue.data;
                }
              }
            }
          }
        }

        // Validate QR URL before setting
        if (qrUrl) {
          // Validate format
          const isValidUrl = qrUrl.startsWith('data:image/') || 
                           qrUrl.startsWith('http://') || 
                           qrUrl.startsWith('https://');
          
          if (!isValidUrl) {
            console.warn('[QRPaymentPage] Invalid QR URL format:', qrUrl.substring(0, 50));
            console.warn('[QRPaymentPage] Full QR URL:', qrUrl);
            throw new Error('Định dạng mã QR không hợp lệ');
          }
          
          console.log('[QRPaymentPage] Valid QR URL detected, format:', 
            qrUrl.startsWith('data:image/') ? 'base64 data URL' : 
            qrUrl.startsWith('http://') || qrUrl.startsWith('https://') ? 'HTTP URL' : 'unknown');
          console.log('[QRPaymentPage] QR URL preview (first 100 chars):', qrUrl.substring(0, 100));
          console.log('[QRPaymentPage] QR URL length:', qrUrl.length);
          
          setQrCodeUrl(qrUrl);
        } else {
          console.error('[QRPaymentPage] No valid QR URL found in response');
          console.error('[QRPaymentPage] Response type:', typeof response);
          if (response && typeof response === 'object') {
            const keys = Object.keys(response);
            console.error('[QRPaymentPage] Response keys:', keys);
            console.error('[QRPaymentPage] Response keys count:', keys.length);
            // Log each key and its value type
            keys.forEach(key => {
              const value = response[key];
              console.error(`[QRPaymentPage] Key "${key}":`, {
                type: typeof value,
                isString: typeof value === 'string',
                isObject: typeof value === 'object',
                stringLength: typeof value === 'string' ? value.length : 'N/A',
                preview: typeof value === 'string' ? value.substring(0, 100) : 
                        typeof value === 'object' ? Object.keys(value || {}) : value
              });
            });
          }
          console.error('[QRPaymentPage] Full response:', response);
          throw new Error('Không thể lấy mã QR từ API. Vui lòng kiểm tra console để biết thêm chi tiết.');
        }
      } catch (err) {
        console.error('[QRPaymentPage] Error fetching QR code:', err);
        setError(err.message || 'Không thể tạo mã QR. Vui lòng thử lại.');
        
        // Fallback to generate QR code locally if API fails
        const qrContent = `VietQR|${orderData.orderId || 'N/A'}|${orderData.totalPrice || 0}|TechZone`;
        const fallbackUrl = `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(qrContent)}`;
        setQrCodeUrl(fallbackUrl);
      } finally {
        setLoading(false);
      }
    };

    // Only fetch if we don't already have QR URL from checkout response
    if (orderData && !qrCodeUrl) {
      fetchQrCode();
    }
  }, [orderData, qrCodeUrl]);

  const handleBackToCheckout = () => {
    // Leave SignalR group before navigating
    if (orderData) {
      const gencode = orderData.gencode || orderData.genCode;
      if (gencode) {
        signalRService.leavePaymentGroup(gencode).catch(console.error);
      }
    }
    navigate('/checkout');
  };

  if (!orderData) {
    return (
      <div className="qr-payment-container">
        <div className="loading">Đang tải thông tin đơn hàng...</div>
      </div>
    );
  }

  return (
    <div className="qr-payment-container">
      <div className="container">
        {/* Header */}
        <div className="qr-header">
          <div className="logo">TechZone</div>
          <h1>Thanh toán qua QR Code</h1>
        </div>

        {/* Payment Success Banner */}
        {paymentStatus === 'success' && (
          <div className="payment-success-banner" style={{
            background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
            color: 'white',
            padding: '20px',
            borderRadius: '12px',
            marginBottom: '24px',
            textAlign: 'center',
            animation: 'slideDown 0.3s ease-out'
          }}>
            <div style={{ fontSize: '48px', marginBottom: '12px' }}>✓</div>
            <h2 style={{ margin: '0 0 8px 0', fontSize: '24px', fontWeight: 'bold' }}>Thanh toán thành công!</h2>
            <p style={{ margin: 0, fontSize: '16px', opacity: 0.95 }}>Đang chuyển đến trang xác nhận đơn hàng...</p>
          </div>
        )}

        {/* Main Content */}
        <div className="qr-content">
          {/* Left: QR Code */}
          <div className="qr-section">
            <div className="qr-code-wrapper">
              <div className="qr-code-box">
                {loading ? (
                  <div className="qr-loading">
                    <div className="spinner"></div>
                    <p>Đang tạo mã QR...</p>
                  </div>
                ) : error && !qrCodeUrl ? (
                  <div className="qr-error">
                    <p>⚠️ {error}</p>
                    <button 
                      onClick={() => window.location.reload()} 
                      className="btn-retry"
                    >
                      Thử lại
                    </button>
                  </div>
                ) : qrCodeUrl ? (
                  <img 
                    src={qrCodeUrl} 
                    alt="QR Code thanh toán" 
                    className="qr-code-image"
                    crossOrigin="anonymous"
                    onLoad={(e) => {
                      console.log('[QRPaymentPage] QR code image loaded successfully');
                      const img = e.target;
                      console.log('[QRPaymentPage] Image dimensions:', {
                        naturalWidth: img.naturalWidth,
                        naturalHeight: img.naturalHeight,
                        displayedWidth: img.width,
                        displayedHeight: img.height,
                        src: img.src.substring(0, 100) + '...'
                      });
                      
                      // Verify QR code is visible and not distorted
                      if (img.naturalWidth && img.naturalHeight) {
                        const aspectRatio = img.naturalWidth / img.naturalHeight;
                        if (Math.abs(aspectRatio - 1) > 0.1) {
                          console.warn('[QRPaymentPage] QR code may be distorted - aspect ratio:', aspectRatio);
                        }
                      }
                    }}
                    onError={(e) => {
                      console.error('[QRPaymentPage] QR code image failed to load:', e);
                      // Fallback if QR code image fails to load
                      e.target.style.display = 'none';
                      const errorDiv = document.createElement('div');
                      errorDiv.className = 'qr-error';
                      errorDiv.innerHTML = '<p>⚠️ Không thể tải mã QR</p>';
                      e.target.parentElement.appendChild(errorDiv);
                    }}
                  />
                ) : (
                  <div className="qr-placeholder">QR Code sẽ hiển thị tại đây</div>
                )}
              </div>
              {error && qrCodeUrl && (
                <div className="qr-warning">
                  <p>⚠️ Đang sử dụng mã QR dự phòng</p>
                </div>
              )}
              <p className="qr-instruction">
                Mở ứng dụng ngân hàng và quét mã QR để thanh toán
              </p>
            </div>

            {/* Payment Instructions */}
            <div className="payment-instructions">
              <h3>Hướng dẫn thanh toán:</h3>
              <ol>
                <li>Mở ứng dụng ngân hàng trên điện thoại</li>
                <li>Chọn tính năng "Quét QR" hoặc "VietQR"</li>
                <li>Quét mã QR hiển thị trên màn hình</li>
                <li>Kiểm tra thông tin thanh toán và xác nhận</li>
              </ol>
            </div>
          </div>

          {/* Right: Order Info */}
          <div className="order-info-section">
            <div className="order-info-box">
              <h3>Thông tin đơn hàng</h3>
              <div className="info-row">
                <span className="label">Mã đơn hàng:</span>
                <span className="value">{orderData.orderId || orderData.id || orderData.order_id || 'N/A'}</span>
              </div>
              <div className="info-row">
                <span className="label">Số tiền:</span>
                <span className="value amount">{formatPrice(orderData.totalPrice || orderData.total || orderData.amount || 0)}</span>
              </div>
              {import.meta.env.DEV && (
                <>
                  <div className="info-row" style={{ fontSize: '0.85em', color: '#666', borderTop: '1px solid #eee', paddingTop: '8px', marginTop: '8px' }}>
                    <span className="label">Debug (dev only):</span>
                    <span className="value" style={{ wordBreak: 'break-all' }}>
                      Amount: {orderData.totalPrice || orderData.total || orderData.amount || 0} | 
                      Gencode: {orderData.orderId || orderData.id || orderData.order_id || 'N/A'}
                    </span>
                  </div>
                </>
              )}
              <div className="info-row">
                <span className="label">Người nhận:</span>
                <span className="value">{orderData.fullName || 'N/A'}</span>
              </div>
              <div className="info-row">
                <span className="label">Số điện thoại:</span>
                <span className="value">{orderData.phone || 'N/A'}</span>
              </div>
            </div>

            <div className="bank-info-box">
              <h3>Thông tin tài khoản</h3>
              <div className="bank-details">
                <div className="bank-item">
                  <span className="bank-label">Ngân hàng:</span>
                  <span className="bank-value">TechZone Bank</span>
                </div>
                <div className="bank-item">
                  <span className="bank-label">Số tài khoản:</span>
                  <span className="bank-value">1234567890</span>
                </div>
                <div className="bank-item">
                  <span className="bank-label">Chủ tài khoản:</span>
                  <span className="bank-value">CÔNG TY TNHH TECHZONE</span>
                </div>
                <div className="bank-item">
                  <span className="bank-label">Nội dung:</span>
                  <span className="bank-value">Thanh toan don hang {orderData.orderId || 'N/A'}</span>
                </div>
              </div>
            </div>

            <div className="order-items-box">
              <h3>Sản phẩm ({orderData.items?.length || 0})</h3>
              <div className="items-list">
                {orderData.items && orderData.items.length > 0 ? (
                  orderData.items.slice(0, 3).map((item, index) => (
                    <div key={index} className="item-row">
                      <span className="item-name">{item.name || item.productName || 'Sản phẩm'}</span>
                      <span className="item-quantity">x{item.quantity || 1}</span>
                    </div>
                  ))
                ) : (
                  <p>Không có sản phẩm</p>
                )}
                {orderData.items && orderData.items.length > 3 && (
                  <div className="item-row more-items">
                    <span>Và {orderData.items.length - 3} sản phẩm khác...</span>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="qr-actions">
          <button onClick={handleBackToCheckout} className="btn-secondary">
            Quay lại
          </button>
        </div>

        {/* Important Notice */}
        <div className="notice-box">
          <p>
            <strong>Lưu ý:</strong> Vui lòng thanh toán đúng số tiền và đúng nội dung chuyển khoản. 
            Đơn hàng sẽ được xử lý sau khi thanh toán thành công.
          </p>
        </div>
      </div>
    </div>
  );
};

export default QRPaymentPage;

