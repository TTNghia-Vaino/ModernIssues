using System.ComponentModel.DataAnnotations;

namespace ModernIssues.Models.DTOs
{
    /// <summary>
    /// DTO cho test checkout - tạo đơn hàng test với product và quantity trực tiếp
    /// </summary>
    public class TestCheckoutDto
    {
        [Required(ErrorMessage = "Product ID là bắt buộc")]
        public int ProductId { get; set; }

        [Range(1, int.MaxValue, ErrorMessage = "Số lượng phải lớn hơn 0")]
        public int Quantity { get; set; } = 1;

        [Required(ErrorMessage = "Loại thanh toán là bắt buộc")]
        [StringLength(20, ErrorMessage = "Loại thanh toán không được vượt quá 20 ký tự")]
        public string PaymentType { get; set; } = "Transfer";
    }
}

