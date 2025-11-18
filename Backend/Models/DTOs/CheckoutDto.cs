using System.ComponentModel.DataAnnotations;

namespace ModernIssues.Models.DTOs
{
    /// <summary>
    /// DTO cho checkout - tạo đơn hàng từ giỏ hàng
    /// </summary>
    public class CheckoutDto
    {
        [Required(ErrorMessage = "Loại thanh toán là bắt buộc")]
        [StringLength(20, ErrorMessage = "Loại thanh toán không được vượt quá 20 ký tự")]
        public string PaymentType { get; set; } = "COD";
    }
}

