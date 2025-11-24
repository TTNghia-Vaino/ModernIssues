using Microsoft.EntityFrameworkCore;
using ModernIssues.Models.DTOs;
using ModernIssues.Models.Entities;
using Microsoft.Extensions.DependencyInjection;

namespace ModernIssues.Services
{
    public class LogService : ILogService
    {
        private readonly WebDbContext _context;
        private readonly IServiceScopeFactory _scopeFactory;

        public LogService(WebDbContext context, IServiceScopeFactory scopeFactory)
        {
            _context = context;
            _scopeFactory = scopeFactory;
        }

        /// <summary>
        /// Tạo log mới cho một hành động của người dùng
        /// </summary>
        public async Task CreateLogAsync(int? userId, int? productId, string actionType)
        {
            try
            {
                var log = new log
                {
                    user_id = userId,
                    product_id = productId,
                    action_type = actionType,
                    created_at = DateTime.UtcNow
                };

                _context.logs.Add(log);
                await _context.SaveChangesAsync();
                Console.WriteLine($"[LogService] Log created successfully: userId={userId}, productId={productId}, actionType={actionType}");
            }
            catch (Exception ex)
            {
                // Log lỗi nhưng không throw để không ảnh hưởng đến flow chính
                Console.WriteLine($"[LogService] Error creating log: {ex.Message}");
                Console.WriteLine($"[LogService] StackTrace: {ex.StackTrace}");
            }
        }

        /// <summary>
        /// Tạo log trong scope mới (fire-and-forget safe)
        /// </summary>
        public async Task CreateLogInNewScopeAsync(int? userId, int? productId, string actionType)
        {
            // Tạo scope mới để đảm bảo DbContext không bị dispose
            _ = Task.Run(async () =>
            {
                try
                {
                    using var scope = _scopeFactory.CreateScope();
                    var context = scope.ServiceProvider.GetRequiredService<WebDbContext>();
                    
                    var log = new log
                    {
                        user_id = userId,
                        product_id = productId,
                        action_type = actionType,
                        created_at = DateTime.UtcNow
                    };

                    context.logs.Add(log);
                    await context.SaveChangesAsync();
                    Console.WriteLine($"[LogService] Log created successfully in new scope: userId={userId}, productId={productId}, actionType={actionType}");
                }
                catch (Exception ex)
                {
                    Console.WriteLine($"[LogService] Error creating log in new scope: {ex.Message}");
                    Console.WriteLine($"[LogService] StackTrace: {ex.StackTrace}");
                }
            });
        }

        /// <summary>
        /// Lấy danh sách logs với phân trang và lọc
        /// </summary>
        public async Task<LogListResponse> GetLogsAsync(int page = 1, int limit = 20, int? userId = null, int? productId = null, string? actionType = null)
        {
            var query = _context.logs.AsQueryable();

            // Áp dụng filters
            if (userId.HasValue)
            {
                query = query.Where(l => l.user_id == userId.Value);
            }

            if (productId.HasValue)
            {
                query = query.Where(l => l.product_id == productId.Value);
            }

            if (!string.IsNullOrWhiteSpace(actionType))
            {
                query = query.Where(l => l.action_type == actionType);
            }

            // Đếm tổng số records
            var totalCount = await query.CountAsync();

            // Phân trang
            var logs = await query
                .Include(l => l.user)
                .Include(l => l.product)
                .OrderByDescending(l => l.created_at)
                .Skip((page - 1) * limit)
                .Take(limit)
                .Select(l => new LogDto
                {
                    LogId = l.log_id,
                    UserId = l.user_id,
                    ProductId = l.product_id,
                    ActionType = l.action_type ?? string.Empty,
                    CreatedAt = l.created_at ?? DateTime.UtcNow,
                    Username = l.user != null ? l.user.username : null,
                    ProductName = l.product != null ? l.product.product_name : null
                })
                .ToListAsync();

            return new LogListResponse
            {
                Logs = logs,
                TotalCount = totalCount,
                Page = page,
                Limit = limit,
                TotalPages = (int)Math.Ceiling(totalCount / (double)limit)
            };
        }

        /// <summary>
        /// Lấy logs của một user cụ thể
        /// </summary>
        public async Task<LogListResponse> GetUserLogsAsync(int userId, int page = 1, int limit = 20)
        {
            return await GetLogsAsync(page, limit, userId: userId);
        }

        /// <summary>
        /// Lấy logs của một sản phẩm cụ thể
        /// </summary>
        public async Task<LogListResponse> GetProductLogsAsync(int productId, int page = 1, int limit = 20)
        {
            return await GetLogsAsync(page, limit, productId: productId);
        }

        /// <summary>
        /// Lấy logs theo loại hành động
        /// </summary>
        public async Task<LogListResponse> GetLogsByActionTypeAsync(string actionType, int page = 1, int limit = 20)
        {
            return await GetLogsAsync(page, limit, actionType: actionType);
        }
    }
}

