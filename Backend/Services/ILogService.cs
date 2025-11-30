using ModernIssues.Models.DTOs;

namespace ModernIssues.Services
{
    public interface ILogService
    {
        /// <summary>
        /// Tạo log mới cho một hành động của người dùng
        /// </summary>
        Task CreateLogAsync(int? userId, int? productId, string actionType);

        /// <summary>
        /// Tạo log trong scope mới (fire-and-forget safe)
        /// </summary>
        Task CreateLogInNewScopeAsync(int? userId, int? productId, string actionType);

        /// <summary>
        /// Lấy danh sách logs với phân trang và lọc
        /// </summary>
        Task<LogListResponse> GetLogsAsync(int page = 1, int limit = 20, int? userId = null, int? productId = null, string? actionType = null);

        /// <summary>
        /// Lấy logs của một user cụ thể
        /// </summary>
        Task<LogListResponse> GetUserLogsAsync(int userId, int page = 1, int limit = 20);

        /// <summary>
        /// Lấy logs của một sản phẩm cụ thể
        /// </summary>
        Task<LogListResponse> GetProductLogsAsync(int productId, int page = 1, int limit = 20);

        /// <summary>
        /// Lấy logs theo loại hành động
        /// </summary>
        Task<LogListResponse> GetLogsByActionTypeAsync(string actionType, int page = 1, int limit = 20);
    }
}

