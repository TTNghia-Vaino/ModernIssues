using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.SignalR;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Options;
using Microsoft.Extensions.Caching.Memory;
using Microsoft.Extensions.Logging;
using ModernIssues.Models.Entities;
using ModernIssues.Models.Configurations;
using ModernIssues.Models.DTOs;
using ModernIssues.Hubs;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using System.Text.RegularExpressions;
using System.Text.Json;

namespace ModernIssues.Services
{
    public class HooksService : IHooksService
    {
        private readonly WebDbContext _context;
        private readonly HooksConfig _hooksConfig;
        private readonly IMemoryCache _cache;
        private readonly IHubContext<PaymentHub> _hubContext;
        private readonly IEmailService _emailService;
        private readonly ILogger<HooksService> _logger;

        public HooksService(
            WebDbContext context, 
            IOptions<HooksConfig> hooksConfig, 
            IMemoryCache cache,
            IHubContext<PaymentHub> hubContext,
            IEmailService emailService,
            ILogger<HooksService> logger)
        {
            _context = context;
            _hooksConfig = hooksConfig.Value;
            _cache = cache;
            _hubContext = hubContext;
            _emailService = emailService;
            _logger = logger;
        }

        public async Task AddTransactionAsync(BankTransaction transaction)
        {
            if (transaction == null)
                throw new ArgumentNullException(nameof(transaction));

            await _context.BankTransactions.AddAsync(transaction);
            await _context.SaveChangesAsync();
        }

        public async Task<TransactionProcessResult> ProcessTransactionAsync(BankTransaction transaction)
        {
            if (transaction == null)
                throw new ArgumentNullException(nameof(transaction));

            var result = new TransactionProcessResult();

            // 1. Kiểm tra xem transaction đã tồn tại chưa (tránh duplicate)
            var existingTransaction = await _context.BankTransactions
                .FirstOrDefaultAsync(t => t.Referencecode == transaction.Referencecode 
                    && t.Transactiondate == transaction.Transactiondate 
                    && t.Transferamount == transaction.Transferamount);

            if (existingTransaction != null)
            {
                result.Message = $"Transaction {transaction.Referencecode} already processed";
                return result;
            }

            // 2. Lưu biến động số dư vào database (bảng BankTransactions như balance_change)
            await _context.BankTransactions.AddAsync(transaction);
            await _context.SaveChangesAsync();

            result.Message = $"Balance change saved: {transaction.Referencecode} - {transaction.Transferamount} - {transaction.Description}";

            // 3. Đối chiếu Description với gencode trong cache
            // SePay sẽ gửi gencode trong field Description hoặc Content
            string? gencode = ExtractGencodeFromTransaction(transaction);
            
            Console.WriteLine($"[HooksService] Extracted gencode: {gencode ?? "null"}");
            Console.WriteLine($"[HooksService] Transaction Description: {transaction.Description}");
            Console.WriteLine($"[HooksService] Transaction Content: {transaction.Content}");
            
            if (string.IsNullOrWhiteSpace(gencode))
            {
                result.Message += ". No gencode found in transaction description/content";
                return result;
            }

            // 4. Tìm thông tin đơn hàng từ cache bằng gencode
            var cacheKey = $"gencode_{gencode}";
            Console.WriteLine($"[HooksService] Looking for cache key: {cacheKey}");
            
            if (!_cache.TryGetValue(cacheKey, out OrderCacheInfo? cacheInfo) || cacheInfo == null)
            {
                Console.WriteLine($"[HooksService] Gencode {gencode} not found in cache");
                result.Message += $". Gencode {gencode} not found in cache (may be expired or invalid)";
                return result;
            }
            
            Console.WriteLine($"[HooksService] Found cache info for orderId: {cacheInfo.OrderId}");

            // 5. Tìm order từ database
            var order = await _context.orders
                .FirstOrDefaultAsync(o => o.order_id == cacheInfo.OrderId);

            if (order == null)
            {
                result.Message += $". Order ID {cacheInfo.OrderId} not found in database";
                result.OrderId = cacheInfo.OrderId;
                return result;
            }

            // 5. Kiểm tra trạng thái đơn hàng - chỉ cập nhật nếu đang pending
            if (order.status?.ToLower() != "pending")
            {
                result.Message += $". Order {cacheInfo.OrderId} already processed (status: {order.status})";
                result.OrderId = cacheInfo.OrderId;
                return result;
            }

            // 6. Kiểm tra số tiền có khớp không (với tolerance)
            var amountDifference = Math.Abs((order.total_amount ?? 0) - transaction.Transferamount);
            if (amountDifference > _hooksConfig.AmountTolerance)
            {
                result.Message += $". Amount mismatch: Order amount {order.total_amount} vs Transaction amount {transaction.Transferamount}";
                result.OrderId = cacheInfo.OrderId;
                return result;
            }

            // 7. Kiểm tra payment type phải là Transfer hoặc ATM
            if (order.types != "Transfer" && order.types != "ATM")
            {
                result.Message += $". Order payment type is {order.types}, not Transfer/ATM";
                result.OrderId = cacheInfo.OrderId;
                return result;
            }

            // 8. Cập nhật trạng thái đơn hàng thành "paid"
            order.status = "paid";
            order.updated_at = DateTime.UtcNow;
            // updated_by có thể để null hoặc set một system user ID

            await _context.SaveChangesAsync();

            // 8.1. Trừ stock và bán serial cho đơn hàng (Transfer/ATM)
            await ProcessStockAndSerialsForOrderAsync(cacheInfo.OrderId, cacheInfo.UserId);

            // 9. Xóa gencode khỏi cache sau khi xử lý thành công
            _cache.Remove(cacheKey);

            result.Message += $". Payment successful! Order {cacheInfo.OrderId} status updated to 'paid'";
            result.OrderUpdated = true;
            result.OrderId = cacheInfo.OrderId;

            // 10. Gửi SignalR notification đến client đang chờ thanh toán
            // NOTE: Gửi SignalR TRƯỚC KHI xóa cache để đảm bảo client có thể nhận được notification
            // ngay cả khi có delay nhỏ trong việc xử lý
            try
            {
                var groupName = $"payment_{gencode}";
                var notificationData = new
                {
                    orderId = cacheInfo.OrderId,
                    gencode = gencode,
                    amount = transaction.Transferamount,
                    message = "Thanh toán thành công! Đơn hàng của bạn đã được xác nhận.",
                    timestamp = DateTime.UtcNow
                };
                
                Console.WriteLine($"[SignalR] ===== Preparing to send payment notification ===== ");
                Console.WriteLine($"[SignalR] Group name: {groupName}");
                Console.WriteLine($"[SignalR] OrderId: {cacheInfo.OrderId}");
                Console.WriteLine($"[SignalR] Gencode: {gencode}");
                Console.WriteLine($"[SignalR] Amount: {transaction.Transferamount}");
                Console.WriteLine($"[SignalR] Notification data: {System.Text.Json.JsonSerializer.Serialize(notificationData)}");
                
                // Send notification to all clients in the group
                await _hubContext.Clients.Group(groupName).SendAsync("PaymentSuccess", notificationData);
                
                Console.WriteLine($"[SignalR] ✅ Payment notification sent successfully to group: {groupName}");
                Console.WriteLine($"[SignalR] Note: If no clients are in the group, the message is silently ignored");
            }
            catch (Exception ex)
            {
                // Log error nhưng không fail toàn bộ process
                Console.WriteLine($"[SignalR] ❌ Error sending payment notification: {ex.Message}");
                Console.WriteLine($"[SignalR] Exception type: {ex.GetType().Name}");
                Console.WriteLine($"[SignalR] StackTrace: {ex.StackTrace}");
                if (ex.InnerException != null)
                {
                    Console.WriteLine($"[SignalR] Inner exception: {ex.InnerException.Message}");
                }
            }

            // 11. Gửi email thông tin đơn hàng cho người dùng (fire-and-forget, không block)
            if (result.OrderUpdated && result.OrderId.HasValue)
            {
                _ = Task.Run(async () =>
                {
                    try
                    {
                        await SendOrderConfirmationEmailAsync(result.OrderId.Value);
                    }
                    catch (Exception ex)
                    {
                        _logger.LogError(ex, $"[HooksService] Error sending order confirmation email for order {result.OrderId}: {ex.Message}");
                    }
                });
            }

            return result;
        }

        /// <summary>
        /// Extract gencode từ transaction description hoặc content
        /// Lấy từ chữ "ORDER" đến hết chuỗi, bỏ qua phần text phía trước
        /// Ví dụ: 
        /// - "ORDER_257_20251122000434_5D77FE6C" → "ORDER_257_20251122000434_5D77FE6C"
        /// - "ORDER257202511220004345D77FE6C" → "ORDER_257_20251122000434_5D77FE6C"
        /// - "ZALOPAY-CHUYENTIEN-O5CH7BRNKLR4-ORDER25920251122002147B1913476" → "ORDER_259_20251122002147_B1913476"
        /// </summary>
        private string? ExtractGencodeFromTransaction(BankTransaction transaction)
        {
            string? gencode = null;
            
            // Ưu tiên kiểm tra Content trước (ZaloPay, Momo thường gửi trong Content)
            if (!string.IsNullOrWhiteSpace(transaction.Content))
            {
                gencode = ExtractGencodeFromString(transaction.Content);
                if (gencode != null) return gencode;
            }
            
            // Nếu không tìm thấy trong Content, kiểm tra Description
            if (!string.IsNullOrWhiteSpace(transaction.Description))
            {
                gencode = ExtractGencodeFromString(transaction.Description);
                if (gencode != null) return gencode;
            }

            return null;
        }

        /// <summary>
        /// Extract gencode từ một chuỗi bất kỳ
        /// Tìm từ chữ "ORDER" (case-insensitive) và lấy toàn bộ phần còn lại
        /// </summary>
        private string? ExtractGencodeFromString(string input)
        {
            if (string.IsNullOrWhiteSpace(input)) return null;

            // Tìm vị trí của chữ "ORDER" (case-insensitive)
            var orderIndex = input.IndexOf("ORDER", StringComparison.OrdinalIgnoreCase);
            if (orderIndex == -1) return null;

            // Lấy từ "ORDER" đến hết chuỗi
            var gencodeRaw = input.Substring(orderIndex);
            
            Console.WriteLine($"[ExtractGencode] Raw gencode from input: {gencodeRaw}");

            // Kiểm tra format có underscore: ORDER_257_20251122000434_5D77FE6C
            var regexWithUnderscore = new Regex(@"^ORDER_\d+_\d{14}_[A-Z0-9]+", RegexOptions.IgnoreCase);
            var match = regexWithUnderscore.Match(gencodeRaw);
            if (match.Success)
            {
                Console.WriteLine($"[ExtractGencode] Found gencode with underscore: {match.Value}");
                return match.Value.ToUpper();
            }

            // Kiểm tra format không underscore: ORDER257202511220004345D77FE6C
            // Pattern: ORDER + orderId(1-10 digits) + timestamp(14 digits) + uniqueId(8+ chars)
            var regexWithoutUnderscore = new Regex(@"^ORDER(\d{1,10})(\d{14})([A-Z0-9]{8,})", RegexOptions.IgnoreCase);
            match = regexWithoutUnderscore.Match(gencodeRaw);
            if (match.Success)
            {
                var orderId = match.Groups[1].Value;
                var timestamp = match.Groups[2].Value;
                var uniqueId = match.Groups[3].Value;
                
                // Convert về format có underscore để đồng nhất
                var normalizedGencode = $"ORDER_{orderId}_{timestamp}_{uniqueId}";
                Console.WriteLine($"[ExtractGencode] Converted gencode without underscore: {match.Value} → {normalizedGencode}");
                return normalizedGencode.ToUpper();
            }

            Console.WriteLine($"[ExtractGencode] No valid gencode pattern found in: {gencodeRaw}");
            return null;
        }

        /// <summary>
        /// Xử lý trừ stock và bán serial cho đơn hàng khi thanh toán thành công
        /// </summary>
        private async Task ProcessStockAndSerialsForOrderAsync(int orderId, int? userId)
        {
            try
            {
                // Lấy order_details của đơn hàng
                var orderDetails = await _context.order_details
                    .Include(od => od.product)
                    .Where(od => od.order_id == orderId)
                    .ToListAsync();

                if (!orderDetails.Any())
                {
                    Console.WriteLine($"[ProcessStockAndSerials] No order details found for order {orderId}");
                    return;
                }

                var updatedBy = userId ?? 1; // System user ID nếu không có

                // Trừ stock và tạo warranty cho từng sản phẩm
                foreach (var orderDetail in orderDetails)
                {
                    var product = orderDetail.product;
                    if (product == null)
                    {
                        Console.WriteLine($"[ProcessStockAndSerials] Product not found for order detail: order_id={orderId}, product_id={orderDetail.product_id}");
                        continue;
                    }

                    // Kiểm tra lại stock trước khi trừ
                    if (product.stock < orderDetail.quantity)
                    {
                        throw new InvalidOperationException(
                            $"Không đủ số lượng trong kho cho sản phẩm {product.product_name}. " +
                            $"Cần {orderDetail.quantity} nhưng chỉ còn {product.stock}.");
                    }

                    // Trừ stock
                    product.stock -= orderDetail.quantity;
                    product.updated_at = DateTime.UtcNow;

                    // Tạo warranty và đánh dấu serial đã bán (nếu có warranty_period)
                    if (product.warranty_period.HasValue && product.warranty_period > 0)
                    {
                        var warrantyPeriod = product.warranty_period ?? 0;
                        var startDate = DateTime.UtcNow;
                        var endDate = startDate.AddMonths(warrantyPeriod);

                        // Lấy serial numbers có sẵn trong kho
                        var availableSerials = await _context.product_serials
                            .Where(ps => ps.product_id == orderDetail.product_id
                                      && (ps.is_sold == null || ps.is_sold == false)
                                      && (ps.is_disabled == null || ps.is_disabled == false))
                            .Take(orderDetail.quantity)
                            .ToListAsync();

                        // Kiểm tra đủ serial không
                        if (availableSerials.Count < orderDetail.quantity)
                        {
                            throw new InvalidOperationException(
                                $"Không đủ serial numbers trong kho cho sản phẩm {product.product_name}. " +
                                $"Cần {orderDetail.quantity} nhưng chỉ có {availableSerials.Count} sản phẩm có serial.");
                        }

                        // Tạo warranty cho mỗi serial number
                        var warranties = new List<warranty>();
                        foreach (var productSerial in availableSerials)
                        {
                            var newWarranty = new warranty
                            {
                                product_id = orderDetail.product_id,
                                user_id = userId ?? 0, // Default to 0 if null
                                order_id = orderId,
                                start_date = startDate,
                                end_date = endDate,
                                status = "active",
                                serial_number = productSerial.serial_number,
                                created_at = DateTime.UtcNow,
                                updated_at = DateTime.UtcNow,
                                created_by = updatedBy,
                                updated_by = updatedBy,
                                is_disabled = false
                            };

                            warranties.Add(newWarranty);

                            // Đánh dấu serial đã bán
                            productSerial.is_sold = true;
                            productSerial.updated_at = DateTime.UtcNow;
                            productSerial.updated_by = updatedBy;
                        }

                        if (warranties.Any())
                        {
                            _context.warranties.AddRange(warranties);
                        }
                    }
                }

                await _context.SaveChangesAsync();
                Console.WriteLine($"[ProcessStockAndSerials] Successfully processed stock and serials for order {orderId}");
            }
            catch (Exception ex)
            {
                Console.WriteLine($"[ProcessStockAndSerials] Error processing stock and serials for order {orderId}: {ex.Message}");
                throw; // Re-throw để caller có thể xử lý
            }
        }

        /// <summary>
        /// Gửi email xác nhận đơn hàng cho người dùng sau khi thanh toán thành công
        /// </summary>
        private async Task SendOrderConfirmationEmailAsync(int orderId)
        {
            try
            {
                // Lấy thông tin đơn hàng đầy đủ
                var orderInfo = await GetOrderInfoForEmailAsync(orderId);
                
                if (orderInfo == null)
                {
                    _logger.LogWarning($"[SendOrderConfirmationEmail] Order {orderId} not found or incomplete");
                    return;
                }

                // Kiểm tra email có hợp lệ không
                if (string.IsNullOrWhiteSpace(orderInfo.UserEmail))
                {
                    _logger.LogWarning($"[SendOrderConfirmationEmail] User email is empty for order {orderId}");
                    return;
                }

                // Tạo nội dung email
                var emailSubject = $"Xác nhận đơn hàng #{orderId} - Modern Issues";
                var emailBody = GenerateOrderConfirmationEmailHtml(orderInfo);

                // Gửi email
                await _emailService.SendEmailAsync(orderInfo.UserEmail, emailSubject, emailBody);
                
                _logger.LogInformation($"[SendOrderConfirmationEmail] ✅ Order confirmation email sent successfully to {orderInfo.UserEmail} for order {orderId}");
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, $"[SendOrderConfirmationEmail] ❌ Error sending order confirmation email for order {orderId}: {ex.Message}");
                throw;
            }
        }

        /// <summary>
        /// Lấy thông tin đơn hàng đầy đủ để gửi email
        /// </summary>
        private async Task<OrderEmailInfo?> GetOrderInfoForEmailAsync(int orderId)
        {
            try
            {
                var order = await _context.orders
                    .Include(o => o.user)
                    .Include(o => o.order_details)
                        .ThenInclude(od => od.product)
                    .Where(o => o.order_id == orderId)
                    .FirstOrDefaultAsync();

                if (order == null || order.user == null)
                {
                    return null;
                }

                var orderDetails = order.order_details?.Select(od => new OrderDetailEmailInfo
                {
                    ProductName = od.product_name,
                    Quantity = od.quantity,
                    Price = od.price_at_purchase,
                    ImageUrl = od.image_url
                }).ToList() ?? new List<OrderDetailEmailInfo>();

                var paymentMethod = order.types switch
                {
                    "COD" => "Thanh toán khi nhận hàng",
                    "Transfer" => "Chuyển khoản",
                    "ATM" => "Thẻ ATM",
                    _ => order.types ?? "Chưa xác định"
                };

                return new OrderEmailInfo
                {
                    OrderId = order.order_id,
                    OrderDate = order.order_date ?? DateTime.UtcNow,
                    TotalAmount = order.total_amount ?? 0,
                    PaymentMethod = paymentMethod,
                    Status = order.status ?? "pending",
                    UserName = order.user.username ?? "Khách hàng",
                    UserEmail = order.user.email ?? "",
                    UserPhone = order.user.phone ?? "",
                    UserAddress = order.user.address ?? "",
                    OrderDetails = orderDetails
                };
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, $"[GetOrderInfoForEmail] Error getting order info for order {orderId}: {ex.Message}");
                return null;
            }
        }

        /// <summary>
        /// Tạo HTML template cho email xác nhận đơn hàng
        /// </summary>
        private string GenerateOrderConfirmationEmailHtml(OrderEmailInfo orderInfo)
        {
            var orderDetailsHtml = string.Join("", orderInfo.OrderDetails.Select((od, index) => $@"
                <tr>
                    <td style='padding: 12px; border-bottom: 1px solid #eee; text-align: center;'>{index + 1}</td>
                    <td style='padding: 12px; border-bottom: 1px solid #eee;'>{od.ProductName}</td>
                    <td style='padding: 12px; border-bottom: 1px solid #eee; text-align: center;'>{od.Quantity}</td>
                    <td style='padding: 12px; border-bottom: 1px solid #eee; text-align: right;'>{od.Price:N0} ₫</td>
                    <td style='padding: 12px; border-bottom: 1px solid #eee; text-align: right; font-weight: bold;'>{od.Quantity * od.Price:N0} ₫</td>
                </tr>
            "));

            var orderDateDisplay = orderInfo.OrderDate.ToLocalTime().ToString("dd/MM/yyyy HH:mm");
            
            return $@"
<!DOCTYPE html>
<html>
<head>
    <meta charset='UTF-8'>
    <meta name='viewport' content='width=device-width, initial-scale=1.0'>
    <title>Xác nhận đơn hàng</title>
</head>
<body style='margin: 0; padding: 0; font-family: Arial, sans-serif; background-color: #f4f4f4;'>
    <table width='100%' cellpadding='0' cellspacing='0' style='background-color: #f4f4f4; padding: 20px;'>
        <tr>
            <td align='center'>
                <table width='600' cellpadding='0' cellspacing='0' style='background-color: #ffffff; border-radius: 8px; overflow: hidden; box-shadow: 0 2px 4px rgba(0,0,0,0.1);'>
                    <!-- Header -->
                    <tr>
                        <td style='background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; text-align: center;'>
                            <h1 style='color: #ffffff; margin: 0; font-size: 28px;'>Cảm ơn bạn đã đặt hàng!</h1>
                        </td>
                    </tr>
                    
                    <!-- Content -->
                    <tr>
                        <td style='padding: 30px;'>
                            <p style='color: #333333; font-size: 16px; line-height: 1.6; margin: 0 0 20px 0;'>
                                Xin chào <strong>{orderInfo.UserName}</strong>,
                            </p>
                            <p style='color: #333333; font-size: 16px; line-height: 1.6; margin: 0 0 20px 0;'>
                                Cảm ơn bạn đã đặt hàng tại <strong>Modern Issues</strong>! Đơn hàng của bạn đã được xác nhận và chúng tôi đang chuẩn bị để gửi đến bạn.
                            </p>
                            
                            <!-- Order Info -->
                            <div style='background-color: #f8f9fa; border-radius: 6px; padding: 20px; margin: 20px 0;'>
                                <h2 style='color: #333333; font-size: 20px; margin: 0 0 15px 0; border-bottom: 2px solid #667eea; padding-bottom: 10px;'>
                                    Thông tin đơn hàng
                                </h2>
                                <table width='100%' cellpadding='0' cellspacing='0'>
                                    <tr>
                                        <td style='padding: 8px 0; color: #666666; width: 150px;'>Mã đơn hàng:</td>
                                        <td style='padding: 8px 0; color: #333333; font-weight: bold;'>#{orderInfo.OrderId}</td>
                                    </tr>
                                    <tr>
                                        <td style='padding: 8px 0; color: #666666;'>Ngày đặt hàng:</td>
                                        <td style='padding: 8px 0; color: #333333;'>{orderDateDisplay}</td>
                                    </tr>
                                    <tr>
                                        <td style='padding: 8px 0; color: #666666;'>Phương thức thanh toán:</td>
                                        <td style='padding: 8px 0; color: #333333;'>{orderInfo.PaymentMethod}</td>
                                    </tr>
                                    <tr>
                                        <td style='padding: 8px 0; color: #666666;'>Trạng thái:</td>
                                        <td style='padding: 8px 0; color: #28a745; font-weight: bold;'>Đã thanh toán</td>
                                    </tr>
                                </table>
                            </div>
                            
                            <!-- Order Details -->
                            <div style='margin: 20px 0;'>
                                <h2 style='color: #333333; font-size: 20px; margin: 0 0 15px 0; border-bottom: 2px solid #667eea; padding-bottom: 10px;'>
                                    Chi tiết đơn hàng
                                </h2>
                                <table width='100%' cellpadding='0' cellspacing='0' style='border-collapse: collapse;'>
                                    <thead>
                                        <tr style='background-color: #f8f9fa;'>
                                            <th style='padding: 12px; text-align: center; border-bottom: 2px solid #ddd; color: #333333;'>STT</th>
                                            <th style='padding: 12px; text-align: left; border-bottom: 2px solid #ddd; color: #333333;'>Sản phẩm</th>
                                            <th style='padding: 12px; text-align: center; border-bottom: 2px solid #ddd; color: #333333;'>SL</th>
                                            <th style='padding: 12px; text-align: right; border-bottom: 2px solid #ddd; color: #333333;'>Đơn giá</th>
                                            <th style='padding: 12px; text-align: right; border-bottom: 2px solid #ddd; color: #333333;'>Thành tiền</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {orderDetailsHtml}
                                    </tbody>
                                    <tfoot>
                                        <tr>
                                            <td colspan='4' style='padding: 15px; text-align: right; font-weight: bold; color: #333333; border-top: 2px solid #667eea;'>
                                                Tổng cộng:
                                            </td>
                                            <td style='padding: 15px; text-align: right; font-weight: bold; font-size: 18px; color: #667eea; border-top: 2px solid #667eea;'>
                                                {orderInfo.TotalAmount:N0} ₫
                                            </td>
                                        </tr>
                                    </tfoot>
                                </table>
                            </div>
                            
                            <!-- Delivery Info -->
                            <div style='background-color: #f8f9fa; border-radius: 6px; padding: 20px; margin: 20px 0;'>
                                <h2 style='color: #333333; font-size: 20px; margin: 0 0 15px 0; border-bottom: 2px solid #667eea; padding-bottom: 10px;'>
                                    Thông tin giao hàng
                                </h2>
                                <table width='100%' cellpadding='0' cellspacing='0'>
                                    <tr>
                                        <td style='padding: 8px 0; color: #666666; width: 150px;'>Người nhận:</td>
                                        <td style='padding: 8px 0; color: #333333;'>{orderInfo.UserName}</td>
                                    </tr>
                                    <tr>
                                        <td style='padding: 8px 0; color: #666666;'>Số điện thoại:</td>
                                        <td style='padding: 8px 0; color: #333333;'>{orderInfo.UserPhone}</td>
                                    </tr>
                                    <tr>
                                        <td style='padding: 8px 0; color: #666666;'>Địa chỉ:</td>
                                        <td style='padding: 8px 0; color: #333333;'>{orderInfo.UserAddress}</td>
                                    </tr>
                                </table>
                            </div>
                            
                            <p style='color: #666666; font-size: 14px; line-height: 1.6; margin: 20px 0 0 0;'>
                                Chúng tôi sẽ thông báo cho bạn ngay khi đơn hàng được gửi đi. Nếu bạn có bất kỳ câu hỏi nào, vui lòng liên hệ với chúng tôi.
                            </p>
                        </td>
                    </tr>
                    
                    <!-- Footer -->
                    <tr>
                        <td style='background-color: #f8f9fa; padding: 20px; text-align: center; border-top: 1px solid #eee;'>
                            <p style='color: #666666; font-size: 12px; margin: 0 0 10px 0;'>
                                <strong>Modern Issues</strong>
                            </p>
                            <p style='color: #999999; font-size: 11px; margin: 0;'>
                                Email này được gửi tự động, vui lòng không trả lời.
                            </p>
                        </td>
                    </tr>
                </table>
            </td>
        </tr>
    </table>
</body>
</html>";
        }

        /// <summary>
        /// DTO để chứa thông tin đơn hàng cho email
        /// </summary>
        private class OrderEmailInfo
        {
            public int OrderId { get; set; }
            public DateTime OrderDate { get; set; }
            public decimal TotalAmount { get; set; }
            public string PaymentMethod { get; set; } = string.Empty;
            public string Status { get; set; } = string.Empty;
            public string UserName { get; set; } = string.Empty;
            public string UserEmail { get; set; } = string.Empty;
            public string UserPhone { get; set; } = string.Empty;
            public string UserAddress { get; set; } = string.Empty;
            public List<OrderDetailEmailInfo> OrderDetails { get; set; } = new List<OrderDetailEmailInfo>();
        }

        /// <summary>
        /// DTO để chứa thông tin chi tiết sản phẩm trong đơn hàng
        /// </summary>
        private class OrderDetailEmailInfo
        {
            public string ProductName { get; set; } = string.Empty;
            public int Quantity { get; set; }
            public decimal Price { get; set; }
            public string? ImageUrl { get; set; }
        }
    }
}
