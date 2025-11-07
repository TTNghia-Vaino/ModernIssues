using ModernIssues.Models.DTOs;
using System.Collections.Generic;
using System.Threading.Tasks;

namespace ModernIssues.Repositories.Interface
{
    public interface ICategoryRepository
    {
        Task<List<CategoryDto>> GetAllCategoriesAsync();
        Task<CategoryDto?> GetCategoryByIdAsync(int categoryId);
        Task<CategoryDto> CreateCategoryAsync(CategoryCreateDto category, int adminId);
        Task<CategoryDto?> UpdateCategoryAsync(int categoryId, CategoryUpdateDto category, int adminId);
        Task<bool> DeleteCategoryAsync(int categoryId, int adminId);
        Task<bool> HasChildrenAsync(int categoryId);
        Task<bool> HasProductsAsync(int categoryId);
    }
}

