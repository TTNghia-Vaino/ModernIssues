using System;
using System.Collections.Generic;

namespace ModernIssues.Models.Entities;

/// <summary>
/// Thông tin bảo hành sản phẩm (thời gian và trạng thái)
/// </summary>
public partial class warranty
{
    public int warranty_id { get; set; }

    public int product_id { get; set; }

    public int user_id { get; set; }

    public int order_id { get; set; }

    public DateTime start_date { get; set; }

    public DateTime end_date { get; set; }

    /// <summary>
    /// Số serial của sản phẩm
    /// </summary>
    public string? serial_number { get; set; }

    public string? status { get; set; }

    public DateTime? created_at { get; set; }

    public DateTime? updated_at { get; set; }

    public int? created_by { get; set; }

    public int? updated_by { get; set; }

    public bool? is_disabled { get; set; }

    public virtual user? created_byNavigation { get; set; }

    public virtual order order { get; set; } = null!;

    public virtual product product { get; set; } = null!;

    public virtual user? updated_byNavigation { get; set; }

    public virtual user user { get; set; } = null!;
}
