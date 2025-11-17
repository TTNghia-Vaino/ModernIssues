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
using System.Linq;

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
    }
}
