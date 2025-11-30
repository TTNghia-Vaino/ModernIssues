using System;

namespace ModernIssues.Models.DTOs
{
    /// <summary>
    /// Thông tin đơn hàng lưu trong cache để đối chiếu với biến động số dư
    /// </summary>
    public class OrderCacheInfo
    {
        public int OrderId { get; set; }
        public int? UserId { get; set; }
        public decimal TotalAmount { get; set; }
        public string PaymentType { get; set; } = string.Empty;
        public string Status { get; set; } = string.Empty;
        public DateTime CreatedAt { get; set; }
    }
}

