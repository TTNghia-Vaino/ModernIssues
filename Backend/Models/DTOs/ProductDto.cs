using System.Text.Json.Serialization;
using System.Collections.Generic;

namespace ModernIssues.Models.DTOs
{
    // ============================================
    // 1. DTO cho Đầu vào (CREATE và UPDATE)
    // ============================================
    // DTO này được sử dụng cho cả CREATE và UPDATE.
    // Nó chỉ chứa các trường Admin được phép ghi vào DB.
    // KHÔNG CÓ ProductId (tự sinh) và KHÔNG CÓ OnPrices (tính toán riêng).
    public class ProductCreateUpdateDto 
    {
        public int CategoryId { get; set; }
        public string ProductName { get; set; }
        public string Description { get; set; }
        public decimal Price { get; set; }
        public int Stock { get; set; }
        public int WarrantyPeriod { get; set; }
        public string ImageUrl { get; set; }
    }

    // ============================================
    // 2. DTO cho Đầu ra (READ)
    // ============================================
    // DTO đầy đủ thông tin, kế thừa DTO đầu vào và bổ sung thông tin chỉ đọc.
    public class ProductDto : ProductCreateUpdateDto
    {
        // Thông tin định danh
        public int ProductId { get; set; }
        
        // Thông tin chỉ đọc (tính từ task khác)
        public decimal OnPrices { get; set; } 

        // Thông tin đọc thêm từ các bảng khác
        public string CategoryName { get; set; } 
        
        // Trạng thái vô hiệu hóa
        public bool IsDisabled { get; set; }
        

        // Trạng thái hiển thị (hết hàng, không hoạt động, đang hoạt động)
        public string StatusText { get; set; }
        
        // Màu sắc trạng thái (đỏ cho hết hàng, xám cho không hoạt động)
        public string StatusColor { get; set; }
        
        // Tùy chọn: Bạn có thể thêm các trường quản lý như CreatedAt, UpdatedAt
    }

    // ============================================
    // 3. Response cho READ ALL (Phân trang)
    // ============================================
    public class ProductListResponse
    {
        public int TotalCount { get; set; } // Tổng số lượng sản phẩm
        public int CurrentPage { get; set; } // Trang hiện tại
        public int Limit { get; set; } // Số lượng tối đa trên 1 trang
        public IEnumerable<ProductDto> Data { get; set; } // Dữ liệu sản phẩm trên trang này
    }

    // ============================================
    // 4. DTO cho Sản phẩm bán chạy
    // ============================================
    public class BestSellingProductDto : ProductDto
    {
        /// <summary>
        /// Tổng số lượng đã bán (từ các đơn hàng đã hoàn thành)
        /// </summary>
        public int TotalSold { get; set; }
    }
}