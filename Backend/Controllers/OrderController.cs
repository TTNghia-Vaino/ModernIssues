using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Http;
using Microsoft.EntityFrameworkCore;
using ModernIssues.Models.Configurations;
using ModernIssues.Models.DTOs;
using ModernIssues.Models.Entities;
using System;
using System.Threading.Tasks;
using ModernIssues.Services;
using Microsoft.Extensions.Caching.Memory;

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

        // viết hàm orders lay het don hang theo username với 
        // session đã được set up HttpContext.Session.SetString("username", user.username);
        //các thuộc t ính của order cần lấy: order_id, order_date, status, total_amount, created_at, updated_at
        // sau đó return lại list of orders


        /// viết hàm getorder by order_id 
        /// trả lại order_id với list order_details bao gồm (product_id, product_name, price_at_purchase, quantity, image_url)

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
                // Lấy danh sách đơn hàng theo username
                var orders = await _context.orders
                    .Where(o => o.user_id == user.user_id)
                    .OrderByDescending(o => o.created_at)
                    .Select(o => new
                    {
                        order_id = o.order_id,
                        order_date = o.order_date,
                        status = o.status,
                        total_amount = o.total_amount,
                        created_at = o.created_at,
                        updated_at = o.updated_at
                    })
                    .ToListAsync();
                // nếu orders không có gì thì returl text "Người dùng chưa có đơn hàng"
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
                // Lấy thông tin order
                var order = await _context.orders
                    .Where(o => o.order_id == order_id && o.user_id == user.user_id)
                    .FirstOrDefaultAsync();

                // test code
                //var order = await _context.orders
                //    .Where(o => o.order_id == order_id)
                //    .FirstOrDefaultAsync();

                if (order == null)
                {
                    return NotFound(new { message = "Không tìm thấy đơn hàng" });
                }

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

                // tạo ra 1 biến return_order = order(order_id, order_date, status, total_amount, created_at, updated_at)
                var return_order = new
                {
                    order_id = order.order_id,
                    order_date = order.order_date,
                    status = order.status,
                    total_amount = order.total_amount,
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
    }
}


