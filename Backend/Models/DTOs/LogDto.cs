using System;

namespace ModernIssues.Models.DTOs
{
    /// <summary>
    /// DTO cho log entry
    /// </summary>
    public class LogDto
    {
        public int LogId { get; set; }
        public int? UserId { get; set; }
        public int? ProductId { get; set; }
        public string ActionType { get; set; } = string.Empty;
        public DateTime CreatedAt { get; set; }
        public string? Username { get; set; }
        public string? ProductName { get; set; }
    }

    /// <summary>
    /// Response cho danh sách logs với phân trang
    /// </summary>
    public class LogListResponse
    {
        public List<LogDto> Logs { get; set; } = new List<LogDto>();
        public int TotalCount { get; set; }
        public int Page { get; set; }
        public int Limit { get; set; }
        public int TotalPages { get; set; }
    }
}

