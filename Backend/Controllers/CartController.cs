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
                Console.WriteLine($"[ERROR] GetCart: {ex.Message}");
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
        [HttpGet("summary")]
        [ProducesResponseType(typeof(ApiResponse<CartSummaryDto>), HttpStatusCodes.OK)]
        [ProducesResponseType(typeof(ApiResponse<object>), HttpStatusCodes.NotFound)]
        [ProducesResponseType(typeof(ApiResponse<object>), HttpStatusCodes.Unauthorized)]
        public async Task<IActionResult> GetCartSummary()
        {
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
                Console.WriteLine($"[ERROR] GetCartSummary: {ex.Message}");
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
        [HttpPost("add")]
        [ProducesResponseType(typeof(ApiResponse<CartDto>), HttpStatusCodes.OK)]
        [ProducesResponseType(typeof(ApiResponse<object>), HttpStatusCodes.BadRequest)]
        [ProducesResponseType(typeof(ApiResponse<object>), HttpStatusCodes.Unauthorized)]
        public async Task<IActionResult> AddToCart([FromBody] AddToCartDto addToCartDto)
        {
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
                
                if (cart == null)
                {
                    return BadRequest(ApiResponse<object>.ErrorResponse("Không thể thêm sản phẩm vào giỏ hàng."));
                }
                
                return Ok(ApiResponse<CartDto>.SuccessResponse(cart, "Thêm sản phẩm vào giỏ hàng thành công."));
            }
            catch (ArgumentException ex)
            {
                return BadRequest(ApiResponse<object>.ErrorResponse(ex.Message));
            }
            catch (Exception ex)
            {
                Console.WriteLine($"[ERROR] AddToCart: {ex.Message}");
                return StatusCode(HttpStatusCodes.InternalServerError,
                    ApiResponse<object>.ErrorResponse("Lỗi hệ thống khi thêm sản phẩm vào giỏ hàng."));
            }
        }

        // ============================================
        // 4. UPDATE CART ITEM: PUT /v1/Cart/{cartId}/{productId}
        // ============================================
        /// <summary>
        /// Cập nhật số lượng sản phẩm trong giỏ hàng.
        /// </summary>
        [HttpPut("{cartId}/{productId}")]
        [ProducesResponseType(typeof(ApiResponse<CartDto>), HttpStatusCodes.OK)]
        [ProducesResponseType(typeof(ApiResponse<object>), HttpStatusCodes.BadRequest)]
        [ProducesResponseType(typeof(ApiResponse<object>), HttpStatusCodes.Unauthorized)]
        public async Task<IActionResult> UpdateCartItem(int cartId, int productId, [FromBody] UpdateCartItemDto updateDto)
        {
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
                var cart = await _cartService.UpdateCartItemAsync(userId, cartId, productId, updateDto);
                
                if (cart == null)
                {
                    return BadRequest(ApiResponse<object>.ErrorResponse($"Không tìm thấy cart item với Cart ID: {cartId} và Product ID: {productId}."));
                }

                return Ok(ApiResponse<CartDto>.SuccessResponse(cart, "Cập nhật giỏ hàng thành công."));
            }
            catch (ArgumentException ex)
            {
                return BadRequest(ApiResponse<object>.ErrorResponse(ex.Message));
            }
            catch (Exception ex)
            {
                Console.WriteLine($"[ERROR] UpdateCartItem: {ex.Message}");
                return StatusCode(HttpStatusCodes.InternalServerError,
                    ApiResponse<object>.ErrorResponse("Lỗi hệ thống khi cập nhật giỏ hàng."));
            }
        }

        // ============================================
        // 5. REMOVE FROM CART: DELETE /v1/Cart/{cartId}/{productId}
        // ============================================
        /// <summary>
        /// Xóa sản phẩm khỏi giỏ hàng.
        /// </summary>
        [HttpDelete("{cartId}/{productId}")]
        [ProducesResponseType(typeof(ApiResponse<object>), HttpStatusCodes.OK)]
        [ProducesResponseType(typeof(ApiResponse<object>), HttpStatusCodes.BadRequest)]
        [ProducesResponseType(typeof(ApiResponse<object>), HttpStatusCodes.Unauthorized)]
        public async Task<IActionResult> RemoveFromCart(int cartId, int productId)
        {
            if (!AuthHelper.IsLoggedIn(HttpContext))
            {
                return Unauthorized(ApiResponse<object>.ErrorResponse("Bạn cần đăng nhập để xóa sản phẩm khỏi giỏ hàng."));
            }

            try
            {
                var userId = AuthHelper.GetCurrentUserId(HttpContext) ?? 0;
                var success = await _cartService.RemoveFromCartAsync(userId, cartId, productId);
                
                if (!success)
                {
                    return BadRequest(ApiResponse<object>.ErrorResponse($"Không tìm thấy cart item với Cart ID: {cartId} và Product ID: {productId}."));
                }

                return Ok(ApiResponse<object>.SuccessResponse(new { cartId, productId }, "Xóa sản phẩm khỏi giỏ hàng thành công."));
            }
            catch (ArgumentException ex)
            {
                return BadRequest(ApiResponse<object>.ErrorResponse(ex.Message));
            }
            catch (Exception ex)
            {
                Console.WriteLine($"[ERROR] RemoveFromCart: {ex.Message}");
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
        [HttpDelete("clear")]
        [ProducesResponseType(typeof(ApiResponse<object>), HttpStatusCodes.OK)]
        [ProducesResponseType(typeof(ApiResponse<object>), HttpStatusCodes.NotFound)]
        [ProducesResponseType(typeof(ApiResponse<object>), HttpStatusCodes.Unauthorized)]
        public async Task<IActionResult> ClearCart()
        {
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
                Console.WriteLine($"[ERROR] ClearCart: {ex.Message}");
                return StatusCode(HttpStatusCodes.InternalServerError,
                    ApiResponse<object>.ErrorResponse("Lỗi hệ thống khi xóa giỏ hàng."));
            }
        }
    }
}

