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

        // ============================================
        // GET PAYMENT METHOD REPORT: GET api/v1/Order/GetPaymentMethodReport
        // ============================================
        /// <summary>
        /// Lấy báo cáo tỷ lệ phương thức thanh toán để vẽ biểu đồ Pie/Donut/Column. Chỉ dành cho Admin.
        /// </summary>
        /// <param name="period">Loại báo cáo: day, month, quarter, year (mặc định: không nhóm theo kỳ)</param>
        /// <param name="startDate">Ngày bắt đầu (tùy chọn)</param>
        /// <param name="endDate">Ngày kết thúc (tùy chọn)</param>
        /// <response code="200">Trả về báo cáo tỷ lệ phương thức thanh toán.</response>
        /// <response code="400">Tham số không hợp lệ.</response>
        /// <response code="401">Chưa đăng nhập.</response>
        /// <response code="403">Không có quyền admin.</response>
        [HttpGet("GetPaymentMethodReport")]
        [ProducesResponseType(typeof(ApiResponse<PaymentMethodReportResponse>), 200)]
        [ProducesResponseType(typeof(ApiResponse<object>), 400)]
        [ProducesResponseType(typeof(ApiResponse<object>), 401)]
        [ProducesResponseType(typeof(ApiResponse<object>), 403)]
        public async Task<IActionResult> GetPaymentMethodReport(
            [FromQuery] string period = "",
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
                return StatusCode(403, ApiResponse<object>.ErrorResponse("Chỉ có quyền admin mới được xem báo cáo phương thức thanh toán."));
            }

            try
            {
                // Validate period
                period = period.ToLower();
                bool hasPeriod = !string.IsNullOrEmpty(period) && (period == "day" || period == "month" || period == "quarter" || period == "year");
                
                if (!string.IsNullOrEmpty(period) && !hasPeriod)
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
                    if (hasPeriod)
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
                        startDate = DateTime.SpecifyKind(endDate.Value.AddMonths(-1), DateTimeKind.Utc);
                    }
                }
                else
                {
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

                // Lấy các đơn hàng trong khoảng thời gian
                var startDateUtc = startDate.Value;
                var endDateUtc = endDate.Value.AddDays(1).AddTicks(-1); // End of day

                var orders = await _context.orders
                    .Where(o => o.order_date.HasValue &&
                                o.order_date.Value >= startDateUtc &&
                                o.order_date.Value <= endDateUtc &&
                                !string.IsNullOrEmpty(o.types))
                    .ToListAsync();

                var totalOrders = orders.Count;
                List<PaymentMethodReportDto> reportData = new List<PaymentMethodReportDto>();

                if (hasPeriod)
                {
                    // Nhóm theo period và payment method
                    if (period == "day")
                    {
                        reportData = orders
                            .GroupBy(o => new { Date = o.order_date!.Value.Date, PaymentMethod = o.types!.ToUpper() })
                            .Select(g => new
                            {
                                Period = g.Key.Date.ToString("yyyy-MM-dd"),
                                PeriodStart = g.Key.Date,
                                PaymentMethod = g.Key.PaymentMethod,
                                OrderCount = g.Count()
                            })
                            .GroupBy(x => new { x.Period, x.PeriodStart })
                            .SelectMany(periodGroup =>
                            {
                                var periodTotal = periodGroup.Sum(x => x.OrderCount);
                                return periodGroup.Select(x => new PaymentMethodReportDto
                                {
                                    Period = x.Period,
                                    PeriodStart = x.PeriodStart,
                                    PaymentMethod = x.PaymentMethod,
                                    PaymentMethodDisplay = x.PaymentMethod switch
                                    {
                                        "COD" => "Thanh toán khi nhận hàng",
                                        "TRANSFER" => "Chuyển khoản",
                                        "ATM" => "Thẻ ATM",
                                        "VNPAY" => "VNPay",
                                        _ => x.PaymentMethod
                                    },
                                    OrderCount = x.OrderCount,
                                    Percentage = periodTotal > 0 ? Math.Round((decimal)x.OrderCount / periodTotal * 100, 2) : 0
                                });
                            })
                            .OrderBy(x => x.PeriodStart)
                            .ThenByDescending(x => x.OrderCount)
                            .ToList();
                    }
                    else if (period == "month")
                    {
                        reportData = orders
                            .GroupBy(o => new { Year = o.order_date!.Value.Year, Month = o.order_date!.Value.Month, PaymentMethod = o.types!.ToUpper() })
                            .Select(g => new
                            {
                                Period = $"{g.Key.Year}-{g.Key.Month:D2}",
                                PeriodStart = new DateTime(g.Key.Year, g.Key.Month, 1),
                                PaymentMethod = g.Key.PaymentMethod,
                                OrderCount = g.Count()
                            })
                            .GroupBy(x => new { x.Period, x.PeriodStart })
                            .SelectMany(periodGroup =>
                            {
                                var periodTotal = periodGroup.Sum(x => x.OrderCount);
                                return periodGroup.Select(x => new PaymentMethodReportDto
                                {
                                    Period = x.Period,
                                    PeriodStart = x.PeriodStart,
                                    PaymentMethod = x.PaymentMethod,
                                    PaymentMethodDisplay = x.PaymentMethod switch
                                    {
                                        "COD" => "Thanh toán khi nhận hàng",
                                        "TRANSFER" => "Chuyển khoản",
                                        "ATM" => "Thẻ ATM",
                                        "VNPAY" => "VNPay",
                                        _ => x.PaymentMethod
                                    },
                                    OrderCount = x.OrderCount,
                                    Percentage = periodTotal > 0 ? Math.Round((decimal)x.OrderCount / periodTotal * 100, 2) : 0
                                });
                            })
                            .OrderBy(x => x.PeriodStart)
                            .ThenByDescending(x => x.OrderCount)
                            .ToList();
                    }
                    else if (period == "quarter")
                    {
                        reportData = orders
                            .GroupBy(o => new
                            {
                                Year = o.order_date!.Value.Year,
                                Quarter = (o.order_date!.Value.Month - 1) / 3 + 1,
                                PaymentMethod = o.types!.ToUpper()
                            })
                            .Select(g => new
                            {
                                Period = $"Q{g.Key.Quarter} {g.Key.Year}",
                                PeriodStart = new DateTime(g.Key.Year, (g.Key.Quarter - 1) * 3 + 1, 1),
                                PaymentMethod = g.Key.PaymentMethod,
                                OrderCount = g.Count()
                            })
                            .GroupBy(x => new { x.Period, x.PeriodStart })
                            .SelectMany(periodGroup =>
                            {
                                var periodTotal = periodGroup.Sum(x => x.OrderCount);
                                return periodGroup.Select(x => new PaymentMethodReportDto
                                {
                                    Period = x.Period,
                                    PeriodStart = x.PeriodStart,
                                    PaymentMethod = x.PaymentMethod,
                                    PaymentMethodDisplay = x.PaymentMethod switch
                                    {
                                        "COD" => "Thanh toán khi nhận hàng",
                                        "TRANSFER" => "Chuyển khoản",
                                        "ATM" => "Thẻ ATM",
                                        "VNPAY" => "VNPay",
                                        _ => x.PaymentMethod
                                    },
                                    OrderCount = x.OrderCount,
                                    Percentage = periodTotal > 0 ? Math.Round((decimal)x.OrderCount / periodTotal * 100, 2) : 0
                                });
                            })
                            .OrderBy(x => x.PeriodStart)
                            .ThenByDescending(x => x.OrderCount)
                            .ToList();
                    }
                    else // year
                    {
                        reportData = orders
                            .GroupBy(o => new { Year = o.order_date!.Value.Year, PaymentMethod = o.types!.ToUpper() })
                            .Select(g => new
                            {
                                Period = g.Key.Year.ToString(),
                                PeriodStart = new DateTime(g.Key.Year, 1, 1),
                                PaymentMethod = g.Key.PaymentMethod,
                                OrderCount = g.Count()
                            })
                            .GroupBy(x => new { x.Period, x.PeriodStart })
                            .SelectMany(periodGroup =>
                            {
                                var periodTotal = periodGroup.Sum(x => x.OrderCount);
                                return periodGroup.Select(x => new PaymentMethodReportDto
                                {
                                    Period = x.Period,
                                    PeriodStart = x.PeriodStart,
                                    PaymentMethod = x.PaymentMethod,
                                    PaymentMethodDisplay = x.PaymentMethod switch
                                    {
                                        "COD" => "Thanh toán khi nhận hàng",
                                        "TRANSFER" => "Chuyển khoản",
                                        "ATM" => "Thẻ ATM",
                                        "VNPAY" => "VNPay",
                                        _ => x.PaymentMethod
                                    },
                                    OrderCount = x.OrderCount,
                                    Percentage = periodTotal > 0 ? Math.Round((decimal)x.OrderCount / periodTotal * 100, 2) : 0
                                });
                            })
                            .OrderBy(x => x.PeriodStart)
                            .ThenByDescending(x => x.OrderCount)
                            .ToList();
                    }
                }
                else
                {
                    // Không nhóm theo period, chỉ nhóm theo payment method
                    var paymentMethodGroups = orders
                        .GroupBy(o => o.types!.ToUpper())
                        .Select(g => new
                        {
                            PaymentMethod = g.Key,
                            OrderCount = g.Count()
                        })
                        .ToList();

                    reportData = paymentMethodGroups.Select(g => new PaymentMethodReportDto
                    {
                        Period = "",
                        PeriodStart = DateTime.MinValue,
                        PaymentMethod = g.PaymentMethod,
                        PaymentMethodDisplay = g.PaymentMethod switch
                        {
                            "COD" => "Thanh toán khi nhận hàng",
                            "TRANSFER" => "Chuyển khoản",
                            "ATM" => "Thẻ ATM",
                            "VNPAY" => "VNPay",
                            _ => g.PaymentMethod
                        },
                        OrderCount = g.OrderCount,
                        Percentage = totalOrders > 0 ? Math.Round((decimal)g.OrderCount / totalOrders * 100, 2) : 0
                    })
                    .OrderByDescending(x => x.OrderCount)
                    .ToList();
                }

                var response = new PaymentMethodReportResponse
                {
                    PeriodType = hasPeriod ? period : "",
                    TotalOrders = totalOrders,
                    Data = reportData
                };

                return Ok(ApiResponse<PaymentMethodReportResponse>.SuccessResponse(
                    response,
                    "Lấy báo cáo tỷ lệ phương thức thanh toán thành công."));
            }
            catch (Exception ex)
            {
                Console.WriteLine($"[CRITICAL ERROR] GetPaymentMethodReport: {ex.Message}");
                return StatusCode(500, ApiResponse<object>.ErrorResponse(
                    "Lỗi hệ thống khi lấy báo cáo phương thức thanh toán.",
                    new List<string> { ex.Message }));
            }
        }

        // ============================================
        // GET ORDER STATUS REPORT: GET api/v1/Order/GetOrderStatusReport
        // ============================================
        /// <summary>
        /// Lấy báo cáo số lượng đơn theo trạng thái để vẽ biểu đồ Pie/Radial bar/Column. Chỉ dành cho Admin.
        /// </summary>
        /// <param name="period">Loại báo cáo: day, month, quarter, year (mặc định: không nhóm theo kỳ)</param>
        /// <param name="startDate">Ngày bắt đầu (tùy chọn)</param>
        /// <param name="endDate">Ngày kết thúc (tùy chọn)</param>
        /// <response code="200">Trả về báo cáo số lượng đơn theo trạng thái.</response>
        /// <response code="400">Tham số không hợp lệ.</response>
        /// <response code="401">Chưa đăng nhập.</response>
        /// <response code="403">Không có quyền admin.</response>
        [HttpGet("GetOrderStatusReport")]
        [ProducesResponseType(typeof(ApiResponse<OrderStatusReportResponse>), 200)]
        [ProducesResponseType(typeof(ApiResponse<object>), 400)]
        [ProducesResponseType(typeof(ApiResponse<object>), 401)]
        [ProducesResponseType(typeof(ApiResponse<object>), 403)]
        public async Task<IActionResult> GetOrderStatusReport(
            [FromQuery] string period = "",
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
                return StatusCode(403, ApiResponse<object>.ErrorResponse("Chỉ có quyền admin mới được xem báo cáo trạng thái đơn hàng."));
            }

            try
            {
                // Validate period
                period = period.ToLower();
                bool hasPeriod = !string.IsNullOrEmpty(period) && (period == "day" || period == "month" || period == "quarter" || period == "year");
                
                if (!string.IsNullOrEmpty(period) && !hasPeriod)
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
                    if (hasPeriod)
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
                        startDate = DateTime.SpecifyKind(endDate.Value.AddMonths(-1), DateTimeKind.Utc);
                    }
                }
                else
                {
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

                // Lấy các đơn hàng trong khoảng thời gian
                var startDateUtc = startDate.Value;
                var endDateUtc = endDate.Value.AddDays(1).AddTicks(-1); // End of day

                var orders = await _context.orders
                    .Where(o => o.order_date.HasValue &&
                                o.order_date.Value >= startDateUtc &&
                                o.order_date.Value <= endDateUtc &&
                                !string.IsNullOrEmpty(o.status))
                    .ToListAsync();

                var totalOrders = orders.Count;
                List<OrderStatusReportDto> reportData = new List<OrderStatusReportDto>();

                if (hasPeriod)
                {
                    // Nhóm theo period và status
                    if (period == "day")
                    {
                        reportData = orders
                            .GroupBy(o => new { Date = o.order_date!.Value.Date, Status = o.status!.ToLower() })
                            .Select(g => new
                            {
                                Period = g.Key.Date.ToString("yyyy-MM-dd"),
                                PeriodStart = g.Key.Date,
                                Status = g.Key.Status,
                                OrderCount = g.Count()
                            })
                            .GroupBy(x => new { x.Period, x.PeriodStart })
                            .SelectMany(periodGroup =>
                            {
                                var periodTotal = periodGroup.Sum(x => x.OrderCount);
                                return periodGroup.Select(x => new OrderStatusReportDto
                                {
                                    Period = x.Period,
                                    PeriodStart = x.PeriodStart,
                                    Status = x.Status,
                                    StatusDisplay = x.Status switch
                                    {
                                        "pending" => "Đang chờ xử lý",
                                        "processing" => "Đang xử lý",
                                        "shipped" => "Đang giao hàng",
                                        "delivered" => "Đã giao hàng",
                                        "completed" => "Đã hoàn thành",
                                        "cancelled" => "Đã hủy",
                                        "paid" => "Đã thanh toán",
                                        _ => x.Status
                                    },
                                    OrderCount = x.OrderCount,
                                    Percentage = periodTotal > 0 ? Math.Round((decimal)x.OrderCount / periodTotal * 100, 2) : 0
                                });
                            })
                            .OrderBy(x => x.PeriodStart)
                            .ThenByDescending(x => x.OrderCount)
                            .ToList();
                    }
                    else if (period == "month")
                    {
                        reportData = orders
                            .GroupBy(o => new { Year = o.order_date!.Value.Year, Month = o.order_date!.Value.Month, Status = o.status!.ToLower() })
                            .Select(g => new
                            {
                                Period = $"{g.Key.Year}-{g.Key.Month:D2}",
                                PeriodStart = new DateTime(g.Key.Year, g.Key.Month, 1),
                                Status = g.Key.Status,
                                OrderCount = g.Count()
                            })
                            .GroupBy(x => new { x.Period, x.PeriodStart })
                            .SelectMany(periodGroup =>
                            {
                                var periodTotal = periodGroup.Sum(x => x.OrderCount);
                                return periodGroup.Select(x => new OrderStatusReportDto
                                {
                                    Period = x.Period,
                                    PeriodStart = x.PeriodStart,
                                    Status = x.Status,
                                    StatusDisplay = x.Status switch
                                    {
                                        "pending" => "Đang chờ xử lý",
                                        "processing" => "Đang xử lý",
                                        "shipped" => "Đang giao hàng",
                                        "delivered" => "Đã giao hàng",
                                        "completed" => "Đã hoàn thành",
                                        "cancelled" => "Đã hủy",
                                        "paid" => "Đã thanh toán",
                                        _ => x.Status
                                    },
                                    OrderCount = x.OrderCount,
                                    Percentage = periodTotal > 0 ? Math.Round((decimal)x.OrderCount / periodTotal * 100, 2) : 0
                                });
                            })
                            .OrderBy(x => x.PeriodStart)
                            .ThenByDescending(x => x.OrderCount)
                            .ToList();
                    }
                    else if (period == "quarter")
                    {
                        reportData = orders
                            .GroupBy(o => new
                            {
                                Year = o.order_date!.Value.Year,
                                Quarter = (o.order_date!.Value.Month - 1) / 3 + 1,
                                Status = o.status!.ToLower()
                            })
                            .Select(g => new
                            {
                                Period = $"Q{g.Key.Quarter} {g.Key.Year}",
                                PeriodStart = new DateTime(g.Key.Year, (g.Key.Quarter - 1) * 3 + 1, 1),
                                Status = g.Key.Status,
                                OrderCount = g.Count()
                            })
                            .GroupBy(x => new { x.Period, x.PeriodStart })
                            .SelectMany(periodGroup =>
                            {
                                var periodTotal = periodGroup.Sum(x => x.OrderCount);
                                return periodGroup.Select(x => new OrderStatusReportDto
                                {
                                    Period = x.Period,
                                    PeriodStart = x.PeriodStart,
                                    Status = x.Status,
                                    StatusDisplay = x.Status switch
                                    {
                                        "pending" => "Đang chờ xử lý",
                                        "processing" => "Đang xử lý",
                                        "shipped" => "Đang giao hàng",
                                        "delivered" => "Đã giao hàng",
                                        "completed" => "Đã hoàn thành",
                                        "cancelled" => "Đã hủy",
                                        "paid" => "Đã thanh toán",
                                        _ => x.Status
                                    },
                                    OrderCount = x.OrderCount,
                                    Percentage = periodTotal > 0 ? Math.Round((decimal)x.OrderCount / periodTotal * 100, 2) : 0
                                });
                            })
                            .OrderBy(x => x.PeriodStart)
                            .ThenByDescending(x => x.OrderCount)
                            .ToList();
                    }
                    else // year
                    {
                        reportData = orders
                            .GroupBy(o => new { Year = o.order_date!.Value.Year, Status = o.status!.ToLower() })
                            .Select(g => new
                            {
                                Period = g.Key.Year.ToString(),
                                PeriodStart = new DateTime(g.Key.Year, 1, 1),
                                Status = g.Key.Status,
                                OrderCount = g.Count()
                            })
                            .GroupBy(x => new { x.Period, x.PeriodStart })
                            .SelectMany(periodGroup =>
                            {
                                var periodTotal = periodGroup.Sum(x => x.OrderCount);
                                return periodGroup.Select(x => new OrderStatusReportDto
                                {
                                    Period = x.Period,
                                    PeriodStart = x.PeriodStart,
                                    Status = x.Status,
                                    StatusDisplay = x.Status switch
                                    {
                                        "pending" => "Đang chờ xử lý",
                                        "processing" => "Đang xử lý",
                                        "shipped" => "Đang giao hàng",
                                        "delivered" => "Đã giao hàng",
                                        "completed" => "Đã hoàn thành",
                                        "cancelled" => "Đã hủy",
                                        "paid" => "Đã thanh toán",
                                        _ => x.Status
                                    },
                                    OrderCount = x.OrderCount,
                                    Percentage = periodTotal > 0 ? Math.Round((decimal)x.OrderCount / periodTotal * 100, 2) : 0
                                });
                            })
                            .OrderBy(x => x.PeriodStart)
                            .ThenByDescending(x => x.OrderCount)
                            .ToList();
                    }
                }
                else
                {
                    // Không nhóm theo period, chỉ nhóm theo status
                    var statusGroups = orders
                        .GroupBy(o => o.status!.ToLower())
                        .Select(g => new
                        {
                            Status = g.Key,
                            OrderCount = g.Count()
                        })
                        .ToList();

                    reportData = statusGroups.Select(g => new OrderStatusReportDto
                    {
                        Period = "",
                        PeriodStart = DateTime.MinValue,
                        Status = g.Status,
                        StatusDisplay = g.Status switch
                        {
                            "pending" => "Đang chờ xử lý",
                            "processing" => "Đang xử lý",
                            "shipped" => "Đang giao hàng",
                            "delivered" => "Đã giao hàng",
                            "completed" => "Đã hoàn thành",
                            "cancelled" => "Đã hủy",
                            "paid" => "Đã thanh toán",
                            _ => g.Status
                        },
                        OrderCount = g.OrderCount,
                        Percentage = totalOrders > 0 ? Math.Round((decimal)g.OrderCount / totalOrders * 100, 2) : 0
                    })
                    .OrderByDescending(x => x.OrderCount)
                    .ToList();
                }

                var response = new OrderStatusReportResponse
                {
                    PeriodType = hasPeriod ? period : "",
                    TotalOrders = totalOrders,
                    Data = reportData
                };

                return Ok(ApiResponse<OrderStatusReportResponse>.SuccessResponse(
                    response,
                    "Lấy báo cáo số lượng đơn theo trạng thái thành công."));
            }
            catch (Exception ex)
            {
                Console.WriteLine($"[CRITICAL ERROR] GetOrderStatusReport: {ex.Message}");
                return StatusCode(500, ApiResponse<object>.ErrorResponse(
                    "Lỗi hệ thống khi lấy báo cáo trạng thái đơn hàng.",
                    new List<string> { ex.Message }));
            }
        }

        // ============================================
        // UPDATE ORDER STATUS: PUT api/v1/Order/Status/{orderId} (Admin only)
        // ============================================
        /// <summary>
        /// Cập nhật trạng thái đơn hàng. Chỉ dành cho Admin.
        /// </summary>
        /// <param name="orderId">ID của đơn hàng cần cập nhật.</param>
        /// <param name="statusUpdateDto">Thông tin cập nhật trạng thái.</param>
        /// <response code="200">Cập nhật trạng thái thành công.</response>
        /// <response code="400">Dữ liệu không hợp lệ.</response>
        /// <response code="401">Chưa đăng nhập.</response>
        /// <response code="403">Không có quyền admin.</response>
        /// <response code="404">Không tìm thấy đơn hàng.</response>
        [HttpPut("Status/{orderId}")]
        [ProducesResponseType(typeof(ApiResponse<OrderDto>), 200)]
        [ProducesResponseType(typeof(ApiResponse<object>), 400)]
        [ProducesResponseType(typeof(ApiResponse<object>), 401)]
        [ProducesResponseType(typeof(ApiResponse<object>), 403)]
        [ProducesResponseType(typeof(ApiResponse<object>), 404)]
        public async Task<IActionResult> UpdateOrderStatus(int orderId, [FromBody] OrderStatusUpdateDto statusUpdateDto)
        {
            // Kiểm tra đăng nhập
            if (!AuthHelper.IsLoggedIn(HttpContext))
            {
                return Unauthorized(ApiResponse<object>.ErrorResponse("Bạn cần đăng nhập để thực hiện thao tác này."));
            }

            // Kiểm tra quyền admin
            if (!AuthHelper.IsAdmin(HttpContext))
            {
                return StatusCode(403, ApiResponse<object>.ErrorResponse("Chỉ có quyền admin mới được cập nhật trạng thái đơn hàng."));
            }

            try
            {
                if (statusUpdateDto == null || string.IsNullOrWhiteSpace(statusUpdateDto.Status))
                {
                    return BadRequest(ApiResponse<object>.ErrorResponse("Trạng thái không được để trống."));
                }

                // Validate trạng thái hợp lệ - chỉ có 3 trạng thái: pending, paid, cancelled
                var validStatuses = new[] { "pending", "paid", "cancelled" };
                var statusLower = statusUpdateDto.Status.ToLower().Trim();
                
                if (!validStatuses.Contains(statusLower))
                {
                    return BadRequest(ApiResponse<object>.ErrorResponse(
                        $"Trạng thái không hợp lệ. Các trạng thái hợp lệ: Đang chờ xử lý (pending), Đã thanh toán (paid), Đã hủy (cancelled)"));
                }

                var adminId = AuthHelper.GetCurrentUserId(HttpContext);
                if (!adminId.HasValue)
                {
                    return Unauthorized(ApiResponse<object>.ErrorResponse("Không thể xác định người dùng hiện tại."));
                }

                // Tìm đơn hàng
                var order = await _context.orders
                    .FirstOrDefaultAsync(o => o.order_id == orderId);

                if (order == null)
                {
                    return NotFound(ApiResponse<object>.ErrorResponse($"Không tìm thấy đơn hàng với ID: {orderId}."));
                }

                // Lưu trạng thái cũ để kiểm tra
                var oldStatus = order.status?.ToLower() ?? "";

                // Cập nhật trạng thái
                order.status = statusLower;
                order.updated_at = DateTime.UtcNow;
                order.updated_by = adminId.Value;

                await _context.SaveChangesAsync();

                // Nếu chuyển sang "paid" và loại thanh toán là COD, trừ stock và bán serial
                if (statusLower == "paid" && oldStatus != "paid" && order.types == "COD")
                {
                    await ProcessStockAndSerialsForOrderAsync(orderId, adminId.Value, order.user_id);
                }

                // Lấy lại thông tin đơn hàng với đầy đủ thông tin
                var updatedOrder = await (from o in _context.orders
                                         join u in _context.users on o.user_id equals u.user_id into userGroup
                                         from u in userGroup.DefaultIfEmpty()
                                         where o.order_id == orderId
                                         select new OrderDto
                                         {
                                             OrderId = o.order_id,
                                             UserId = o.user_id,
                                             Username = u != null ? u.username : null,
                                             OrderDate = o.order_date,
                                             Status = o.status,
                                             TotalAmount = o.total_amount,
                                             Types = o.types,
                                             TypesDisplay = o.types == "COD" ? "Thanh toán khi nhận hàng" :
                                                           o.types == "Transfer" ? "Chuyển khoản" :
                                                           o.types == "ATM" ? "Thẻ ATM" : o.types ?? "COD",
                                             CreatedAt = o.created_at,
                                             UpdatedAt = o.updated_at,
                                             CreatedBy = o.created_by,
                                             UpdatedBy = o.updated_by,
                                             OrderDetails = _context.order_details
                                                 .Where(od => od.order_id == o.order_id)
                                                 .Join(_context.products,
                                                     od => od.product_id,
                                                     p => p.product_id,
                                                     (od, p) => new OrderDetailDto
                                                     {
                                                         OrderId = od.order_id,
                                                         ProductId = od.product_id,
                                                         ProductName = p.product_name ?? "",
                                                         Quantity = od.quantity,
                                                         PriceAtPurchase = od.price_at_purchase,
                                                         ImageUrl = p.image_url,
                                                         CreatedAt = od.created_at,
                                                         UpdatedAt = od.updated_at,
                                                         CreatedBy = od.created_by,
                                                         UpdatedBy = od.updated_by
                                                     })
                                                 .ToList()
                                         })
                                         .FirstOrDefaultAsync();

                if (updatedOrder == null)
                {
                    return NotFound(ApiResponse<object>.ErrorResponse($"Không tìm thấy đơn hàng với ID: {orderId}."));
                }

                // Map status display
                var statusDisplay = statusLower switch
                {
                    "pending" => "Đang chờ xử lý",
                    "paid" => "Đã thanh toán",
                    "cancelled" => "Đã hủy",
                    _ => statusLower
                };

                return Ok(ApiResponse<OrderDto>.SuccessResponse(updatedOrder, 
                    $"Cập nhật trạng thái đơn hàng thành công. Trạng thái mới: {statusDisplay}"));
            }
            catch (Exception ex)
            {
                Console.WriteLine($"[CRITICAL ERROR] UpdateOrderStatus: {ex.Message}");
                return StatusCode(500, ApiResponse<object>.ErrorResponse(
                    "Lỗi hệ thống khi cập nhật trạng thái đơn hàng.",
                    new List<string> { ex.Message }));
            }
        }

        /// <summary>
        /// Xử lý trừ stock và bán serial cho đơn hàng khi thanh toán thành công (COD)
        /// </summary>
        private async Task ProcessStockAndSerialsForOrderAsync(int orderId, int updatedBy, int? userId)
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
