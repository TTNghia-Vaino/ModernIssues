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
    }
}
