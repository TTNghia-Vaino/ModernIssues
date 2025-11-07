using System;

namespace ModernIssues.Models.Entities;

/// <summary>
/// Bảng biến động số dư từ webhook ngân hàng/payment gateway
/// </summary>
public partial class balance_change
{
    /// <summary>
    /// ID tự tăng
    /// </summary>
    public int id { get; set; }

    /// <summary>
    /// Transaction ID từ ngân hàng
    /// </summary>
    public string? transaction_id { get; set; }

    /// <summary>
    /// Số tiền giao dịch
    /// </summary>
    public decimal amount { get; set; }

    /// <summary>
    /// Nội dung chuyển khoản (Description) - chứa gencode
    /// </summary>
    public string? description { get; set; }

    /// <summary>
    /// Số tài khoản người gửi
    /// </summary>
    public string? sender_account { get; set; }

    /// <summary>
    /// Tên người gửi
    /// </summary>
    public string? sender_name { get; set; }

    /// <summary>
    /// Số tài khoản nhận
    /// </summary>
    public string? receiver_account { get; set; }

    /// <summary>
    /// Tên người nhận
    /// </summary>
    public string? receiver_name { get; set; }

    /// <summary>
    /// Mã ngân hàng
    /// </summary>
    public string? bank_code { get; set; }

    /// <summary>
    /// Thời gian giao dịch
    /// </summary>
    public DateTime? transaction_date { get; set; }

    /// <summary>
    /// Loại giao dịch: IN (tiền vào), OUT (tiền ra)
    /// </summary>
    public string? transaction_type { get; set; }

    /// <summary>
    /// Gencode được parse từ description (nếu có)
    /// </summary>
    public string? gencode { get; set; }

    /// <summary>
    /// Trạng thái xử lý: pending, processed, failed
    /// </summary>
    public string? status { get; set; }

    /// <summary>
    /// Order ID được match (nếu có)
    /// </summary>
    public int? order_id { get; set; }

    /// <summary>
    /// Nội dung webhook gốc (JSON)
    /// </summary>
    public string? raw_webhook_data { get; set; }

    /// <summary>
    /// Thời gian tạo bản ghi
    /// </summary>
    public DateTime? created_at { get; set; }

    /// <summary>
    /// Thời gian cập nhật
    /// </summary>
    public DateTime? updated_at { get; set; }

    /// <summary>
    /// Quan hệ với bảng orders
    /// </summary>
    public virtual order? order { get; set; }
}

