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
    public class LogController : ControllerBase
    {
        private readonly ILogService _logService;

        public LogController(ILogService logService)
        {
            _logService = logService;
        }

        /// <summary>
        /// Lấy danh sách logs với phân trang và lọc (Admin only)
        /// </summary>
        /// <param name="page">Số trang (mặc định: 1)</param>
        /// <param name="limit">Số lượng records mỗi trang (mặc định: 20)</param>
        /// <param name="userId">Lọc theo user ID (tùy chọn)</param>
        /// <param name="productId">Lọc theo product ID (tùy chọn)</param>
        /// <param name="actionType">Lọc theo loại hành động (tùy chọn)</param>
        /// <response code="200">Trả về danh sách logs.</response>
        /// <response code="401">Chưa đăng nhập.</response>
        /// <response code="403">Không có quyền admin.</response>
        [HttpGet]
        [ProducesResponseType(typeof(ApiResponse<LogListResponse>), HttpStatusCodes.OK)]
        [ProducesResponseType(typeof(ApiResponse<object>), HttpStatusCodes.Unauthorized)]
        [ProducesResponseType(typeof(ApiResponse<object>), HttpStatusCodes.Forbidden)]
        public async Task<IActionResult> GetLogs(
            [FromQuery] int page = 1,
            [FromQuery] int limit = 20,
            [FromQuery] int? userId = null,
            [FromQuery] int? productId = null,
            [FromQuery] string? actionType = null)
        {
            // Kiểm tra đăng nhập
            if (!AuthHelper.IsLoggedIn(HttpContext))
            {
                return Unauthorized(ApiResponse<object>.ErrorResponse("Bạn cần đăng nhập để xem logs."));
            }

            // Kiểm tra quyền admin
            if (!AuthHelper.IsAdmin(HttpContext))
            {
                return StatusCode(HttpStatusCodes.Forbidden,
                    ApiResponse<object>.ErrorResponse("Chỉ có quyền admin mới được xem logs."));
            }

            try
            {
                var response = await _logService.GetLogsAsync(page, limit, userId, productId, actionType);
                return Ok(ApiResponse<LogListResponse>.SuccessResponse(response, "Lấy danh sách logs thành công."));
            }
            catch (Exception ex)
            {
                Console.WriteLine($"[ERROR] GetLogs: {ex.Message}");
                return StatusCode(HttpStatusCodes.InternalServerError,
                    ApiResponse<object>.ErrorResponse("Lỗi hệ thống khi lấy danh sách logs."));
            }
        }

        /// <summary>
        /// Lấy logs của user hiện tại
        /// </summary>
        /// <param name="page">Số trang (mặc định: 1)</param>
        /// <param name="limit">Số lượng records mỗi trang (mặc định: 20)</param>
        /// <response code="200">Trả về danh sách logs của user.</response>
        /// <response code="401">Chưa đăng nhập.</response>
        [HttpGet("my-logs")]
        [ProducesResponseType(typeof(ApiResponse<LogListResponse>), HttpStatusCodes.OK)]
        [ProducesResponseType(typeof(ApiResponse<object>), HttpStatusCodes.Unauthorized)]
        public async Task<IActionResult> GetMyLogs(
            [FromQuery] int page = 1,
            [FromQuery] int limit = 20)
        {
            if (!AuthHelper.IsLoggedIn(HttpContext))
            {
                return Unauthorized(ApiResponse<object>.ErrorResponse("Bạn cần đăng nhập để xem logs của mình."));
            }

            try
            {
                var userId = AuthHelper.GetCurrentUserId(HttpContext);
                if (userId == null)
                {
                    return Unauthorized(ApiResponse<object>.ErrorResponse("Không thể xác định user ID."));
                }

                var response = await _logService.GetUserLogsAsync(userId.Value, page, limit);
                return Ok(ApiResponse<LogListResponse>.SuccessResponse(response, "Lấy danh sách logs của bạn thành công."));
            }
            catch (Exception ex)
            {
                Console.WriteLine($"[ERROR] GetMyLogs: {ex.Message}");
                return StatusCode(HttpStatusCodes.InternalServerError,
                    ApiResponse<object>.ErrorResponse("Lỗi hệ thống khi lấy logs của bạn."));
            }
        }

        /// <summary>
        /// Lấy logs của một user cụ thể (Admin only)
        /// </summary>
        /// <param name="userId">ID của user</param>
        /// <param name="page">Số trang (mặc định: 1)</param>
        /// <param name="limit">Số lượng records mỗi trang (mặc định: 20)</param>
        /// <response code="200">Trả về danh sách logs của user.</response>
        /// <response code="401">Chưa đăng nhập.</response>
        /// <response code="403">Không có quyền admin.</response>
        [HttpGet("user/{userId}")]
        [ProducesResponseType(typeof(ApiResponse<LogListResponse>), HttpStatusCodes.OK)]
        [ProducesResponseType(typeof(ApiResponse<object>), HttpStatusCodes.Unauthorized)]
        [ProducesResponseType(typeof(ApiResponse<object>), HttpStatusCodes.Forbidden)]
        public async Task<IActionResult> GetUserLogs(
            int userId,
            [FromQuery] int page = 1,
            [FromQuery] int limit = 20)
        {
            if (!AuthHelper.IsLoggedIn(HttpContext))
            {
                return Unauthorized(ApiResponse<object>.ErrorResponse("Bạn cần đăng nhập để xem logs."));
            }

            if (!AuthHelper.IsAdmin(HttpContext))
            {
                return StatusCode(HttpStatusCodes.Forbidden,
                    ApiResponse<object>.ErrorResponse("Chỉ có quyền admin mới được xem logs của user khác."));
            }

            try
            {
                var response = await _logService.GetUserLogsAsync(userId, page, limit);
                return Ok(ApiResponse<LogListResponse>.SuccessResponse(response, $"Lấy danh sách logs của user {userId} thành công."));
            }
            catch (Exception ex)
            {
                Console.WriteLine($"[ERROR] GetUserLogs: {ex.Message}");
                return StatusCode(HttpStatusCodes.InternalServerError,
                    ApiResponse<object>.ErrorResponse("Lỗi hệ thống khi lấy logs của user."));
            }
        }

        /// <summary>
        /// Lấy logs của một sản phẩm cụ thể (Admin only)
        /// </summary>
        /// <param name="productId">ID của sản phẩm</param>
        /// <param name="page">Số trang (mặc định: 1)</param>
        /// <param name="limit">Số lượng records mỗi trang (mặc định: 20)</param>
        /// <response code="200">Trả về danh sách logs của sản phẩm.</response>
        /// <response code="401">Chưa đăng nhập.</response>
        /// <response code="403">Không có quyền admin.</response>
        [HttpGet("product/{productId}")]
        [ProducesResponseType(typeof(ApiResponse<LogListResponse>), HttpStatusCodes.OK)]
        [ProducesResponseType(typeof(ApiResponse<object>), HttpStatusCodes.Unauthorized)]
        [ProducesResponseType(typeof(ApiResponse<object>), HttpStatusCodes.Forbidden)]
        public async Task<IActionResult> GetProductLogs(
            int productId,
            [FromQuery] int page = 1,
            [FromQuery] int limit = 20)
        {
            if (!AuthHelper.IsLoggedIn(HttpContext))
            {
                return Unauthorized(ApiResponse<object>.ErrorResponse("Bạn cần đăng nhập để xem logs."));
            }

            if (!AuthHelper.IsAdmin(HttpContext))
            {
                return StatusCode(HttpStatusCodes.Forbidden,
                    ApiResponse<object>.ErrorResponse("Chỉ có quyền admin mới được xem logs của sản phẩm."));
            }

            try
            {
                var response = await _logService.GetProductLogsAsync(productId, page, limit);
                return Ok(ApiResponse<LogListResponse>.SuccessResponse(response, $"Lấy danh sách logs của sản phẩm {productId} thành công."));
            }
            catch (Exception ex)
            {
                Console.WriteLine($"[ERROR] GetProductLogs: {ex.Message}");
                return StatusCode(HttpStatusCodes.InternalServerError,
                    ApiResponse<object>.ErrorResponse("Lỗi hệ thống khi lấy logs của sản phẩm."));
            }
        }

        /// <summary>
        /// Lấy logs theo loại hành động (Admin only)
        /// </summary>
        /// <param name="actionType">Loại hành động (ví dụ: "view_product", "add_to_cart", "login")</param>
        /// <param name="page">Số trang (mặc định: 1)</param>
        /// <param name="limit">Số lượng records mỗi trang (mặc định: 20)</param>
        /// <response code="200">Trả về danh sách logs theo loại hành động.</response>
        /// <response code="401">Chưa đăng nhập.</response>
        /// <response code="403">Không có quyền admin.</response>
        [HttpGet("action/{actionType}")]
        [ProducesResponseType(typeof(ApiResponse<LogListResponse>), HttpStatusCodes.OK)]
        [ProducesResponseType(typeof(ApiResponse<object>), HttpStatusCodes.Unauthorized)]
        [ProducesResponseType(typeof(ApiResponse<object>), HttpStatusCodes.Forbidden)]
        public async Task<IActionResult> GetLogsByActionType(
            string actionType,
            [FromQuery] int page = 1,
            [FromQuery] int limit = 20)
        {
            if (!AuthHelper.IsLoggedIn(HttpContext))
            {
                return Unauthorized(ApiResponse<object>.ErrorResponse("Bạn cần đăng nhập để xem logs."));
            }

            if (!AuthHelper.IsAdmin(HttpContext))
            {
                return StatusCode(HttpStatusCodes.Forbidden,
                    ApiResponse<object>.ErrorResponse("Chỉ có quyền admin mới được xem logs theo loại hành động."));
            }

            try
            {
                var response = await _logService.GetLogsByActionTypeAsync(actionType, page, limit);
                return Ok(ApiResponse<LogListResponse>.SuccessResponse(response, $"Lấy danh sách logs theo hành động '{actionType}' thành công."));
            }
            catch (Exception ex)
            {
                Console.WriteLine($"[ERROR] GetLogsByActionType: {ex.Message}");
                return StatusCode(HttpStatusCodes.InternalServerError,
                    ApiResponse<object>.ErrorResponse("Lỗi hệ thống khi lấy logs theo loại hành động."));
            }
        }
    }
}

