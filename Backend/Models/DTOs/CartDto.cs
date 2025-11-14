using System;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;

namespace ModernIssues.Models.DTOs
{
    /// <summary>
    /// DTO cho thông tin giỏ hàng
    /// </summary>
    public class CartDto
    {
        public int UserId { get; set; } = 0;
        public string? Username { get; set; }
        public DateTime? CreatedAt { get; set; }
        public DateTime? UpdatedAt { get; set; }
        public List<CartItemDto> CartItems { get; set; } = new List<CartItemDto>();
        public decimal TotalAmount { get; set; } = 0;
        public int TotalItems { get; set; } = 0;
    }

    /// <summary>
    /// DTO cho chi tiết sản phẩm trong giỏ hàng
    /// </summary>
    public class CartItemDto
    {
        public int CartId { get; set; } = 0; // ID của dòng cart (mỗi dòng = 1 sản phẩm)
        public int ProductId { get; set; } = 0;
        public string ProductName { get; set; } = string.Empty;
        public string? ProductImage { get; set; }
        public int Quantity { get; set; } = 0;
        public decimal PriceAtAdd { get; set; } = 0;
        public decimal CurrentPrice { get; set; } = 0;
        public decimal SubTotal { get; set; } = 0;
        public DateTime? CreatedAt { get; set; }
        public DateTime? UpdatedAt { get; set; }
        public int? CreatedBy { get; set; }
        public int? UpdatedBy { get; set; }
    }

    /// <summary>
    /// DTO cho thêm sản phẩm vào giỏ hàng
    /// </summary>
    public class AddToCartDto
    {
        [Required(ErrorMessage = "Product ID là bắt buộc")]
        public int ProductId { get; set; }

        [Required(ErrorMessage = "Số lượng là bắt buộc")]
        [Range(1, int.MaxValue, ErrorMessage = "Số lượng phải lớn hơn 0")]
        public int Quantity { get; set; }
    }

    /// <summary>
    /// DTO cho cập nhật số lượng sản phẩm trong giỏ hàng
    /// </summary>
    public class UpdateCartItemDto
    {
        [Required(ErrorMessage = "Số lượng là bắt buộc")]
        [Range(1, int.MaxValue, ErrorMessage = "Số lượng phải lớn hơn 0")]
        public int Quantity { get; set; }
    }

    /// <summary>
    /// DTO cho tóm tắt giỏ hàng (không có chi tiết)
    /// </summary>
    public class CartSummaryDto
    {
        public int UserId { get; set; } = 0;
        public string? Username { get; set; }
        public decimal TotalAmount { get; set; } = 0;
        public int TotalItems { get; set; } = 0;
        public DateTime? UpdatedAt { get; set; }
    }
}

