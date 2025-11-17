using ModernIssues.Models.DTOs;

namespace ModernIssues.Repositories.Interface
{
    public interface IProductRepository
    {
        // CREATE
        Task<ProductDto> CreateAsync(ProductCreateUpdateDto product, int adminId);
        
        // READ
        Task<ProductDto> GetByIdAsync(int productId);
        Task<IEnumerable<ProductDto>> GetAllAsync(int limit, int offset, int? categoryId, string search);
        Task<int> CountAllAsync(int? categoryId, string search); // Hỗ trợ phân trang
        
        // UPDATE
        Task<ProductDto> UpdateAsync(int productId, ProductCreateUpdateDto product, int adminId);
        
        // DELETE (Soft Delete)
        Task<bool> SoftDeleteAsync(int productId, int adminId);
        
        // REACTIVATE (Kích hoạt lại sản phẩm)
        Task<bool> ReactivateAsync(int productId, int adminId);
    }
}