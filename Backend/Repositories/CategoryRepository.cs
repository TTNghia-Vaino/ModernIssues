using ModernIssues.Models.DTOs;
using ModernIssues.Models.Entities;
using Microsoft.EntityFrameworkCore;
using System;
using System.Collections.Generic;
using System.Threading.Tasks;
using System.Linq;

namespace ModernIssues.Repositories
{
    public interface ICategoryRepository
    {
        Task<List<CategoryDto>> GetAllCategoriesAsync(bool includeDisabled = false);
        Task<CategoryDto?> GetCategoryByIdAsync(int categoryId, bool includeDisabled = false);
        Task<CategoryDto> CreateCategoryAsync(CategoryCreateDto category, int adminId);
        Task<CategoryDto?> UpdateCategoryAsync(int categoryId, CategoryUpdateDto category, int adminId);
        Task<bool> DeleteCategoryAsync(int categoryId, int adminId);
        Task<bool> HasChildrenAsync(int categoryId);
        Task<bool> HasProductsAsync(int categoryId);
        Task<bool> HasActiveProductsAsync(int categoryId);
        Task<bool> HasAnyProductsAsync(int categoryId);
    }

    public class CategoryRepository : ICategoryRepository
    {
        private readonly WebDbContext _context;

        public CategoryRepository(WebDbContext context)
        {
            _context = context;
        }

        public async Task<List<CategoryDto>> GetAllCategoriesAsync(bool includeDisabled = false)
        {
            var query = _context.categories
                .Include(c => c.parent)
                .AsQueryable();

            // Ẩn các danh mục đã bị vô hiệu hóa (trừ khi admin yêu cầu xem tất cả)
            if (!includeDisabled)
            {
                query = query.Where(c => c.is_disabled == null || c.is_disabled == false);
            }

            var categories = await query
                .OrderBy(c => c.parent_id)
                .ThenBy(c => c.category_name)
                .Select(c => new CategoryDto
                {
                    CategoryId = c.category_id,
                    CategoryName = c.category_name,
                    ParentId = c.parent_id,
                    ParentName = c.parent != null ? c.parent.category_name : null,
                    CreatedAt = c.created_at,
                    UpdatedAt = c.updated_at,
                    CreatedBy = c.created_by,
                    UpdatedBy = c.updated_by,
                    IsDisabled = c.is_disabled
                })
                .ToListAsync();

            return categories;
        }

        public async Task<CategoryDto?> GetCategoryByIdAsync(int categoryId, bool includeDisabled = false)
        {
            var query = _context.categories
                .Include(c => c.parent)
                .Where(c => c.category_id == categoryId)
                .AsQueryable();

            // Ẩn các danh mục đã bị vô hiệu hóa (trừ khi admin yêu cầu xem tất cả)
            if (!includeDisabled)
            {
                query = query.Where(c => c.is_disabled == null || c.is_disabled == false);
            }

            var category = await query
                .Select(c => new CategoryDto
                {
                    CategoryId = c.category_id,
                    CategoryName = c.category_name,
                    ParentId = c.parent_id,
                    ParentName = c.parent != null ? c.parent.category_name : null,
                    CreatedAt = c.created_at,
                    UpdatedAt = c.updated_at,
                    CreatedBy = c.created_by,
                    UpdatedBy = c.updated_by,
                    IsDisabled = c.is_disabled
                })
                .FirstOrDefaultAsync();

            return category;
        }

        public async Task<CategoryDto> CreateCategoryAsync(CategoryCreateDto category, int adminId)
        {
            if (category == null)
            {
                throw new ArgumentNullException(nameof(category), "Category data cannot be null");
            }

            if (string.IsNullOrWhiteSpace(category.CategoryName))
            {
                throw new ArgumentException("Category name is required", nameof(category.CategoryName));
            }

            var newCategory = new category
            {
                category_id = category.CategoryId ?? 0, // Sử dụng CategoryId nếu có, nếu không thì để 0 (database sẽ auto-increment)
                category_name = category.CategoryName.Trim(),
                parent_id = category.ParentId,
                created_at = DateTime.UtcNow,
                created_by = adminId
            };

            _context.categories.Add(newCategory);
            await _context.SaveChangesAsync();

            // Reload with parent information
            return await GetCategoryByIdAsync(newCategory.category_id) ?? new CategoryDto();
        }

        public async Task<CategoryDto?> UpdateCategoryAsync(int categoryId, CategoryUpdateDto category, int adminId)
        {
            if (category == null)
            {
                throw new ArgumentNullException(nameof(category), "Category data cannot be null");
            }

            var existingCategory = await _context.categories.FindAsync(categoryId);
            if (existingCategory == null)
            {
                return null;
            }

            if (!string.IsNullOrEmpty(category.CategoryName))
            {
                existingCategory.category_name = category.CategoryName.Trim();
            }

            // Update ParentId if provided in the DTO
            // Note: In JSON, if ParentId is not sent, it will be null
            // If ParentId is null, it means "remove parent" (set to root level)
            // If ParentId has a value, it means "set this parent"
            // We always update ParentId when the DTO is provided, even if null
            // This allows removing parent by sending null
            existingCategory.parent_id = category.ParentId;

            // Update IsDisabled if provided
            if (category.IsDisabled.HasValue)
            {
                existingCategory.is_disabled = category.IsDisabled.Value;
            }

            existingCategory.updated_at = DateTime.UtcNow;
            existingCategory.updated_by = adminId;

            await _context.SaveChangesAsync();

            // Admin có thể xem category ngay cả khi đã bị vô hiệu hóa
            return await GetCategoryByIdAsync(categoryId, includeDisabled: true);
        }

        public async Task<bool> DeleteCategoryAsync(int categoryId, int adminId)
        {
            var category = await _context.categories.FindAsync(categoryId);
            if (category == null)
            {
                return false;
            }

            // Soft delete - just update timestamps
            category.updated_at = DateTime.UtcNow;
            category.updated_by = adminId;

            await _context.SaveChangesAsync();
            return true;
        }

        public async Task<bool> HasChildrenAsync(int categoryId)
        {
            return await _context.categories
                .AnyAsync(c => c.parent_id == categoryId);
        }

        public async Task<bool> HasProductsAsync(int categoryId)
        {
            return await _context.products
                .AnyAsync(p => p.category_id == categoryId && p.is_disabled != true);
        }

        /// <summary>
        /// Kiểm tra xem danh mục có sản phẩm đang hoạt động (is_disabled != true) không
        /// Trả về true nếu có ít nhất 1 sản phẩm đang hoạt động
        /// </summary>
        public async Task<bool> HasActiveProductsAsync(int categoryId)
        {
            return await _context.products
                .AnyAsync(p => p.category_id == categoryId && (p.is_disabled == null || p.is_disabled == false));
        }

        /// <summary>
        /// Kiểm tra xem danh mục có sản phẩm nào không (kể cả đã bị vô hiệu hóa)
        /// </summary>
        public async Task<bool> HasAnyProductsAsync(int categoryId)
        {
            return await _context.products
                .AnyAsync(p => p.category_id == categoryId);
        }
    }
}
