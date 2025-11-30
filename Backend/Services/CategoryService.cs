using ModernIssues.Models.DTOs;
using ModernIssues.Repositories;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;

namespace ModernIssues.Services
{
    public interface ICategoryService
    {
        Task<List<CategoryDto>> GetAllCategoriesAsync();
        Task<List<CategoryTreeDto>> GetCategoryTreeAsync();
        Task<List<CategoryTreeDto>> GetCategoryTreeFullAsync();
        Task<CategoryDto?> GetCategoryByIdAsync(int categoryId, bool includeDisabled = false);
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

        public async Task<CategoryDto?> GetCategoryByIdAsync(int categoryId, bool includeDisabled = false)
        {
            return await _categoryRepository.GetCategoryByIdAsync(categoryId, includeDisabled);
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
            // Validate that at least one field is being updated
            if (string.IsNullOrWhiteSpace(category.CategoryName) && !category.ParentId.HasValue && !category.IsDisabled.HasValue)
            {
                throw new ArgumentException("Phải cập nhật ít nhất một trường (tên danh mục, danh mục cha hoặc trạng thái)");
            }

            // Validate parent category exists if specified
            if (category.ParentId.HasValue && category.ParentId.Value > 0)
            {
                var parentCategory = await _categoryRepository.GetCategoryByIdAsync(category.ParentId.Value);
                if (parentCategory == null)
                {
                    throw new ArgumentException($"Không tìm thấy danh mục cha với ID: {category.ParentId}");
                }

                // Prevent circular reference - category cannot be parent of itself
                if (category.ParentId.Value == categoryId)
                {
                    throw new ArgumentException("Danh mục không thể là cha của chính nó");
                }

                // Prevent deep circular reference - check if new parent is a descendant of current category
                var allCategories = await _categoryRepository.GetAllCategoriesAsync();
                if (IsDescendantOf(categoryId, category.ParentId.Value, allCategories))
                {
                    throw new ArgumentException("Không thể di chuyển danh mục vào làm con của danh mục con của chính nó");
                }
            }
            else if (category.ParentId.HasValue && category.ParentId.Value == 0)
            {
                // Setting parent to 0 means removing parent (making it root)
                category.ParentId = null;
            }

            return await _categoryRepository.UpdateCategoryAsync(categoryId, category, adminId);
        }

        /// <summary>
        /// Check if potentialParentId is a descendant (child, grandchild, etc.) of categoryId
        /// </summary>
        private bool IsDescendantOf(int categoryId, int potentialParentId, List<CategoryDto> allCategories)
        {
            // Get all descendants of categoryId recursively
            var descendants = GetDescendants(categoryId, allCategories);
            return descendants.Contains(potentialParentId);
        }

        /// <summary>
        /// Get all descendant category IDs recursively
        /// </summary>
        private HashSet<int> GetDescendants(int categoryId, List<CategoryDto> allCategories)
        {
            var result = new HashSet<int>();
            var children = allCategories.Where(c => c.ParentId == categoryId).ToList();
            
            foreach (var child in children)
            {
                result.Add(child.CategoryId);
                // Recursively get descendants of children
                var childDescendants = GetDescendants(child.CategoryId, allCategories);
                result.UnionWith(childDescendants);
            }
            
            return result;
        }

        public async Task<bool> DeleteCategoryAsync(int categoryId, int adminId)
        {
            // Check if category has children
            var hasChildren = await _categoryRepository.HasChildrenAsync(categoryId);
            if (hasChildren)
            {
                throw new ArgumentException("Không thể xóa danh mục có danh mục con. Vui lòng xóa các danh mục con trước.");
            }

            // Check if category has active products (is_disabled != true)
            // Chỉ cho phép xóa khi:
            // 1. Không có sản phẩm nào trong danh mục
            // 2. HOẶC tất cả sản phẩm trong danh mục đều có is_disabled = true
            var hasActiveProducts = await _categoryRepository.HasActiveProductsAsync(categoryId);
            if (hasActiveProducts)
            {
                throw new ArgumentException("Không thể xóa danh mục có sản phẩm đang hoạt động. Vui lòng vô hiệu hóa hoặc di chuyển các sản phẩm trước.");
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
                    IsDisabled = category.IsDisabled,
                    Children = new List<CategoryTreeDto>()
                };
            }

            // Build tree structure recursively (supports unlimited levels)
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
                    // Child category - recursively find parent and add
                    AddToParent(categoryDict, categoryNode, category.ParentId.Value);
                }
            }

            return rootCategories;
        }

        private void AddToParent(Dictionary<int, CategoryTreeDto> categoryDict, CategoryTreeDto childNode, int parentId)
        {
            if (categoryDict.ContainsKey(parentId))
            {
                categoryDict[parentId].Children.Add(childNode);
            }
        }

        /// <summary>
        /// Build category tree with full hierarchy (supports unlimited levels)
        /// </summary>
        public async Task<List<CategoryTreeDto>> GetCategoryTreeFullAsync()
        {
            // Admin có thể xem tất cả categories (kể cả disabled)
            var allCategories = await _categoryRepository.GetAllCategoriesAsync(includeDisabled: true);
            return BuildCategoryTree(allCategories);
        }
    }
}
