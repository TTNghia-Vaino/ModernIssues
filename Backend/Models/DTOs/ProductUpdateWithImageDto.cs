using Microsoft.AspNetCore.Http;

namespace ModernIssues.Models.DTOs
{
    public class ProductUpdateWithImageDto
    {
        public string ProductName { get; set; } = string.Empty;
        public string Description { get; set; } = string.Empty;
        public decimal Price { get; set; }
        public int CategoryId { get; set; }
        public int Stock { get; set; }
        public int WarrantyPeriod { get; set; }
        public IFormFile? ImageFile { get; set; }
        public string? CurrentImageUrl { get; set; } // Ảnh hiện tại (không bắt buộc)
        /// <summary>
        /// Ảnh thứ 2 của sản phẩm
        /// </summary>
        public IFormFile? ImageFile2 { get; set; }
        /// <summary>
        /// Ảnh thứ 3 của sản phẩm
        /// </summary>
        public IFormFile? ImageFile3 { get; set; }
        /// <summary>
        /// Ảnh thứ 2 hiện tại (không bắt buộc)
        /// </summary>
        public string? CurrentImageUrl2 { get; set; }
        /// <summary>
        /// Ảnh thứ 3 hiện tại (không bắt buộc)
        /// </summary>
        public string? CurrentImageUrl3 { get; set; }
        /// <summary>
        /// Thông số kỹ thuật của sản phẩm (lưu dưới dạng text)
        /// Format: "RAM<bold>: 36GB ; CPU<bold>: Chip intel core i3 8 nhân"
        /// </summary>
        public string? Specifications { get; set; }
        /// <summary>
        /// Thương hiệu của sản phẩm
        /// </summary>
        public string? Brand { get; set; }
    }
}
