using Microsoft.AspNetCore.Mvc;
using ModernIssues.Models.DTOs;
using ModernIssues.Services;
using ModernIssues.Helpers;
using ModernIssues.Models.Common;
using System.Collections.Generic;
using ModernIssues.Repositories.Interface;
using ModernIssues.Repositories.Service;

namespace ModernIssues.Controllers
{

    [Route("api/v1/[controller]")]
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
        // [Authorize] // Yêu cầu đăng nhập
        [ProducesResponseType(typeof(ApiResponse<UserDto>), HttpStatusCodes.OK)]
        [ProducesResponseType(typeof(ApiResponse<object>), HttpStatusCodes.NotFound)]
        public async Task<IActionResult> GetProfile(int userId)
        {
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
        /// <response code="200">Cập nhật thành công.</response>
        /// <response code="404">Không tìm thấy khách hàng.</response>
        [HttpPut("{userId}")]
        // [Authorize] 
        [ProducesResponseType(typeof(ApiResponse<UserDto>), HttpStatusCodes.OK)]
        public async Task<IActionResult> UpdateProfile(int userId, [FromBody] UserUpdateProfileDto profile)
        {
            try
            {
                // NOTE: Cần thêm logic kiểm tra userId trong URL khớp với userId trong Token
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
    }
}