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
        // public DateTime CreatedAt { get; set; } // Tùy chọn
    }
}