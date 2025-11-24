using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using ModernIssues.Models.Entities;
using ModernIssues.Helpers;
using ModernIssues.Models.Common;
using System;
using System.Linq;
using System.Threading.Tasks;

namespace ModernIssues.Controllers
{
    [Route("/v1/[controller]")]
    [ApiController]
    public class LogController : ControllerBase
    {
        private readonly WebDbContext _context;

        public LogController(WebDbContext context)
        {
            _context = context;
        }

        /// <summary>
        /// Lấy danh sách logs của user hiện tại
        /// </summary>
        /// <param name="actionType">Lọc theo loại hành vi (login, search, product_view, add_to_cart, order_completed)</param>
        /// <param name="startDate">Ngày bắt đầu (tùy chọn)</param>
        /// <param name="endDate">Ngày kết thúc (tùy chọn)</param>
        /// <param name="page">Số trang (mặc định: 1)</param>
        /// <param name="limit">Số lượng mỗi trang (mặc định: 50)</param>
        /// <response code="200">Trả về danh sách logs.</response>
        /// <response code="401">Chưa đăng nhập.</response>
        [HttpGet]
        [ProducesResponseType(typeof(ApiResponse<object>), HttpStatusCodes.OK)]
        [ProducesResponseType(typeof(ApiResponse<object>), HttpStatusCodes.Unauthorized)]
        public async Task<IActionResult> GetLogs(
            [FromQuery] string? actionType = null,
            [FromQuery] DateTime? startDate = null,
            [FromQuery] DateTime? endDate = null,
            [FromQuery] int page = 1,
            [FromQuery] int limit = 50)
        {
            if (!AuthHelper.IsLoggedIn(HttpContext))
            {
                return Unauthorized(ApiResponse<object>.ErrorResponse("Bạn cần đăng nhập để xem logs."));
            }

            try
            {
                var userId = AuthHelper.GetCurrentUserId(HttpContext);
                
                if (userId == null)
                {
                    return Unauthorized(ApiResponse<object>.ErrorResponse("Không xác định được user."));
                }

                var query = _context.logs
                    .Where(l => l.user_id == userId)
                    .OrderByDescending(l => l.created_at)
                    .AsQueryable();

                // Filter by action type
                if (!string.IsNullOrWhiteSpace(actionType))
                {
                    query = query.Where(l => l.action_type == actionType);
                }

                // Filter by date range
                if (startDate.HasValue)
                {
                    query = query.Where(l => l.created_at >= startDate.Value);
                }

                if (endDate.HasValue)
                {
                    query = query.Where(l => l.created_at <= endDate.Value.AddDays(1));
                }

                // Get total count
                var totalCount = await query.CountAsync();

                // Pagination
                var skip = (page - 1) * limit;
                var logs = await query
                    .Skip(skip)
                    .Take(limit)
                    .Select(l => new
                    {
                        log_id = l.log_id,
                        action_type = l.action_type,
                        product_id = l.product_id,
                        order_id = l.order_id,
                        search_query = l.search_query,
                        page_url = l.page_url,
                        ip_address = l.ip_address,
                        user_agent = l.user_agent,
                        metadata = l.metadata,
                        created_at = l.created_at
                    })
                    .ToListAsync();

                var response = new
                {
                    logs,
                    pagination = new
                    {
                        page,
                        limit,
                        total_count = totalCount,
                        total_pages = (int)Math.Ceiling(totalCount / (double)limit)
                    }
                };

                return Ok(ApiResponse<object>.SuccessResponse(response, "Lấy danh sách logs thành công."));
            }
            catch (Exception ex)
            {
                Console.WriteLine($"[ERROR] GetLogs: {ex.Message}");
                return StatusCode(HttpStatusCodes.InternalServerError,
                    ApiResponse<object>.ErrorResponse("Lỗi hệ thống khi lấy logs."));
            }
        }

        /// <summary>
        /// Lấy thống kê logs của user hiện tại
        /// </summary>
        /// <response code="200">Trả về thống kê logs.</response>
        /// <response code="401">Chưa đăng nhập.</response>
        [HttpGet("stats")]
        [ProducesResponseType(typeof(ApiResponse<object>), HttpStatusCodes.OK)]
        [ProducesResponseType(typeof(ApiResponse<object>), HttpStatusCodes.Unauthorized)]
        public async Task<IActionResult> GetLogStats()
        {
            if (!AuthHelper.IsLoggedIn(HttpContext))
            {
                return Unauthorized(ApiResponse<object>.ErrorResponse("Bạn cần đăng nhập để xem thống kê."));
            }

            try
            {
                var userId = AuthHelper.GetCurrentUserId(HttpContext);
                
                if (userId == null)
                {
                    return Unauthorized(ApiResponse<object>.ErrorResponse("Không xác định được user."));
                }

                var stats = await _context.logs
                    .Where(l => l.user_id == userId)
                    .GroupBy(l => l.action_type)
                    .Select(g => new
                    {
                        action_type = g.Key,
                        count = g.Count()
                    })
                    .ToListAsync();

                var totalLogs = await _context.logs
                    .Where(l => l.user_id == userId)
                    .CountAsync();

                var response = new
                {
                    total_logs = totalLogs,
                    by_action_type = stats
                };

                return Ok(ApiResponse<object>.SuccessResponse(response, "Lấy thống kê logs thành công."));
            }
            catch (Exception ex)
            {
                Console.WriteLine($"[ERROR] GetLogStats: {ex.Message}");
                return StatusCode(HttpStatusCodes.InternalServerError,
                    ApiResponse<object>.ErrorResponse("Lỗi hệ thống khi lấy thống kê logs."));
            }
        }
    }
}

