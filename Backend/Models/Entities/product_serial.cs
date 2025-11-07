using System;
using System.Collections.Generic;

namespace ModernIssues.Models.Entities;

/// <summary>
/// Mỗi đơn vị hàng hóa trong kho có một serial riêng biệt
/// </summary>
public partial class product_serial
{
    public int serial_id { get; set; }

    public int product_id { get; set; }

    /// <summary>
    /// Mã serial duy nhất cho từng sản phẩm vật lý
    /// </summary>
    public string serial_number { get; set; } = null!;

    public DateTime? import_date { get; set; }

    public bool? is_sold { get; set; }

    public bool? is_disabled { get; set; }

    public DateTime? created_at { get; set; }

    public DateTime? updated_at { get; set; }

    public int? created_by { get; set; }

    public int? updated_by { get; set; }

    public virtual product product { get; set; } = null!;

    public virtual user? created_byNavigation { get; set; }

    public virtual user? updated_byNavigation { get; set; }

    public virtual ICollection<warranty> warranties { get; set; } = new List<warranty>();
}

