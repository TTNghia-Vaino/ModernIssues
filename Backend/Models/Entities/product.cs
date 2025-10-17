﻿using System;
using System.Collections.Generic;

namespace ModernIssues.Models.Entities;

/// <summary>
/// Danh sách sản phẩm bán trong cửa hàng: laptop, linh kiện, phụ kiện...
/// </summary>
public partial class product
{
    public int product_id { get; set; }

    public int? category_id { get; set; }

    public string product_name { get; set; } = null!;

    public string? description { get; set; }

    public decimal price { get; set; }

    public int? stock { get; set; }

    public int? warranty_period { get; set; }

    public string? image_url { get; set; }

    public bool? is_disabled { get; set; }

    public DateTime? created_at { get; set; }

    public DateTime? updated_at { get; set; }

    public int? created_by { get; set; }

    public int? updated_by { get; set; }

    public decimal? on_prices { get; set; }

    public virtual category? category { get; set; }

    public virtual user? created_byNavigation { get; set; }

    public virtual ICollection<log> logs { get; set; } = new List<log>();

    public virtual ICollection<order_detail> order_details { get; set; } = new List<order_detail>();

    public virtual user? updated_byNavigation { get; set; }

    public virtual ICollection<warranty> warranties { get; set; } = new List<warranty>();

    public virtual ICollection<promotion> promotions { get; set; } = new List<promotion>();
}
