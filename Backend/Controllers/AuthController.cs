using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Http;
using Microsoft.EntityFrameworkCore;
using ModernIssues.Models.Configurations;
using ModernIssues.Models.DTOs;
using ModernIssues.Models.Entities;
using System;
using System.Threading.Tasks;
using ModernIssues.Services;
using Microsoft.Extensions.Caching.Memory;
using BCrypt.Net;


namespace ModernIssues.Controllers
{
    [Route("/v1/[controller]")]
    [ApiController]
    public class AuthController : ControllerBase
    {
        private readonly WebDbContext _context;
        private readonly IEmailService _emailService;

        public AuthController(WebDbContext context, IEmailService emailService)
        {
            _context = context;
            _emailService = emailService;
        }

        // POST: api/Auth/Register
        [HttpPost("Register")]
        public async Task<IActionResult> Register([FromBody] RegisterRequest request)
        {
            if (string.IsNullOrWhiteSpace(request.Username) ||
                string.IsNullOrWhiteSpace(request.Email) ||
                string.IsNullOrWhiteSpace(request.Password))
            {
                return BadRequest(new { message = "Username, Email and Password are required." });
            }

            var existingUser = await _context.users
                .FirstOrDefaultAsync(u => u.username == request.Username || u.email == request.Email);

            if (existingUser != null)
            {
                return BadRequest(new { message = "Username or Email already exists." });
            }

            var newUser = new user
            {
                username = request.Username,
                email = request.Email,
                phone = request.Phone,
                address = request.Address,
                role = "customer",
                created_at = DateTime.UtcNow,
                updated_at = DateTime.UtcNow,
                created_by = null,
                email_confirmed = false
            };

            // Hash password using BCrypt
            newUser.password = BCrypt.Net.BCrypt.HashPassword(request.Password);

            _context.users.Add(newUser);
            await _context.SaveChangesAsync();

            newUser.created_by = newUser.user_id;
            _context.users.Update(newUser);
            await _context.SaveChangesAsync();

            var emailRequest = new EmailRequest
            {
                ToEmail = newUser.email,
                Subject = "Confirm your registration",
                Body = $"Hello {newUser.username},\n\nThank you for registering!"
            };

            await _emailService.SendEmailAsync(emailRequest.ToEmail, emailRequest.Subject, emailRequest.Body);

            return Ok(new { message = "Registration successful! Please check your email." });
        }


        // POST: api/Auth/Login
        [HttpPost("Login")]
        public async Task<IActionResult> Login([FromBody] LoginRequest request)
        {
            if (string.IsNullOrWhiteSpace(request.Username) || string.IsNullOrWhiteSpace(request.Password))
            {
                return BadRequest(new { message = "Username and password are required." });
            }

            var user = await _context.users
                .FirstOrDefaultAsync(u => u.username == request.Username);

            if (user == null)
            {
                return BadRequest(new { message = "Invalid username or password." });
            }

            // Kiểm tra tài khoản có bị vô hiệu hóa không
            if (user.is_disabled == true)
            {
                return BadRequest(new { message = "Tài khoản của bạn đã bị vô hiệu hóa. Vui lòng liên hệ quản trị viên." });
            }

            // Kiểm tra mật khẩu với BCrypt
            bool isPasswordValid = false;
            try
            {
                isPasswordValid = BCrypt.Net.BCrypt.Verify(request.Password, user.password);
            }
            catch (BCrypt.Net.SaltParseException)
            {
                // Nếu không phải BCrypt format, có thể là mật khẩu cũ từ ASP.NET Identity
                // Trong trường hợp này, cần reset mật khẩu hoặc migrate
                return BadRequest(new { message = "Mật khẩu không hợp lệ. Vui lòng đặt lại mật khẩu." });
            }

            if (!isPasswordValid)
            {
                return BadRequest(new { message = "Invalid username or password." });
            }

            // Lưu session
            HttpContext.Session.SetString("username", user.username);
            HttpContext.Session.SetString("role", user.role ?? "customer");
            HttpContext.Session.SetString("userId", user.user_id.ToString());

            return Ok(new { 
                message = "Login successful!", 
                username = user.username, 
                role = user.role,
                userId = user.user_id 
            });
        }

        // GET: api/Auth/Me - Lấy thông tin user hiện tại từ session
        [HttpGet("Me")]
        public IActionResult GetCurrentUser()
        {
            var username = HttpContext.Session.GetString("username");
            var userId = HttpContext.Session.GetString("userId");
            var role = HttpContext.Session.GetString("role");

            if (string.IsNullOrEmpty(username))
            {
                return Unauthorized(new { message = "Not logged in" });
            }

            return Ok(new { 
                username = username,
                userId = userId != null ? int.Parse(userId) : (int?)null,
                role = role 
            });
        }

        // POST: api/Auth/Logout
        [HttpPost("Logout")]
        public IActionResult Logout()
        {
            HttpContext.Session.Clear();
            return Ok(new { message = "You have been logged out." });
        }


        //Post : api/Auth/ForgotPassword
        [HttpPost("ForgotPassword")]
        public async Task<IActionResult> ForgotPassword([FromBody] ForgotPasswordRequest request, [FromServices] IMemoryCache cache)
        {
            var user = await _context.users.FirstOrDefaultAsync(u => u.email == request.Email);
            if (user == null)
                return BadRequest(new { message = "Email not found." });

            var otp = new Random().Next(100000, 999999).ToString();
            var cacheKey = $"OTP_{user.email}";
            cache.Set(cacheKey, otp, TimeSpan.FromMinutes(10));

            try
            {
                await _emailService.SendEmailAsync(user.email, "Your OTP Code", $"Your OTP code is {otp}. It expires in 10 minutes.");
                return Ok(new { message = "OTP sent successfully!" });
            }
            catch (Exception ex)
            {
                return BadRequest(new { message = $"Failed to send OTP: {ex.Message}" });
            }
        }

        //Post : api/Auth/VerifyOtp
        [HttpPost("VerifyOtp")]
        public IActionResult VerifyOtp([FromBody] VerifyOtpRequest request, [FromServices] IMemoryCache cache)
        {
            var cacheKey = $"OTP_{request.Email}";
            cache.TryGetValue(cacheKey, out string cachedOtp); // nếu hết hạn -> null

            if (cachedOtp == request.Otp)
            {
                // OTP đúng → xóa OTP
                cache.Remove(cacheKey);

                // Tạo temp token tạm thời
                var tempToken = Guid.NewGuid().ToString();
                cache.Set($"TEMP_TOKEN_{tempToken}", request.Email, TimeSpan.FromMinutes(10));

                return Ok(new { message = "OTP verified.", tempToken });
            }
            else
            {
                // OTP sai hoặc hết hạn
                return BadRequest(new { message = "OTP is incorrect." });
            }
        }

        //Post : api/Auth/ResetPassword
        [HttpPost("ResetPassword")]
        public async Task<IActionResult> ResetPassword([FromBody] ResetPasswordRequest request, [FromServices] IMemoryCache cache)
        {
            var cacheKey = $"TEMP_TOKEN_{request.TempToken}";
            if (!cache.TryGetValue(cacheKey, out string email))
                return BadRequest(new { message = "Invalid or expired token." });

            var user = await _context.users.FirstOrDefaultAsync(u => u.email == email);
            if (user == null)
                return BadRequest(new { message = "User not found." });

            user.password = BCrypt.Net.BCrypt.HashPassword(request.NewPassword);
            _context.users.Update(user);
            await _context.SaveChangesAsync();

            // Xóa temp token
            cache.Remove(cacheKey);

            return Ok(new { message = "Password has been reset successfully." });
        }
    }


}
