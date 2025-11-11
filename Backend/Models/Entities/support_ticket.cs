using System;

namespace ModernIssues.Models.Entities;

/// <summary>
/// Ticket hỗ trợ khách hàng
/// </summary>
public partial class support_ticket
{
    public int ticket_id { get; set; }
    
    public int? user_id { get; set; }
    
    public string subject { get; set; } = string.Empty;
    
    public string message { get; set; } = string.Empty;
    
    /// <summary>
    /// Loại ticket: technical, billing, order, general
    /// </summary>
    public string? ticket_type { get; set; }
    
    /// <summary>
    /// Trạng thái: open, in_progress, resolved, closed
    /// </summary>
    public string status { get; set; } = "open";
    
    /// <summary>
    /// Admin đang xử lý ticket
    /// </summary>
    public int? assigned_to { get; set; }
    
    public string? email { get; set; }
    
    public string? phone { get; set; }
    
    public DateTime? created_at { get; set; }
    
    public DateTime? updated_at { get; set; }
    
    public DateTime? resolved_at { get; set; }
    
    public virtual user? user { get; set; }
    
    public virtual user? assigned_toNavigation { get; set; }
}
