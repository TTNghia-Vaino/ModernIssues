using Microsoft.AspNetCore.Http; // Sử dụng cho StatusCodes

namespace ModernIssues.Helpers
{
    /// <summary>
    /// Cung cấp các hằng số mã trạng thái HTTP thường dùng cho API Responses.
    /// Sử dụng StatusCodes của ASP.NET Core để đảm bảo tính nhất quán.
    /// </summary>
    public static class HttpStatusCodes
    {
        // 2xx - Thành công
        public const int OK = StatusCodes.Status200OK;
        public const int Created = StatusCodes.Status201Created;
        public const int Accepted = StatusCodes.Status202Accepted;
        public const int NoContent = StatusCodes.Status204NoContent;
        
        // 4xx - Lỗi Client
        public const int BadRequest = StatusCodes.Status400BadRequest;
        public const int Unauthorized = StatusCodes.Status401Unauthorized;
        public const int Forbidden = StatusCodes.Status403Forbidden;
        public const int NotFound = StatusCodes.Status404NotFound;
        public const int MethodNotAllowed = StatusCodes.Status405MethodNotAllowed;
        public const int Conflict = StatusCodes.Status409Conflict;
        public const int UnprocessableEntity = StatusCodes.Status422UnprocessableEntity;
        public const int TooManyRequests = StatusCodes.Status429TooManyRequests;
        
        // 5xx - Lỗi Server
        public const int InternalServerError = StatusCodes.Status500InternalServerError;
    }
}