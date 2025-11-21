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
        /// SePay sẽ gửi gencode trong Description hoặc Content
        /// </summary>
        private string? ExtractGencodeFromTransaction(BankTransaction transaction)
        {
            // Ưu tiên kiểm tra Description trước (SePay thường gửi trong Description)
            if (!string.IsNullOrWhiteSpace(transaction.Description))
            {
                // Tìm gencode pattern: ORDER_{order_id}_{timestamp}_{uniqueId}
                var regex = new Regex(@"ORDER_\d+_\d+_[A-Z0-9]+", RegexOptions.IgnoreCase);
                var match = regex.Match(transaction.Description);
                if (match.Success)
                {
                    return match.Value;
                }
            }

            // Nếu không tìm thấy trong Description, kiểm tra Content
            if (!string.IsNullOrWhiteSpace(transaction.Content))
            {
                var regex = new Regex(@"ORDER_\d+_\d+_[A-Z0-9]+", RegexOptions.IgnoreCase);
                var match = regex.Match(transaction.Content);
                if (match.Success)
                {
                    return match.Value;
                }
            }

            return null;
        }
    }
}
