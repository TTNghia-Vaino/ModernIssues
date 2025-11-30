using System;
using System.Collections.Generic;

namespace ModernIssues.Models.Entities;

/// <summary>
/// Lưu lịch sử thao tác của người dùng: xem, thêm giỏ hàng, đăng nhập,...
/// </summary>
public partial class log
{
    public int log_id { get; set; }

    public int? user_id { get; set; }

    public int? product_id { get; set; }

    public string action_type { get; set; } = null!;

    public DateTime? created_at { get; set; }

    public virtual product? product { get; set; }

    public virtual user? user { get; set; }
}
