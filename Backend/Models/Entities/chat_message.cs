using System;

namespace ModernIssues.Models.Entities;

/// <summary>
/// Tin nhắn chat hỗ trợ
/// </summary>
public partial class chat_message
{
    public int message_id { get; set; }
    
    public int? user_id { get; set; }
    
    public int? admin_id { get; set; }
    
    public string message { get; set; } = string.Empty;
    
    /// <summary>
    /// Loại tin nhắn: user (khách hàng) hoặc admin
    /// </summary>
    public string sender_type { get; set; } = "user";
    
    public bool is_read { get; set; } = false;
    
    public DateTime? created_at { get; set; }
    
    public virtual user? user { get; set; }
    
    public virtual user? admin { get; set; }
}

