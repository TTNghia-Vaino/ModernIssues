using Microsoft.AspNetCore.Http;
using System;
using System.Collections.Generic;

namespace ModernIssues.Models.DTOs
{
    /// <summary>
    /// DTO cho tạo/cập nhật khuyến mãi với upload banner
    /// </summary>
    public class PromotionWithImageDto
    {
        public string PromotionName { get; set; } = string.Empty;
        public string? Description { get; set; }
        
        /// <summary>
        /// Loại khuyến mãi: "percentage" (phần trăm) hoặc "fixed_amount" (số tiền trực tiếp)
        /// </summary>
        public string DiscountType { get; set; } = "percentage";
        
        /// <summary>
        /// Giá trị khuyến mãi: phần trăm (0-100) hoặc số tiền (nếu DiscountType = "fixed_amount")
        /// </summary>
        public decimal DiscountValue { get; set; }
        
        public DateTime StartDate { get; set; }
        public DateTime EndDate { get; set; }
        public bool IsActive { get; set; } = true;
        
        /// <summary>
        /// Danh sách ID danh mục (JSON array string hoặc comma-separated)
        /// </summary>
        public string? CategoryIds { get; set; } // VD: "[1,2,3]" hoặc "1,2,3"
        
        /// <summary>
        /// Danh sách ID sản phẩm cụ thể (JSON array string hoặc comma-separated)
        /// </summary>
        public string? ProductIds { get; set; } // VD: "[1,2,3]" hoặc "1,2,3"
        
        /// <summary>
        /// File banner khuyến mãi (tùy chọn)
        /// </summary>
        public IFormFile? BannerFile { get; set; }
    }
}

