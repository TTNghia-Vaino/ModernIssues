using System;

namespace ModernIssues.Models.Entities;

/// <summary>
/// Chi tiết từng lần bảo hành của một warranty
/// Một warranty có thể có nhiều lần bảo hành (lần 1, 2, 3, 4...)
/// </summary>
public partial class warranty_detail
{
    public int detail_id { get; set; }

    public int warranty_id { get; set; }

    /// <summary>
    /// Số thứ tự lần bảo hành (1, 2, 3, 4...) - tự động tính từ số lần bảo hành hiện có + 1
    /// </summary>
    public int claim_number { get; set; }

    /// <summary>
    /// Trạng thái: pending (chờ xử lý), approved (đã duyệt), processing (đang xử lý), 
    /// completed (hoàn thành), rejected (từ chối), cancelled (đã hủy)
    /// </summary>
    public string status { get; set; } = "pending";

    /// <summary>
    /// Mô tả vấn đề/yêu cầu bảo hành
    /// </summary>
    public string? description { get; set; }

    /// <summary>
    /// Giải pháp/công việc đã thực hiện (admin điền sau khi xử lý)
    /// </summary>
    public string? solution { get; set; }

    /// <summary>
    /// Ngày yêu cầu bảo hành
    /// </summary>
    public DateTime request_date { get; set; }

    /// <summary>
    /// Ngày bắt đầu xử lý (nullable)
    /// </summary>
    public DateTime? service_date { get; set; }

    /// <summary>
    /// Ngày hoàn thành (nullable)
    /// </summary>
    public DateTime? completed_date { get; set; }

    /// <summary>
    /// Chi phí sửa chữa (nếu có, nullable) - có thể là 0 nếu trong bảo hành
    /// </summary>
    public decimal? cost { get; set; }

    /// <summary>
    /// Người yêu cầu bảo hành (user_id)
    /// </summary>
    public int created_by { get; set; }

    /// <summary>
    /// Người xử lý bảo hành (admin_id, nullable)
    /// </summary>
    public int? handled_by { get; set; }

    /// <summary>
    /// Ghi chú thêm (nullable)
    /// </summary>
    public string? notes { get; set; }

    /// <summary>
    /// Ảnh minh chứng (có thể lưu JSON array hoặc string, nullable)
    /// </summary>
    public string? image_urls { get; set; }

    public DateTime? created_at { get; set; }

    public DateTime? updated_at { get; set; }

    public int? updated_by { get; set; }

    public bool? is_disabled { get; set; }

    public virtual user created_byNavigation { get; set; } = null!;

    public virtual user? handled_byNavigation { get; set; }

    public virtual user? updated_byNavigation { get; set; }

    public virtual warranty warranty { get; set; } = null!;
}

