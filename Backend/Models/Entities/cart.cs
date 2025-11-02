using System;

namespace ModernIssues.Models.Entities;

/// <summary>
/// Giỏ hàng của khách hàng - mỗi dòng là 1 sản phẩm trong giỏ hàng
/// PRIMARY KEY: (user_id, cart_id, product_id)
/// </summary>
public partial class cart
{
    public int cart_id { get; set; }

    public int user_id { get; set; }

    public int product_id { get; set; }

    public int quantity { get; set; }

    public decimal price_at_add { get; set; }

    public DateTime? created_at { get; set; }

    public DateTime? updated_at { get; set; }

    public virtual user? user { get; set; }

    public virtual product? product { get; set; }
}

