using Microsoft.AspNetCore.Mvc;
using ModernIssues.Models.DTOs;
using ModernIssues.Repositories.Interface;
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
    public class CheckoutController : ControllerBase
    {
        private readonly ICheckoutRepository _checkoutRepository;
        private readonly WebDbContext _context;

        public CheckoutController(ICheckoutRepository checkoutRepository, WebDbContext context)
        {
            _checkoutRepository = checkoutRepository;
            _context = context;
        }

        /// <summary>
        /// Helper method để ghi log hành động user
        /// </summary>
        private async Task LogActionAsync(string actionType, int? productId = null)
        {
            try
            {
                var userId = AuthHelper.GetCurrentUserId(HttpContext);
                Console.WriteLine($"[LOG] Attempting to log: action={actionType}, userId={userId}, productId={productId}");
                
                var log = new log
                {
                    user_id = userId,
                    product_id = productId,
                    action_type = actionType,
                    created_at = DateTime.UtcNow
                };
                _context.logs.Add(log);
                var result = await _context.SaveChangesAsync();
                Console.WriteLine($"[LOG] Saved successfully: {result} changes, log_id should be generated");
            }
            catch (Exception ex)
            {
                Console.WriteLine($"[ERROR] LogActionAsync failed: {ex.Message}");
                Console.WriteLine($"[ERROR] StackTrace: {ex.StackTrace}");
                if (ex.InnerException != null)
                {
                    Console.WriteLine($"[ERROR] InnerException: {ex.InnerException.Message}");
                }
                // Không throw exception để không ảnh hưởng business logic
            }
        }

        // ============================================
        // POST CHECKOUT: POST /v1/Checkout
        // ============================================
        /// <summary>
        /// Checkout - Tạo đơn hàng từ giỏ hàng của user hiện tại.
        /// </summary>
        /// <param name="checkoutDto">Thông tin checkout (payment type).</param>
        /// <response code="200">Checkout thành công, trả về thông tin đơn hàng.</response>
        /// <response code="400">Dữ liệu không hợp lệ hoặc giỏ hàng trống.</response>
        /// <response code="401">Chưa đăng nhập.</response>
        [HttpPost]
        [ProducesResponseType(typeof(ApiResponse<OrderDto>), HttpStatusCodes.OK)]
        [ProducesResponseType(typeof(ApiResponse<object>), HttpStatusCodes.BadRequest)]
        [ProducesResponseType(typeof(ApiResponse<object>), HttpStatusCodes.Unauthorized)]
        public async Task<IActionResult> Checkout([FromBody] CheckoutDto checkoutDto)
        {
            if (!AuthHelper.IsLoggedIn(HttpContext))
            {
                return Unauthorized(ApiResponse<object>.ErrorResponse("Bạn cần đăng nhập."));
            }

            if (checkoutDto == null)
            {
                return BadRequest(ApiResponse<object>.ErrorResponse("Dữ liệu không hợp lệ."));
            }

            if (string.IsNullOrWhiteSpace(checkoutDto.PaymentType))
            {
                return BadRequest(ApiResponse<object>.ErrorResponse("Loại thanh toán không được để trống."));
            }

            var validPaymentTypes = new[] { "COD", "Transfer", "ATM" };
            if (!validPaymentTypes.Contains(checkoutDto.PaymentType))
            {
                return BadRequest(ApiResponse<object>.ErrorResponse($"Loại thanh toán không hợp lệ. Chỉ chấp nhận: {string.Join(", ", validPaymentTypes)}"));
            }

            var userId = AuthHelper.GetCurrentUserId(HttpContext);
            if (!userId.HasValue)
            {
                return Unauthorized(ApiResponse<object>.ErrorResponse("Không thể xác định người dùng."));
            }

            try
            {
                var order = await _checkoutRepository.CheckoutAsync(userId.Value, checkoutDto.PaymentType);
                
                // Log checkout
                await LogActionAsync("checkout");
                
                return Ok(ApiResponse<OrderDto>.SuccessResponse(order, "Checkout thành công."));
            }
            catch (ArgumentException ex)
            {
                return BadRequest(ApiResponse<object>.ErrorResponse(ex.Message));
            }
            catch (Exception ex)
            {
                Console.WriteLine($"[ERROR] Checkout: {ex.Message}");
                return StatusCode(HttpStatusCodes.InternalServerError,
                    ApiResponse<object>.ErrorResponse("Lỗi hệ thống."));
            }
        }

        // ============================================
        // POST TEST CHECKOUT: POST /v1/Checkout/Test
        // ============================================
        /// <summary>
        /// Test Checkout - Tạo đơn hàng test trực tiếp từ productId và quantity (không cần cart).
        /// Dùng để test payment flow với Transfer.
        /// </summary>
        /// <param name="testCheckoutDto">Thông tin test checkout (productId, quantity, paymentType).</param>
        /// <response code="200">Checkout thành công, trả về thông tin đơn hàng (bao gồm gencode nếu là Transfer).</response>
        /// <response code="400">Dữ liệu không hợp lệ hoặc sản phẩm không đủ số lượng.</response>
        /// <response code="401">Chưa đăng nhập.</response>
        [HttpPost("Test")]
        [ProducesResponseType(typeof(ApiResponse<OrderDto>), HttpStatusCodes.OK)]
        [ProducesResponseType(typeof(ApiResponse<object>), HttpStatusCodes.BadRequest)]
        [ProducesResponseType(typeof(ApiResponse<object>), HttpStatusCodes.Unauthorized)]
        public async Task<IActionResult> TestCheckout([FromBody] TestCheckoutDto testCheckoutDto)
        {
            if (!AuthHelper.IsLoggedIn(HttpContext))
            {
                return Unauthorized(ApiResponse<object>.ErrorResponse("Bạn cần đăng nhập."));
            }

            if (testCheckoutDto == null)
            {
                return BadRequest(ApiResponse<object>.ErrorResponse("Dữ liệu không hợp lệ."));
            }

            if (testCheckoutDto.ProductId <= 0)
            {
                return BadRequest(ApiResponse<object>.ErrorResponse("Product ID không hợp lệ."));
            }

            if (testCheckoutDto.Quantity <= 0)
            {
                return BadRequest(ApiResponse<object>.ErrorResponse("Số lượng phải lớn hơn 0."));
            }

            if (string.IsNullOrWhiteSpace(testCheckoutDto.PaymentType))
            {
                return BadRequest(ApiResponse<object>.ErrorResponse("Loại thanh toán không được để trống."));
            }

            var validPaymentTypes = new[] { "COD", "Transfer", "ATM" };
            if (!validPaymentTypes.Contains(testCheckoutDto.PaymentType))
            {
                return BadRequest(ApiResponse<object>.ErrorResponse($"Loại thanh toán không hợp lệ. Chỉ chấp nhận: {string.Join(", ", validPaymentTypes)}"));
            }

            var userId = AuthHelper.GetCurrentUserId(HttpContext);
            if (!userId.HasValue)
            {
                return Unauthorized(ApiResponse<object>.ErrorResponse("Không thể xác định người dùng."));
            }

            try
            {
                var order = await _checkoutRepository.TestCheckoutAsync(
                    userId.Value, 
                    testCheckoutDto.ProductId, 
                    testCheckoutDto.Quantity, 
                    testCheckoutDto.PaymentType);
                
                return Ok(ApiResponse<OrderDto>.SuccessResponse(order, "Test checkout thành công. Đơn hàng đã được tạo."));
            }
            catch (ArgumentException ex)
            {
                return BadRequest(ApiResponse<object>.ErrorResponse(ex.Message));
            }
            catch (Exception ex)
            {
                Console.WriteLine($"[ERROR] Test Checkout: {ex.Message}");
                return StatusCode(HttpStatusCodes.InternalServerError,
                    ApiResponse<object>.ErrorResponse("Lỗi hệ thống."));
            }
        }
    }
}

