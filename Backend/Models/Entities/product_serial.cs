using System;

namespace ModernIssues.Models.Entities;

/// <summary>
/// Bảng quản lý serial numbers của sản phẩm trong kho
/// Mỗi sản phẩm nhập vào kho sẽ có một serial number riêng
/// </summary>
public partial class product_serial
{
    public int serial_id { get; set; }

    public int product_id { get; set; }

    /// <summary>
    /// Serial number của sản phẩm (unique, bắt buộc)
    /// </summary>
    public string serial_number { get; set; } = null!;

    /// <summary>
    /// ID đơn hàng nếu đã bán (nullable)
    /// </summary>
    public int? order_id { get; set; }

    /// <summary>
    /// ID warranty nếu đã bán (nullable)
    /// </summary>
    public int? warranty_id { get; set; }

    public DateTime? created_at { get; set; }

    public DateTime? updated_at { get; set; }

    public int? created_by { get; set; }

    public int? updated_by { get; set; }

    public bool? is_disabled { get; set; }

    public virtual user? created_byNavigation { get; set; }

    public virtual order? order { get; set; }

    public virtual product product { get; set; } = null!;

    public virtual user? updated_byNavigation { get; set; }

    public virtual warranty? warranty { get; set; }
}

