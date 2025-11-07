using System;

namespace ModernIssues.Models.DTOs;

/// <summary>
/// DTO nhận webhook biến động số dư từ ngân hàng/payment gateway
/// </summary>
public class WebhookBalanceDto
{
    /// <summary>
    /// ID giao dịch từ ngân hàng
    /// </summary>
    public string? TransactionId { get; set; }

    /// <summary>
    /// Số tiền
    /// </summary>
    public decimal Amount { get; set; }

    /// <summary>
    /// Nội dung chuyển khoản (chứa gencode)
    /// </summary>
    public string? Description { get; set; }

    /// <summary>
    /// Số tài khoản người gửi
    /// </summary>
    public string? SenderAccount { get; set; }

    /// <summary>
    /// Tên người gửi
    /// </summary>
    public string? SenderName { get; set; }

    /// <summary>
    /// Số tài khoản nhận
    /// </summary>
    public string? ReceiverAccount { get; set; }

    /// <summary>
    /// Tên người nhận
    /// </summary>
    public string? ReceiverName { get; set; }

    /// <summary>
    /// Mã ngân hàng
    /// </summary>
    public string? BankCode { get; set; }

    /// <summary>
    /// Thời gian giao dịch
    /// </summary>
    public DateTime? TransactionDate { get; set; }

    /// <summary>
    /// Loại giao dịch: IN (tiền vào), OUT (tiền ra)
    /// </summary>
    public string? TransactionType { get; set; }
}

/// <summary>
/// Dữ liệu order được cache theo gencode
/// Cache TTL: 30 phút (có thể config)
/// </summary>
public class OrderCacheDto
{
    /// <summary>
    /// User ID
    /// </summary>
    public int UserId { get; set; }

    /// <summary>
    /// Order ID
    /// </summary>
    public int OrderId { get; set; }

    /// <summary>
    /// Tổng tiền order
    /// </summary>
    public decimal TotalAmount { get; set; }

    /// <summary>
    /// Trạng thái order: pending, paid, cancelled
    /// </summary>
    public string Status { get; set; } = "pending";

    /// <summary>
    /// Loại thanh toán: COD, Transfer, ATM
    /// </summary>
    public string PaymentType { get; set; } = "Transfer";

    /// <summary>
    /// Thời gian tạo order
    /// </summary>
    public DateTime OrderCreatedAt { get; set; }

    /// <summary>
    /// Thời gian cache (để tracking)
    /// </summary>
    public DateTime CachedAt { get; set; }

    /// <summary>
    /// Thời gian hết hạn cache
    /// </summary>
    public DateTime ExpiresAt { get; set; }

    /// <summary>
    /// Thông tin user (optional - để notification/tracking)
    /// </summary>
    public CachedUserInfo? UserInfo { get; set; }

    /// <summary>
    /// Danh sách sản phẩm trong order
    /// </summary>
    public List<OrderItemCacheDto> Items { get; set; } = new();

    /// <summary>
    /// Metadata bổ sung (nếu cần)
    /// </summary>
    public Dictionary<string, string>? Metadata { get; set; }

    /// <summary>
    /// Kiểm tra cache còn hợp lệ không
    /// </summary>
    public bool IsValid() => DateTime.UtcNow < ExpiresAt && Status == "pending";
}

/// <summary>
/// Thông tin user được cache (minimal - chỉ cần thiết)
/// </summary>
public class CachedUserInfo
{
    public string? Username { get; set; }
    public string? Email { get; set; }
    public string? Phone { get; set; }
}

/// <summary>
/// Chi tiết sản phẩm trong order cache
/// </summary>
public class OrderItemCacheDto
{
    /// <summary>
    /// Product ID
    /// </summary>
    public int ProductId { get; set; }

    /// <summary>
    /// Tên sản phẩm (tại thời điểm mua)
    /// </summary>
    public string Name { get; set; } = string.Empty;

    /// <summary>
    /// Số lượng
    /// </summary>
    public int Quantity { get; set; }

    /// <summary>
    /// Giá tại thời điểm mua
    /// </summary>
    public decimal Price { get; set; }

    /// <summary>
    /// Tổng tiền (Quantity * Price)
    /// </summary>
    public decimal Subtotal { get; set; }

    /// <summary>
    /// Image URL (optional - để hiển thị)
    /// </summary>
    public string? ImageUrl { get; set; }
}

