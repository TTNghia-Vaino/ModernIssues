using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Http;
using ModernIssues.Models.DTOs;
using ModernIssues.Services;
using ModernIssues.Helpers;
using ModernIssues.Models.Common;
using ModernIssues.Models.Entities;
using System.Collections.Generic;
using ModernIssues.Repositories.Interface;
using ModernIssues.Repositories.Service;
using System;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Hosting;
using System.IO;
using Microsoft.EntityFrameworkCore;
using System.Linq;
using BCrypt.Net;
using Microsoft.Extensions.Caching.Memory;

namespace ModernIssues.Controllers
{

    [Route("/v1/[controller]")]
    [ApiController]
    public class UserController : ControllerBase
    {
        private readonly IUserService _userService;
        private readonly IWebHostEnvironment _webHostEnvironment;
        private readonly WebDbContext _context;
        private readonly IEmailService _emailService;

        public UserController(IUserService userService, IWebHostEnvironment webHostEnvironment, WebDbContext context, IEmailService emailService)
        {
            _userService = userService;
            _webHostEnvironment = webHostEnvironment;
            _context = context;
            _emailService = emailService;
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
        public async Task<IActionResult> Register([FromForm] UserRegisterDto user)
        {
            try
            {
                // Xử lý upload avatar nếu có
                string avatarUrl = "default-avatar.jpg"; // Ảnh mặc định
                
                if (user.AvatarFile != null && user.AvatarFile.Length > 0)
                {
                    try
                    {
                        if (!ImageUploadHelper.IsValidImage(user.AvatarFile))
                        {
                            return BadRequest(ApiResponse<object>.ErrorResponse("File avatar không hợp lệ. Chỉ chấp nhận file ảnh (jpg, jpeg, png, gif, bmp, webp) và kích thước tối đa 5MB."));
                        }

                        var uploadPath = _webHostEnvironment.WebRootPath ?? Path.Combine(Directory.GetCurrentDirectory(), "wwwroot");
                        var fileName = await ImageUploadHelper.UploadImageAsync(user.AvatarFile, uploadPath);
                        if (!string.IsNullOrEmpty(fileName))
                        {
                            avatarUrl = fileName;
                        }
                    }
                    catch (ArgumentException ex)
                    {
                        return BadRequest(ApiResponse<object>.ErrorResponse($"Lỗi upload avatar: {ex.Message}"));
                    }
                }

                // Tạo UserRegisterDto mới với avatarUrl
                var userData = new UserRegisterDto
                {
                    Username = user.Username,
                    Password = user.Password,
                    Email = user.Email,
                    Phone = user.Phone,
                    Address = user.Address,
                    AvatarUrl = avatarUrl
                };

                var newUser = await _userService.RegisterCustomerAsync(userData);
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
            var currentUserId = AuthHelper.GetCurrentUserId(HttpContext);
            var isAdmin = AuthHelper.IsAdmin(HttpContext);
            
            // User chỉ được xem profile của chính mình, Admin có thể xem tất cả
            if (!isAdmin && currentUserId != userId)
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
        /// Cập nhật thông tin hồ sơ cá nhân (Phone, Address, Email, Avatar). (Cần Token Auth)
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
        public async Task<IActionResult> UpdateProfile(int userId, [FromForm] UserUpdateProfileDto profile)
        {
            // Kiểm tra đăng nhập
            if (!AuthHelper.IsLoggedIn(HttpContext))
            {
                return Unauthorized(ApiResponse<object>.ErrorResponse("Bạn cần đăng nhập để thực hiện thao tác này."));
            }

            // Kiểm tra quyền: User chỉ được cập nhật profile của chính mình, Admin có thể cập nhật tất cả
            var currentUserId = AuthHelper.GetCurrentUserId(HttpContext);
            var isAdmin = AuthHelper.IsAdmin(HttpContext);
            
            // User chỉ được cập nhật profile của chính mình, Admin có thể cập nhật tất cả
            if (!isAdmin && currentUserId != userId)
            {
                return StatusCode(HttpStatusCodes.Forbidden, 
                    ApiResponse<object>.ErrorResponse("Bạn chỉ có thể cập nhật thông tin của chính mình."));
            }

            try
            {
                // Lấy thông tin user hiện tại từ database để verify password
                var user = await _context.users.FindAsync(userId);
                if (user == null)
                {
                    return NotFound(ApiResponse<object>.ErrorResponse("Không tìm thấy người dùng để cập nhật."));
                }

                // Verify password nếu có ConfirmPassword
                if (!string.IsNullOrWhiteSpace(profile.ConfirmPassword))
                {
                    bool isPasswordValid;
                    try
                    {
                        isPasswordValid = BCrypt.Net.BCrypt.Verify(profile.ConfirmPassword, user.password);
                    }
                    catch
                    {
                        isPasswordValid = false;
                    }

                    if (!isPasswordValid)
                    {
                        return BadRequest(ApiResponse<object>.ErrorResponse("Mật khẩu xác nhận không đúng."));
                    }
                }
                else
                {
                    // Nếu không có mật khẩu xác nhận, yêu cầu nhập
                    return BadRequest(ApiResponse<object>.ErrorResponse("Vui lòng nhập mật khẩu để xác nhận thay đổi thông tin."));
                }

                // Lấy thông tin user hiện tại để có avatar_url
                var currentUser = await _userService.GetCustomerProfileAsync(userId);
                if (currentUser == null)
                {
                    return NotFound(ApiResponse<object>.ErrorResponse("Không tìm thấy người dùng để cập nhật."));
                }

                string avatarUrl = currentUser.AvatarUrl ?? "default-avatar.jpg"; // Giữ nguyên avatar hiện tại

                // Xử lý upload avatar mới nếu có
                if (profile.AvatarFile != null && profile.AvatarFile.Length > 0)
                {
                    try
                    {
                        if (!ImageUploadHelper.IsValidImage(profile.AvatarFile))
                        {
                            return BadRequest(ApiResponse<object>.ErrorResponse("File avatar không hợp lệ. Chỉ chấp nhận file ảnh (jpg, jpeg, png, gif, bmp, webp) và kích thước tối đa 5MB."));
                        }

                        // Xóa ảnh cũ nếu có và không phải ảnh mặc định
                        if (!string.IsNullOrEmpty(currentUser.AvatarUrl) && currentUser.AvatarUrl != "default-avatar.jpg")
                        {
                            var uploadPath = _webHostEnvironment.WebRootPath ?? Path.Combine(Directory.GetCurrentDirectory(), "wwwroot");
                            ImageUploadHelper.DeleteImage(currentUser.AvatarUrl, uploadPath);
                        }

                        // Upload ảnh mới
                        var uploadPath2 = _webHostEnvironment.WebRootPath ?? Path.Combine(Directory.GetCurrentDirectory(), "wwwroot");
                        var fileName = await ImageUploadHelper.UploadImageAsync(profile.AvatarFile, uploadPath2);
                        if (!string.IsNullOrEmpty(fileName))
                        {
                            avatarUrl = fileName;
                        }
                    }
                    catch (ArgumentException ex)
                    {
                        return BadRequest(ApiResponse<object>.ErrorResponse($"Lỗi upload avatar: {ex.Message}"));
                    }
                }

                // Tạo UserUpdateProfileDto mới với avatarUrl
                var profileData = new UserUpdateProfileDto
                {
                    Username = !string.IsNullOrEmpty(profile.Username) ? profile.Username : null,
                    Phone = !string.IsNullOrEmpty(profile.Phone) ? profile.Phone : null,
                    Address = !string.IsNullOrEmpty(profile.Address) ? profile.Address : null,
                    Email = !string.IsNullOrEmpty(profile.Email) ? profile.Email : null,
                    AvatarUrl = avatarUrl
                };

                var updatedUser = await _userService.UpdateCustomerProfileAsync(userId, profileData);
                return Ok(ApiResponse<UserDto>.SuccessResponse(updatedUser, "Cập nhật hồ sơ thành công."));
            }
            catch (KeyNotFoundException)
            {
                return NotFound(ApiResponse<object>.ErrorResponse("Không tìm thấy người dùng để cập nhật."));
            }
            catch (Exception ex)
            {
                Console.WriteLine($"[CRITICAL ERROR] UpdateProfile: {ex.Message}");
                return StatusCode(HttpStatusCodes.InternalServerError,
                    ApiResponse<object>.ErrorResponse("Lỗi hệ thống khi cập nhật hồ sơ."));
            }
        }

        // ============================================
        // 4. GET ALL USERS: GET api/v1/User/ListUsers (Admin only)
        // ============================================
        /// <summary>
        /// Lấy danh sách tất cả người dùng (bao gồm cả hoạt động và không hoạt động). Chỉ dành cho Admin.
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
        /// <response code="404">Không tìm thấy người dùng hoặc người dùng đã bị vô hiệu hóa.</response>
        /// <response code="400">Không thể vô hiệu hóa tài khoản admin.</response>
        /// <response code="401">Chưa đăng nhập.</response>
        /// <response code="403">Không có quyền admin.</response>
        [HttpDelete("{userId}")]
        [ProducesResponseType(typeof(ApiResponse<object>), HttpStatusCodes.OK)]
        [ProducesResponseType(typeof(ApiResponse<object>), HttpStatusCodes.NotFound)]
        [ProducesResponseType(typeof(ApiResponse<object>), HttpStatusCodes.BadRequest)]
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
                    ApiResponse<object>.ErrorResponse("Chỉ có quyền admin mới được vô hiệu hóa người dùng."));
            }

            // Lấy adminId từ người dùng đang đăng nhập
            var adminId = AuthHelper.GetCurrentUserId(HttpContext);
            if (!adminId.HasValue)
            {
                return Unauthorized(ApiResponse<object>.ErrorResponse("Không thể xác định người dùng hiện tại."));
            }

            // Kiểm tra không cho phép admin tự vô hiệu hóa chính mình
            if (adminId.Value == userId)
            {
                return BadRequest(ApiResponse<object>.ErrorResponse("Bạn không thể vô hiệu hóa tài khoản của chính mình."));
            }

            try
            {
                // Kiểm tra xem user tồn tại không
                var targetUser = await _userService.GetUserByIdAsync(userId);
                if (targetUser == null)
                {
                    return NotFound(ApiResponse<object>.ErrorResponse($"Không tìm thấy người dùng với ID: {userId}."));
                }

                // Không cho phép vô hiệu hóa tài khoản admin khác
                if (targetUser.Role == "admin")
                {
                    return BadRequest(ApiResponse<object>.ErrorResponse("Không thể vô hiệu hóa tài khoản admin."));
                }

                // Thực hiện vô hiệu hóa
                var success = await _userService.DeleteUserAsync(userId, adminId.Value);
                if (!success)
                {
                    return NotFound(ApiResponse<object>.ErrorResponse($"Người dùng với ID: {userId} đã bị vô hiệu hóa hoặc không thể vô hiệu hóa."));
                }

                return Ok(ApiResponse<object>.SuccessResponse(
                    new { 
                        userId = userId,
                        username = targetUser.Username,
                        disabledBy = adminId.Value,
                        disabledAt = DateTime.UtcNow
                    }, 
                    $"Người dùng '{targetUser.Username}' đã được vô hiệu hóa thành công."
                ));
            }
            catch (Exception ex)
            {
                Console.WriteLine($"[CRITICAL ERROR] DeleteUser: {ex.Message}");
                Console.WriteLine($"[STACK TRACE] {ex.StackTrace}");
                return StatusCode(HttpStatusCodes.InternalServerError,
                    ApiResponse<object>.ErrorResponse("Lỗi hệ thống khi vô hiệu hóa người dùng."));
            }
        }

        // ============================================
        // 6. ACTIVATE USER: PUT api/v1/User/{userId}/activate (Admin only)
        // ============================================
        /// <summary>
        /// Kích hoạt lại tài khoản người dùng. Chỉ dành cho Admin.
        /// </summary>
        /// <param name="userId">ID của người dùng cần kích hoạt.</param>
        /// <response code="200">Kích hoạt thành công.</response>
        /// <response code="404">Không tìm thấy người dùng hoặc người dùng đã được kích hoạt.</response>
        /// <response code="401">Chưa đăng nhập.</response>
        /// <response code="403">Không có quyền admin.</response>
        [HttpPut("{userId}/activate")]
        [ProducesResponseType(typeof(ApiResponse<object>), HttpStatusCodes.OK)]
        [ProducesResponseType(typeof(ApiResponse<object>), HttpStatusCodes.NotFound)]
        [ProducesResponseType(typeof(ApiResponse<object>), HttpStatusCodes.Unauthorized)]
        [ProducesResponseType(typeof(ApiResponse<object>), HttpStatusCodes.Forbidden)]
        public async Task<IActionResult> ActivateUser(int userId)
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
                    ApiResponse<object>.ErrorResponse("Chỉ có quyền admin mới được kích hoạt người dùng."));
            }

            // Lấy adminId từ người dùng đang đăng nhập
            var adminId = AuthHelper.GetCurrentUserId(HttpContext);
            if (!adminId.HasValue)
            {
                return Unauthorized(ApiResponse<object>.ErrorResponse("Không thể xác định người dùng hiện tại."));
            }

            try
            {
                // Kiểm tra xem user tồn tại không
                var targetUser = await _userService.GetUserByIdAsync(userId);
                if (targetUser == null)
                {
                    return NotFound(ApiResponse<object>.ErrorResponse($"Không tìm thấy người dùng với ID: {userId}."));
                }

                // Thực hiện kích hoạt
                var success = await _userService.ActivateUserAsync(userId, adminId.Value);
                if (!success)
                {
                    return NotFound(ApiResponse<object>.ErrorResponse($"Người dùng với ID: {userId} đã được kích hoạt hoặc không thể kích hoạt."));
                }

                return Ok(ApiResponse<object>.SuccessResponse(
                    new { 
                        userId = userId,
                        username = targetUser.Username,
                        activatedBy = adminId.Value,
                        activatedAt = DateTime.UtcNow
                    }, 
                    $"Người dùng '{targetUser.Username}' đã được kích hoạt thành công."
                ));
            }
            catch (Exception ex)
            {
                Console.WriteLine($"[CRITICAL ERROR] ActivateUser: {ex.Message}");
                Console.WriteLine($"[STACK TRACE] {ex.StackTrace}");
                return StatusCode(HttpStatusCodes.InternalServerError,
                    ApiResponse<object>.ErrorResponse("Lỗi hệ thống khi kích hoạt người dùng."));
            }
        }

        // ============================================
        // 6. GET CURRENT USER INFO: GET api/v1/User/CurrentUser
        // ============================================
        /// <summary>
        /// Lấy thông tin user hiện tại bao gồm ảnh, số điện thoại, địa chỉ, trạng thái xác nhận mail.
        /// </summary>
        /// <response code="200">Trả về thông tin user hiện tại.</response>
        /// <response code="401">Chưa đăng nhập.</response>
        /// <response code="404">Không tìm thấy user.</response>
        [HttpGet("CurrentUser")]
        [ProducesResponseType(typeof(ApiResponse<UserDto>), HttpStatusCodes.OK)]
        [ProducesResponseType(typeof(ApiResponse<object>), HttpStatusCodes.Unauthorized)]
        [ProducesResponseType(typeof(ApiResponse<object>), HttpStatusCodes.NotFound)]
        public async Task<IActionResult> GetCurrentUser()
        {
            if (!AuthHelper.IsLoggedIn(HttpContext))
            {
                return Unauthorized(ApiResponse<object>.ErrorResponse("Bạn cần đăng nhập để xem thông tin này."));
            }

            try
            {
                var userId = AuthHelper.GetCurrentUserId(HttpContext);
                if (!userId.HasValue)
                {
                    return Unauthorized(ApiResponse<object>.ErrorResponse("Không thể xác định user."));
                }

                var userInfo = await _userService.GetCustomerProfileAsync(userId.Value);
                return Ok(ApiResponse<UserDto>.SuccessResponse(userInfo, "Lấy thông tin user thành công."));
            }
            catch (KeyNotFoundException ex)
            {
                return NotFound(ApiResponse<object>.ErrorResponse(ex.Message));
            }
            catch (Exception)
            {
                return StatusCode(HttpStatusCodes.InternalServerError,
                    ApiResponse<object>.ErrorResponse("Lỗi hệ thống khi truy xuất thông tin user."));
            }
        }

        // ============================================
        // 7. UPLOAD AVATAR: POST api/v1/User/{userId}/avatar
        // ============================================
        /// <summary>
        /// Upload ảnh đại diện cho khách hàng.
        /// </summary>
        /// <param name="userId">ID của người dùng.</param>
        /// <param name="avatarData">Dữ liệu upload avatar.</param>
        /// <response code="200">Upload avatar thành công.</response>
        /// <response code="400">File không hợp lệ hoặc lỗi upload.</response>
        /// <response code="401">Chưa đăng nhập.</response>
        /// <response code="403">Không có quyền cập nhật.</response>
        /// <response code="404">Không tìm thấy người dùng.</response>
        [HttpPost("{userId}/avatar")]
        [ProducesResponseType(typeof(ApiResponse<UserDto>), HttpStatusCodes.OK)]
        [ProducesResponseType(typeof(ApiResponse<object>), HttpStatusCodes.BadRequest)]
        [ProducesResponseType(typeof(ApiResponse<object>), HttpStatusCodes.Unauthorized)]
        [ProducesResponseType(typeof(ApiResponse<object>), HttpStatusCodes.Forbidden)]
        [ProducesResponseType(typeof(ApiResponse<object>), HttpStatusCodes.NotFound)]
        public async Task<IActionResult> UploadAvatar(int userId, [FromForm] UserUploadAvatarDto avatarData)
        {
            // Kiểm tra đăng nhập
            if (!AuthHelper.IsLoggedIn(HttpContext))
            {
                return Unauthorized(ApiResponse<object>.ErrorResponse("Bạn cần đăng nhập để thực hiện thao tác này."));
            }

            // Kiểm tra quyền: User chỉ được upload avatar của chính mình, Admin có thể upload cho tất cả
            var currentUserId = AuthHelper.GetCurrentUserId(HttpContext);
            var isAdmin = AuthHelper.IsAdmin(HttpContext);
            
            // User chỉ được upload avatar của chính mình, Admin có thể upload cho tất cả
            if (!isAdmin && currentUserId != userId)
            {
                return StatusCode(HttpStatusCodes.Forbidden, 
                    ApiResponse<object>.ErrorResponse("Bạn chỉ có thể cập nhật avatar của chính mình."));
            }

            try
            {
                // Kiểm tra file có hợp lệ không
                if (avatarData.AvatarFile == null || avatarData.AvatarFile.Length == 0)
                {
                    return BadRequest(ApiResponse<object>.ErrorResponse("Vui lòng chọn file ảnh để upload."));
                }

                if (!ImageUploadHelper.IsValidImage(avatarData.AvatarFile))
                {
                    return BadRequest(ApiResponse<object>.ErrorResponse("File không hợp lệ. Chỉ chấp nhận file ảnh (jpg, jpeg, png, gif, bmp, webp) và kích thước tối đa 5MB."));
                }

                // Xóa ảnh cũ nếu có
                if (!string.IsNullOrEmpty(avatarData.CurrentAvatarUrl) && avatarData.CurrentAvatarUrl != "default-avatar.jpg")
                {
                    var uploadPath = _webHostEnvironment.WebRootPath ?? Path.Combine(Directory.GetCurrentDirectory(), "wwwroot");
                    ImageUploadHelper.DeleteImage(avatarData.CurrentAvatarUrl, uploadPath);
                }

                // Upload ảnh mới
                var uploadPath2 = _webHostEnvironment.WebRootPath ?? Path.Combine(Directory.GetCurrentDirectory(), "wwwroot");
                var fileName = await ImageUploadHelper.UploadImageAsync(avatarData.AvatarFile, uploadPath2);
                
                if (string.IsNullOrEmpty(fileName))
                {
                    return BadRequest(ApiResponse<object>.ErrorResponse("Lỗi khi upload ảnh. Vui lòng thử lại."));
                }

                // Cập nhật avatar trong database
                var updatedUser = await _userService.UpdateCustomerAvatarAsync(userId, fileName);
                
                if (updatedUser == null)
                {
                    return NotFound(ApiResponse<object>.ErrorResponse("Không tìm thấy người dùng để cập nhật avatar."));
                }

                return Ok(ApiResponse<UserDto>.SuccessResponse(updatedUser, "Upload avatar thành công."));
            }
            catch (ArgumentException ex)
            {
                return BadRequest(ApiResponse<object>.ErrorResponse($"Lỗi upload ảnh: {ex.Message}"));
            }
            catch (KeyNotFoundException)
            {
                return NotFound(ApiResponse<object>.ErrorResponse("Không tìm thấy người dùng để cập nhật avatar."));
            }
            catch (Exception ex)
            {
                Console.WriteLine($"[CRITICAL ERROR] UploadAvatar: {ex.Message}");
                return StatusCode(HttpStatusCodes.InternalServerError,
                    ApiResponse<object>.ErrorResponse("Lỗi hệ thống khi upload avatar."));
            }
        }

        // ============================================
        // 8. UPLOAD AVATAR FOR CURRENT USER: POST api/v1/User/avatar/upload
        // ============================================
        /// <summary>
        /// Upload ảnh đại diện cho người dùng hiện tại (cả admin và khách hàng đều có thể sử dụng).
        /// </summary>
        /// <param name="avatarData">Dữ liệu upload avatar.</param>
        /// <response code="200">Upload avatar thành công.</response>
        /// <response code="400">File không hợp lệ hoặc lỗi upload.</response>
        /// <response code="401">Chưa đăng nhập.</response>
        /// <response code="404">Không tìm thấy người dùng.</response>
        [HttpPost("avatar/upload")]
        [ProducesResponseType(typeof(ApiResponse<UserDto>), HttpStatusCodes.OK)]
        [ProducesResponseType(typeof(ApiResponse<object>), HttpStatusCodes.BadRequest)]
        [ProducesResponseType(typeof(ApiResponse<object>), HttpStatusCodes.Unauthorized)]
        [ProducesResponseType(typeof(ApiResponse<object>), HttpStatusCodes.NotFound)]
        public async Task<IActionResult> UploadMyAvatar([FromForm] UserUploadAvatarDto avatarData)
        {
            // Kiểm tra đăng nhập
            if (!AuthHelper.IsLoggedIn(HttpContext))
            {
                return Unauthorized(ApiResponse<object>.ErrorResponse("Bạn cần đăng nhập để thực hiện thao tác này."));
            }

            var currentUserId = AuthHelper.GetCurrentUserId(HttpContext);
            if (!currentUserId.HasValue)
            {
                return Unauthorized(ApiResponse<object>.ErrorResponse("Không thể xác định người dùng hiện tại."));
            }

            try
            {
                // Kiểm tra file có hợp lệ không
                if (avatarData.AvatarFile == null || avatarData.AvatarFile.Length == 0)
                {
                    return BadRequest(ApiResponse<object>.ErrorResponse("Vui lòng chọn file ảnh để upload."));
                }

                if (!ImageUploadHelper.IsValidImage(avatarData.AvatarFile))
                {
                    return BadRequest(ApiResponse<object>.ErrorResponse("File không hợp lệ. Chỉ chấp nhận file ảnh (jpg, jpeg, png, gif, bmp, webp) và kích thước tối đa 5MB."));
                }

                // Lấy thông tin user hiện tại để có avatar_url (sử dụng GetByIdAsync thay vì GetCustomerProfileAsync)
                var currentUser = await _userService.GetUserByIdAsync(currentUserId.Value);
                if (currentUser == null)
                {
                    return NotFound(ApiResponse<object>.ErrorResponse("Không tìm thấy người dùng."));
                }

                // Xóa ảnh cũ nếu có và không phải ảnh mặc định
                if (!string.IsNullOrEmpty(currentUser.AvatarUrl) && currentUser.AvatarUrl != "default-avatar.jpg")
                {
                    var uploadPath = _webHostEnvironment.WebRootPath ?? Path.Combine(Directory.GetCurrentDirectory(), "wwwroot");
                    ImageUploadHelper.DeleteImage(currentUser.AvatarUrl, uploadPath);
                }

                // Upload ảnh mới
                var uploadPath2 = _webHostEnvironment.WebRootPath ?? Path.Combine(Directory.GetCurrentDirectory(), "wwwroot");
                var fileName = await ImageUploadHelper.UploadImageAsync(avatarData.AvatarFile, uploadPath2);
                
                if (string.IsNullOrEmpty(fileName))
                {
                    return BadRequest(ApiResponse<object>.ErrorResponse("Lỗi khi upload ảnh. Vui lòng thử lại."));
                }

                // Cập nhật avatar trong database (sử dụng UpdateAvatarAsync thay vì UpdateCustomerAvatarAsync)
                var updatedUser = await _userService.UpdateUserAvatarAsync(currentUserId.Value, fileName);
                
                if (updatedUser == null)
                {
                    return NotFound(ApiResponse<object>.ErrorResponse("Không tìm thấy người dùng để cập nhật avatar."));
                }

                return Ok(ApiResponse<UserDto>.SuccessResponse(updatedUser, "Upload avatar thành công."));
            }
            catch (ArgumentException ex)
            {
                return BadRequest(ApiResponse<object>.ErrorResponse($"Lỗi upload ảnh: {ex.Message}"));
            }
            catch (KeyNotFoundException)
            {
                return NotFound(ApiResponse<object>.ErrorResponse("Không tìm thấy người dùng để cập nhật avatar."));
            }
            catch (Exception ex)
            {
                Console.WriteLine($"[CRITICAL ERROR] UploadMyAvatar: {ex.Message}");
                return StatusCode(HttpStatusCodes.InternalServerError,
                    ApiResponse<object>.ErrorResponse("Lỗi hệ thống khi upload avatar."));
            }
        }

        // ============================================
        // 9. DELETE AVATAR FOR CURRENT USER: DELETE api/v1/User/avatar/delete
        // ============================================
        /// <summary>
        /// Xóa ảnh đại diện của người dùng hiện tại (trở về ảnh mặc định). Ai cũng có thể sử dụng.
        /// </summary>
        /// <response code="200">Xóa avatar thành công.</response>
        /// <response code="401">Chưa đăng nhập.</response>
        /// <response code="404">Không tìm thấy người dùng.</response>
        [HttpDelete("avatar/delete")]
        [ProducesResponseType(typeof(ApiResponse<UserDto>), HttpStatusCodes.OK)]
        [ProducesResponseType(typeof(ApiResponse<object>), HttpStatusCodes.Unauthorized)]
        [ProducesResponseType(typeof(ApiResponse<object>), HttpStatusCodes.NotFound)]
        public async Task<IActionResult> DeleteMyAvatar()
        {
            // Kiểm tra đăng nhập
            if (!AuthHelper.IsLoggedIn(HttpContext))
            {
                return Unauthorized(ApiResponse<object>.ErrorResponse("Bạn cần đăng nhập để thực hiện thao tác này."));
            }

            var currentUserId = AuthHelper.GetCurrentUserId(HttpContext);
            if (!currentUserId.HasValue)
            {
                return Unauthorized(ApiResponse<object>.ErrorResponse("Không thể xác định người dùng hiện tại."));
            }

            try
            {
                // Lấy thông tin user hiện tại để có avatar_url (sử dụng GetByIdAsync thay vì GetCustomerProfileAsync)
                var currentUser = await _userService.GetUserByIdAsync(currentUserId.Value);
                if (currentUser == null)
                {
                    return NotFound(ApiResponse<object>.ErrorResponse("Không tìm thấy người dùng."));
                }

                // Xóa file ảnh cũ nếu có và không phải ảnh mặc định
                if (!string.IsNullOrEmpty(currentUser.AvatarUrl) && currentUser.AvatarUrl != "default-avatar.jpg")
                {
                    var uploadPath = _webHostEnvironment.WebRootPath ?? Path.Combine(Directory.GetCurrentDirectory(), "wwwroot");
                    ImageUploadHelper.DeleteImage(currentUser.AvatarUrl, uploadPath);
                }

                // Cập nhật về ảnh mặc định (sử dụng UpdateAvatarAsync thay vì UpdateCustomerAvatarAsync)
                var updatedUser = await _userService.UpdateUserAvatarAsync(currentUserId.Value, "default-avatar.jpg");
                
                return Ok(ApiResponse<UserDto>.SuccessResponse(updatedUser, "Xóa avatar thành công. Đã trở về ảnh mặc định."));
            }
            catch (KeyNotFoundException)
            {
                return NotFound(ApiResponse<object>.ErrorResponse("Không tìm thấy người dùng để xóa avatar."));
            }
            catch (Exception ex)
            {
                Console.WriteLine($"[CRITICAL ERROR] DeleteMyAvatar: {ex.Message}");
                return StatusCode(HttpStatusCodes.InternalServerError,
                    ApiResponse<object>.ErrorResponse("Lỗi hệ thống khi xóa avatar."));
            }
        }

        // ============================================
        // 10. DELETE AVATAR: DELETE api/v1/User/{userId}/avatar
        // ============================================
        /// <summary>
        /// Xóa ảnh đại diện của khách hàng (trở về ảnh mặc định).
        /// </summary>
        /// <param name="userId">ID của người dùng.</param>
        /// <response code="200">Xóa avatar thành công.</response>
        /// <response code="401">Chưa đăng nhập.</response>
        /// <response code="403">Không có quyền xóa.</response>
        /// <response code="404">Không tìm thấy người dùng.</response>
        [HttpDelete("{userId}/avatar")]
        [ProducesResponseType(typeof(ApiResponse<UserDto>), HttpStatusCodes.OK)]
        [ProducesResponseType(typeof(ApiResponse<object>), HttpStatusCodes.Unauthorized)]
        [ProducesResponseType(typeof(ApiResponse<object>), HttpStatusCodes.Forbidden)]
        [ProducesResponseType(typeof(ApiResponse<object>), HttpStatusCodes.NotFound)]
        public async Task<IActionResult> DeleteAvatar(int userId)
        {
            // Kiểm tra đăng nhập
            if (!AuthHelper.IsLoggedIn(HttpContext))
            {
                return Unauthorized(ApiResponse<object>.ErrorResponse("Bạn cần đăng nhập để thực hiện thao tác này."));
            }

            // Kiểm tra quyền: User chỉ được xóa avatar của chính mình, Admin có thể xóa cho tất cả
            var currentUserId = AuthHelper.GetCurrentUserId(HttpContext);
            var isAdmin = AuthHelper.IsAdmin(HttpContext);
            
            // User chỉ được xóa avatar của chính mình, Admin có thể xóa cho tất cả
            if (!isAdmin && currentUserId != userId)
            {
                return StatusCode(HttpStatusCodes.Forbidden, 
                    ApiResponse<object>.ErrorResponse("Bạn chỉ có thể xóa avatar của chính mình."));
            }

            try
            {
                // Lấy thông tin user hiện tại để có avatar_url
                var currentUser = await _userService.GetCustomerProfileAsync(userId);
                if (currentUser == null)
                {
                    return NotFound(ApiResponse<object>.ErrorResponse("Không tìm thấy người dùng."));
                }

                // Xóa file ảnh cũ nếu có và không phải ảnh mặc định
                if (!string.IsNullOrEmpty(currentUser.AvatarUrl) && currentUser.AvatarUrl != "default-avatar.jpg")
                {
                    var uploadPath = _webHostEnvironment.WebRootPath ?? Path.Combine(Directory.GetCurrentDirectory(), "wwwroot");
                    ImageUploadHelper.DeleteImage(currentUser.AvatarUrl, uploadPath);
                }

                // Cập nhật về ảnh mặc định
                var updatedUser = await _userService.UpdateCustomerAvatarAsync(userId, "default-avatar.jpg");
                
                return Ok(ApiResponse<UserDto>.SuccessResponse(updatedUser, "Xóa avatar thành công. Đã trở về ảnh mặc định."));
            }
            catch (KeyNotFoundException)
            {
                return NotFound(ApiResponse<object>.ErrorResponse("Không tìm thấy người dùng để xóa avatar."));
            }
            catch (Exception ex)
            {
                Console.WriteLine($"[CRITICAL ERROR] DeleteAvatar: {ex.Message}");
                return StatusCode(HttpStatusCodes.InternalServerError,
                    ApiResponse<object>.ErrorResponse("Lỗi hệ thống khi xóa avatar."));
            }
        }

        // ============================================
        // 11. GET USER REPORT: GET api/v1/User/GetUserReport
        // ============================================
        /// <summary>
        /// Lấy báo cáo thống kê số lượng người dùng đăng ký theo ngày, tháng, quý, năm để vẽ biểu đồ cột. Chỉ dành cho Admin.
        /// </summary>
        /// <param name="period">Loại báo cáo: day, month, quarter, year</param>
        /// <param name="startDate">Ngày bắt đầu (tùy chọn)</param>
        /// <param name="endDate">Ngày kết thúc (tùy chọn)</param>
        /// <response code="200">Trả về báo cáo người dùng.</response>
        /// <response code="400">Tham số không hợp lệ.</response>
        /// <response code="401">Chưa đăng nhập.</response>
        /// <response code="403">Không có quyền admin.</response>
        [HttpGet("GetUserReport")]
        [ProducesResponseType(typeof(ApiResponse<ReportResponse>), HttpStatusCodes.OK)]
        [ProducesResponseType(typeof(ApiResponse<object>), HttpStatusCodes.BadRequest)]
        [ProducesResponseType(typeof(ApiResponse<object>), HttpStatusCodes.Unauthorized)]
        [ProducesResponseType(typeof(ApiResponse<object>), HttpStatusCodes.Forbidden)]
        public async Task<IActionResult> GetUserReport(
            [FromQuery] string period = "day",
            [FromQuery] DateTime? startDate = null,
            [FromQuery] DateTime? endDate = null)
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
                    ApiResponse<object>.ErrorResponse("Chỉ có quyền admin mới được xem báo cáo người dùng."));
            }

            try
            {
                // Validate period
                period = period.ToLower();
                if (period != "day" && period != "month" && period != "quarter" && period != "year")
                {
                    return BadRequest(ApiResponse<object>.ErrorResponse("Tham số period phải là: day, month, quarter, hoặc year."));
                }

                // Set default dates if not provided (convert to UTC)
                if (!endDate.HasValue)
                {
                    endDate = DateTime.SpecifyKind(DateTime.UtcNow.Date, DateTimeKind.Utc);
                }
                else
                {
                    // Ensure UTC
                    if (endDate.Value.Kind != DateTimeKind.Utc)
                    {
                        endDate = DateTime.SpecifyKind(endDate.Value.ToUniversalTime().Date, DateTimeKind.Utc);
                    }
                    else
                    {
                        endDate = DateTime.SpecifyKind(endDate.Value.Date, DateTimeKind.Utc);
                    }
                }

                if (!startDate.HasValue)
                {
                    if (period == "day" || period == "month")
                    {
                        startDate = DateTime.SpecifyKind(endDate.Value.AddDays(-30), DateTimeKind.Utc);
                    }
                    else if (period == "quarter")
                    {
                        startDate = DateTime.SpecifyKind(endDate.Value.AddYears(-1), DateTimeKind.Utc);
                    }
                    else // year
                    {
                        startDate = DateTime.SpecifyKind(endDate.Value.AddYears(-5), DateTimeKind.Utc);
                    }
                }
                else
                {
                    // Ensure UTC
                    if (startDate.Value.Kind != DateTimeKind.Utc)
                    {
                        startDate = DateTime.SpecifyKind(startDate.Value.ToUniversalTime().Date, DateTimeKind.Utc);
                    }
                    else
                    {
                        startDate = DateTime.SpecifyKind(startDate.Value.Date, DateTimeKind.Utc);
                    }
                }

                // Validate date range
                if (startDate.Value > endDate.Value)
                {
                    return BadRequest(ApiResponse<object>.ErrorResponse("Ngày bắt đầu phải nhỏ hơn hoặc bằng ngày kết thúc."));
                }

                // Lấy các người dùng (use UTC dates)
                var startDateUtc = startDate.Value;
                var endDateUtc = endDate.Value.AddDays(1).AddTicks(-1); // End of day
                
                var users = await _context.users
                    .Where(u => u.created_at.HasValue &&
                                u.created_at.Value >= startDateUtc &&
                                u.created_at.Value <= endDateUtc)
                    .ToListAsync();

                // Nhóm và tính toán theo period
                List<ReportDto> reportData = new List<ReportDto>();

                if (period == "day")
                {
                    reportData = users
                        .GroupBy(u => u.created_at!.Value.Date)
                        .Select(g => new ReportDto
                        {
                            Period = g.Key.ToString("yyyy-MM-dd"),
                            Count = g.Count(),
                            PeriodStart = g.Key
                        })
                        .OrderBy(x => x.PeriodStart)
                        .ToList();
                }
                else if (period == "month")
                {
                    reportData = users
                        .GroupBy(u => new { Year = u.created_at!.Value.Year, Month = u.created_at!.Value.Month })
                        .Select(g => new ReportDto
                        {
                            Period = $"{g.Key.Year}-{g.Key.Month:D2}",
                            Count = g.Count(),
                            PeriodStart = new DateTime(g.Key.Year, g.Key.Month, 1)
                        })
                        .OrderBy(x => x.PeriodStart)
                        .ToList();
                }
                else if (period == "quarter")
                {
                    reportData = users
                        .GroupBy(u => new
                        {
                            Year = u.created_at!.Value.Year,
                            Quarter = (u.created_at!.Value.Month - 1) / 3 + 1
                        })
                        .Select(g => new ReportDto
                        {
                            Period = $"Q{g.Key.Quarter} {g.Key.Year}",
                            Count = g.Count(),
                            PeriodStart = new DateTime(g.Key.Year, (g.Key.Quarter - 1) * 3 + 1, 1)
                        })
                        .OrderBy(x => x.PeriodStart)
                        .ToList();
                }
                else // year
                {
                    reportData = users
                        .GroupBy(u => u.created_at!.Value.Year)
                        .Select(g => new ReportDto
                        {
                            Period = g.Key.ToString(),
                            Count = g.Count(),
                            PeriodStart = new DateTime(g.Key, 1, 1)
                        })
                        .OrderBy(x => x.PeriodStart)
                        .ToList();
                }

                // Tạo response
                var response = new ReportResponse
                {
                    PeriodType = period,
                    TotalCount = reportData.Sum(x => x.Count),
                    Data = reportData
                };

                return Ok(ApiResponse<ReportResponse>.SuccessResponse(
                    response,
                    $"Lấy báo cáo người dùng theo {period} thành công."));
            }
            catch (Exception ex)
            {
                Console.WriteLine($"[CRITICAL ERROR] GetUserReport: {ex.Message}");
                return StatusCode(HttpStatusCodes.InternalServerError,
                    ApiResponse<object>.ErrorResponse("Lỗi hệ thống khi lấy báo cáo người dùng.", new List<string> { ex.Message }));
            }
        }

        // ============================================
        // 12. GET CONSUMPTION: GET api/v1/User/Consumption
        // ============================================
        /// <summary>
        /// Lấy dữ liệu chi tiêu 12 tháng gần nhất của người dùng hiện tại (cho biểu đồ cột).
        /// </summary>
        /// <response code="200">Trả về dữ liệu chi tiêu 12 tháng.</response>
        /// <response code="401">Chưa đăng nhập.</response>
        [HttpGet("Consumption")]
        [ProducesResponseType(typeof(ApiResponse<ConsumptionResponse>), HttpStatusCodes.OK)]
        [ProducesResponseType(typeof(ApiResponse<object>), HttpStatusCodes.Unauthorized)]
        public async Task<IActionResult> GetConsumption()
        {
            // Kiểm tra đăng nhập
            if (!AuthHelper.IsLoggedIn(HttpContext))
            {
                return Unauthorized(ApiResponse<object>.ErrorResponse("Bạn cần đăng nhập để xem thông tin chi tiêu."));
            }

            try
            {
                var userId = AuthHelper.GetCurrentUserId(HttpContext);
                if (!userId.HasValue)
                {
                    return Unauthorized(ApiResponse<object>.ErrorResponse("Không thể xác định người dùng hiện tại."));
                }

                var now = DateTime.UtcNow;
                var startDate = now.AddMonths(-12);
                var endDate = now;

                // Lấy tất cả đơn hàng đã hoàn thành trong 12 tháng gần nhất
                var completedStatuses = new[] { "completed", "delivered", "paid", "shipped" };
                
                var orders = await _context.orders
                    .Where(o => o.user_id == userId.Value &&
                                o.order_date.HasValue &&
                                o.order_date.Value >= startDate &&
                                o.order_date.Value <= endDate &&
                                o.total_amount.HasValue &&
                                !string.IsNullOrEmpty(o.status) &&
                                completedStatuses.Contains(o.status.ToLower()))
                    .ToListAsync();

                // Nhóm theo tháng (12 tháng gần nhất)
                var monthlyData = new List<ConsumptionMonthlyDto>();
                
                for (int i = 11; i >= 0; i--)
                {
                    var monthStart = new DateTime(now.Year, now.Month, 1).AddMonths(-i);
                    var monthEnd = monthStart.AddMonths(1).AddDays(-1);
                    
                    var monthOrders = orders
                        .Where(o => o.order_date.HasValue &&
                                    o.order_date.Value.Date >= monthStart.Date &&
                                    o.order_date.Value.Date <= monthEnd.Date)
                        .ToList();
                    
                    var monthAmount = monthOrders.Sum(o => o.total_amount ?? 0);
                    var monthOrderCount = monthOrders.Count;
                    
                    monthlyData.Add(new ConsumptionMonthlyDto
                    {
                        Month = $"T{12 - i}", // T1, T2, ..., T12
                        Amount = monthAmount,
                        OrderCount = monthOrderCount
                    });
                }

                // Tính tổng và trung bình
                var totalConsumption = orders.Sum(o => o.total_amount ?? 0);
                var averageMonthly = monthlyData.Count > 0 ? monthlyData.Average(m => m.Amount) : 0;

                // Đếm số sản phẩm đã mua (unique products)
                var productIds = await _context.order_details
                    .Join(_context.orders,
                        od => od.order_id,
                        o => o.order_id,
                        (od, o) => new { od.product_id, o.user_id, o.order_date, o.status })
                    .Where(x => x.user_id == userId.Value &&
                                x.order_date.HasValue &&
                                x.order_date.Value >= startDate &&
                                x.order_date.Value <= endDate &&
                                !string.IsNullOrEmpty(x.status) &&
                                completedStatuses.Contains(x.status.ToLower()))
                    .Select(x => x.product_id)
                    .Distinct()
                    .CountAsync();

                var response = new ConsumptionResponse
                {
                    TotalConsumption = totalConsumption,
                    AverageMonthly = averageMonthly,
                    TotalProducts = productIds,
                    MonthlyData = monthlyData
                };

                return Ok(ApiResponse<ConsumptionResponse>.SuccessResponse(
                    response,
                    "Lấy dữ liệu chi tiêu 12 tháng gần nhất thành công."));
            }
            catch (Exception ex)
            {
                Console.WriteLine($"[CRITICAL ERROR] GetConsumption: {ex.Message}");
                return StatusCode(HttpStatusCodes.InternalServerError,
                    ApiResponse<object>.ErrorResponse("Lỗi hệ thống khi lấy dữ liệu chi tiêu.", new List<string> { ex.Message }));
            }
        }

        // ============================================
        // 13. GET PURCHASES: GET api/v1/User/Purchases
        // ============================================
        /// <summary>
        /// Lấy danh sách sản phẩm đã mua của người dùng hiện tại.
        /// </summary>
        /// <response code="200">Trả về danh sách sản phẩm đã mua.</response>
        /// <response code="401">Chưa đăng nhập.</response>
        [HttpGet("Purchases")]
        [ProducesResponseType(typeof(ApiResponse<List<PurchasedProductDto>>), HttpStatusCodes.OK)]
        [ProducesResponseType(typeof(ApiResponse<object>), HttpStatusCodes.Unauthorized)]
        public async Task<IActionResult> GetPurchases()
        {
            // Kiểm tra đăng nhập
            if (!AuthHelper.IsLoggedIn(HttpContext))
            {
                return Unauthorized(ApiResponse<object>.ErrorResponse("Bạn cần đăng nhập để xem danh sách sản phẩm đã mua."));
            }

            try
            {
                var userId = AuthHelper.GetCurrentUserId(HttpContext);
                if (!userId.HasValue)
                {
                    return Unauthorized(ApiResponse<object>.ErrorResponse("Không thể xác định người dùng hiện tại."));
                }

                // Lấy các đơn hàng đã hoàn thành
                var completedStatuses = new[] { "completed", "delivered", "paid", "shipped" };

                var purchases = await (from od in _context.order_details
                                      join o in _context.orders on od.order_id equals o.order_id
                                      where o.user_id == userId.Value &&
                                            !string.IsNullOrEmpty(o.status) &&
                                            completedStatuses.Contains(o.status.ToLower())
                                      orderby o.order_date descending
                                      select new PurchasedProductDto
                                      {
                                          OrderId = o.order_id,
                                          ProductId = od.product_id,
                                          ProductName = od.product_name,
                                          ImageUrl = od.image_url,
                                          PriceAtPurchase = od.price_at_purchase,
                                          Quantity = od.quantity,
                                          PurchaseDate = o.order_date
                                      })
                                      .ToListAsync();

                return Ok(ApiResponse<List<PurchasedProductDto>>.SuccessResponse(
                    purchases,
                    $"Lấy danh sách {purchases.Count} sản phẩm đã mua thành công."));
            }
            catch (Exception ex)
            {
                Console.WriteLine($"[CRITICAL ERROR] GetPurchases: {ex.Message}");
                return StatusCode(HttpStatusCodes.InternalServerError,
                    ApiResponse<object>.ErrorResponse("Lỗi hệ thống khi lấy danh sách sản phẩm đã mua.", new List<string> { ex.Message }));
            }
        }

        // ============================================
        // 14. CHANGE PASSWORD: PUT api/v1/User/Password
        // ============================================
        /// <summary>
        /// Đổi mật khẩu của người dùng hiện tại.
        /// </summary>
        /// <param name="changePasswordDto">Thông tin đổi mật khẩu.</param>
        /// <response code="200">Đổi mật khẩu thành công.</response>
        /// <response code="400">Mật khẩu hiện tại không đúng hoặc dữ liệu không hợp lệ.</response>
        /// <response code="401">Chưa đăng nhập.</response>
        [HttpPut("Password")]
        [ProducesResponseType(typeof(ApiResponse<object>), HttpStatusCodes.OK)]
        [ProducesResponseType(typeof(ApiResponse<object>), HttpStatusCodes.BadRequest)]
        [ProducesResponseType(typeof(ApiResponse<object>), HttpStatusCodes.Unauthorized)]
        public async Task<IActionResult> ChangePassword([FromBody] ChangePasswordDto changePasswordDto)
        {
            // Kiểm tra đăng nhập
            if (!AuthHelper.IsLoggedIn(HttpContext))
            {
                return Unauthorized(ApiResponse<object>.ErrorResponse("Bạn cần đăng nhập để đổi mật khẩu."));
            }

            try
            {
                var userId = AuthHelper.GetCurrentUserId(HttpContext);
                if (!userId.HasValue)
                {
                    return Unauthorized(ApiResponse<object>.ErrorResponse("Không thể xác định người dùng hiện tại."));
                }

                // Validate input
                if (string.IsNullOrWhiteSpace(changePasswordDto.CurrentPassword))
                {
                    return BadRequest(ApiResponse<object>.ErrorResponse("Vui lòng nhập mật khẩu hiện tại."));
                }

                if (string.IsNullOrWhiteSpace(changePasswordDto.NewPassword))
                {
                    return BadRequest(ApiResponse<object>.ErrorResponse("Vui lòng nhập mật khẩu mới."));
                }

                if (changePasswordDto.NewPassword != changePasswordDto.ConfirmPassword)
                {
                    return BadRequest(ApiResponse<object>.ErrorResponse("Mật khẩu mới và xác nhận mật khẩu không khớp."));
                }

                if (changePasswordDto.NewPassword.Length < 8)
                {
                    return BadRequest(ApiResponse<object>.ErrorResponse("Mật khẩu mới phải có ít nhất 8 ký tự."));
                }

                // Lấy user từ database
                var user = await _context.users.FindAsync(userId.Value);
                if (user == null)
                {
                    return NotFound(ApiResponse<object>.ErrorResponse("Không tìm thấy người dùng."));
                }

                // Verify current password using BCrypt
                bool isCurrentPasswordValid;
                try
                {
                    isCurrentPasswordValid = BCrypt.Net.BCrypt.Verify(changePasswordDto.CurrentPassword, user.password);
                }
                catch
                {
                    isCurrentPasswordValid = false;
                }

                if (!isCurrentPasswordValid)
                {
                    return BadRequest(ApiResponse<object>.ErrorResponse("Mật khẩu hiện tại không đúng."));
                }

                // Hash new password
                var hashedNewPassword = BCrypt.Net.BCrypt.HashPassword(changePasswordDto.NewPassword);

                // Update password
                user.password = hashedNewPassword;
                user.updated_at = DateTime.UtcNow;

                await _context.SaveChangesAsync();

                return Ok(ApiResponse<object>.SuccessResponse(
                    new { userId = userId.Value },
                    "Đổi mật khẩu thành công."));
            }
            catch (Exception ex)
            {
                Console.WriteLine($"[CRITICAL ERROR] ChangePassword: {ex.Message}");
                return StatusCode(HttpStatusCodes.InternalServerError,
                    ApiResponse<object>.ErrorResponse("Lỗi hệ thống khi đổi mật khẩu.", new List<string> { ex.Message }));
            }
        }

        // ============================================
        // 15. SEND EMAIL OTP: POST api/v1/User/Email/SendOtp
        // ============================================
        /// <summary>
        /// Gửi mã OTP đến email cũ (email hiện tại) để xác thực khi đổi email.
        /// </summary>
        /// <param name="sendOtpDto">Thông tin email mới và mật khẩu xác nhận.</param>
        /// <param name="cache">Memory cache để lưu OTP.</param>
        /// <response code="200">Gửi OTP thành công.</response>
        /// <response code="400">Email không hợp lệ, đã tồn tại, hoặc mật khẩu không đúng.</response>
        /// <response code="401">Chưa đăng nhập.</response>
        [HttpPost("Email/SendOtp")]
        [ProducesResponseType(typeof(ApiResponse<object>), HttpStatusCodes.OK)]
        [ProducesResponseType(typeof(ApiResponse<object>), HttpStatusCodes.BadRequest)]
        [ProducesResponseType(typeof(ApiResponse<object>), HttpStatusCodes.Unauthorized)]
        public async Task<IActionResult> SendEmailOtp([FromBody] SendEmailOtpDto sendOtpDto, [FromServices] IMemoryCache cache)
        {
            // Kiểm tra đăng nhập
            if (!AuthHelper.IsLoggedIn(HttpContext))
            {
                return Unauthorized(ApiResponse<object>.ErrorResponse("Bạn cần đăng nhập để đổi email."));
            }

            try
            {
                var userId = AuthHelper.GetCurrentUserId(HttpContext);
                if (!userId.HasValue)
                {
                    return Unauthorized(ApiResponse<object>.ErrorResponse("Không thể xác định người dùng hiện tại."));
                }

                // Validate input
                if (string.IsNullOrWhiteSpace(sendOtpDto.NewEmail))
                {
                    return BadRequest(ApiResponse<object>.ErrorResponse("Vui lòng nhập email mới."));
                }

                if (!System.Text.RegularExpressions.Regex.IsMatch(sendOtpDto.NewEmail, 
                    @"^[^@\s]+@[^@\s]+\.[^@\s]+$"))
                {
                    return BadRequest(ApiResponse<object>.ErrorResponse("Email không hợp lệ."));
                }

                if (string.IsNullOrWhiteSpace(sendOtpDto.ConfirmPassword))
                {
                    return BadRequest(ApiResponse<object>.ErrorResponse("Vui lòng nhập mật khẩu để xác nhận."));
                }

                // Lấy user từ database
                var user = await _context.users.FindAsync(userId.Value);
                if (user == null)
                {
                    return NotFound(ApiResponse<object>.ErrorResponse("Không tìm thấy người dùng."));
                }

                // Verify password
                bool isPasswordValid;
                try
                {
                    isPasswordValid = BCrypt.Net.BCrypt.Verify(sendOtpDto.ConfirmPassword, user.password);
                }
                catch
                {
                    isPasswordValid = false;
                }

                if (!isPasswordValid)
                {
                    return BadRequest(ApiResponse<object>.ErrorResponse("Mật khẩu xác nhận không đúng."));
                }

                // Kiểm tra email mới có trùng với email hiện tại không
                if (user.email.ToLower() == sendOtpDto.NewEmail.ToLower())
                {
                    return BadRequest(ApiResponse<object>.ErrorResponse("Email mới phải khác email hiện tại."));
                }

                // Kiểm tra email đã tồn tại chưa
                var existingUser = await _context.users
                    .Where(u => u.email.ToLower() == sendOtpDto.NewEmail.ToLower() && u.user_id != userId.Value)
                    .FirstOrDefaultAsync();

                if (existingUser != null)
                {
                    return BadRequest(ApiResponse<object>.ErrorResponse("Email này đã được sử dụng bởi tài khoản khác."));
                }

                // Tạo OTP (6 chữ số)
                var otp = new Random().Next(100000, 999999).ToString();
                
                // Lưu OTP vào cache với key là user_id
                // Lưu cả email mới vào cache để dùng khi verify
                var cacheKey = $"CHANGE_EMAIL_OTP_{userId.Value}";
                var cacheData = new EmailOtpCacheData
                {
                    Otp = otp,
                    NewEmail = sendOtpDto.NewEmail.ToLower()
                };
                cache.Set(cacheKey, cacheData, TimeSpan.FromMinutes(10)); // OTP hết hạn sau 10 phút

                // Gửi OTP qua email CŨ (email hiện tại) để xác thực
                try
                {
                    var emailSubject = "Mã xác thực đổi email - TechZone";
                    var emailBody = $@"
                        <div style='font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;'>
                            <h2 style='color: #2d8659;'>Xác thực đổi email</h2>
                            <p>Xin chào <strong>{user.username}</strong>,</p>
                            <p>Bạn đã yêu cầu đổi email của tài khoản TechZone từ:</p>
                            <p><strong>{user.email}</strong></p>
                            <p>Sang:</p>
                            <p><strong>{sendOtpDto.NewEmail}</strong></p>
                            <p>Để hoàn tất việc đổi email, vui lòng nhập mã xác thực sau:</p>
                            <div style='background-color: #f0f0f0; padding: 20px; text-align: center; font-size: 32px; font-weight: bold; color: #2d8659; letter-spacing: 5px; margin: 20px 0;'>
                                {otp}
                            </div>
                            <p>Mã này sẽ hết hạn sau <strong>10 phút</strong>.</p>
                            <p style='color: #d32f2f;'><strong>⚠️ Cảnh báo:</strong> Nếu bạn không yêu cầu đổi email, vui lòng bỏ qua email này và kiểm tra bảo mật tài khoản ngay lập tức.</p>
                            <p>Trân trọng,<br/>Đội ngũ TechZone</p>
                        </div>";

                    // Gửi OTP đến email CŨ (email hiện tại) để xác thực
                    await _emailService.SendEmailAsync(user.email, emailSubject, emailBody);

                    return Ok(ApiResponse<object>.SuccessResponse(
                        new { currentEmail = user.email, newEmail = sendOtpDto.NewEmail },
                        $"Đã gửi mã OTP đến email hiện tại ({user.email}). Vui lòng kiểm tra email và nhập mã OTP để hoàn tất việc đổi email."));
                }
                catch (Exception ex)
                {
                    Console.WriteLine($"[CRITICAL ERROR] SendEmailOtp - Failed to send email: {ex.Message}");
                    // Xóa OTP khỏi cache nếu gửi email thất bại
                    cache.Remove(cacheKey);
                    return BadRequest(ApiResponse<object>.ErrorResponse($"Không thể gửi email: {ex.Message}"));
                }
            }
            catch (Exception ex)
            {
                Console.WriteLine($"[CRITICAL ERROR] SendEmailOtp: {ex.Message}");
                return StatusCode(HttpStatusCodes.InternalServerError,
                    ApiResponse<object>.ErrorResponse("Lỗi hệ thống khi gửi mã OTP.", new List<string> { ex.Message }));
            }
        }

        // ============================================
        // 16. CHANGE EMAIL: PUT api/v1/User/Email
        // ============================================
        /// <summary>
        /// Đổi email của người dùng hiện tại (cần OTP code từ email cũ).
        /// </summary>
        /// <param name="changeEmailDto">Thông tin đổi email và OTP code.</param>
        /// <param name="cache">Memory cache để xác thực OTP.</param>
        /// <response code="200">Đổi email thành công.</response>
        /// <response code="400">Email đã tồn tại, OTP không đúng hoặc mật khẩu không đúng.</response>
        /// <response code="401">Chưa đăng nhập.</response>
        [HttpPut("Email")]
        [ProducesResponseType(typeof(ApiResponse<UserDto>), HttpStatusCodes.OK)]
        [ProducesResponseType(typeof(ApiResponse<object>), HttpStatusCodes.BadRequest)]
        [ProducesResponseType(typeof(ApiResponse<object>), HttpStatusCodes.Unauthorized)]
        public async Task<IActionResult> ChangeEmail([FromBody] ChangeEmailDto changeEmailDto, [FromServices] IMemoryCache cache)
        {
            // Kiểm tra đăng nhập
            if (!AuthHelper.IsLoggedIn(HttpContext))
            {
                return Unauthorized(ApiResponse<object>.ErrorResponse("Bạn cần đăng nhập để đổi email."));
            }

            try
            {
                var userId = AuthHelper.GetCurrentUserId(HttpContext);
                if (!userId.HasValue)
                {
                    return Unauthorized(ApiResponse<object>.ErrorResponse("Không thể xác định người dùng hiện tại."));
                }

                // Validate input
                if (string.IsNullOrWhiteSpace(changeEmailDto.NewEmail))
                {
                    return BadRequest(ApiResponse<object>.ErrorResponse("Vui lòng nhập email mới."));
                }

                if (!System.Text.RegularExpressions.Regex.IsMatch(changeEmailDto.NewEmail, 
                    @"^[^@\s]+@[^@\s]+\.[^@\s]+$"))
                {
                    return BadRequest(ApiResponse<object>.ErrorResponse("Email không hợp lệ."));
                }

                if (string.IsNullOrWhiteSpace(changeEmailDto.OtpCode))
                {
                    return BadRequest(ApiResponse<object>.ErrorResponse("Vui lòng nhập mã OTP."));
                }

                if (changeEmailDto.OtpCode.Length != 6 || !changeEmailDto.OtpCode.All(char.IsDigit))
                {
                    return BadRequest(ApiResponse<object>.ErrorResponse("Mã OTP phải là 6 chữ số."));
                }

                if (string.IsNullOrWhiteSpace(changeEmailDto.ConfirmPassword))
                {
                    return BadRequest(ApiResponse<object>.ErrorResponse("Vui lòng nhập mật khẩu để xác nhận."));
                }

                // Lấy user từ database
                var user = await _context.users.FindAsync(userId.Value);
                if (user == null)
                {
                    return NotFound(ApiResponse<object>.ErrorResponse("Không tìm thấy người dùng."));
                }

                // Verify password
                bool isPasswordValid;
                try
                {
                    isPasswordValid = BCrypt.Net.BCrypt.Verify(changeEmailDto.ConfirmPassword, user.password);
                }
                catch
                {
                    isPasswordValid = false;
                }

                if (!isPasswordValid)
                {
                    return BadRequest(ApiResponse<object>.ErrorResponse("Mật khẩu xác nhận không đúng."));
                }

                // Kiểm tra email mới có trùng với email hiện tại không
                if (user.email.ToLower() == changeEmailDto.NewEmail.ToLower())
                {
                    return BadRequest(ApiResponse<object>.ErrorResponse("Email mới phải khác email hiện tại."));
                }

                // Kiểm tra email đã tồn tại chưa
                var existingUser = await _context.users
                    .Where(u => u.email.ToLower() == changeEmailDto.NewEmail.ToLower() && u.user_id != userId.Value)
                    .FirstOrDefaultAsync();

                if (existingUser != null)
                {
                    return BadRequest(ApiResponse<object>.ErrorResponse("Email này đã được sử dụng bởi tài khoản khác."));
                }

                // Xác thực OTP (OTP được gửi đến email cũ)
                var cacheKey = $"CHANGE_EMAIL_OTP_{userId.Value}";
                if (!cache.TryGetValue(cacheKey, out EmailOtpCacheData cachedData))
                {
                    return BadRequest(ApiResponse<object>.ErrorResponse("Mã OTP đã hết hạn hoặc chưa được gửi. Vui lòng yêu cầu gửi lại mã OTP."));
                }

                if (cachedData == null)
                {
                    return BadRequest(ApiResponse<object>.ErrorResponse("Dữ liệu OTP không hợp lệ. Vui lòng yêu cầu gửi lại mã OTP."));
                }

                // Kiểm tra OTP
                if (cachedData.Otp != changeEmailDto.OtpCode)
                {
                    return BadRequest(ApiResponse<object>.ErrorResponse("Mã OTP không đúng. Vui lòng kiểm tra lại."));
                }

                // Kiểm tra email mới có khớp với email trong cache không
                if (cachedData.NewEmail != changeEmailDto.NewEmail.ToLower())
                {
                    return BadRequest(ApiResponse<object>.ErrorResponse("Email mới không khớp với email đã yêu cầu đổi. Vui lòng yêu cầu gửi lại mã OTP với email mới."));
                }

                // OTP đúng, xóa OTP khỏi cache
                cache.Remove(cacheKey);

                // Update email
                var oldEmail = user.email;
                user.email = changeEmailDto.NewEmail;
                user.email_confirmed = false; // Cần xác nhận lại email mới
                user.updated_at = DateTime.UtcNow;

                await _context.SaveChangesAsync();

                // Map to DTO
                var userDto = await _userService.GetCustomerProfileAsync(userId.Value);

                // Gửi email thông báo đến email cũ (nếu có thể)
                try
                {
                    if (!string.IsNullOrEmpty(oldEmail))
                    {
                        var notificationSubject = "Thông báo đổi email - TechZone";
                        var notificationBody = $@"
                            <div style='font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;'>
                                <h2 style='color: #2d8659;'>Email đã được thay đổi</h2>
                                <p>Xin chào <strong>{user.username}</strong>,</p>
                                <p>Email của tài khoản TechZone đã được thay đổi từ:</p>
                                <p><strong>{oldEmail}</strong></p>
                                <p>Thành:</p>
                                <p><strong>{changeEmailDto.NewEmail}</strong></p>
                                <p>Nếu bạn không thực hiện thay đổi này, vui lòng liên hệ với chúng tôi ngay lập tức.</p>
                                <p>Trân trọng,<br/>Đội ngũ TechZone</p>
                            </div>";
                        await _emailService.SendEmailAsync(oldEmail, notificationSubject, notificationBody);
                    }
                }
                catch (Exception ex)
                {
                    Console.WriteLine($"[WARNING] ChangeEmail - Failed to send notification to old email: {ex.Message}");
                    // Không fail request nếu không gửi được email thông báo
                }

                return Ok(ApiResponse<UserDto>.SuccessResponse(
                    userDto,
                    "Đổi email thành công. Vui lòng kiểm tra email mới để xác nhận."));
            }
            catch (Exception ex)
            {
                Console.WriteLine($"[CRITICAL ERROR] ChangeEmail: {ex.Message}");
                return StatusCode(HttpStatusCodes.InternalServerError,
                    ApiResponse<object>.ErrorResponse("Lỗi hệ thống khi đổi email.", new List<string> { ex.Message }));
            }
        }

        // ============================================
        // 16. CHANGE PHONE: PUT api/v1/User/Phone
        // ============================================
        /// <summary>
        /// Đổi số điện thoại của người dùng hiện tại (cần xác nhận password, có thể cần OTP).
        /// </summary>
        /// <param name="changePhoneDto">Thông tin đổi số điện thoại.</param>
        /// <response code="200">Đổi số điện thoại thành công.</response>
        /// <response code="400">Số điện thoại đã tồn tại hoặc mật khẩu không đúng.</response>
        /// <response code="401">Chưa đăng nhập.</response>
        [HttpPut("Phone")]
        [ProducesResponseType(typeof(ApiResponse<UserDto>), HttpStatusCodes.OK)]
        [ProducesResponseType(typeof(ApiResponse<object>), HttpStatusCodes.BadRequest)]
        [ProducesResponseType(typeof(ApiResponse<object>), HttpStatusCodes.Unauthorized)]
        public async Task<IActionResult> ChangePhone([FromBody] ChangePhoneDto changePhoneDto)
        {
            // Kiểm tra đăng nhập
            if (!AuthHelper.IsLoggedIn(HttpContext))
            {
                return Unauthorized(ApiResponse<object>.ErrorResponse("Bạn cần đăng nhập để đổi số điện thoại."));
            }

            try
            {
                var userId = AuthHelper.GetCurrentUserId(HttpContext);
                if (!userId.HasValue)
                {
                    return Unauthorized(ApiResponse<object>.ErrorResponse("Không thể xác định người dùng hiện tại."));
                }

                // Validate input
                if (string.IsNullOrWhiteSpace(changePhoneDto.NewPhone))
                {
                    return BadRequest(ApiResponse<object>.ErrorResponse("Vui lòng nhập số điện thoại mới."));
                }

                // Validate phone number format (Vietnamese phone: 10-11 digits, starts with 0)
                if (!System.Text.RegularExpressions.Regex.IsMatch(changePhoneDto.NewPhone, @"^0\d{9,10}$"))
                {
                    return BadRequest(ApiResponse<object>.ErrorResponse("Số điện thoại không hợp lệ. Vui lòng nhập số điện thoại Việt Nam (10-11 chữ số, bắt đầu bằng 0)."));
                }

                if (string.IsNullOrWhiteSpace(changePhoneDto.ConfirmPassword))
                {
                    return BadRequest(ApiResponse<object>.ErrorResponse("Vui lòng nhập mật khẩu để xác nhận."));
                }

                // Lấy user từ database
                var user = await _context.users.FindAsync(userId.Value);
                if (user == null)
                {
                    return NotFound(ApiResponse<object>.ErrorResponse("Không tìm thấy người dùng."));
                }

                // Verify password
                bool isPasswordValid;
                try
                {
                    isPasswordValid = BCrypt.Net.BCrypt.Verify(changePhoneDto.ConfirmPassword, user.password);
                }
                catch
                {
                    isPasswordValid = false;
                }

                if (!isPasswordValid)
                {
                    return BadRequest(ApiResponse<object>.ErrorResponse("Mật khẩu xác nhận không đúng."));
                }

                // Kiểm tra số điện thoại đã tồn tại chưa
                var existingUser = await _context.users
                    .Where(u => u.phone != null && u.phone == changePhoneDto.NewPhone && u.user_id != userId.Value)
                    .FirstOrDefaultAsync();

                if (existingUser != null)
                {
                    return BadRequest(ApiResponse<object>.ErrorResponse("Số điện thoại này đã được sử dụng bởi tài khoản khác."));
                }

                // TODO: Implement OTP verification if OtpCode is provided
                // For now, we'll just update the phone number
                // In production, you should send OTP to the new phone number and verify it before updating

                // Update phone
                user.phone = changePhoneDto.NewPhone;
                user.updated_at = DateTime.UtcNow;

                await _context.SaveChangesAsync();

                // Map to DTO
                var userDto = await _userService.GetCustomerProfileAsync(userId.Value);

                return Ok(ApiResponse<UserDto>.SuccessResponse(
                    userDto,
                    "Đổi số điện thoại thành công."));
            }
            catch (Exception ex)
            {
                Console.WriteLine($"[CRITICAL ERROR] ChangePhone: {ex.Message}");
                return StatusCode(HttpStatusCodes.InternalServerError,
                    ApiResponse<object>.ErrorResponse("Lỗi hệ thống khi đổi số điện thoại.", new List<string> { ex.Message }));
            }
        }

        // ============================================
        // 17. GET 2FA STATUS: GET api/v1/User/2FA
        // ============================================
        /// <summary>
        /// Lấy trạng thái 2FA của người dùng hiện tại.
        /// </summary>
        /// <response code="200">Trả về trạng thái 2FA.</response>
        /// <response code="401">Chưa đăng nhập.</response>
        [HttpGet("2FA")]
        [ProducesResponseType(typeof(ApiResponse<TwoFactorAuthDto>), HttpStatusCodes.OK)]
        [ProducesResponseType(typeof(ApiResponse<object>), HttpStatusCodes.Unauthorized)]
        public async Task<IActionResult> Get2FAStatus()
        {
            // Kiểm tra đăng nhập
            if (!AuthHelper.IsLoggedIn(HttpContext))
            {
                return Unauthorized(ApiResponse<object>.ErrorResponse("Bạn cần đăng nhập để xem trạng thái 2FA."));
            }

            try
            {
                var userId = AuthHelper.GetCurrentUserId(HttpContext);
                if (!userId.HasValue)
                {
                    return Unauthorized(ApiResponse<object>.ErrorResponse("Không thể xác định người dùng hiện tại."));
                }

                // Lấy user từ database
                var user = await _context.users.FindAsync(userId.Value);
                if (user == null)
                {
                    return NotFound(ApiResponse<object>.ErrorResponse("Không tìm thấy người dùng."));
                }

                // TODO: Implement 2FA status retrieval from database
                // For now, return default (disabled)
                // In production, you need to add 2FA fields to user table (two_factor_enabled, two_factor_method, etc.)
                // Tạm thời kiểm tra nếu có field two_factor_enabled trong database

                var twoFactorStatus = new TwoFactorAuthDto
                {
                    Enabled = false, // Default to disabled until implemented
                    Method = "Email" // Chỉ hỗ trợ Email
                };

                return Ok(ApiResponse<TwoFactorAuthDto>.SuccessResponse(
                    twoFactorStatus,
                    "Lấy trạng thái 2FA thành công."));
            }
            catch (Exception ex)
            {
                Console.WriteLine($"[CRITICAL ERROR] Get2FAStatus: {ex.Message}");
                return StatusCode(HttpStatusCodes.InternalServerError,
                    ApiResponse<object>.ErrorResponse("Lỗi hệ thống khi lấy trạng thái 2FA.", new List<string> { ex.Message }));
            }
        }

        // ============================================
        // 18. UPDATE 2FA: PUT api/v1/User/2FA
        // ============================================
        /// <summary>
        /// Bật/tắt 2FA cho người dùng hiện tại.
        /// </summary>
        /// <param name="twoFactorDto">Thông tin cập nhật 2FA.</param>
        /// <response code="200">Cập nhật 2FA thành công.</response>
        /// <response code="400">Dữ liệu không hợp lệ.</response>
        /// <response code="401">Chưa đăng nhập.</response>
        [HttpPut("2FA")]
        [ProducesResponseType(typeof(ApiResponse<TwoFactorAuthDto>), HttpStatusCodes.OK)]
        [ProducesResponseType(typeof(ApiResponse<object>), HttpStatusCodes.BadRequest)]
        [ProducesResponseType(typeof(ApiResponse<object>), HttpStatusCodes.Unauthorized)]
        public async Task<IActionResult> Update2FA([FromBody] TwoFactorAuthDto twoFactorDto)
        {
            // Kiểm tra đăng nhập
            if (!AuthHelper.IsLoggedIn(HttpContext))
            {
                return Unauthorized(ApiResponse<object>.ErrorResponse("Bạn cần đăng nhập để cập nhật 2FA."));
            }

            try
            {
                var userId = AuthHelper.GetCurrentUserId(HttpContext);
                if (!userId.HasValue)
                {
                    return Unauthorized(ApiResponse<object>.ErrorResponse("Không thể xác định người dùng hiện tại."));
                }

                // Validate method - chỉ hỗ trợ Email
                if (twoFactorDto.Enabled && twoFactorDto.Method != "Email")
                {
                    return BadRequest(ApiResponse<object>.ErrorResponse("Phương thức 2FA không hợp lệ. Chỉ hỗ trợ Email."));
                }

                // Lấy user từ database
                var user = await _context.users.FindAsync(userId.Value);
                if (user == null)
                {
                    return NotFound(ApiResponse<object>.ErrorResponse("Không tìm thấy người dùng."));
                }

                // TODO: Implement 2FA update in database
                // For now, just return success
                // In production, you need to:
                // 1. Add 2FA fields to user table (two_factor_enabled, two_factor_method, two_factor_secret, etc.)
                // 2. If enabling, send OTP via email to verify
                // 3. Verify OTP before enabling
                // 4. Update database

                // Nếu đang bật 2FA, có thể gửi OTP qua email để xác thực
                if (twoFactorDto.Enabled)
                {
                    // TODO: Gửi OTP qua email để xác thực trước khi bật 2FA
                    // Tạm thời chỉ trả về success
                }

                var updated2FA = new TwoFactorAuthDto
                {
                    Enabled = twoFactorDto.Enabled,
                    Method = "Email" // Luôn là Email
                };

                return Ok(ApiResponse<TwoFactorAuthDto>.SuccessResponse(
                    updated2FA,
                    twoFactorDto.Enabled ? "Bật 2FA thành công." : "Tắt 2FA thành công."));
            }
            catch (Exception ex)
            {
                Console.WriteLine($"[CRITICAL ERROR] Update2FA: {ex.Message}");
                return StatusCode(HttpStatusCodes.InternalServerError,
                    ApiResponse<object>.ErrorResponse("Lỗi hệ thống khi cập nhật 2FA.", new List<string> { ex.Message }));
            }
        }
    }
}