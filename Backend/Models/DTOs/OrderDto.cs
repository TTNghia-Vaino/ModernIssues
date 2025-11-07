using System;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;

namespace ModernIssues.Models.DTOs
{
    /// <summary>
    /// DTO cho thông tin đơn hàng
    /// </summary>
    public class OrderDto
    {
        public int OrderId { get; set; } = 0;
        public int? UserId { get; set; }
        public string? Username { get; set; }
        public DateTime? OrderDate { get; set; }
        public string? Status { get; set; } = string.Empty;
        public decimal? TotalAmount { get; set; } = 0;
        public string? Types { get; set; } = "COD";
        public string? TypesDisplay { get; set; } = string.Empty;
        public string? Gencode { get; set; }
        public DateTime? CreatedAt { get; set; }
        public DateTime? UpdatedAt { get; set; }
        public int? CreatedBy { get; set; }
        public int? UpdatedBy { get; set; }
        public List<OrderDetailDto> OrderDetails { get; set; } = new List<OrderDetailDto>();
    }

    /// <summary>
    /// DTO cho tạo đơn hàng mới
    /// </summary>
    public class OrderCreateDto
    {
        [Required(ErrorMessage = "User ID là bắt buộc")]
        public int UserId { get; set; }

        [Required(ErrorMessage = "Loại thanh toán là bắt buộc")]
        [StringLength(20, ErrorMessage = "Loại thanh toán không được vượt quá 20 ký tự")]
        public string Types { get; set; } = "COD";

        public string? Status { get; set; } = "pending";
        public decimal? TotalAmount { get; set; } = 0;
        public List<OrderDetailCreateDto> OrderDetails { get; set; } = new List<OrderDetailCreateDto>();
    }

    /// <summary>
    /// DTO cho cập nhật đơn hàng
    /// </summary>
    public class OrderUpdateDto
    {
        public string? Status { get; set; }
        [StringLength(20, ErrorMessage = "Loại thanh toán không được vượt quá 20 ký tự")]
        public string? Types { get; set; }
        public decimal? TotalAmount { get; set; }
    }

    /// <summary>
    /// DTO cho chi tiết đơn hàng
    /// </summary>
    public class OrderDetailDto
    {
        public int OrderId { get; set; } = 0;
        public int ProductId { get; set; } = 0;
        public string ProductName { get; set; } = string.Empty;
        public int Quantity { get; set; } = 0;
        public decimal PriceAtPurchase { get; set; } = 0;
        public string? ImageUrl { get; set; }
        public DateTime? CreatedAt { get; set; }
        public DateTime? UpdatedAt { get; set; }
        public int? CreatedBy { get; set; }
        public int? UpdatedBy { get; set; }
    }

    /// <summary>
    /// DTO cho tạo chi tiết đơn hàng
    /// </summary>
    public class OrderDetailCreateDto
    {
        [Required(ErrorMessage = "Product ID là bắt buộc")]
        public int ProductId { get; set; }

        [Required(ErrorMessage = "Số lượng là bắt buộc")]
        [Range(1, int.MaxValue, ErrorMessage = "Số lượng phải lớn hơn 0")]
        public int Quantity { get; set; }

        [Required(ErrorMessage = "Giá tại thời điểm mua là bắt buộc")]
        [Range(0.01, double.MaxValue, ErrorMessage = "Giá phải lớn hơn 0")]
        public decimal PriceAtPurchase { get; set; }

        public string? ImageUrl { get; set; }
    }

    /// <summary>
    /// DTO cho cập nhật chi tiết đơn hàng
    /// </summary>
    public class OrderDetailUpdateDto
    {
        [Range(1, int.MaxValue, ErrorMessage = "Số lượng phải lớn hơn 0")]
        public int? Quantity { get; set; }

        [Range(0.01, double.MaxValue, ErrorMessage = "Giá phải lớn hơn 0")]
        public decimal? PriceAtPurchase { get; set; }

        public string? ImageUrl { get; set; }
    }
}
