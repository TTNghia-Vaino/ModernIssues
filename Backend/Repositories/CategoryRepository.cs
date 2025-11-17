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
        Task<List<CategoryDto>> GetAllCategoriesAsync();
        Task<CategoryDto?> GetCategoryByIdAsync(int categoryId);
        Task<CategoryDto> CreateCategoryAsync(CategoryCreateDto category, int adminId);
        Task<CategoryDto?> UpdateCategoryAsync(int categoryId, CategoryUpdateDto category, int adminId);
        Task<bool> DeleteCategoryAsync(int categoryId, int adminId);
        Task<bool> HasChildrenAsync(int categoryId);
        Task<bool> HasProductsAsync(int categoryId);
    }

    public class CategoryRepository : ICategoryRepository
    {
        private readonly WebDbContext _context;

        public CategoryRepository(WebDbContext context)
        {
            _context = context;
        }

        public async Task<List<CategoryDto>> GetAllCategoriesAsync()
        {
            var categories = await _context.categories
                .Include(c => c.parent)
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
                    UpdatedBy = c.updated_by
                })
                .ToListAsync();

            return categories;
        }

        public async Task<CategoryDto?> GetCategoryByIdAsync(int categoryId)
        {
            var category = await _context.categories
                .Include(c => c.parent)
                .Where(c => c.category_id == categoryId)
                .Select(c => new CategoryDto
                {
                    CategoryId = c.category_id,
                    CategoryName = c.category_name,
                    ParentId = c.parent_id,
                    ParentName = c.parent != null ? c.parent.category_name : null,
                    CreatedAt = c.created_at,
                    UpdatedAt = c.updated_at,
                    CreatedBy = c.created_by,
                    UpdatedBy = c.updated_by
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

            // Luôn cập nhật ParentId (có thể là null để set về null)
            existingCategory.parent_id = category.ParentId;

            existingCategory.updated_at = DateTime.UtcNow;
            existingCategory.updated_by = adminId;

            await _context.SaveChangesAsync();

            return await GetCategoryByIdAsync(categoryId);
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
    }
}
