using System;
using System.Collections.Generic;

namespace ModernIssues.Models.Entities;

/// <summary>
/// Chương trình khuyến mãi, ví dụ: giảm 10%, mua 1 tặng 1...
/// </summary>
public partial class promotion
{
    public int promotion_id { get; set; }

    public string promotion_name { get; set; } = null!;

    public string? description { get; set; }

    /// <summary>
    /// Loại khuyến mãi: "percentage" (phần trăm) hoặc "fixed_amount" (số tiền trực tiếp)
    /// </summary>
    public string discount_type { get; set; } = "percentage";

    /// <summary>
    /// Giá trị khuyến mãi: phần trăm (0-100) hoặc số tiền (nếu discount_type = "fixed_amount")
    /// </summary>
    public decimal? discount_value { get; set; }

    public DateTime start_date { get; set; }

    public DateTime end_date { get; set; }

    public bool? is_active { get; set; }

    public DateTime? created_at { get; set; }

    public DateTime? updated_at { get; set; }

    public int? created_by { get; set; }

    public int? updated_by { get; set; }

    public string? banner_url { get; set; }

    public virtual user? created_byNavigation { get; set; }

    public virtual user? updated_byNavigation { get; set; }

    public virtual ICollection<product> products { get; set; } = new List<product>();
}
