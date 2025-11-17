using ModernIssues.Models.DTOs;
using ModernIssues.Repositories;
using System;
using System.Collections.Generic;
using System.Threading.Tasks;

namespace ModernIssues.Services
{
    public interface ICategoryService
    {
        Task<List<CategoryDto>> GetAllCategoriesAsync();
        Task<List<CategoryTreeDto>> GetCategoryTreeAsync();
        Task<CategoryDto?> GetCategoryByIdAsync(int categoryId);
        Task<CategoryDto> CreateCategoryAsync(CategoryCreateDto category, int adminId);
        Task<CategoryDto?> UpdateCategoryAsync(int categoryId, CategoryUpdateDto category, int adminId);
        Task<bool> DeleteCategoryAsync(int categoryId, int adminId);
    }

    public class CategoryService : ICategoryService
    {
        private readonly ICategoryRepository _categoryRepository;

        public CategoryService(ICategoryRepository categoryRepository)
        {
            _categoryRepository = categoryRepository;
        }

        public async Task<List<CategoryDto>> GetAllCategoriesAsync()
        {
            return await _categoryRepository.GetAllCategoriesAsync();
        }

        public async Task<List<CategoryTreeDto>> GetCategoryTreeAsync()
        {
            var allCategories = await _categoryRepository.GetAllCategoriesAsync();
            return BuildCategoryTree(allCategories);
        }

        public async Task<CategoryDto?> GetCategoryByIdAsync(int categoryId)
        {
            return await _categoryRepository.GetCategoryByIdAsync(categoryId);
        }

        public async Task<CategoryDto> CreateCategoryAsync(CategoryCreateDto category, int adminId)
        {
            // Validate parent category exists if specified
            if (category.ParentId.HasValue && category.ParentId.Value > 0)
            {
                var parentCategory = await _categoryRepository.GetCategoryByIdAsync(category.ParentId.Value);
                if (parentCategory == null)
                {
                    throw new ArgumentException($"Không tìm thấy danh mục cha với ID: {category.ParentId}");
                }
            }

            return await _categoryRepository.CreateCategoryAsync(category, adminId);
        }

        public async Task<CategoryDto?> UpdateCategoryAsync(int categoryId, CategoryUpdateDto category, int adminId)
        {
            // Validate parent category exists if specified
            if (category.ParentId.HasValue && category.ParentId.Value > 0)
            {
                var parentCategory = await _categoryRepository.GetCategoryByIdAsync(category.ParentId.Value);
                if (parentCategory == null)
                {
                    throw new ArgumentException($"Không tìm thấy danh mục cha với ID: {category.ParentId}");
                }

                // Prevent circular reference
                if (category.ParentId.Value == categoryId)
                {
                    throw new ArgumentException("Danh mục không thể là cha của chính nó");
                }
            }

            return await _categoryRepository.UpdateCategoryAsync(categoryId, category, adminId);
        }

        public async Task<bool> DeleteCategoryAsync(int categoryId, int adminId)
        {
            // Check if category has children
            var hasChildren = await _categoryRepository.HasChildrenAsync(categoryId);
            if (hasChildren)
            {
                throw new ArgumentException("Không thể xóa danh mục có danh mục con. Vui lòng xóa các danh mục con trước.");
            }

            // Check if category has products
            var hasProducts = await _categoryRepository.HasProductsAsync(categoryId);
            if (hasProducts)
            {
                throw new ArgumentException("Không thể xóa danh mục có sản phẩm. Vui lòng di chuyển hoặc xóa các sản phẩm trước.");
            }

            return await _categoryRepository.DeleteCategoryAsync(categoryId, adminId);
        }

        private List<CategoryTreeDto> BuildCategoryTree(List<CategoryDto> categories)
        {
            var categoryDict = new Dictionary<int, CategoryTreeDto>();
            var rootCategories = new List<CategoryTreeDto>();

            // Create dictionary for quick lookup
            foreach (var category in categories)
            {
                categoryDict[category.CategoryId] = new CategoryTreeDto
                {
                    CategoryId = category.CategoryId,
                    CategoryName = category.CategoryName,
                    ParentId = category.ParentId,
                    Children = new List<CategoryTreeDto>()
                };
            }

            // Build tree structure
            foreach (var category in categories)
            {
                var categoryNode = categoryDict[category.CategoryId];
                
                if (category.ParentId == null || category.ParentId == 0)
                {
                    // Root category
                    rootCategories.Add(categoryNode);
                }
                else
                {
                    // Child category
                    if (categoryDict.ContainsKey(category.ParentId.Value))
                    {
                        categoryDict[category.ParentId.Value].Children.Add(categoryNode);
                    }
                }
            }

            return rootCategories;
        }
    }
}
