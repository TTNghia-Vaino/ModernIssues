using Microsoft.AspNetCore.Http;

namespace ModernIssues.Models.DTOs
{
    public class ProductWithImageDto
    {
        public string ProductName { get; set; } = string.Empty;
        public string Description { get; set; } = string.Empty;
        public decimal Price { get; set; }
        public int CategoryId { get; set; }
        public int Stock { get; set; }
        public int WarrantyPeriod { get; set; }
        public IFormFile? ImageFile { get; set; }
    }
}
