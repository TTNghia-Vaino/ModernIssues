using System;
using System.Collections.Generic;

namespace ModernIssues.Models.DTOs
{
    /// <summary>
    /// DTO cho tạo/cập nhật khuyến mãi
    /// </summary>
    public class PromotionCreateUpdateDto
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
        /// Danh sách ID danh mục (nếu chọn danh mục, sẽ tự động lấy tất cả sản phẩm trong danh mục)
        /// </summary>
        public List<int>? CategoryIds { get; set; }
        
        /// <summary>
        /// Danh sách ID sản phẩm cụ thể (có thể chọn thêm sản phẩm riêng lẻ)
        /// </summary>
        public List<int>? ProductIds { get; set; }
        
        /// <summary>
        /// URL banner khuyến mãi (tùy chọn)
        /// </summary>
        public string? BannerUrl { get; set; }
    }

    /// <summary>
    /// DTO cho hiển thị chi tiết khuyến mãi
    /// </summary>
    public class PromotionDto : PromotionCreateUpdateDto
    {
        public int PromotionId { get; set; }
        public DateTime? CreatedAt { get; set; }
        public DateTime? UpdatedAt { get; set; }
        
        /// <summary>
        /// Danh sách sản phẩm áp dụng khuyến mãi
        /// </summary>
        public List<PromotionProductDto> Products { get; set; } = new List<PromotionProductDto>();
    }

    /// <summary>
    /// DTO cho sản phẩm trong khuyến mãi
    /// </summary>
    public class PromotionProductDto
    {
        public int ProductId { get; set; }
        public string ProductName { get; set; } = string.Empty;
        public string? ImageUrl { get; set; }
        public decimal Price { get; set; }
        public int? CategoryId { get; set; }
        public string? CategoryName { get; set; }
    }

    /// <summary>
    /// DTO cho danh sách khuyến mãi (có phân trang)
    /// </summary>
    public class PromotionListDto
    {
        public int PromotionId { get; set; }
        public string PromotionName { get; set; } = string.Empty;
        public string? Description { get; set; }
        public string DiscountType { get; set; } = "percentage";
        public decimal DiscountValue { get; set; }
        public string DiscountDisplay { get; set; } = string.Empty; // Hiển thị: "20%" hoặc "50,000 VNĐ"
        public DateTime StartDate { get; set; }
        public DateTime EndDate { get; set; }
        public string Status { get; set; } = string.Empty; // "Đang hoạt động", "Chưa kích hoạt", "Đã hết hạn"
        public bool IsActive { get; set; }
        public int ProductCount { get; set; } // Số lượng sản phẩm áp dụng
        public string? BannerUrl { get; set; }
    }

    /// <summary>
    /// Response cho danh sách khuyến mãi (phân trang)
    /// </summary>
    public class PromotionListResponse
    {
        public int TotalCount { get; set; }
        public int CurrentPage { get; set; }
        public int Limit { get; set; }
        public List<PromotionListDto> Data { get; set; } = new List<PromotionListDto>();
    }

    /// <summary>
    /// Chi tiết cập nhật giá cho từng promotion
    /// </summary>
    public class PromotionUpdateDetail
    {
        public int PromotionId { get; set; }
        public string PromotionName { get; set; } = string.Empty;
        public int UpdatedProductCount { get; set; }
        public string Status { get; set; } = string.Empty; // "updated" hoặc "reset"
    }

    /// <summary>
    /// Response cho API tự động cập nhật giá sản phẩm
    /// </summary>
    public class UpdatePricesResponse
    {
        public int ProcessedPromotionCount { get; set; }
        public int UpdatedProductCount { get; set; }
        public int ResetProductCount { get; set; }
        public int TotalAffectedProducts { get; set; }
        public List<PromotionUpdateDetail> PromotionDetails { get; set; } = new List<PromotionUpdateDetail>();
        public DateTime ProcessedAt { get; set; }
    }
}

