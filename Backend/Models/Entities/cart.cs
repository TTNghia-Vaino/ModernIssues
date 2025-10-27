using System;
using System.Collections.Generic;

namespace ModernIssues.Models.Entities;

/// <summary>
/// Giỏ hàng của khách hàng
/// </summary>
public partial class cart
{
    public int cart_id { get; set; }
    public int user_id { get; set; }
    public DateTime? created_at { get; set; }
    public DateTime? updated_at { get; set; }
    public int? created_by { get; set; }
    public int? updated_by { get; set; }

    public virtual user? created_byNavigation { get; set; }
    public virtual user? updated_byNavigation { get; set; }
    public virtual user? user { get; set; }
    public virtual ICollection<cart_item> cart_items { get; set; } = new List<cart_item>();
}

/// <summary>
/// Chi tiết sản phẩm trong giỏ hàng
/// </summary>
public partial class cart_item
{
    public int cart_item_id { get; set; }
    public int cart_id { get; set; }
    public int product_id { get; set; }
    public int quantity { get; set; }
    public decimal price_at_add { get; set; }
    public DateTime? created_at { get; set; }
    public DateTime? updated_at { get; set; }
    public int? created_by { get; set; }
    public int? updated_by { get; set; }

    public virtual cart? cart { get; set; }
    public virtual user? created_byNavigation { get; set; }
    public virtual product? product { get; set; }
    public virtual user? updated_byNavigation { get; set; }
}
