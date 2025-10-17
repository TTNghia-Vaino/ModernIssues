using System;
using System.Collections.Generic;

namespace ModernIssues.Models;

/// <summary>
/// Danh mục sản phẩm (ví dụ: Laptop, CPU, RAM, Phụ kiện,...)
/// </summary>
public partial class category
{
    public int category_id { get; set; }

    public string category_name { get; set; } = null!;

    /// <summary>
    /// Tham chiếu đến danh mục cha (nếu có)
    /// </summary>
    public int? parent_id { get; set; }

    public DateTime? created_at { get; set; }

    public DateTime? updated_at { get; set; }

    public int? created_by { get; set; }

    public int? updated_by { get; set; }

    public virtual ICollection<category> Inverseparent { get; set; } = new List<category>();

    public virtual user? created_byNavigation { get; set; }

    public virtual category? parent { get; set; }

    public virtual ICollection<product> products { get; set; } = new List<product>();

    public virtual user? updated_byNavigation { get; set; }
}
