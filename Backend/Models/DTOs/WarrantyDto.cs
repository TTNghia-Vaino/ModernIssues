using System;
using System.Collections.Generic;

namespace ModernIssues.Models.DTOs
{
    /// <summary>
    /// DTO cho thông tin bảo hành
    /// </summary>
    public class WarrantyDto
    {
        public int WarrantyId { get; set; }
        public int ProductId { get; set; }
        public string ProductName { get; set; } = string.Empty;
        public string? ProductImageUrl { get; set; }
        public int UserId { get; set; }
        public string? Username { get; set; }
        public int OrderId { get; set; }
        public DateTime StartDate { get; set; }
        public DateTime EndDate { get; set; }
        public string SerialNumber { get; set; } = string.Empty;
        public string? Status { get; set; }
        public string? StatusDisplay { get; set; }
        public DateTime? CreatedAt { get; set; }
        public DateTime? UpdatedAt { get; set; }
        public bool IsExpired { get; set; }
        public int? DaysRemaining { get; set; }
    }

    /// <summary>
    /// DTO cho tạo bảo hành mới (Admin)
    /// </summary>
    public class WarrantyCreateDto
    {
        public int ProductId { get; set; }
        public int UserId { get; set; }
        public int OrderId { get; set; }
        public string SerialNumber { get; set; } = string.Empty;
        public DateTime StartDate { get; set; }
        public DateTime EndDate { get; set; }
        public string? Status { get; set; } = "active";
    }

    /// <summary>
    /// DTO cho cập nhật bảo hành (Admin)
    /// </summary>
    public class WarrantyUpdateDto
    {
        public string? SerialNumber { get; set; }
        public string? Status { get; set; }
    }

    /// <summary>
    /// DTO cho chi tiết từng lần bảo hành (lịch sử bảo hành)
    /// </summary>
    public class WarrantyDetailDto
    {
        public int DetailId { get; set; }
        public int WarrantyId { get; set; }
        public int ClaimNumber { get; set; }
        public string Status { get; set; } = string.Empty;
        public string? StatusDisplay { get; set; }
        public string? Description { get; set; }
        public string? Solution { get; set; }
        public DateTime RequestDate { get; set; }
        public DateTime? ServiceDate { get; set; }
        public DateTime? CompletedDate { get; set; }
        public decimal? Cost { get; set; }
        public int CreatedBy { get; set; }
        public string? CreatedByName { get; set; }
        public int? HandledBy { get; set; }
        public string? HandledByName { get; set; }
        public string? Notes { get; set; }
        public string? ImageUrls { get; set; }
        public DateTime? CreatedAt { get; set; }
        public DateTime? UpdatedAt { get; set; }
    }

    /// <summary>
    /// DTO cho tạo yêu cầu bảo hành mới (User)
    /// </summary>
    public class WarrantyDetailCreateDto
    {
        public int WarrantyId { get; set; }
        public string? Description { get; set; }
        public string? Notes { get; set; }
        public string? ImageUrls { get; set; } // JSON array string: ["url1.jpg", "url2.jpg"]
    }

    /// <summary>
    /// DTO cho cập nhật yêu cầu bảo hành (Admin xử lý)
    /// </summary>
    public class WarrantyDetailUpdateDto
    {
        public string? Status { get; set; } // pending, approved, processing, completed, rejected, cancelled
        public string? Solution { get; set; }
        public DateTime? ServiceDate { get; set; }
        public DateTime? CompletedDate { get; set; }
        public decimal? Cost { get; set; }
        public string? Notes { get; set; }
    }

    /// <summary>
    /// DTO cho danh sách yêu cầu bảo hành (warranty_detail) kèm thông tin warranty, user, product
    /// Dùng cho frontend hiển thị danh sách yêu cầu bảo hành
    /// </summary>
    public class WarrantyClaimListDto
    {
        // Từ warranty_detail
        public int DetailId { get; set; }
        public int WarrantyId { get; set; }
        public int ClaimNumber { get; set; }
        public string Status { get; set; } = string.Empty;
        public string? StatusDisplay { get; set; }
        public string? Description { get; set; } // Vấn đề
        public DateTime RequestDate { get; set; } // Ngày yêu cầu
        
        // Từ warranty
        public string SerialNumber { get; set; } = string.Empty;
        
        // Từ user (khách hàng)
        public int UserId { get; set; }
        public string CustomerName { get; set; } = string.Empty; // username hoặc tên khách hàng
        public string? CustomerPhone { get; set; }
        
        // Từ product
        public int ProductId { get; set; }
        public string ProductName { get; set; } = string.Empty;
        public string? ProductImageUrl { get; set; }
        
        // Từ order (ngày mua)
        public int OrderId { get; set; }
        public DateTime? PurchaseDate { get; set; } // order.order_date = ngày mua
        
        // Thông tin xử lý
        public string? HandledByName { get; set; } // Kỹ thuật viên
        public DateTime? ServiceDate { get; set; }
        public DateTime? CompletedDate { get; set; }
        public string? Notes { get; set; }
        public string? ImageUrls { get; set; }
    }

    /// <summary>
    /// DTO cho cập nhật trạng thái bảo hành (Admin workflow)
    /// </summary>
    public class WarrantyStatusUpdateDto
    {
        public string Status { get; set; } = string.Empty; // waiting_reception, inspecting, repairing, quality_check, completed, returned
        public string? Notes { get; set; } // Ghi chú của admin
        public string? Solution { get; set; } // Giải pháp đã thực hiện
        public decimal? Cost { get; set; } // Chi phí (nếu có)
    }

    /// <summary>
    /// DTO cho một entry trong lịch sử bảo hành (từ history_json)
    /// </summary>
    public class WarrantyHistoryEntryDto
    {
        public DateTime Date { get; set; }
        public string Status { get; set; } = string.Empty;
        public string StatusDisplay { get; set; } = string.Empty;
        public string? Notes { get; set; }
        public string? Solution { get; set; }
        public decimal? Cost { get; set; }
        public string? HandledBy { get; set; } // Tên admin/kỹ thuật viên
    }
}

