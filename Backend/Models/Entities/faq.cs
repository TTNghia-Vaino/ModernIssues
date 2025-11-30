using System;
using System.Collections.Generic;

namespace ModernIssues.Models.Entities;

/// <summary>
/// Câu hỏi thường gặp (FAQ) của khách hàng
/// </summary>
public partial class faq
{
    public int faq_id { get; set; }

    public string question { get; set; } = null!;

    public string answer { get; set; } = null!;

    public DateTime? created_at { get; set; }

    public DateTime? updated_at { get; set; }

    public int? created_by { get; set; }

    public int? updated_by { get; set; }

    public virtual user? created_byNavigation { get; set; }

    public virtual user? updated_byNavigation { get; set; }
}
