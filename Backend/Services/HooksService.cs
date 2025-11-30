using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.SignalR;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Options;
using Microsoft.Extensions.Caching.Memory;
using ModernIssues.Models.Entities;
using ModernIssues.Models.Configurations;
using ModernIssues.Models.DTOs;
using ModernIssues.Hubs;
using System;
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

        public HooksService(
            WebDbContext context, 
            IOptions<HooksConfig> hooksConfig, 
            IMemoryCache cache,
            IHubContext<PaymentHub> hubContext)
        {
            _context = context;
            _hooksConfig = hooksConfig.Value;
            _cache = cache;
            _hubContext = hubContext;
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
                                user_id = userId,
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
    }
}
