using ModernIssues.Models.DTOs;
using ModernIssues.Models.Entities;
using ModernIssues.Helpers;
using ModernIssues.Models.Configurations;
using Microsoft.AspNetCore.SignalR;
using ModernIssues.Hubs;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Options;
using Microsoft.Extensions.Caching.Memory;
using System;
using System.Linq;
using System.Net.Http;
using System.Net.Http.Json;
using System.Threading.Tasks;
using System.Text.RegularExpressions;

namespace ModernIssues.Services
{
    public class PaymentService : IPaymentService
    {
        private readonly WebDbContext _context;
        private readonly IHubContext<PaymentHub> _hubContext;
        private readonly IHttpContextAccessor _httpContextAccessor;
        private readonly SepayConfig _sepayConfig;
        private readonly HttpClient _httpClient;
        private readonly IMemoryCache _cache;

        public PaymentService(
            WebDbContext context, 
            IHubContext<PaymentHub> hubContext,
            IHttpContextAccessor httpContextAccessor,
            IOptions<SepayConfig> sepayConfig,
            HttpClient httpClient,
            IMemoryCache cache)
        {
            _context = context;
            _hubContext = hubContext;
            _httpContextAccessor = httpContextAccessor;
            _sepayConfig = sepayConfig.Value;
            _httpClient = httpClient;
            _cache = cache;
        }

        /// <summary>
        /// Tạo QR code thanh toán (VietQR EMV standard)
        /// </summary>
        public async Task<GenerateQrResponseDto> GenerateQrCodeAsync(int userId, decimal amount, int orderId)
        {
            Console.WriteLine($"[PaymentService] GenerateQrCodeAsync - UserId: {userId}, OrderId: {orderId}, Amount: {amount}");

            // Lấy order từ database
            var order = await _context.orders
                .Include(o => o.user)
                .Include(o => o.order_details)
                .FirstOrDefaultAsync(o => o.order_id == orderId && o.user_id == userId);

            if (order == null)
            {
                Console.WriteLine($"[ERROR] Order not found: OrderId={orderId}, UserId={userId}");
                throw new ArgumentException("Order không tồn tại hoặc không thuộc về bạn.");
            }

            if (order.types != "Transfer")
            {
                Console.WriteLine($"[ERROR] Invalid payment type: {order.types}");
                throw new ArgumentException($"Chỉ có thể generate QR cho thanh toán Transfer. Loại hiện tại: {order.types}");
            }

            // Tạo mã thanh toán ngắn gọn (PAY1234)
            var gencode = PaymentCodeGenerator.GeneratePaymentCode();
            Console.WriteLine($"[PaymentService] Generated gencode: {gencode}");

            // Lưu gencode vào order.gencode (thay vì EMV string)
            order.gencode = gencode;
            order.updated_at = DateTime.UtcNow;
            await _context.SaveChangesAsync();
            Console.WriteLine($"[PaymentService] Order updated with gencode: {gencode}");

            // Tạo cache với thông tin đầy đủ
            var cacheExpiryMinutes = 30;
            var now = DateTime.UtcNow;
            
            var orderItems = order.order_details.Select(od => new OrderItemCacheDto
            {
                ProductId = od.product_id,
                Name = od.product_name ?? "Unknown Product",
                Quantity = od.quantity,
                Price = od.price_at_purchase,
                Subtotal = od.quantity * od.price_at_purchase,
                ImageUrl = od.image_url
            }).ToList();

            // Cache thông tin order theo gencode với metadata đầy đủ
            var orderCache = new OrderCacheDto
            {
                UserId = userId,
                OrderId = orderId,
                TotalAmount = order.total_amount ?? 0,
                Status = order.status ?? "pending",
                PaymentType = order.types ?? "Transfer",
                OrderCreatedAt = order.order_date ?? order.created_at ?? now,
                CachedAt = now,
                ExpiresAt = now.AddMinutes(cacheExpiryMinutes),
                UserInfo = order.user != null ? new CachedUserInfo
                {
                    Username = order.user.username,
                    Email = order.user.email,
                    Phone = order.user.phone
                } : null,
                Items = orderItems,
                Metadata = new Dictionary<string, string>
                {
                    { "gencode", gencode },
                    { "cache_version", "1.0" },
                    { "items_count", orderItems.Count.ToString() }
                }
            };

            // Validate cache data trước khi lưu
            if (!ValidateOrderCache(orderCache))
            {
                throw new InvalidOperationException("Invalid order cache data");
            }

            // Lưu vào cache với TTL
            var cacheOptions = new MemoryCacheEntryOptions
            {
                AbsoluteExpirationRelativeToNow = TimeSpan.FromMinutes(cacheExpiryMinutes),
                Priority = CacheItemPriority.High // High priority vì payment critical
            };
            
            _cache.Set(gencode, orderCache, cacheOptions);
            Console.WriteLine($"[PaymentService] Order cached with key: {gencode}, expires at: {orderCache.ExpiresAt:yyyy-MM-dd HH:mm:ss} UTC");

            // Gọi VietQR API để tạo QR code EMVCo (nội dung chứa gencode)
            string emvString;
            string qrImageBase64;

            try
            {
                (emvString, qrImageBase64) = await GenerateVietQrAsync(order, amount, gencode);
                Console.WriteLine($"[PaymentService] VietQR success. EMV length: {emvString?.Length ?? 0}");
            }
            catch (Exception ex)
            {
                Console.WriteLine($"[ERROR] VietQR API failed: {ex.Message}");
                Console.WriteLine($"[ERROR] StackTrace: {ex.StackTrace}");
                throw new Exception($"Không thể tạo QR code: {ex.Message}", ex);
            }

            // Tạo payment data response đơn giản (tối ưu bandwidth)
            var paymentData = new
            {
                gencode = gencode,
                order_id = orderId,
                total_amount = orderCache.TotalAmount,
                expires_at = orderCache.ExpiresAt
            };

            // Gửi notification qua SignalR (chỉ thông tin cần thiết)
            Console.WriteLine($"[PaymentService] Sending SignalR notification to user_{userId}");
            await _hubContext.Clients.Group($"user_{userId}").SendAsync("QrCodeGenerated", new
            {
                success = true,
                gencode = gencode,           // Short gencode (PAY1234)
                qrImage = qrImageBase64,     // Base64 image từ VietQR
                amount = amount,
                orderId = orderId,
                expiresAt = orderCache.ExpiresAt
            });

            return new GenerateQrResponseDto
            {
                Gencode = gencode,           // Short gencode (PAY1234)
                QrUrl = gencode,             // Trả gencode ngắn thay vì EMV string dài
                QrImage = qrImageBase64,     // Base64 image
                Amount = amount,
                OrderId = orderId,
                PaymentData = paymentData
            };
        }

        /// <summary>
        /// Gọi VietQR API để tạo QR code theo chuẩn EMVCo (Napas)
        /// </summary>
        private async Task<(string emvString, string qrImageBase64)> GenerateVietQrAsync(
            order order, decimal amount, string gencode)
        {
            Console.WriteLine($"[VietQR] Starting VietQR API call");

            // Tạo payload request
            var payload = new VietQrRequestDto
            {
                accountNo = _sepayConfig.AccountNumber,
                accountName = _sepayConfig.AccountName,
                acqId = _sepayConfig.BankBIN,
                amount = (long)amount,  // Convert to long (VND không có phần thập phân)
                addInfo = gencode,
                format = "text",
                template = "compact"
            };

            var apiEndpoint = _sepayConfig.VietQrApiEndpoint;
            
            Console.WriteLine($"[VietQR] API Endpoint: {apiEndpoint}");
            Console.WriteLine($"[VietQR] Payload: AccountNo={payload.accountNo}, BankBIN={payload.acqId}, Amount={payload.amount}");
            Console.WriteLine($"[VietQR] AddInfo: {payload.addInfo}");

            try
            {
                // Gửi request đến VietQR API
                var response = await _httpClient.PostAsJsonAsync(apiEndpoint, payload);
                
                var responseBody = await response.Content.ReadAsStringAsync();
                Console.WriteLine($"[VietQR] Response Status: {response.StatusCode}");
                Console.WriteLine($"[VietQR] Response Body: {responseBody}");

                if (!response.IsSuccessStatusCode)
                {
                    throw new Exception($"VietQR API error: {response.StatusCode} - {responseBody}");
                }

                // Parse response
                var result = await response.Content.ReadFromJsonAsync<VietQrResponseDto>();

                if (result == null)
                {
                    throw new Exception("VietQR API returned null response");
                }

                // Kiểm tra response code
                if (result.code != "00")
                {
                    var errorDesc = result.desc ?? "Unknown error";
                    Console.WriteLine($"[VietQR] API error code: {result.code}, desc: {errorDesc}");
                    throw new Exception($"VietQR API error: {errorDesc}");
                }

                // Lấy dữ liệu QR
                if (result.data == null)
                {
                    throw new Exception("VietQR API response does not contain 'data' field");
                }

                var emvString = result.data.qrCode;
                var qrImageBase64 = result.data.qrDataURL;

                if (string.IsNullOrEmpty(emvString))
                {
                    throw new Exception("VietQR API response does not contain QR code (EMV string)");
                }

                Console.WriteLine($"[VietQR] Success! EMV length: {emvString.Length}, Image: {(string.IsNullOrEmpty(qrImageBase64) ? "No" : "Yes")}");

                return (emvString, qrImageBase64 ?? string.Empty);
            }
            catch (HttpRequestException ex)
            {
                Console.WriteLine($"[VietQR] HTTP Request Error: {ex.Message}");
                throw new Exception($"Không thể kết nối đến VietQR API: {ex.Message}", ex);
            }
            catch (Exception ex)
            {
                Console.WriteLine($"[VietQR] Error: {ex.Message}");
                throw;
            }
        }

        /// <summary>
        /// Xử lý webhook biến động số dư từ ngân hàng
        /// </summary>
        public async Task<bool> ProcessBalanceChangeAsync(WebhookBalanceDto webhook, string rawWebhookData)
        {
            Console.WriteLine($"[PaymentService] ProcessBalanceChangeAsync");
            Console.WriteLine($"[PaymentService] Description: {webhook.Description}");
            Console.WriteLine($"[PaymentService] Amount: {webhook.Amount}");

            // Parse gencode từ description
            var gencode = ParseGencodeFromDescription(webhook.Description);
            
            if (string.IsNullOrEmpty(gencode))
            {
                Console.WriteLine($"[WARNING] No valid gencode found in description: {webhook.Description}");
            }
            else
            {
                Console.WriteLine($"[PaymentService] Parsed gencode: {gencode}");
            }

            // Lưu biến động số dư vào DB
            var balanceChange = new balance_change
            {
                transaction_id = webhook.TransactionId,
                amount = webhook.Amount,
                description = webhook.Description,
                sender_account = webhook.SenderAccount,
                sender_name = webhook.SenderName,
                receiver_account = webhook.ReceiverAccount,
                receiver_name = webhook.ReceiverName,
                bank_code = webhook.BankCode,
                transaction_date = webhook.TransactionDate,
                transaction_type = webhook.TransactionType,
                gencode = gencode,
                status = "pending",
                raw_webhook_data = rawWebhookData,
                created_at = DateTime.UtcNow,
                updated_at = DateTime.UtcNow
            };

            _context.balance_changes.Add(balanceChange);
            await _context.SaveChangesAsync();
            Console.WriteLine($"[PaymentService] Balance change saved with ID: {balanceChange.id}");

            // Nếu không có gencode thì không xử lý tiếp
            if (string.IsNullOrEmpty(gencode))
            {
                return false;
            }

            // Kiểm tra gencode có trong cache không
            var orderCache = GetOrderFromCache(gencode);
            
            if (orderCache == null)
            {
                Console.WriteLine($"[WARNING] Gencode not found in cache or expired: {gencode}");
                
                // Fallback: Kiểm tra trong DB
                var order = await _context.orders
                    .Include(o => o.user)
                    .Include(o => o.order_details)
                    .FirstOrDefaultAsync(o => o.gencode == gencode);

                if (order == null)
                {
                    Console.WriteLine($"[ERROR] Order not found in DB with gencode: {gencode}");
                    balanceChange.status = "failed";
                    balanceChange.updated_at = DateTime.UtcNow;
                    await _context.SaveChangesAsync();
                    return false;
                }

                // Tạo cache từ DB order (để có data đầy đủ cho notification)
                orderCache = CreateOrderCacheFromDbOrder(order);
                Console.WriteLine($"[PaymentService] Created cache from DB order: {order.order_id}");
            }
            else
            {
                Console.WriteLine($"[PaymentService] Gencode found in cache. OrderId: {orderCache.OrderId}");
            }

            // Verify amount (cảnh báo nếu sai lệch)
            if (Math.Abs(webhook.Amount - orderCache.TotalAmount) > 1)
            {
                Console.WriteLine($"[WARNING] Amount mismatch. Expected: {orderCache.TotalAmount}, Got: {webhook.Amount}");
                // Không block, chỉ warning
            }

            // Cập nhật order status trong DB
            var dbOrder = await _context.orders
                .FirstOrDefaultAsync(o => o.order_id == orderCache.OrderId);

            if (dbOrder == null)
            {
                Console.WriteLine($"[ERROR] Order not found in DB: {orderCache.OrderId}");
                balanceChange.status = "failed";
                balanceChange.updated_at = DateTime.UtcNow;
                await _context.SaveChangesAsync();
                return false;
            }

            // Check nếu order đã paid rồi (prevent double payment)
            if (dbOrder.status == "paid")
            {
                Console.WriteLine($"[WARNING] Order {dbOrder.order_id} already paid. Skipping...");
                balanceChange.status = "duplicate";
                balanceChange.order_id = dbOrder.order_id;
                balanceChange.updated_at = DateTime.UtcNow;
                await _context.SaveChangesAsync();
                return false; // Return false vì không xử lý
            }

            // Cập nhật order và balance_change
            dbOrder.status = "paid";
            dbOrder.updated_at = DateTime.UtcNow;
            
            balanceChange.status = "processed";
            balanceChange.order_id = dbOrder.order_id;
            balanceChange.updated_at = DateTime.UtcNow;

            await _context.SaveChangesAsync();
            Console.WriteLine($"[PaymentService] Order {dbOrder.order_id} marked as paid");

            // Remove from cache sau khi xử lý thành công
            _cache.Remove(gencode);
            Console.WriteLine($"[PaymentService] Removed gencode from cache: {gencode}");

            // Gửi notification qua SignalR với đầy đủ thông tin
            await _hubContext.Clients.Group($"user_{orderCache.UserId}").SendAsync("PaymentConfirmed", new
            {
                success = true,
                orderId = orderCache.OrderId,
                status = "paid",
                gencode = gencode,
                amount = webhook.Amount,
                paidAt = DateTime.UtcNow,
                transactionId = webhook.TransactionId,
                orderData = new
                {
                    orderId = orderCache.OrderId,
                    totalAmount = orderCache.TotalAmount,
                    items = orderCache.Items,
                    userInfo = orderCache.UserInfo
                }
            });
            Console.WriteLine($"[PaymentService] Sent PaymentConfirmed notification to user_{orderCache.UserId}");

            return true;
        }

        /// <summary>
        /// Parse gencode từ description (PAYXXXX)
        /// </summary>
        private string? ParseGencodeFromDescription(string? description)
        {
            if (string.IsNullOrWhiteSpace(description))
                return null;

            // Pattern: PAYXXXX (4-6 ký tự sau PAY)
            var match = Regex.Match(description, @"PAY[A-Z0-9]{4,6}", RegexOptions.IgnoreCase);
            
            if (match.Success)
            {
                return match.Value.ToUpper();
            }

            return null;
        }

        /// <summary>
        /// Xác thực thanh toán từ webhook (legacy - kept for backward compatibility)
        /// </summary>
        public async Task<bool> VerifyPaymentAsync(string gencode)
        {
            Console.WriteLine($"[PaymentService] VerifyPaymentAsync - Gencode: {gencode}");

            var order = await _context.orders
                .FirstOrDefaultAsync(o => o.gencode == gencode);

            if (order == null)
            {
                Console.WriteLine($"[ERROR] Order not found with gencode: {gencode}");
                return false;
            }

            // Cập nhật status thành "paid"
            order.status = "paid";
            order.updated_at = DateTime.UtcNow;
            await _context.SaveChangesAsync();

            Console.WriteLine($"[PaymentService] Order {order.order_id} marked as paid");

            // Gửi notification qua SignalR
            if (order.user_id.HasValue)
            {
                Console.WriteLine($"[PaymentService] Sending PaymentConfirmed to user_{order.user_id}");
                await _hubContext.Clients.Group($"user_{order.user_id}").SendAsync("PaymentConfirmed", new
                {
                    orderId = order.order_id,
                    status = "paid",
                    gencode = gencode
                });
            }

            return true;
        }

        /// <summary>
        /// Validate dữ liệu cache trước khi lưu
        /// </summary>
        private bool ValidateOrderCache(OrderCacheDto cache)
        {
            if (cache == null)
            {
                Console.WriteLine("[WARNING] Cache data is null");
                return false;
            }

            if (cache.OrderId <= 0)
            {
                Console.WriteLine($"[WARNING] Invalid OrderId: {cache.OrderId}");
                return false;
            }

            if (cache.UserId <= 0)
            {
                Console.WriteLine($"[WARNING] Invalid UserId: {cache.UserId}");
                return false;
            }

            if (cache.TotalAmount <= 0)
            {
                Console.WriteLine($"[WARNING] Invalid TotalAmount: {cache.TotalAmount}");
                return false;
            }

            if (cache.Items == null || cache.Items.Count == 0)
            {
                Console.WriteLine("[WARNING] No items in order");
                return false;
            }

            if (cache.ExpiresAt <= DateTime.UtcNow)
            {
                Console.WriteLine($"[WARNING] Cache already expired: {cache.ExpiresAt}");
                return false;
            }

            return true;
        }

        /// <summary>
        /// Get order từ cache với validation
        /// </summary>
        private OrderCacheDto? GetOrderFromCache(string gencode)
        {
            if (!_cache.TryGetValue<OrderCacheDto>(gencode, out var orderCache))
            {
                return null;
            }

            // Validate cache còn hợp lệ
            if (orderCache == null || !orderCache.IsValid())
            {
                Console.WriteLine($"[WARNING] Cache for {gencode} is invalid or expired");
                _cache.Remove(gencode); // Clean up invalid cache
                return null;
            }

            return orderCache;
        }

        /// <summary>
        /// Tạo order cache từ DB order (fallback khi cache miss)
        /// </summary>
        private OrderCacheDto CreateOrderCacheFromDbOrder(order order)
        {
            var now = DateTime.UtcNow;
            
            return new OrderCacheDto
            {
                UserId = order.user_id ?? 0,
                OrderId = order.order_id,
                TotalAmount = order.total_amount ?? 0,
                Status = order.status ?? "pending",
                PaymentType = order.types ?? "Transfer",
                OrderCreatedAt = order.order_date ?? order.created_at ?? now,
                CachedAt = now,
                ExpiresAt = now.AddMinutes(30), // Default TTL
                UserInfo = order.user != null ? new CachedUserInfo
                {
                    Username = order.user.username,
                    Email = order.user.email,
                    Phone = order.user.phone
                } : null,
                Items = order.order_details?.Select(od => new OrderItemCacheDto
                {
                    ProductId = od.product_id,
                    Name = od.product_name ?? "Unknown",
                    Quantity = od.quantity,
                    Price = od.price_at_purchase,
                    Subtotal = od.quantity * od.price_at_purchase,
                    ImageUrl = od.image_url
                }).ToList() ?? new List<OrderItemCacheDto>()
            };
        }
    }
}
