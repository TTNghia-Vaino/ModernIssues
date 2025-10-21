using System.Collections.Generic;

namespace ModernIssues.Models.DTOs
{
    // DTO cho Đăng ký (CREATE - Đầu vào)
    public class UserRegisterDto
    {
        public string Username { get; set; }
        public string Password { get; set; } // Sẽ được hash
        public string Email { get; set; }
        public string Phone { get; set; }
        public string Address { get; set; }
    }

    // DTO cho Cập nhật thông tin cá nhân (UPDATE - Đầu vào)
    public class UserUpdateProfileDto
    {
        public string Phone { get; set; }
        public string Address { get; set; }
        public string Email { get; set; } // Có thể cần xác thực lại
    }

    // DTO cho Đầu ra (READ - Chỉ hiển thị)
    public class UserDto
    {
        public int UserId { get; set; }
        public string Username { get; set; }
        public string Email { get; set; }
        public string Phone { get; set; }
        public string Address { get; set; }
        public string Role { get; set; }
        public bool IsDisabled { get; set; }
        public bool EmailConfirmed { get; set; }
        // public DateTime CreatedAt { get; set; } // Tùy chọn
    }
}