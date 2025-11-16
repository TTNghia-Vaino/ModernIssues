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
using Microsoft.AspNetCore.Hosting;
using System.IO;

namespace ModernIssues.Controllers
{

    [Route("/v1/[controller]")]
    [ApiController]
    public class UserController : ControllerBase
    {
        private readonly IUserService _userService;
        private readonly IWebHostEnvironment _webHostEnvironment;

        public UserController(IUserService userService, IWebHostEnvironment webHostEnvironment)
        {
            _userService = userService;
            _webHostEnvironment = webHostEnvironment;
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
    }
}
}