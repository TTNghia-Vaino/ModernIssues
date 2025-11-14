using Microsoft.AspNetCore.Mvc;
using ModernIssues.Models.DTOs;
using ModernIssues.Services;
using ModernIssues.Helpers;
using ModernIssues.Models.Common;
using System;
using System.Threading.Tasks;

namespace ModernIssues.Controllers
{
    [Route("/v1/[controller]")]
    [ApiController]
    public class CheckoutController : ControllerBase
    {
        private readonly ICheckoutService _checkoutService;

        public CheckoutController(ICheckoutService checkoutService)
        {
            _checkoutService = checkoutService;
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
            // Kiểm tra đăng nhập
            if (!AuthHelper.IsLoggedIn(HttpContext))
            {
                return Unauthorized(ApiResponse<object>.ErrorResponse("Bạn cần đăng nhập để checkout."));
            }

            try
            {
                if (checkoutDto == null)
                {
                    return BadRequest(ApiResponse<object>.ErrorResponse("Dữ liệu checkout không được để trống."));
                }

                var userId = AuthHelper.GetCurrentUserId(HttpContext) ?? 0;

                if (userId <= 0)
                {
                    return Unauthorized(ApiResponse<object>.ErrorResponse("Không xác định được user."));
                }

                var order = await _checkoutService.CheckoutAsync(userId, checkoutDto.PaymentType);

                return Ok(ApiResponse<OrderDto>.SuccessResponse(order, "Checkout thành công. Đơn hàng đã được tạo."));
            }
            catch (ArgumentException ex)
            {
                return BadRequest(ApiResponse<object>.ErrorResponse(ex.Message));
            }
            catch (Exception ex)
            {
                Console.WriteLine($"[CRITICAL ERROR] Checkout: {ex.Message}");
                Console.WriteLine($"[CRITICAL ERROR] StackTrace: {ex.StackTrace}");
                return StatusCode(HttpStatusCodes.InternalServerError,
                    ApiResponse<object>.ErrorResponse("Lỗi hệ thống khi checkout."));
            }
        }
    }
}

