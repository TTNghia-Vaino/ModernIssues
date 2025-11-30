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

    /// <summary>
    /// Loại thanh toán (COD, Transfer, ATM)
    /// </summary>
    public string? types { get; set; } = "COD";

    public DateTime? created_at { get; set; }

    public DateTime? updated_at { get; set; }

    public int? created_by { get; set; }

    public int? updated_by { get; set; }

    public virtual user? created_byNavigation { get; set; }

    public virtual ICollection<order_detail> order_details { get; set; } = new List<order_detail>();

    public virtual user? updated_byNavigation { get; set; }

    public virtual user? user { get; set; }

    public virtual ICollection<warranty> warranties { get; set; } = new List<warranty>();

    // Note: product_serials không có quan hệ trực tiếp với order
    // Quan hệ giữa order và product_serial chỉ thông qua warranty (warranty có order_id và serial_number)
    // public virtual ICollection<product_serial> product_serials { get; set; } = new List<product_serial>();
}
