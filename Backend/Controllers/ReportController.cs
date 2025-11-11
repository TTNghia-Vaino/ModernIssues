using Microsoft.AspNetCore.Mvc;
using ModernIssues.Helpers;
using ModernIssues.Models.Common;
using ModernIssues.Models.Entities;
using Microsoft.EntityFrameworkCore;
using System;
using System.Linq;
using System.Threading.Tasks;

namespace ModernIssues.Controllers
{
    [Route("/v1/[controller]")]
    [ApiController]
    public class ReportController : ControllerBase
    {
        private readonly WebDbContext _context;

        public ReportController(WebDbContext context)
        {
            _context = context;
        }

        /// <summary>
        /// Tổng doanh thu theo khoảng thời gian
        /// </summary>
        [HttpGet("Revenue")]
        public async Task<IActionResult> GetRevenue(
            [FromQuery] DateTime? fromDate,
            [FromQuery] DateTime? toDate)
        {
            if (!AuthHelper.IsAdmin(HttpContext))
            {
                return Unauthorized(ApiResponse<object>.ErrorResponse("Chỉ admin mới có quyền xem báo cáo."));
            }

            var from = fromDate ?? DateTime.UtcNow.AddDays(-30);
            var to = toDate ?? DateTime.UtcNow;

            // Lấy đơn hàng đã thanh toán (status = "paid")
            var orders = await _context.orders
                .Where(o => o.status == "paid" 
                    && o.order_date >= from 
                    && o.order_date <= to)
                .ToListAsync();

            var totalRevenue = orders.Sum(o => o.total_amount ?? 0);
            var totalOrders = orders.Count;
            var averageOrderValue = totalOrders > 0 ? totalRevenue / totalOrders : 0;

            // Thống kê theo loại thanh toán
            var revenueByPaymentType = orders
                .GroupBy(o => o.types ?? "Unknown")
                .Select(g => new
                {
                    paymentType = g.Key,
                    revenue = g.Sum(o => o.total_amount ?? 0),
                    orderCount = g.Count()
                })
                .ToList();

            return Ok(ApiResponse<object>.SuccessResponse(new
            {
                fromDate = from,
                toDate = to,
                totalRevenue = totalRevenue,
                totalOrders = totalOrders,
                averageOrderValue = averageOrderValue,
                revenueByPaymentType = revenueByPaymentType
            }, "Báo cáo doanh thu."));
        }

        /// <summary>
        /// Doanh thu theo ngày
        /// </summary>
        [HttpGet("Revenue/Daily")]
        public async Task<IActionResult> GetDailyRevenue(
            [FromQuery] DateTime? fromDate,
            [FromQuery] DateTime? toDate)
        {
            if (!AuthHelper.IsAdmin(HttpContext))
            {
                return Unauthorized(ApiResponse<object>.ErrorResponse("Chỉ admin mới có quyền xem báo cáo."));
            }

            var from = fromDate ?? DateTime.UtcNow.AddDays(-30);
            var to = toDate ?? DateTime.UtcNow;

            var dailyRevenue = await _context.orders
                .Where(o => o.status == "paid" 
                    && o.order_date >= from 
                    && o.order_date <= to)
                .GroupBy(o => o.order_date.Value.Date)
                .Select(g => new
                {
                    date = g.Key,
                    revenue = g.Sum(o => o.total_amount ?? 0),
                    orderCount = g.Count()
                })
                .OrderBy(x => x.date)
                .ToListAsync();

            return Ok(ApiResponse<object>.SuccessResponse(dailyRevenue, "Doanh thu theo ngày."));
        }

        /// <summary>
        /// Doanh thu theo sản phẩm
        /// </summary>
        [HttpGet("Revenue/ByProduct")]
        public async Task<IActionResult> GetRevenueByProduct(
            [FromQuery] DateTime? fromDate,
            [FromQuery] DateTime? toDate,
            [FromQuery] int limit = 10)
        {
            if (!AuthHelper.IsAdmin(HttpContext))
            {
                return Unauthorized(ApiResponse<object>.ErrorResponse("Chỉ admin mới có quyền xem báo cáo."));
            }

            var from = fromDate ?? DateTime.UtcNow.AddDays(-30);
            var to = toDate ?? DateTime.UtcNow;

            var productRevenue = await _context.order_details
                .Include(od => od.product)
                .Include(od => od.order)
                .Where(od => od.order.status == "paid"
                    && od.order.order_date >= from
                    && od.order.order_date <= to)
                .GroupBy(od => new
                {
                    od.product_id,
                    od.product_name,
                    od.product.image_url
                })
                .Select(g => new
                {
                    productId = g.Key.product_id,
                    productName = g.Key.product_name,
                    imageUrl = g.Key.image_url,
                    totalRevenue = g.Sum(od => od.price_at_purchase * od.quantity),
                    totalQuantity = g.Sum(od => od.quantity),
                    orderCount = g.Select(od => od.order_id).Distinct().Count(),
                    averagePrice = g.Average(od => od.price_at_purchase)
                })
                .OrderByDescending(x => x.totalRevenue)
                .Take(limit)
                .ToListAsync();

            return Ok(ApiResponse<object>.SuccessResponse(productRevenue, $"Top {limit} sản phẩm doanh thu cao nhất."));
        }

        /// <summary>
        /// Top sản phẩm bán chạy (theo số lượng)
        /// </summary>
        [HttpGet("TopSelling")]
        public async Task<IActionResult> GetTopSellingProducts(
            [FromQuery] DateTime? fromDate,
            [FromQuery] DateTime? toDate,
            [FromQuery] int limit = 10)
        {
            if (!AuthHelper.IsAdmin(HttpContext))
            {
                return Unauthorized(ApiResponse<object>.ErrorResponse("Chỉ admin mới có quyền xem báo cáo."));
            }

            var from = fromDate ?? DateTime.UtcNow.AddDays(-30);
            var to = toDate ?? DateTime.UtcNow;

            var topSelling = await _context.order_details
                .Include(od => od.product)
                .Include(od => od.order)
                .Where(od => od.order.status == "paid"
                    && od.order.order_date >= from
                    && od.order.order_date <= to)
                .GroupBy(od => new
                {
                    od.product_id,
                    od.product_name,
                    od.product.image_url,
                    od.product.price
                })
                .Select(g => new
                {
                    productId = g.Key.product_id,
                    productName = g.Key.product_name,
                    imageUrl = g.Key.image_url,
                    currentPrice = g.Key.price,
                    totalQuantitySold = g.Sum(od => od.quantity),
                    totalRevenue = g.Sum(od => od.price_at_purchase * od.quantity),
                    orderCount = g.Select(od => od.order_id).Distinct().Count()
                })
                .OrderByDescending(x => x.totalQuantitySold)
                .Take(limit)
                .ToListAsync();

            return Ok(ApiResponse<object>.SuccessResponse(topSelling, $"Top {limit} sản phẩm bán chạy nhất."));
        }

        /// <summary>
        /// Thống kê đơn hàng
        /// </summary>
        [HttpGet("Orders")]
        public async Task<IActionResult> GetOrderStatistics(
            [FromQuery] DateTime? fromDate,
            [FromQuery] DateTime? toDate)
        {
            if (!AuthHelper.IsAdmin(HttpContext))
            {
                return Unauthorized(ApiResponse<object>.ErrorResponse("Chỉ admin mới có quyền xem báo cáo."));
            }

            var from = fromDate ?? DateTime.UtcNow.AddDays(-30);
            var to = toDate ?? DateTime.UtcNow;

            var orders = await _context.orders
                .Where(o => o.order_date >= from && o.order_date <= to)
                .ToListAsync();

            var statistics = new
            {
                totalOrders = orders.Count,
                paidOrders = orders.Count(o => o.status == "paid"),
                pendingOrders = orders.Count(o => o.status == "pending"),
                cancelledOrders = orders.Count(o => o.status == "cancelled"),
                totalRevenue = orders.Where(o => o.status == "paid").Sum(o => o.total_amount ?? 0),
                ordersByStatus = orders.GroupBy(o => o.status ?? "unknown")
                    .Select(g => new
                    {
                        status = g.Key,
                        count = g.Count(),
                        revenue = g.Where(o => o.status == "paid").Sum(o => o.total_amount ?? 0)
                    })
                    .ToList(),
                ordersByPaymentType = orders.GroupBy(o => o.types ?? "unknown")
                    .Select(g => new
                    {
                        paymentType = g.Key,
                        count = g.Count(),
                        revenue = g.Where(o => o.status == "paid").Sum(o => o.total_amount ?? 0)
                    })
                    .ToList()
            };

            return Ok(ApiResponse<object>.SuccessResponse(statistics, "Thống kê đơn hàng."));
        }

        /// <summary>
        /// Doanh thu theo tháng
        /// </summary>
        [HttpGet("Revenue/Monthly")]
        public async Task<IActionResult> GetMonthlyRevenue(
            [FromQuery] int? year)
        {
            if (!AuthHelper.IsAdmin(HttpContext))
            {
                return Unauthorized(ApiResponse<object>.ErrorResponse("Chỉ admin mới có quyền xem báo cáo."));
            }

            var targetYear = year ?? DateTime.UtcNow.Year;

            var monthlyRevenue = await _context.orders
                .Where(o => o.status == "paid"
                    && o.order_date.Value.Year == targetYear)
                .GroupBy(o => new
                {
                    Year = o.order_date.Value.Year,
                    Month = o.order_date.Value.Month
                })
                .Select(g => new
                {
                    year = g.Key.Year,
                    month = g.Key.Month,
                    revenue = g.Sum(o => o.total_amount ?? 0),
                    orderCount = g.Count(),
                    averageOrderValue = g.Average(o => o.total_amount ?? 0)
                })
                .OrderBy(x => x.year)
                .ThenBy(x => x.month)
                .ToListAsync();

            return Ok(ApiResponse<object>.SuccessResponse(monthlyRevenue, $"Doanh thu theo tháng năm {targetYear}."));
        }

        /// <summary>
        /// Báo cáo tổng hợp (dashboard)
        /// </summary>
        [HttpGet("Dashboard")]
        public async Task<IActionResult> GetDashboard(
            [FromQuery] DateTime? fromDate,
            [FromQuery] DateTime? toDate)
        {
            if (!AuthHelper.IsAdmin(HttpContext))
            {
                return Unauthorized(ApiResponse<object>.ErrorResponse("Chỉ admin mới có quyền xem báo cáo."));
            }

            var from = fromDate ?? DateTime.UtcNow.AddDays(-30);
            var to = toDate ?? DateTime.UtcNow;

            // Tổng doanh thu
            var totalRevenue = await _context.orders
                .Where(o => o.status == "paid" && o.order_date >= from && o.order_date <= to)
                .SumAsync(o => o.total_amount ?? 0);

            // Tổng đơn hàng
            var totalOrders = await _context.orders
                .Where(o => o.order_date >= from && o.order_date <= to)
                .CountAsync();

            // Đơn hàng đã thanh toán
            var paidOrders = await _context.orders
                .Where(o => o.status == "paid" && o.order_date >= from && o.order_date <= to)
                .CountAsync();

            // Số lượng sản phẩm đã bán
            var totalProductsSold = await _context.order_details
                .Include(od => od.order)
                .Where(od => od.order.status == "paid"
                    && od.order.order_date >= from
                    && od.order.order_date <= to)
                .SumAsync(od => od.quantity);

            // Top 5 sản phẩm bán chạy
            var topProducts = await _context.order_details
                .Include(od => od.product)
                .Include(od => od.order)
                .Where(od => od.order.status == "paid"
                    && od.order.order_date >= from
                    && od.order.order_date <= to)
                .GroupBy(od => new { od.product_id, od.product_name })
                .Select(g => new
                {
                    productId = g.Key.product_id,
                    productName = g.Key.product_name,
                    quantitySold = g.Sum(od => od.quantity),
                    revenue = g.Sum(od => od.price_at_purchase * od.quantity)
                })
                .OrderByDescending(x => x.quantitySold)
                .Take(5)
                .ToListAsync();

            // Doanh thu 7 ngày gần nhất
            var last7DaysRevenue = await _context.orders
                .Where(o => o.status == "paid"
                    && o.order_date >= DateTime.UtcNow.AddDays(-7)
                    && o.order_date <= DateTime.UtcNow)
                .GroupBy(o => o.order_date.Value.Date)
                .Select(g => new
                {
                    date = g.Key,
                    revenue = g.Sum(o => o.total_amount ?? 0),
                    orders = g.Count()
                })
                .OrderBy(x => x.date)
                .ToListAsync();

            var dashboard = new
            {
                summary = new
                {
                    totalRevenue = totalRevenue,
                    totalOrders = totalOrders,
                    paidOrders = paidOrders,
                    pendingOrders = totalOrders - paidOrders,
                    totalProductsSold = totalProductsSold,
                    averageOrderValue = paidOrders > 0 ? totalRevenue / paidOrders : 0,
                    conversionRate = totalOrders > 0 ? (double)paidOrders / totalOrders * 100 : 0
                },
                topProducts = topProducts,
                last7DaysRevenue = last7DaysRevenue,
                dateRange = new { from, to }
            };

            return Ok(ApiResponse<object>.SuccessResponse(dashboard, "Báo cáo tổng hợp dashboard."));
        }
    }
}

