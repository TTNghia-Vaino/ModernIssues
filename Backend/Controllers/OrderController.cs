using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Http;
using Microsoft.EntityFrameworkCore;
using ModernIssues.Models.Configurations;
using ModernIssues.Models.DTOs;
using ModernIssues.Models.Entities;
using ModernIssues.Models.Common;
using ModernIssues.Helpers;
using System;
using System.Threading.Tasks;
using ModernIssues.Services;
using Microsoft.Extensions.Caching.Memory;
using System.Linq;
using System.Collections.Generic;

namespace ModernIssues.Controllers
{
    [Route("/v1/[controller]")]
    [ApiController]
    public class OrderController : ControllerBase
    {
        private readonly WebDbContext _context;
        private readonly IEmailService _emailService;
        public OrderController(WebDbContext context, IEmailService emailService)
        {
            _context = context;
            _emailService = emailService;
        }

        // GET: /v1/Order/GetOrders
        [HttpGet("GetOrders")]
        public async Task<ActionResult<IEnumerable<object>>> GetOrders()
        {
            try
            {
                // Lấy username từ session
                var username = HttpContext.Session.GetString("username");

                if (string.IsNullOrEmpty(username))
                {
                    return Unauthorized(new { message = "Vui lòng đăng nhập" });
                }
                
                // từ username lấy ngược user_id
                var user = await _context.users
                    .Where(u => u.username == username)
                    .FirstOrDefaultAsync();
                
                if (user == null)
                {
                    return Unauthorized(new { message = "Không tìm thấy người dùng" });
                }
                
                // Lấy danh sách đơn hàng theo username với thông tin khách hàng
                var orders = await (from o in _context.orders
                                   join u in _context.users on o.user_id equals u.user_id
                                   where o.user_id == user.user_id
                                   orderby o.created_at descending
                                   select new
                                   {
                                       order_id = o.order_id,
                                       customer_name = u.username,
                                       order_date = o.order_date,
                                       status = o.status,
                                       total_amount = o.total_amount,
                                       types = o.types,
                                       types_display = o.types == "COD" ? "Thanh toán khi nhận hàng" :
                                                      o.types == "Transfer" ? "Chuyển khoản" :
                                                      o.types == "ATM" ? "Thẻ ATM" : o.types ?? "COD",
                                       created_at = o.created_at,
                                       updated_at = o.updated_at
                                   })
                                   .ToListAsync();
                
                // nếu orders không có gì thì return text "Người dùng chưa có đơn hàng"
                if (orders == null || !orders.Any())
                {
                    return Ok(new { message = "Người dùng chưa có đơn hàng" });
                }
                
                return Ok(orders);
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { message = "Lỗi server", error = ex.Message });
            }
        }

        // GET: /v1/Order/GetOrderById/5
        [HttpGet("GetOrderById/{order_id}")]
        public async Task<ActionResult<object>> GetOrderById(int order_id)
        {
            try
            {
                // Lấy username từ session
                var username = HttpContext.Session.GetString("username");

                if (string.IsNullOrEmpty(username))
                {
                    return Unauthorized(new { message = "Vui lòng đăng nhập" });
                }
                
                var user = await _context.users
                    .Where(u => u.username == username)
                    .FirstOrDefaultAsync();
                
                if (user == null)
                {
                    return Unauthorized(new { message = "Không tìm thấy người dùng" });
                }

                // Lấy thông tin order kèm user bằng join để đảm bảo load đầy đủ
                var orderWithUser = await (from o in _context.orders
                                          join u in _context.users on o.user_id equals u.user_id
                                          where o.order_id == order_id && o.user_id == user.user_id
                                          select new
                                          {
                                              order = o,
                                              user = u
                                          })
                                          .FirstOrDefaultAsync();

                if (orderWithUser == null)
                {
                    return NotFound(new { message = "Không tìm thấy đơn hàng" });
                }

                var order = orderWithUser.order;
                var orderUser = orderWithUser.user;

                // Lấy chi tiết đơn hàng kèm thông tin sản phẩm
                var orderDetails = await _context.order_details
                    .Where(od => od.order_id == order_id)
                    .Join(
                        _context.products,
                        od => od.product_id,
                        p => p.product_id,
                        (od, p) => new
                        {
                            product_id = od.product_id,
                            product_name = p.product_name,
                            price_at_purchase = od.price_at_purchase,
                            quantity = od.quantity,
                            image_url = p.image_url
                        }
                    )
                    .ToListAsync();

                // Tạo TypesDisplay từ types
                var typesDisplay = order.types == "COD" ? "Thanh toán khi nhận hàng" :
                                  order.types == "Transfer" ? "Chuyển khoản" :
                                  order.types == "ATM" ? "Thẻ ATM" : order.types ?? "COD";
                
                // tạo ra 1 biến return_order với đầy đủ thông tin khách hàng
                var return_order = new
                {
                    order_id = order.order_id,
                    user_id = order.user_id,
                    // Thông tin khách hàng
                    customer_name = orderUser.username,
                    phone = orderUser.phone,
                    address = orderUser.address,
                    email = orderUser.email,
                    // Thông tin đơn hàng
                    order_date = order.order_date,
                    status = order.status,
                    total_amount = order.total_amount,
                    types = order.types,
                    types_display = typesDisplay,
                    created_at = order.created_at,
                    updated_at = order.updated_at
                };
                
                // Trả về kết quả
                var result = new
                {
                    // trả về return_order
                    order = return_order,
                    order_details = orderDetails
                };

                return Ok(result);
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { message = "Lỗi server", error = ex.Message });
            }
        }

        // ============================================
        // GET REVENUE REPORT: GET api/v1/Order/GetRevenueReport
        // ============================================
        /// <summary>
        /// Lấy báo cáo thống kê doanh thu theo ngày, tháng, quý, năm để vẽ biểu đồ cột. Chỉ dành cho Admin.
        /// </summary>
        /// <param name="period">Loại báo cáo: day, month, quarter, year</param>
        /// <param name="startDate">Ngày bắt đầu (tùy chọn, mặc định là 30 ngày trước)</param>
        /// <param name="endDate">Ngày kết thúc (tùy chọn, mặc định là hôm nay)</param>
        /// <response code="200">Trả về báo cáo doanh thu.</response>
        /// <response code="400">Tham số không hợp lệ.</response>
        /// <response code="401">Chưa đăng nhập.</response>
        /// <response code="403">Không có quyền admin.</response>
        [HttpGet("GetRevenueReport")]
        [ProducesResponseType(typeof(ApiResponse<RevenueReportResponse>), 200)]
        [ProducesResponseType(typeof(ApiResponse<object>), 400)]
        [ProducesResponseType(typeof(ApiResponse<object>), 401)]
        [ProducesResponseType(typeof(ApiResponse<object>), 403)]
        public async Task<IActionResult> GetRevenueReport(
            [FromQuery] string period = "day",
            [FromQuery] DateTime? startDate = null,
            [FromQuery] DateTime? endDate = null)
        {
            // Kiểm tra đăng nhập
            if (!AuthHelper.IsLoggedIn(HttpContext))
            {
                return Unauthorized(ApiResponse<object>.ErrorResponse("Bạn cần đăng nhập để thực hiện thao tác này."));
            }

            // Kiểm tra quyền admin
            if (!AuthHelper.IsAdmin(HttpContext))
            {
                return StatusCode(403, ApiResponse<object>.ErrorResponse("Chỉ có quyền admin mới được xem báo cáo doanh thu."));
            }

            try
            {
                // Validate period
                period = period.ToLower();
                if (period != "day" && period != "month" && period != "quarter" && period != "year")
                {
                    return BadRequest(ApiResponse<object>.ErrorResponse("Tham số period phải là: day, month, quarter, hoặc year."));
                }

                // Set default dates if not provided (convert to UTC)
                if (!endDate.HasValue)
                {
                    endDate = DateTime.SpecifyKind(DateTime.UtcNow.Date, DateTimeKind.Utc);
                }
                else
                {
                    // Ensure UTC
                    if (endDate.Value.Kind != DateTimeKind.Utc)
                    {
                        endDate = DateTime.SpecifyKind(endDate.Value.ToUniversalTime().Date, DateTimeKind.Utc);
                    }
                    else
                    {
                        endDate = DateTime.SpecifyKind(endDate.Value.Date, DateTimeKind.Utc);
                    }
                }

                if (!startDate.HasValue)
                {
                    // Default: 30 days for day/month, 1 year for quarter/year
                    if (period == "day" || period == "month")
                    {
                        startDate = DateTime.SpecifyKind(endDate.Value.AddDays(-30), DateTimeKind.Utc);
                    }
                    else if (period == "quarter")
                    {
                        startDate = DateTime.SpecifyKind(endDate.Value.AddYears(-1), DateTimeKind.Utc);
                    }
                    else // year
                    {
                        startDate = DateTime.SpecifyKind(endDate.Value.AddYears(-5), DateTimeKind.Utc);
                    }
                }
                else
                {
                    // Ensure UTC
                    if (startDate.Value.Kind != DateTimeKind.Utc)
                    {
                        startDate = DateTime.SpecifyKind(startDate.Value.ToUniversalTime().Date, DateTimeKind.Utc);
                    }
                    else
                    {
                        startDate = DateTime.SpecifyKind(startDate.Value.Date, DateTimeKind.Utc);
                    }
                }

                // Validate date range
                if (startDate.Value > endDate.Value)
                {
                    return BadRequest(ApiResponse<object>.ErrorResponse("Ngày bắt đầu phải nhỏ hơn hoặc bằng ngày kết thúc."));
                }

                // Lấy các đơn hàng đã hoàn thành (không phải cancelled hoặc pending)
                var completedStatuses = new[] { "completed", "delivered", "paid", "shipped" };
                var startDateUtc = startDate.Value;
                var endDateUtc = endDate.Value.AddDays(1).AddTicks(-1); // End of day
                
                var allOrders = await _context.orders
                    .Where(o => o.order_date.HasValue &&
                                o.order_date.Value >= startDateUtc &&
                                o.order_date.Value <= endDateUtc &&
                                o.total_amount.HasValue &&
                                !string.IsNullOrEmpty(o.status))
                    .ToListAsync();

                // Filter completed orders in memory
                var orders = allOrders
                    .Where(o => completedStatuses.Contains(o.status!.ToLower()))
                    .ToList();

                // Nhóm và tính toán theo period
                List<RevenueReportDto> reportData = new List<RevenueReportDto>();

                if (period == "day")
                {
                    reportData = orders
                        .GroupBy(o => o.order_date.Value.Date)
                        .Select(g => new RevenueReportDto
                        {
                            Period = g.Key.ToString("yyyy-MM-dd"),
                            Revenue = g.Sum(o => o.total_amount ?? 0),
                            OrderCount = g.Count(),
                            PeriodStart = g.Key
                        })
                        .OrderBy(x => x.PeriodStart)
                        .ToList();
                }
                else if (period == "month")
                {
                    reportData = orders
                        .GroupBy(o => new { Year = o.order_date.Value.Year, Month = o.order_date.Value.Month })
                        .Select(g => new RevenueReportDto
                        {
                            Period = $"{g.Key.Year}-{g.Key.Month:D2}",
                            Revenue = g.Sum(o => o.total_amount ?? 0),
                            OrderCount = g.Count(),
                            PeriodStart = new DateTime(g.Key.Year, g.Key.Month, 1)
                        })
                        .OrderBy(x => x.PeriodStart)
                        .ToList();
                }
                else if (period == "quarter")
                {
                    reportData = orders
                        .GroupBy(o => new
                        {
                            Year = o.order_date.Value.Year,
                            Quarter = (o.order_date.Value.Month - 1) / 3 + 1
                        })
                        .Select(g => new RevenueReportDto
                        {
                            Period = $"Q{g.Key.Quarter} {g.Key.Year}",
                            Revenue = g.Sum(o => o.total_amount ?? 0),
                            OrderCount = g.Count(),
                            PeriodStart = new DateTime(g.Key.Year, (g.Key.Quarter - 1) * 3 + 1, 1)
                        })
                        .OrderBy(x => x.PeriodStart)
                        .ToList();
                }
                else // year
                {
                    reportData = orders
                        .GroupBy(o => o.order_date.Value.Year)
                        .Select(g => new RevenueReportDto
                        {
                            Period = g.Key.ToString(),
                            Revenue = g.Sum(o => o.total_amount ?? 0),
                            OrderCount = g.Count(),
                            PeriodStart = new DateTime(g.Key, 1, 1)
                        })
                        .OrderBy(x => x.PeriodStart)
                        .ToList();
                }

                // Tạo response
                var response = new RevenueReportResponse
                {
                    PeriodType = period,
                    TotalRevenue = reportData.Sum(x => x.Revenue),
                    TotalOrders = reportData.Sum(x => x.OrderCount),
                    Data = reportData
                };

                return Ok(ApiResponse<RevenueReportResponse>.SuccessResponse(
                    response,
                    $"Lấy báo cáo doanh thu theo {period} thành công."));
            }
            catch (Exception ex)
            {
                Console.WriteLine($"[CRITICAL ERROR] GetRevenueReport: {ex.Message}");
                return StatusCode(500, ApiResponse<object>.ErrorResponse(
                    "Lỗi hệ thống khi lấy báo cáo doanh thu.",
                    new List<string> { ex.Message }));
            }
        }

        // ============================================
        // GET ORDER REPORT: GET api/v1/Order/GetOrderReport
        // ============================================
        /// <summary>
        /// Lấy báo cáo thống kê số lượng đơn hàng theo ngày, tháng, quý, năm để vẽ biểu đồ cột. Chỉ dành cho Admin.
        /// </summary>
        /// <param name="period">Loại báo cáo: day, month, quarter, year</param>
        /// <param name="startDate">Ngày bắt đầu (tùy chọn)</param>
        /// <param name="endDate">Ngày kết thúc (tùy chọn)</param>
        /// <response code="200">Trả về báo cáo đơn hàng.</response>
        /// <response code="400">Tham số không hợp lệ.</response>
        /// <response code="401">Chưa đăng nhập.</response>
        /// <response code="403">Không có quyền admin.</response>
        [HttpGet("GetOrderReport")]
        [ProducesResponseType(typeof(ApiResponse<ReportResponse>), 200)]
        [ProducesResponseType(typeof(ApiResponse<object>), 400)]
        [ProducesResponseType(typeof(ApiResponse<object>), 401)]
        [ProducesResponseType(typeof(ApiResponse<object>), 403)]
        public async Task<IActionResult> GetOrderReport(
            [FromQuery] string period = "day",
            [FromQuery] DateTime? startDate = null,
            [FromQuery] DateTime? endDate = null)
        {
            // Kiểm tra đăng nhập
            if (!AuthHelper.IsLoggedIn(HttpContext))
            {
                return Unauthorized(ApiResponse<object>.ErrorResponse("Bạn cần đăng nhập để thực hiện thao tác này."));
            }

            // Kiểm tra quyền admin
            if (!AuthHelper.IsAdmin(HttpContext))
            {
                return StatusCode(403, ApiResponse<object>.ErrorResponse("Chỉ có quyền admin mới được xem báo cáo đơn hàng."));
            }

            try
            {
                // Validate period
                period = period.ToLower();
                if (period != "day" && period != "month" && period != "quarter" && period != "year")
                {
                    return BadRequest(ApiResponse<object>.ErrorResponse("Tham số period phải là: day, month, quarter, hoặc year."));
                }

                // Set default dates if not provided (convert to UTC)
                if (!endDate.HasValue)
                {
                    endDate = DateTime.SpecifyKind(DateTime.UtcNow.Date, DateTimeKind.Utc);
                }
                else
                {
                    // Ensure UTC
                    if (endDate.Value.Kind != DateTimeKind.Utc)
                    {
                        endDate = DateTime.SpecifyKind(endDate.Value.ToUniversalTime().Date, DateTimeKind.Utc);
                    }
                    else
                    {
                        endDate = DateTime.SpecifyKind(endDate.Value.Date, DateTimeKind.Utc);
                    }
                }

                if (!startDate.HasValue)
                {
                    if (period == "day" || period == "month")
                    {
                        startDate = DateTime.SpecifyKind(endDate.Value.AddDays(-30), DateTimeKind.Utc);
                    }
                    else if (period == "quarter")
                    {
                        startDate = DateTime.SpecifyKind(endDate.Value.AddYears(-1), DateTimeKind.Utc);
                    }
                    else // year
                    {
                        startDate = DateTime.SpecifyKind(endDate.Value.AddYears(-5), DateTimeKind.Utc);
                    }
                }
                else
                {
                    // Ensure UTC
                    if (startDate.Value.Kind != DateTimeKind.Utc)
                    {
                        startDate = DateTime.SpecifyKind(startDate.Value.ToUniversalTime().Date, DateTimeKind.Utc);
                    }
                    else
                    {
                        startDate = DateTime.SpecifyKind(startDate.Value.Date, DateTimeKind.Utc);
                    }
                }

                // Validate date range
                if (startDate.Value > endDate.Value)
                {
                    return BadRequest(ApiResponse<object>.ErrorResponse("Ngày bắt đầu phải nhỏ hơn hoặc bằng ngày kết thúc."));
                }

                // Lấy các đơn hàng
                var startDateUtc = startDate.Value;
                var endDateUtc = endDate.Value.AddDays(1).AddTicks(-1); // End of day
                
                var orders = await _context.orders
                    .Where(o => o.order_date.HasValue &&
                                o.order_date.Value >= startDateUtc &&
                                o.order_date.Value <= endDateUtc)
                    .ToListAsync();

                // Nhóm và tính toán theo period
                List<ReportDto> reportData = new List<ReportDto>();

                if (period == "day")
                {
                    reportData = orders
                        .GroupBy(o => o.order_date!.Value.Date)
                        .Select(g => new ReportDto
                        {
                            Period = g.Key.ToString("yyyy-MM-dd"),
                            Count = g.Count(),
                            PeriodStart = g.Key
                        })
                        .OrderBy(x => x.PeriodStart)
                        .ToList();
                }
                else if (period == "month")
                {
                    reportData = orders
                        .GroupBy(o => new { Year = o.order_date!.Value.Year, Month = o.order_date!.Value.Month })
                        .Select(g => new ReportDto
                        {
                            Period = $"{g.Key.Year}-{g.Key.Month:D2}",
                            Count = g.Count(),
                            PeriodStart = new DateTime(g.Key.Year, g.Key.Month, 1)
                        })
                        .OrderBy(x => x.PeriodStart)
                        .ToList();
                }
                else if (period == "quarter")
                {
                    reportData = orders
                        .GroupBy(o => new
                        {
                            Year = o.order_date!.Value.Year,
                            Quarter = (o.order_date!.Value.Month - 1) / 3 + 1
                        })
                        .Select(g => new ReportDto
                        {
                            Period = $"Q{g.Key.Quarter} {g.Key.Year}",
                            Count = g.Count(),
                            PeriodStart = new DateTime(g.Key.Year, (g.Key.Quarter - 1) * 3 + 1, 1)
                        })
                        .OrderBy(x => x.PeriodStart)
                        .ToList();
                }
                else // year
                {
                    reportData = orders
                        .GroupBy(o => o.order_date!.Value.Year)
                        .Select(g => new ReportDto
                        {
                            Period = g.Key.ToString(),
                            Count = g.Count(),
                            PeriodStart = new DateTime(g.Key, 1, 1)
                        })
                        .OrderBy(x => x.PeriodStart)
                        .ToList();
                }

                // Tạo response
                var response = new ReportResponse
                {
                    PeriodType = period,
                    TotalCount = reportData.Sum(x => x.Count),
                    Data = reportData
                };

                return Ok(ApiResponse<ReportResponse>.SuccessResponse(
                    response,
                    $"Lấy báo cáo đơn hàng theo {period} thành công."));
            }
            catch (Exception ex)
            {
                Console.WriteLine($"[CRITICAL ERROR] GetOrderReport: {ex.Message}");
                return StatusCode(500, ApiResponse<object>.ErrorResponse(
                    "Lỗi hệ thống khi lấy báo cáo đơn hàng.",
                    new List<string> { ex.Message }));
            }
        }
    }
}
