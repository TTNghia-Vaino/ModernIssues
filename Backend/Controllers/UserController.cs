using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Http;
using ModernIssues.Models.DTOs;
using ModernIssues.Services;
using ModernIssues.Helpers;
using ModernIssues.Models.Common;
using System.Collections.Generic;
using ModernIssues.Repositories.Interface;
using ModernIssues.Repositories.Service;
using System;
using System.Threading.Tasks;

namespace ModernIssues.Controllers
{

    [Route("/v1/[controller]")]
    [ApiController]
    public class UserController : ControllerBase
    {
        private readonly IUserService _userService;

        public UserController(IUserService userService)
        {
            _userService = userService;
        }

        // ============================================
        // 1. CREATE: POST api/v1/User/register
        // ============================================
        /// <summary>
        /// Đăng ký tài khoản khách hàng mới.
        /// </summary>
        /// <response code="201">Đăng ký thành công.</response>
        /// <response code="400">Tên đăng nhập/Email đã tồn tại hoặc dữ liệu không hợp lệ.</response>
        [HttpPost("register")]
        [ProducesResponseType(typeof(ApiResponse<UserDto>), HttpStatusCodes.Created)]
        [ProducesResponseType(typeof(ApiResponse<object>), HttpStatusCodes.BadRequest)]
        public async Task<IActionResult> Register([FromBody] UserRegisterDto user)
        {
            try
            {
                var newUser = await _userService.RegisterCustomerAsync(user);
                return StatusCode(HttpStatusCodes.Created,
                    ApiResponse<UserDto>.SuccessResponse(newUser, "Đăng ký tài khoản thành công."));
            }
            catch (ArgumentException ex)
            {
                return BadRequest(ApiResponse<object>.ErrorResponse(ex.Message));
            }
            catch (Exception ex)
            {
                Console.WriteLine($"[CRITICAL ERROR] Register: {ex.Message}");
                return StatusCode(HttpStatusCodes.InternalServerError,
                    ApiResponse<object>.ErrorResponse("Lỗi hệ thống khi đăng ký."));
            }
        }

        // ============================================
        // 2. READ ONE: GET api/v1/User/{userId}
        // ============================================
        /// <summary>
        /// Lấy thông tin chi tiết hồ sơ khách hàng. (Cần Token Auth)
        /// </summary>
        /// <param name="userId">ID của người dùng cần xem (Lấy từ Token).</param>
        /// <response code="200">Trả về thông tin hồ sơ.</response>
        /// <response code="404">Không tìm thấy khách hàng.</response>
        [HttpGet("{userId}")]
        [ProducesResponseType(typeof(ApiResponse<UserDto>), HttpStatusCodes.OK)]
        [ProducesResponseType(typeof(ApiResponse<object>), HttpStatusCodes.NotFound)]
        [ProducesResponseType(typeof(ApiResponse<object>), HttpStatusCodes.Unauthorized)]
        [ProducesResponseType(typeof(ApiResponse<object>), HttpStatusCodes.Forbidden)]
        public async Task<IActionResult> GetProfile(int userId)
        {
            // Kiểm tra đăng nhập
            if (!AuthHelper.IsLoggedIn(HttpContext))
            {
                return Unauthorized(ApiResponse<object>.ErrorResponse("Bạn cần đăng nhập để xem thông tin này."));
            }

            // Kiểm tra quyền: User chỉ được xem profile của chính mình, Admin có thể xem tất cả
            var currentUsername = AuthHelper.GetCurrentUsername(HttpContext);
            var isAdmin = AuthHelper.IsAdmin(HttpContext);
            
            // TODO: Cần implement logic để lấy userId từ username hoặc session
            // Hiện tại tạm thời cho phép nếu là admin hoặc userId = 1 (giả lập)
            if (!isAdmin && userId != 1) // Giả lập userId = 1 là user hiện tại
            {
                return StatusCode(HttpStatusCodes.Forbidden, 
                    ApiResponse<object>.ErrorResponse("Bạn chỉ có thể xem thông tin của chính mình."));
            }

            try
            {
                var user = await _userService.GetCustomerProfileAsync(userId);
                return Ok(ApiResponse<UserDto>.SuccessResponse(user));
            }
            catch (KeyNotFoundException ex)
            {
                return NotFound(ApiResponse<object>.ErrorResponse(ex.Message));
            }
            catch (Exception)
            {
                return StatusCode(HttpStatusCodes.InternalServerError,
                    ApiResponse<object>.ErrorResponse("Lỗi hệ thống khi truy xuất hồ sơ."));
            }
        }

        // ============================================
        // 3. UPDATE: PUT api/v1/User/{userId}
        // ============================================
        /// <summary>
        /// Cập nhật thông tin hồ sơ cá nhân (Phone, Address, Email). (Cần Token Auth)
        /// </summary>
        /// <param name="userId">ID của người dùng.</param>
        /// <param name="profile">Thông tin profile cần cập nhật.</param>
        /// <response code="200">Cập nhật thành công.</response>
        /// <response code="404">Không tìm thấy khách hàng.</response>
        [HttpPut("{userId}")]
        [ProducesResponseType(typeof(ApiResponse<UserDto>), HttpStatusCodes.OK)]
        [ProducesResponseType(typeof(ApiResponse<object>), HttpStatusCodes.NotFound)]
        [ProducesResponseType(typeof(ApiResponse<object>), HttpStatusCodes.Unauthorized)]
        [ProducesResponseType(typeof(ApiResponse<object>), HttpStatusCodes.Forbidden)]
        public async Task<IActionResult> UpdateProfile(int userId, [FromBody] UserUpdateProfileDto profile)
        {
            // Kiểm tra đăng nhập
            if (!AuthHelper.IsLoggedIn(HttpContext))
            {
                return Unauthorized(ApiResponse<object>.ErrorResponse("Bạn cần đăng nhập để thực hiện thao tác này."));
            }

            // Kiểm tra quyền: User chỉ được cập nhật profile của chính mình, Admin có thể cập nhật tất cả
            var isAdmin = AuthHelper.IsAdmin(HttpContext);
            
            // TODO: Cần implement logic để lấy userId từ username hoặc session
            // Hiện tại tạm thời cho phép nếu là admin hoặc userId = 1 (giả lập)
            if (!isAdmin && userId != 1) // Giả lập userId = 1 là user hiện tại
            {
                return StatusCode(HttpStatusCodes.Forbidden, 
                    ApiResponse<object>.ErrorResponse("Bạn chỉ có thể cập nhật thông tin của chính mình."));
            }

            try
            {
                var updatedUser = await _userService.UpdateCustomerProfileAsync(userId, profile);
                return Ok(ApiResponse<UserDto>.SuccessResponse(updatedUser, "Cập nhật hồ sơ thành công."));
            }
            catch (KeyNotFoundException)
            {
                return NotFound(ApiResponse<object>.ErrorResponse("Không tìm thấy người dùng để cập nhật."));
            }
            catch (Exception)
            {
                return StatusCode(HttpStatusCodes.InternalServerError,
                    ApiResponse<object>.ErrorResponse("Lỗi hệ thống khi cập nhật hồ sơ."));
            }
        }

        // ============================================
        // 4. GET ALL USERS: GET api/v1/User/ListUsers (Admin only)
        // ============================================
        /// <summary>
        /// Lấy danh sách tất cả người dùng. Chỉ dành cho Admin.
        /// </summary>
        /// <response code="200">Trả về danh sách người dùng.</response>
        /// <response code="401">Chưa đăng nhập.</response>
        /// <response code="403">Không có quyền admin.</response>
        [HttpGet("ListUsers")]
        [ProducesResponseType(typeof(ApiResponse<List<UserDto>>), HttpStatusCodes.OK)]
        [ProducesResponseType(typeof(ApiResponse<object>), HttpStatusCodes.Unauthorized)]
        [ProducesResponseType(typeof(ApiResponse<object>), HttpStatusCodes.Forbidden)]
        public async Task<IActionResult> GetAllUsers()
        {
            // Kiểm tra đăng nhập
            if (!AuthHelper.IsLoggedIn(HttpContext))
            {
                return Unauthorized(ApiResponse<object>.ErrorResponse("Bạn cần đăng nhập để thực hiện thao tác này."));
            }

            // Kiểm tra quyền admin
            if (!AuthHelper.IsAdmin(HttpContext))
            {
                return StatusCode(HttpStatusCodes.Forbidden, 
                    ApiResponse<object>.ErrorResponse("Chỉ có quyền admin mới được xem danh sách người dùng."));
            }

            try
            {
                var users = await _userService.GetAllUsersAsync();
                return Ok(ApiResponse<List<UserDto>>.SuccessResponse(users, "Lấy danh sách người dùng thành công."));
            }
            catch (Exception ex)
            {
                Console.WriteLine($"[CRITICAL ERROR] GetAllUsers: {ex.Message}");
                return StatusCode(HttpStatusCodes.InternalServerError,
                    ApiResponse<object>.ErrorResponse("Lỗi hệ thống khi lấy danh sách người dùng."));
            }
        }

        // ============================================
        // 5. DELETE USER: DELETE api/v1/User/{userId} (Admin only)
        // ============================================
        /// <summary>
        /// Vô hiệu hóa tài khoản người dùng. Chỉ dành cho Admin.
        /// </summary>
        /// <param name="userId">ID của người dùng cần vô hiệu hóa.</param>
        /// <response code="200">Vô hiệu hóa thành công.</response>
        /// <response code="404">Không tìm thấy người dùng.</response>
        /// <response code="401">Chưa đăng nhập.</response>
        /// <response code="403">Không có quyền admin.</response>
        [HttpDelete("{userId}")]
        [ProducesResponseType(typeof(ApiResponse<object>), HttpStatusCodes.OK)]
        [ProducesResponseType(typeof(ApiResponse<object>), HttpStatusCodes.NotFound)]
        [ProducesResponseType(typeof(ApiResponse<object>), HttpStatusCodes.Unauthorized)]
        [ProducesResponseType(typeof(ApiResponse<object>), HttpStatusCodes.Forbidden)]
        public async Task<IActionResult> DeleteUser(int userId)
        {
            // Kiểm tra đăng nhập
            if (!AuthHelper.IsLoggedIn(HttpContext))
            {
                return Unauthorized(ApiResponse<object>.ErrorResponse("Bạn cần đăng nhập để thực hiện thao tác này."));
            }

            // Kiểm tra quyền admin
            if (!AuthHelper.IsAdmin(HttpContext))
            {
                return StatusCode(HttpStatusCodes.Forbidden, 
                    ApiResponse<object>.ErrorResponse("Chỉ có quyền admin mới được xóa người dùng."));
            }

            try
            {
                var success = await _userService.DeleteUserAsync(userId);
                if (!success)
                {
                    return NotFound(ApiResponse<object>.ErrorResponse($"Không tìm thấy người dùng với ID: {userId}."));
                }
                return Ok(ApiResponse<object>.SuccessResponse(new { userId }, $"Người dùng {userId} đã được vô hiệu hóa thành công."));
            }
            catch (Exception ex)
            {
                Console.WriteLine($"[CRITICAL ERROR] DeleteUser: {ex.Message}");
                return StatusCode(HttpStatusCodes.InternalServerError,
                    ApiResponse<object>.ErrorResponse("Lỗi hệ thống khi xóa người dùng."));
            }
        }

        // ============================================
        // 6. GET CURRENT USER INFO: GET api/v1/User/CurrentUser
        // ============================================
        /// <summary>
        /// Lấy thông tin user hiện tại.
        /// </summary>
        /// <response code="200">Trả về thông tin user hiện tại.</response>
        /// <response code="401">Chưa đăng nhập.</response>
        [HttpGet("CurrentUser")]
        [ProducesResponseType(typeof(ApiResponse<object>), HttpStatusCodes.OK)]
        [ProducesResponseType(typeof(ApiResponse<object>), HttpStatusCodes.Unauthorized)]
        public IActionResult GetCurrentUser()
        {
            if (!AuthHelper.IsLoggedIn(HttpContext))
            {
                return Unauthorized(ApiResponse<object>.ErrorResponse("Bạn cần đăng nhập để xem thông tin này."));
            }

            var userInfo = AuthHelper.GetCurrentUser(HttpContext);
            return Ok(ApiResponse<object>.SuccessResponse(userInfo ?? new { }, "Lấy thông tin user thành công."));
        }
    }
}