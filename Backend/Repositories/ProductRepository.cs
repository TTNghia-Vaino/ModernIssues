using ModernIssues.Models.DTOs;
using ModernIssues.Models.Entities;
using ModernIssues.Repositories.Interface;
using Microsoft.EntityFrameworkCore;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;

namespace ModernIssues.Repositories
{
    public class ProductRepository : IProductRepository
    {
        private readonly WebDbContext _context;

        public ProductRepository(WebDbContext context)
        {
            _context = context;
        }

        // --- CREATE ---
        public async Task<ProductDto> CreateAsync(ProductCreateUpdateDto product, int adminId)
        {
            var newProduct = new product
            {
                category_id = product.CategoryId,
                product_name = product.ProductName,
                description = product.Description,
                price = product.Price,
                stock = product.Stock,
                warranty_period = product.WarrantyPeriod,
                image_url = product.ImageUrl,
                created_by = adminId,
                updated_by = adminId,
                is_disabled = false,
                created_at = DateTime.UtcNow,
                updated_at = DateTime.UtcNow
            };

            _context.products.Add(newProduct);
            await _context.SaveChangesAsync();

            // Load category để lấy CategoryName
            await _context.Entry(newProduct)
                .Reference(p => p.category)
                .LoadAsync();

            return MapToProductDto(newProduct);
        }

        // --- READ ONE ---
        public async Task<ProductDto> GetByIdAsync(int productId)
        {
            var product = await _context.products
                .Include(p => p.category)
                .Where(p => p.product_id == productId && p.is_disabled != true)
                .FirstOrDefaultAsync();

            if (product == null)
                return null;

            return MapToProductDto(product);
        }

        // --- READ ALL ---
        public async Task<IEnumerable<ProductDto>> GetAllAsync(int limit, int offset, int? categoryId, string search)
        {
            var query = _context.products
                .Include(p => p.category)
                .Where(p => p.is_disabled != true)
                .AsQueryable();

            // Filter by category
            if (categoryId.HasValue && categoryId.Value > 0)
            {
                query = query.Where(p => p.category_id == categoryId.Value);
            }

            // Search filter
            if (!string.IsNullOrWhiteSpace(search))
            {
                query = query.Where(p => 
                    EF.Functions.ILike(p.product_name, $"%{search}%") ||
                    (p.category != null && EF.Functions.ILike(p.category.category_name, $"%{search}%")));
            }

            var products = await query
                .OrderByDescending(p => p.product_id)
                .Skip(offset)
                .Take(limit)
                .ToListAsync();

            return products.Select(MapToProductDto);
        }

        // --- COUNT ALL (Hỗ trợ phân trang) ---
        public async Task<int> CountAllAsync(int? categoryId, string search)
        {
            var query = _context.products
                .Where(p => p.is_disabled != true)
                .AsQueryable();

            if (categoryId.HasValue && categoryId.Value > 0)
            {
                query = query.Where(p => p.category_id == categoryId.Value);
            }

            if (!string.IsNullOrWhiteSpace(search))
            {
                query = query.Where(p => EF.Functions.ILike(p.product_name, $"%{search}%"));
            }

            return await query.CountAsync();
        }

        // --- UPDATE ---
        public async Task<ProductDto> UpdateAsync(int productId, ProductCreateUpdateDto product, int adminId)
        {
            var existingProduct = await _context.products
                .Include(p => p.category)
                .Where(p => p.product_id == productId)
                .FirstOrDefaultAsync();

            if (existingProduct == null)
                return null;

            // Update fields
            existingProduct.category_id = product.CategoryId;
            existingProduct.product_name = product.ProductName;
            existingProduct.description = product.Description;
            existingProduct.price = product.Price;
            existingProduct.stock = product.Stock;
            existingProduct.warranty_period = product.WarrantyPeriod;
            existingProduct.image_url = product.ImageUrl;
            existingProduct.updated_by = adminId;
            existingProduct.updated_at = DateTime.UtcNow;

            // Reload category if category_id changed
            if (existingProduct.category_id != product.CategoryId)
            {
                await _context.Entry(existingProduct)
                    .Reference(p => p.category)
                    .LoadAsync();
            }

            await _context.SaveChangesAsync();

            return MapToProductDto(existingProduct);
        }

        // --- DELETE (Soft Delete) ---
        public async Task<bool> SoftDeleteAsync(int productId, int adminId)
        {
            var product = await _context.products
                .Where(p => p.product_id == productId)
                .FirstOrDefaultAsync();

            if (product == null)
                return false;

            product.is_disabled = true;
            product.updated_at = DateTime.UtcNow;
            product.updated_by = adminId;

            await _context.SaveChangesAsync();
            return true;
        }

        // Helper method to map product entity to ProductDto
        private ProductDto MapToProductDto(product p)
        {
            return new ProductDto
            {
                ProductId = p.product_id,
                CategoryId = p.category_id ?? 0,
                ProductName = p.product_name,
                Description = p.description ?? "",
                Price = p.price,
                Stock = p.stock ?? 0,
                WarrantyPeriod = p.warranty_period ?? 0,
                ImageUrl = p.image_url ?? "",
                OnPrices = p.on_prices ?? 0,
                CategoryName = p.category?.category_name ?? "Chưa phân loại"
            };
        }
    }
}
