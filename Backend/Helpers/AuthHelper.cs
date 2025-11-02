using Microsoft.AspNetCore.Http;

namespace ModernIssues.Helpers
{
    public static class AuthHelper
    {
        // Kiểm tra đã đăng nhập chưa - đọc từ session
        public static bool IsLoggedIn(HttpContext httpContext)
        {
            var username = httpContext.Session.GetString("username");
            return !string.IsNullOrEmpty(username);
        }

        // Kiểm tra có phải admin không - đọc từ session
        public static bool IsAdmin(HttpContext httpContext)
        {
            var role = httpContext.Session.GetString("role");
            return role == "admin";
        }

        // Lấy userId từ session
        public static int? GetCurrentUserId(HttpContext httpContext)
        {
            var userIdString = httpContext.Session.GetString("userId");
            if (int.TryParse(userIdString, out int userId))
            {
                return userId;
            }
            return null;
        }

        // Lấy thông tin user hiện tại từ session
        public static object? GetCurrentUser(HttpContext httpContext)
        {
            if (!IsLoggedIn(httpContext))
                return null;

            return new
            {
                UserId = GetCurrentUserId(httpContext),
                Username = httpContext.Session.GetString("username"),
                Role = httpContext.Session.GetString("role"),
                IsAdmin = IsAdmin(httpContext)
            };
        }
    }
}
