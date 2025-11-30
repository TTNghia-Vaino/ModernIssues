using System.Collections.Generic;
using Microsoft.AspNetCore.Http;

namespace ModernIssues.Models.DTOs
{
    // DTO cho Đăng ký (CREATE - Đầu vào)
    public class UserRegisterDto
    {
        public string Username { get; set; } = string.Empty;
        public string Password { get; set; } = string.Empty; // Sẽ được hash
        public string Email { get; set; } = string.Empty;
        public string Phone { get; set; } = string.Empty;
        public string Address { get; set; } = string.Empty;
        public IFormFile? AvatarFile { get; set; } // File ảnh đại diện
        public string? AvatarUrl { get; set; } // Đường dẫn ảnh đại diện (được set trong controller)
    }

    // DTO cho Cập nhật thông tin cá nhân (UPDATE - Đầu vào)
    public class UserUpdateProfileDto
    {
        public string? Username { get; set; } // Tên đăng nhập (nullable để không bắt buộc)
        public string? Phone { get; set; }
        public string? Address { get; set; }
        public string? Email { get; set; } // Có thể cần xác thực lại
        public IFormFile? AvatarFile { get; set; } // File ảnh đại diện mới
        public string? CurrentAvatarUrl { get; set; } // Ảnh hiện tại (để xóa khi upload mới)
        public string? AvatarUrl { get; set; } // Đường dẫn ảnh đại diện (được set trong controller)
        public string? ConfirmPassword { get; set; } // Mật khẩu xác nhận để thay đổi thông tin
    }

    // DTO cho Upload Avatar riêng biệt
    public class UserUploadAvatarDto
    {
        public IFormFile AvatarFile { get; set; } = null!;
        public string? CurrentAvatarUrl { get; set; } // Ảnh hiện tại (để xóa khi upload mới)
    }

    // DTO cho Đầu ra (READ - Chỉ hiển thị)
    public class UserDto
    {
        public int UserId { get; set; }
        public string Username { get; set; } = string.Empty;
        public string Email { get; set; } = string.Empty;
        public string Phone { get; set; } = string.Empty;
        public string Address { get; set; } = string.Empty;
        public string? AvatarUrl { get; set; } // Đường dẫn ảnh đại diện
        public string Role { get; set; } = string.Empty;
        public bool IsDisabled { get; set; }
        public bool EmailConfirmed { get; set; }
        public bool TwoFactorEnabled { get; set; } // Trạng thái bật/tắt 2FA
        // public DateTime CreatedAt { get; set; } // Tùy chọn
    }

    // DTO cho Đổi mật khẩu
    public class ChangePasswordDto
    {
        public string CurrentPassword { get; set; } = string.Empty;
        public string NewPassword { get; set; } = string.Empty;
        public string ConfirmPassword { get; set; } = string.Empty;
    }

    // DTO cho Đổi email
    public class ChangeEmailDto
    {
        public string NewEmail { get; set; } = string.Empty;
        public string ConfirmPassword { get; set; } = string.Empty;
        public string OtpCode { get; set; } = string.Empty; // OTP code để xác thực email mới
    }

    // DTO cho Gửi OTP đổi email
    public class SendEmailOtpDto
    {
        public string NewEmail { get; set; } = string.Empty;
        public string ConfirmPassword { get; set; } = string.Empty; // Cần xác nhận mật khẩu trước khi gửi OTP
        // OTP sẽ được gửi đến email cũ (email hiện tại) để xác thực
    }

    // Class để lưu OTP data trong cache
    public class EmailOtpCacheData
    {
        public string Otp { get; set; } = string.Empty;
        public string NewEmail { get; set; } = string.Empty;
    }

    // DTO cho Đổi số điện thoại
    public class ChangePhoneDto
    {
        public string NewPhone { get; set; } = string.Empty;
        public string ConfirmPassword { get; set; } = string.Empty;
        public string? OtpCode { get; set; } // Mã OTP xác nhận (tùy chọn)
    }

    // DTO cho Quản lý 2FA
    public class TwoFactorAuthDto
    {
        public bool Enabled { get; set; }
        public string Method { get; set; } = "Email"; // Chỉ hỗ trợ "Email"
    }

    // DTO cho Chi tiêu theo tháng
    public class ConsumptionMonthlyDto
    {
        public string Month { get; set; } = string.Empty; // "T1", "T2", ..., "T12" hoặc "YYYY-MM"
        public decimal Amount { get; set; }
        public int OrderCount { get; set; }
    }

    // DTO cho Response Chi tiêu
    public class ConsumptionResponse
    {
        public decimal TotalConsumption { get; set; }
        public decimal AverageMonthly { get; set; }
        public int TotalProducts { get; set; }
        public List<ConsumptionMonthlyDto> MonthlyData { get; set; } = new List<ConsumptionMonthlyDto>();
    }

    // DTO cho Sản phẩm đã mua
    public class PurchasedProductDto
    {
        public int OrderId { get; set; }
        public int ProductId { get; set; }
        public string ProductName { get; set; } = string.Empty;
        public string? ImageUrl { get; set; }
        public decimal PriceAtPurchase { get; set; }
        public int Quantity { get; set; }
        public DateTime? PurchaseDate { get; set; }
    }

    // DTO cho Bảo hành sản phẩm (sử dụng lại WarrantyDto từ WarrantyController)
}