using Microsoft.AspNetCore.Http;
using System.Security.Claims;

namespace ModernIssues.Helpers
{
    public static class AuthHelper
    {
        /// <summary>
        /// Kiểm tra xem user có đăng nhập hay không
        /// </summary>
        /// <param name="httpContext">HttpContext hiện tại</param>
        /// <returns>True nếu đã đăng nhập, False nếu chưa</returns>
        public static bool IsLoggedIn(HttpContext httpContext)
        {
            var username = httpContext.Session.GetString("username");
            return !string.IsNullOrEmpty(username);
        }

        /// <summary>
        /// Kiểm tra xem user có phải admin hay không
        /// </summary>
        /// <param name="httpContext">HttpContext hiện tại</param>
        /// <returns>True nếu là admin, False nếu không</returns>
        public static bool IsAdmin(HttpContext httpContext)
        {
            var role = httpContext.Session.GetString("role");
            return role == "admin";
        }

        /// <summary>
        /// Lấy username của user hiện tại
        /// </summary>
        /// <param name="httpContext">HttpContext hiện tại</param>
        /// <returns>Username hoặc null nếu chưa đăng nhập</returns>
        public static string? GetCurrentUsername(HttpContext httpContext)
        {
            return httpContext.Session.GetString("username");
        }

        /// <summary>
        /// Lấy role của user hiện tại
        /// </summary>
        /// <param name="httpContext">HttpContext hiện tại</param>
        /// <returns>Role hoặc null nếu chưa đăng nhập</returns>
        public static string? GetCurrentRole(HttpContext httpContext)
        {
            return httpContext.Session.GetString("role");
        }

        /// <summary>
        /// Kiểm tra xem user có quyền thực hiện thao tác admin hay không
        /// </summary>
        /// <param name="httpContext">HttpContext hiện tại</param>
        /// <returns>True nếu có quyền admin, False nếu không</returns>
        public static bool HasAdminPermission(HttpContext httpContext)
        {
            return IsLoggedIn(httpContext) && IsAdmin(httpContext);
        }

        /// <summary>
        /// Lấy thông tin user hiện tại dưới dạng object
        /// </summary>
        /// <param name="httpContext">HttpContext hiện tại</param>
        /// <returns>Object chứa thông tin user hoặc null nếu chưa đăng nhập</returns>
        public static object? GetCurrentUser(HttpContext httpContext)
        {
            if (!IsLoggedIn(httpContext))
                return null;

            return new
            {
                Username = GetCurrentUsername(httpContext),
                Role = GetCurrentRole(httpContext),
                IsAdmin = IsAdmin(httpContext)
            };
        }
    }
}
