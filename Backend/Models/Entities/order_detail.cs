using System;
using System.Collections.Generic;

namespace ModernIssues.Models.Entities;

/// <summary>
/// Chi tiết các sản phẩm trong mỗi đơn hàng
/// </summary>
public partial class order_detail
{
    public int order_id { get; set; }

    public int product_id { get; set; }

    /// <summary>
    /// Lưu tên sản phẩm tại thời điểm mua để giữ lịch sử
    /// </summary>
    public string product_name { get; set; } = null!;

    public decimal price_at_purchase { get; set; }

    public int quantity { get; set; }

    public string? image_url { get; set; }

    public DateTime? created_at { get; set; }

    public DateTime? updated_at { get; set; }

    public int? created_by { get; set; }

    public int? updated_by { get; set; }

    public virtual user? created_byNavigation { get; set; }

    public virtual order order { get; set; } = null!;

    public virtual product product { get; set; } = null!;

    public virtual user? updated_byNavigation { get; set; }
}
