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

    public decimal? discount_percent { get; set; }

    public DateTime start_date { get; set; }

    public DateTime end_date { get; set; }

    public bool? is_active { get; set; }

    public DateTime? created_at { get; set; }

    public DateTime? updated_at { get; set; }

    public int? created_by { get; set; }

    public int? updated_by { get; set; }

    public virtual user? created_byNavigation { get; set; }

    public virtual user? updated_byNavigation { get; set; }

    public virtual ICollection<product> products { get; set; } = new List<product>();
}
