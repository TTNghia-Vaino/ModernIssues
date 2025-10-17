using System;
using System.Collections.Generic;

namespace ModernIssues.Models.Entities;

/// <summary>
/// Thông tin đơn hàng của khách hàng
/// </summary>
public partial class order
{
    public int order_id { get; set; }

    public int? user_id { get; set; }

    public DateTime? order_date { get; set; }

    public string? status { get; set; }

    public decimal? total_amount { get; set; }

    public DateTime? created_at { get; set; }

    public DateTime? updated_at { get; set; }

    public int? created_by { get; set; }

    public int? updated_by { get; set; }

    public virtual user? created_byNavigation { get; set; }

    public virtual ICollection<order_detail> order_details { get; set; } = new List<order_detail>();

    public virtual user? updated_byNavigation { get; set; }

    public virtual user? user { get; set; }

    public virtual ICollection<warranty> warranties { get; set; } = new List<warranty>();
}
