using ModernIssues.Models.DTOs;

namespace ModernIssues.Repositories.Service
{
    public interface IProductService
{
    // Cập nhật: Nhận ProductCreateUpdateDto cho CREATE và UPDATE
    Task<ProductDto> CreateProductAsync(ProductCreateUpdateDto product, int adminId); 
    
    Task<ProductDto> GetProductByIdAsync(int productId);
    Task<ProductListResponse> GetProductsAsync(int page, int limit, int? categoryId, string search);
    
    Task<ProductDto> UpdateProductAsync(int productId, ProductCreateUpdateDto product, int adminId); 
    
    Task<bool> SoftDeleteProductAsync(int productId, int adminId);
    
    Task<bool> ReactivateProductAsync(int productId, int adminId);
    
    Task<int> GenerateSerialsForAllProductsAsync(int adminId);
}
}