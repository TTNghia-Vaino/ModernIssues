using Microsoft.AspNetCore.Mvc;
using ModernIssues.Models.DTOs;
using ModernIssues.Repositories;
using ModernIssues.Helpers;
using ModernIssues.Models.Common;
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

        public CheckoutController(ICheckoutRepository checkoutRepository)
        {
            _checkoutRepository = checkoutRepository;
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
    }
}

