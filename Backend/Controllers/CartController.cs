using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Http;
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
    public class CartController : ControllerBase
    {
        private readonly ICartService _cartService;

        public CartController(ICartService cartService)
        {
            _cartService = cartService;
        }

        // ============================================
        // 1. GET CART: GET /v1/Cart
        // ============================================
        /// <summary>
        /// Lấy thông tin giỏ hàng của người dùng hiện tại.
        /// </summary>
        /// <response code="200">Trả về thông tin giỏ hàng.</response>
        /// <response code="404">Không tìm thấy giỏ hàng.</response>
        /// <response code="401">Chưa đăng nhập.</response>
        [HttpGet]
        [ProducesResponseType(typeof(ApiResponse<CartDto>), HttpStatusCodes.OK)]
        [ProducesResponseType(typeof(ApiResponse<object>), HttpStatusCodes.NotFound)]
        [ProducesResponseType(typeof(ApiResponse<object>), HttpStatusCodes.Unauthorized)]
        public async Task<IActionResult> GetCart()
        {
            // Kiểm tra đăng nhập
            if (!AuthHelper.IsLoggedIn(HttpContext))
            {
                return Unauthorized(ApiResponse<object>.ErrorResponse("Bạn cần đăng nhập để xem giỏ hàng."));
            }

            try
            {
                var userId = AuthHelper.GetCurrentUserId(HttpContext) ?? 0;
                var cart = await _cartService.GetCartByUserIdAsync(userId);
                
                if (cart == null)
                {
                    return NotFound(ApiResponse<object>.ErrorResponse("Không tìm thấy giỏ hàng."));
                }

                return Ok(ApiResponse<CartDto>.SuccessResponse(cart, "Lấy thông tin giỏ hàng thành công."));
            }
            catch (Exception ex)
            {
                Console.WriteLine($"[CRITICAL ERROR] GetCart: {ex.Message}");
                return StatusCode(HttpStatusCodes.InternalServerError,
                    ApiResponse<object>.ErrorResponse("Lỗi hệ thống khi lấy thông tin giỏ hàng."));
            }
        }

        // ============================================
        // 2. GET CART SUMMARY: GET /v1/Cart/summary
        // ============================================
        /// <summary>
        /// Lấy tóm tắt giỏ hàng (tổng tiền, số lượng sản phẩm).
        /// </summary>
        /// <response code="200">Trả về tóm tắt giỏ hàng.</response>
        /// <response code="404">Không tìm thấy giỏ hàng.</response>
        /// <response code="401">Chưa đăng nhập.</response>
        [HttpGet("summary")]
        [ProducesResponseType(typeof(ApiResponse<CartSummaryDto>), HttpStatusCodes.OK)]
        [ProducesResponseType(typeof(ApiResponse<object>), HttpStatusCodes.NotFound)]
        [ProducesResponseType(typeof(ApiResponse<object>), HttpStatusCodes.Unauthorized)]
        public async Task<IActionResult> GetCartSummary()
        {
            // Kiểm tra đăng nhập
            if (!AuthHelper.IsLoggedIn(HttpContext))
            {
                return Unauthorized(ApiResponse<object>.ErrorResponse("Bạn cần đăng nhập để xem giỏ hàng."));
            }

            try
            {
                var userId = AuthHelper.GetCurrentUserId(HttpContext) ?? 0;
                var summary = await _cartService.GetCartSummaryAsync(userId);
                
                if (summary == null)
                {
                    return NotFound(ApiResponse<object>.ErrorResponse("Không tìm thấy giỏ hàng."));
                }

                return Ok(ApiResponse<CartSummaryDto>.SuccessResponse(summary, "Lấy tóm tắt giỏ hàng thành công."));
            }
            catch (Exception ex)
            {
                Console.WriteLine($"[CRITICAL ERROR] GetCartSummary: {ex.Message}");
                return StatusCode(HttpStatusCodes.InternalServerError,
                    ApiResponse<object>.ErrorResponse("Lỗi hệ thống khi lấy tóm tắt giỏ hàng."));
            }
        }

        // ============================================
        // 3. ADD TO CART: POST /v1/Cart/add
        // ============================================
        /// <summary>
        /// Thêm sản phẩm vào giỏ hàng.
        /// </summary>
        /// <param name="addToCartDto">Thông tin sản phẩm cần thêm.</param>
        /// <response code="200">Thêm vào giỏ hàng thành công.</response>
        /// <response code="400">Dữ liệu không hợp lệ hoặc sản phẩm không tồn tại.</response>
        /// <response code="401">Chưa đăng nhập.</response>
        [HttpPost("add")]
        [ProducesResponseType(typeof(ApiResponse<CartDto>), HttpStatusCodes.OK)]
        [ProducesResponseType(typeof(ApiResponse<object>), HttpStatusCodes.BadRequest)]
        [ProducesResponseType(typeof(ApiResponse<object>), HttpStatusCodes.Unauthorized)]
        public async Task<IActionResult> AddToCart([FromBody] AddToCartDto addToCartDto)
        {
            // Kiểm tra đăng nhập
            if (!AuthHelper.IsLoggedIn(HttpContext))
            {
                return Unauthorized(ApiResponse<object>.ErrorResponse("Bạn cần đăng nhập để thêm sản phẩm vào giỏ hàng."));
            }

            try
            {
                if (addToCartDto == null)
                {
                    return BadRequest(ApiResponse<object>.ErrorResponse("Dữ liệu sản phẩm không được để trống."));
                }

                var userId = AuthHelper.GetCurrentUserId(HttpContext) ?? 0;
                var cart = await _cartService.AddToCartAsync(userId, addToCartDto);
                
                return Ok(ApiResponse<CartDto>.SuccessResponse(cart, "Thêm sản phẩm vào giỏ hàng thành công."));
            }
            catch (ArgumentException ex)
            {
                return BadRequest(ApiResponse<object>.ErrorResponse(ex.Message));
            }
            catch (Exception ex)
            {
                Console.WriteLine($"[CRITICAL ERROR] AddToCart: {ex.Message}");
                return StatusCode(HttpStatusCodes.InternalServerError,
                    ApiResponse<object>.ErrorResponse("Lỗi hệ thống khi thêm sản phẩm vào giỏ hàng."));
            }
        }

        // ============================================
        // 4. UPDATE CART ITEM: PUT /v1/Cart/item/{cartItemId}
        // ============================================
        /// <summary>
        /// Cập nhật số lượng sản phẩm trong giỏ hàng.
        /// </summary>
        /// <param name="cartItemId">ID của cart item cần cập nhật.</param>
        /// <param name="updateDto">Thông tin cập nhật.</param>
        /// <response code="200">Cập nhật thành công.</response>
        /// <response code="400">Dữ liệu không hợp lệ hoặc cart item không tồn tại.</response>
        /// <response code="401">Chưa đăng nhập.</response>
        [HttpPut("item/{cartItemId}")]
        [ProducesResponseType(typeof(ApiResponse<CartDto>), HttpStatusCodes.OK)]
        [ProducesResponseType(typeof(ApiResponse<object>), HttpStatusCodes.BadRequest)]
        [ProducesResponseType(typeof(ApiResponse<object>), HttpStatusCodes.Unauthorized)]
        public async Task<IActionResult> UpdateCartItem(int cartItemId, [FromBody] UpdateCartItemDto updateDto)
        {
            // Kiểm tra đăng nhập
            if (!AuthHelper.IsLoggedIn(HttpContext))
            {
                return Unauthorized(ApiResponse<object>.ErrorResponse("Bạn cần đăng nhập để cập nhật giỏ hàng."));
            }

            try
            {
                if (updateDto == null)
                {
                    return BadRequest(ApiResponse<object>.ErrorResponse("Dữ liệu cập nhật không được để trống."));
                }

                var userId = AuthHelper.GetCurrentUserId(HttpContext) ?? 0;
                var cart = await _cartService.UpdateCartItemAsync(userId, cartItemId, updateDto);
                
                if (cart == null)
                {
                    return BadRequest(ApiResponse<object>.ErrorResponse($"Không tìm thấy cart item với ID: {cartItemId}."));
                }

                return Ok(ApiResponse<CartDto>.SuccessResponse(cart, "Cập nhật giỏ hàng thành công."));
            }
            catch (ArgumentException ex)
            {
                return BadRequest(ApiResponse<object>.ErrorResponse(ex.Message));
            }
            catch (Exception ex)
            {
                Console.WriteLine($"[CRITICAL ERROR] UpdateCartItem: {ex.Message}");
                return StatusCode(HttpStatusCodes.InternalServerError,
                    ApiResponse<object>.ErrorResponse("Lỗi hệ thống khi cập nhật giỏ hàng."));
            }
        }

        // ============================================
        // 5. REMOVE FROM CART: DELETE /v1/Cart/item/{cartItemId}
        // ============================================
        /// <summary>
        /// Xóa sản phẩm khỏi giỏ hàng.
        /// </summary>
        /// <param name="cartItemId">ID của cart item cần xóa.</param>
        /// <response code="200">Xóa thành công.</response>
        /// <response code="400">Cart item không tồn tại.</response>
        /// <response code="401">Chưa đăng nhập.</response>
        [HttpDelete("item/{cartItemId}")]
        [ProducesResponseType(typeof(ApiResponse<object>), HttpStatusCodes.OK)]
        [ProducesResponseType(typeof(ApiResponse<object>), HttpStatusCodes.BadRequest)]
        [ProducesResponseType(typeof(ApiResponse<object>), HttpStatusCodes.Unauthorized)]
        public async Task<IActionResult> RemoveFromCart(int cartItemId)
        {
            // Kiểm tra đăng nhập
            if (!AuthHelper.IsLoggedIn(HttpContext))
            {
                return Unauthorized(ApiResponse<object>.ErrorResponse("Bạn cần đăng nhập để xóa sản phẩm khỏi giỏ hàng."));
            }

            try
            {
                var userId = AuthHelper.GetCurrentUserId(HttpContext) ?? 0;
                var success = await _cartService.RemoveFromCartAsync(userId, cartItemId);
                
                if (!success)
                {
                    return BadRequest(ApiResponse<object>.ErrorResponse($"Không tìm thấy cart item với ID: {cartItemId}."));
                }

                return Ok(ApiResponse<object>.SuccessResponse(new { cartItemId }, "Xóa sản phẩm khỏi giỏ hàng thành công."));
            }
            catch (ArgumentException ex)
            {
                return BadRequest(ApiResponse<object>.ErrorResponse(ex.Message));
            }
            catch (Exception ex)
            {
                Console.WriteLine($"[CRITICAL ERROR] RemoveFromCart: {ex.Message}");
                return StatusCode(HttpStatusCodes.InternalServerError,
                    ApiResponse<object>.ErrorResponse("Lỗi hệ thống khi xóa sản phẩm khỏi giỏ hàng."));
            }
        }

        // ============================================
        // 6. CLEAR CART: DELETE /v1/Cart/clear
        // ============================================
        /// <summary>
        /// Xóa tất cả sản phẩm khỏi giỏ hàng.
        /// </summary>
        /// <response code="200">Xóa giỏ hàng thành công.</response>
        /// <response code="404">Không tìm thấy giỏ hàng.</response>
        /// <response code="401">Chưa đăng nhập.</response>
        [HttpDelete("clear")]
        [ProducesResponseType(typeof(ApiResponse<object>), HttpStatusCodes.OK)]
        [ProducesResponseType(typeof(ApiResponse<object>), HttpStatusCodes.NotFound)]
        [ProducesResponseType(typeof(ApiResponse<object>), HttpStatusCodes.Unauthorized)]
        public async Task<IActionResult> ClearCart()
        {
            // Kiểm tra đăng nhập
            if (!AuthHelper.IsLoggedIn(HttpContext))
            {
                return Unauthorized(ApiResponse<object>.ErrorResponse("Bạn cần đăng nhập để xóa giỏ hàng."));
            }

            try
            {
                var userId = AuthHelper.GetCurrentUserId(HttpContext) ?? 0;
                var success = await _cartService.ClearCartAsync(userId);
                
                if (!success)
                {
                    return NotFound(ApiResponse<object>.ErrorResponse("Không tìm thấy giỏ hàng để xóa."));
                }

                return Ok(ApiResponse<object>.SuccessResponse(new { userId }, "Xóa giỏ hàng thành công."));
            }
            catch (ArgumentException ex)
            {
                return BadRequest(ApiResponse<object>.ErrorResponse(ex.Message));
            }
            catch (Exception ex)
            {
                Console.WriteLine($"[CRITICAL ERROR] ClearCart: {ex.Message}");
                return StatusCode(HttpStatusCodes.InternalServerError,
                    ApiResponse<object>.ErrorResponse("Lỗi hệ thống khi xóa giỏ hàng."));
            }
        }
    }
}
