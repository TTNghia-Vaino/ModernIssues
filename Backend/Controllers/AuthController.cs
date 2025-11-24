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
using System.Text.Json;
using System.Linq;


namespace ModernIssues.Controllers
{
    [Route("/v1/[controller]")]
    [ApiController]
    public class AuthController : ControllerBase
    {
        private readonly WebDbContext _context;
        private readonly IEmailService _emailService;
        private readonly ITwoFactorAuthService _twoFactorAuthService;

        public AuthController(
            WebDbContext context, 
            IEmailService emailService,
            ITwoFactorAuthService twoFactorAuthService)
        {
            _context = context;
            _emailService = emailService;
            _twoFactorAuthService = twoFactorAuthService;
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
        public async Task<IActionResult> Login([FromBody] LoginRequest? request)
        {
            if (request == null)
            {
                return BadRequest(new { message = "Dữ liệu đăng nhập không hợp lệ." });
            }

            if (string.IsNullOrWhiteSpace(request.Email) || string.IsNullOrWhiteSpace(request.Password))
            {
                return BadRequest(new { message = "Email và mật khẩu không được để trống." });
            }

            var user = await _context.users
                .FirstOrDefaultAsync(u => u.email == request.Email);

            if (user == null)
            {
                return BadRequest(new { message = "Sai email hoặc mật khẩu." });
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
                return BadRequest(new { message = "Sai email hoặc mật khẩu." });
            }

            // Check if 2FA is enabled
            if (user.two_factor_enabled)
            {
                // Don't complete login yet - return requires2FA flag
                return Ok(new 
                { 
                    requires2FA = true, 
                    email = user.email,
                    message = "Please enter your 2FA code to complete login.",
                    method = user.two_factor_method
                });
            }

            // No 2FA - Complete login immediately
            HttpContext.Session.SetString("username", user.username);
            HttpContext.Session.SetString("role", user.role ?? "customer");
            HttpContext.Session.SetString("userId", user.user_id.ToString());

            return Ok(new { message = "Login successful!", username = user.username, role = user.role });
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

        // ========== TWO-FACTOR AUTHENTICATION ENDPOINTS ==========

        /// <summary>
        /// Get 2FA status for current user
        /// </summary>
        [HttpGet("2fa/status")]
        public async Task<IActionResult> Get2FAStatus()
        {
            var userId = Helpers.AuthHelper.GetCurrentUserId(HttpContext);
            if (userId == null)
                return Unauthorized(new { message = "Please login first." });

            var user = await _context.users.FindAsync(userId);
            if (user == null)
                return NotFound(new { message = "User not found." });

            return Ok(new TwoFactorStatusResponse
            {
                Enabled = user.two_factor_enabled,
                Method = user.two_factor_method,
                EnabledAt = user.two_factor_enabled_at,
                HasRecoveryCodes = !string.IsNullOrWhiteSpace(user.two_factor_recovery_codes)
            });
        }

        /// <summary>
        /// Setup 2FA - Generate QR code for authenticator app
        /// </summary>
        [HttpPost("2fa/setup")]
        public async Task<IActionResult> Setup2FA([FromBody] Enable2FARequest request)
        {
            try
            {
                var userId = Helpers.AuthHelper.GetCurrentUserId(HttpContext);
                if (userId == null)
                    return Unauthorized(new { message = "Please login first." });

                var user = await _context.users.FindAsync(userId);
                if (user == null)
                    return NotFound(new { message = "User not found." });

                if (user.two_factor_enabled)
                    return BadRequest(new { message = "2FA is already enabled for this account." });

                Console.WriteLine($"[2FA Setup] Starting 2FA setup for user: {user.email}");

                // Generate secret and QR code
                var secret = _twoFactorAuthService.GenerateSecret();
                var qrCodeData = _twoFactorAuthService.GenerateQrCode(user.email, secret);

                Console.WriteLine($"[2FA Setup] Generated secret (first 10 chars): {secret.Substring(0, Math.Min(10, secret.Length))}...");
                Console.WriteLine($"[2FA Setup] QR Code URL length: {qrCodeData.QrCodeDataUrl?.Length ?? 0}");

                // IMPORTANT: Save encrypted secret to DB immediately (not enabled yet)
                var encryptedSecret = _twoFactorAuthService.EncryptSecret(secret);
                user.two_factor_secret = encryptedSecret;
                user.two_factor_method = request.Method;
                user.two_factor_enabled = false; // Not enabled until verified
                user.updated_at = DateTime.UtcNow;

                await _context.SaveChangesAsync();

                Console.WriteLine($"[2FA Setup] Secret saved to DB for user {user.email}. Enabled: false");

                return Ok(qrCodeData);
            }
            catch (Exception ex)
            {
                Console.WriteLine($"[2FA Setup] Error: {ex.Message}");
                Console.WriteLine($"[2FA Setup] Stack trace: {ex.StackTrace}");
                return StatusCode(500, new { message = "An error occurred during 2FA setup.", error = ex.Message });
            }
        }

        /// <summary>
        /// Verify 2FA setup - Confirm the code from authenticator app
        /// </summary>
        [HttpPost("2fa/verify-setup")]
        public async Task<IActionResult> Verify2FASetup([FromBody] Verify2FASetupRequest request)
        {
            try
            {
                var userId = Helpers.AuthHelper.GetCurrentUserId(HttpContext);
                if (userId == null)
                    return Unauthorized(new { message = "Please login first." });

                var user = await _context.users.FindAsync(userId);
                if (user == null)
                    return NotFound(new { message = "User not found." });

                // Check if secret exists in DB (from setup step)
                if (string.IsNullOrWhiteSpace(user.two_factor_secret))
                {
                    Console.WriteLine($"[2FA Verify] No secret found in DB for user {user.email}");
                    return BadRequest(new { message = "2FA setup not initiated. Please run setup first." });
                }

                Console.WriteLine($"[2FA Verify] User: {user.email}, Secret exists in DB: true, Code: {request.Code}");

                // Decrypt secret from DB
                var encryptedSecret = user.two_factor_secret;
                var secret = _twoFactorAuthService.DecryptSecret(encryptedSecret);

                // Verify the code
                if (!_twoFactorAuthService.VerifyCode(secret, request.Code))
                {
                    Console.WriteLine($"[2FA Verify] Code verification failed for user {user.email}");
                    return BadRequest(new { message = "Invalid verification code. Please try again." });
                }

                // Code is valid - Enable 2FA and generate recovery codes
                var recoveryCodes = _twoFactorAuthService.GenerateRecoveryCodes();

                Console.WriteLine($"[2FA Verify] Code verified! Enabling 2FA for user {user.email}");

                user.two_factor_enabled = true;
                user.two_factor_recovery_codes = JsonSerializer.Serialize(recoveryCodes);
                user.two_factor_enabled_at = DateTime.UtcNow;
                user.updated_at = DateTime.UtcNow;

                await _context.SaveChangesAsync();

                Console.WriteLine($"[2FA Verify] 2FA enabled successfully for user {user.email}");

                return Ok(new Enable2FAResponse
                {
                    Success = true,
                    Message = "Two-factor authentication has been enabled successfully!",
                    RecoveryCodes = recoveryCodes
                });
            }
            catch (Exception ex)
            {
                Console.WriteLine($"[2FA Verify] Error: {ex.Message}");
                Console.WriteLine($"[2FA Verify] Stack trace: {ex.StackTrace}");
                if (ex.InnerException != null)
                {
                    Console.WriteLine($"[2FA Verify] Inner exception: {ex.InnerException.Message}");
                }
                return StatusCode(500, new { message = "An error occurred while enabling 2FA.", error = ex.Message });
            }
        }

        /// <summary>
        /// Disable 2FA - Requires password confirmation
        /// </summary>
        [HttpPost("2fa/disable")]
        public async Task<IActionResult> Disable2FA([FromBody] Disable2FARequest request)
        {
            var userId = Helpers.AuthHelper.GetCurrentUserId(HttpContext);
            if (userId == null)
                return Unauthorized(new { message = "Please login first." });

            var user = await _context.users.FindAsync(userId);
            if (user == null)
                return NotFound(new { message = "User not found." });

            if (!user.two_factor_enabled)
                return BadRequest(new { message = "2FA is not enabled for this account." });

            // Verify password
            if (!BCrypt.Net.BCrypt.Verify(request.Password, user.password))
                return BadRequest(new { message = "Incorrect password." });

            // Disable 2FA
            user.two_factor_enabled = false;
            user.two_factor_method = null;
            user.two_factor_secret = null;
            user.two_factor_recovery_codes = null;
            user.two_factor_enabled_at = null;
            user.updated_at = DateTime.UtcNow;

            await _context.SaveChangesAsync();

            return Ok(new { message = "Two-factor authentication has been disabled." });
        }

        /// <summary>
        /// Verify 2FA code during login
        /// </summary>
        [HttpPost("2fa/verify-login")]
        public async Task<IActionResult> Verify2FALogin([FromBody] Verify2FALoginRequest request, [FromServices] IMemoryCache cache)
        {
            var user = await _context.users.FirstOrDefaultAsync(u => u.email == request.Email);
            if (user == null)
                return BadRequest(new { message = "Invalid request." });

            if (!user.two_factor_enabled)
                return BadRequest(new { message = "2FA is not enabled for this account." });

            bool isValid = false;
            string? updatedRecoveryCodes = null;

            if (request.UseRecoveryCode)
            {
                // Verify recovery code
                isValid = _twoFactorAuthService.VerifyRecoveryCode(
                    user.two_factor_recovery_codes ?? "[]",
                    request.Code,
                    out updatedRecoveryCodes);

                if (isValid)
                {
                    // Update recovery codes (remove used one)
                    user.two_factor_recovery_codes = updatedRecoveryCodes;
                    await _context.SaveChangesAsync();
                }
            }
            else
            {
                // Verify TOTP code
                var secret = _twoFactorAuthService.DecryptSecret(user.two_factor_secret ?? "");
                isValid = _twoFactorAuthService.VerifyCode(secret, request.Code);
            }

            if (!isValid)
                return BadRequest(new { message = "Invalid verification code." });

            // Code is valid - Complete login
            HttpContext.Session.SetString("username", user.username);
            HttpContext.Session.SetString("role", user.role ?? "customer");
            HttpContext.Session.SetString("userId", user.user_id.ToString());

            return Ok(new 
            { 
                message = "Login successful!", 
                username = user.username, 
                role = user.role,
                twoFactorVerified = true
            });
        }

        /// <summary>
        /// Regenerate recovery codes
        /// </summary>
        [HttpPost("2fa/regenerate-recovery-codes")]
        public async Task<IActionResult> RegenerateRecoveryCodes()
        {
            var userId = Helpers.AuthHelper.GetCurrentUserId(HttpContext);
            if (userId == null)
                return Unauthorized(new { message = "Please login first." });

            var user = await _context.users.FindAsync(userId);
            if (user == null)
                return NotFound(new { message = "User not found." });

            if (!user.two_factor_enabled)
                return BadRequest(new { message = "2FA is not enabled for this account." });

            // Generate new recovery codes
            var recoveryCodes = _twoFactorAuthService.GenerateRecoveryCodes();
            user.two_factor_recovery_codes = JsonSerializer.Serialize(recoveryCodes);
            user.updated_at = DateTime.UtcNow;

            await _context.SaveChangesAsync();

            return Ok(new { 
                message = "Recovery codes have been regenerated.", 
                recoveryCodes = recoveryCodes 
            });
        }

        // ========== END TWO-FACTOR AUTHENTICATION ENDPOINTS ==========
    }


}
