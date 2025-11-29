using ModernIssues.Models.DTOs;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using ModernIssues.Repositories.Interface;
using ModernIssues.Repositories.Service;
using ModernIssues.Models.Entities;
using Microsoft.EntityFrameworkCore;



namespace ModernIssues.Repositories
{

    public class ProductRepository : IProductRepository
    {
        private readonly WebDbContext _context;

        public ProductRepository(WebDbContext context)
        {
            _context = context;
        }

        /// <summary>
        /// Tạo serial numbers cho sản phẩm khi nhập hàng vào kho
        /// Đảm bảo serial number là unique bằng cách sử dụng timestamp với milliseconds và index
        /// Chỉ dùng cho GenerateSerialsForAllProductsAsync - các method khác sẽ tự động tạo serial qua SaveChangesAsync
        /// </summary>
        private async Task CreateProductSerialsAsync(int productId, int quantity, int adminId)
        {
            var serials = new List<product_serial>();
            var timestamp = DateTime.UtcNow;
            var baseTimestamp = timestamp.ToString("yyyyMMddHHmmssfff");

            for (int i = 0; i < quantity; i++)
            {
                // Tạo serial number unique: PRD-{productId}-{timestamp}-{index}
                // Sử dụng timestamp với milliseconds và index để đảm bảo unique
                // Format: PRD-{productId}-{yyyyMMddHHmmssfff}-{index:000000}
                var serialNumber = $"PRD-{productId}-{baseTimestamp}-{(i + 1):D6}";

                serials.Add(new product_serial
                {
                    product_id = productId,
                    serial_number = serialNumber,
                    import_date = timestamp,
                    is_sold = false, // false = chưa bán, true = đã bán
                    is_disabled = false, // false = còn bảo hành, true = hết bảo hành
                    created_at = timestamp,
                    updated_at = timestamp,
                    created_by = adminId,
                    updated_by = adminId
                });
            }

            _context.product_serials.AddRange(serials);
            await _context.SaveChangesAsync();
        }

        // --- CREATE ---
        // Sử dụng EF Core để tự động trigger SaveChangesAsync và tạo serial
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
                created_at = DateTime.UtcNow,
                updated_at = DateTime.UtcNow,
                is_disabled = false
            };

            _context.products.Add(newProduct);
            // SaveChangesAsync sẽ tự động tạo serial nếu stock > 0
            await _context.SaveChangesAsync();

            // Lấy category name
            var categoryName = await _context.categories
                .Where(c => c.category_id == product.CategoryId)
                .Select(c => c.category_name)
                .FirstOrDefaultAsync();

            return new ProductDto
            {
                ProductId = newProduct.product_id,
                CategoryId = newProduct.category_id ?? 0,
                ProductName = newProduct.product_name ?? string.Empty,
                Description = newProduct.description ?? string.Empty,
                Price = newProduct.price,
                Stock = newProduct.stock ?? 0,
                WarrantyPeriod = newProduct.warranty_period ?? 0,
                ImageUrl = newProduct.image_url ?? "default.jpg",
                OnPrices = newProduct.on_prices ?? 0,
                CategoryName = categoryName ?? "Chưa phân loại"
            };
        }

        // --- READ ONE ---
        public async Task<ProductDto> GetByIdAsync(int productId)
        {
            var product = await _context.products
                .Where(p => p.product_id == productId && p.is_disabled == false)
                .Select(p => new ProductDto
                {
                    ProductId = p.product_id,
                    CategoryId = p.category_id ?? 0,
                    ProductName = p.product_name ?? string.Empty,
                    Description = p.description ?? string.Empty,
                    Price = p.price,
                    Stock = p.stock ?? 0,
                    WarrantyPeriod = p.warranty_period ?? 0,
                    ImageUrl = p.image_url ?? "default.jpg",
                    OnPrices = p.on_prices ?? 0,
                    CategoryName = p.category_id.HasValue 
                        ? _context.categories
                            .Where(c => c.category_id == p.category_id)
                            .Select(c => c.category_name)
                            .FirstOrDefault() ?? "Chưa phân loại"
                        : "Chưa phân loại"
                })
                .FirstOrDefaultAsync();

            return product ?? new ProductDto();
        }

        // --- READ ALL ---
        public async Task<IEnumerable<ProductDto>> GetAllAsync(int limit, int offset, int? categoryId, string search)
        {
            var query = from p in _context.products
                        join c in _context.categories on p.category_id equals c.category_id into categoryGroup
                        from c in categoryGroup.DefaultIfEmpty()
                        where p.is_disabled == false
                        select new { p, CategoryName = c != null ? c.category_name : null };

            // Nếu có categoryId -> lọc theo
            if (categoryId.HasValue && categoryId.Value > 0)
            {
                query = query.Where(x => x.p.category_id == categoryId.Value);
            }

            // Nếu có từ khóa tìm kiếm -> thêm điều kiện search
            if (!string.IsNullOrWhiteSpace(search))
            {
                var searchLower = search.ToLower();
                query = query.Where(x => 
                    x.p.product_name.ToLower().Contains(searchLower) ||
                    (x.CategoryName != null && x.CategoryName.ToLower().Contains(searchLower))
                );
            }

            var products = await query
                .OrderByDescending(x => x.p.product_id)
                .Skip(offset)
                .Take(limit)
                .Select(x => new ProductDto
                {
                    ProductId = x.p.product_id,
                    CategoryId = x.p.category_id ?? 0,
                    ProductName = x.p.product_name ?? string.Empty,
                    Description = x.p.description ?? string.Empty,
                    Price = x.p.price,
                    Stock = x.p.stock ?? 0,
                    WarrantyPeriod = x.p.warranty_period ?? 0,
                    ImageUrl = x.p.image_url ?? "default.jpg",
                    OnPrices = x.p.on_prices ?? 0,
                    CategoryName = x.CategoryName ?? "Chưa phân loại"
                })
                .ToListAsync();

            return products;
        }

        // --- COUNT ALL (Hỗ trợ phân trang) ---
        public async Task<int> CountAllAsync(int? categoryId, string search)
        {
            var query = from p in _context.products
                        join c in _context.categories on p.category_id equals c.category_id into categoryGroup
                        from c in categoryGroup.DefaultIfEmpty()
                        where p.is_disabled == false
                        select new { p, CategoryName = c != null ? c.category_name : null };

            if (categoryId.HasValue)
            {
                query = query.Where(x => x.p.category_id == categoryId.Value);
            }

            if (!string.IsNullOrEmpty(search))
            {
                var searchLower = search.ToLower();
                query = query.Where(x => 
                    x.p.product_name.ToLower().Contains(searchLower) ||
                    (x.CategoryName != null && x.CategoryName.ToLower().Contains(searchLower))
                );
            }

            return await query.CountAsync();
        }

        // --- UPDATE ---
        // Sử dụng EF Core để tự động trigger SaveChangesAsync và tạo serial
        public async Task<ProductDto> UpdateAsync(int productId, ProductCreateUpdateDto product, int adminId)
        {
            var existingProduct = await _context.products
                .FirstOrDefaultAsync(p => p.product_id == productId);

            if (existingProduct == null)
            {
                return new ProductDto();
            }

            // Cập nhật các thuộc tính
            existingProduct.category_id = product.CategoryId;
            existingProduct.product_name = product.ProductName;
            existingProduct.description = product.Description;
            existingProduct.price = product.Price;
            existingProduct.stock = product.Stock;
            existingProduct.warranty_period = product.WarrantyPeriod;
            existingProduct.image_url = product.ImageUrl;
            existingProduct.updated_at = DateTime.UtcNow;
            existingProduct.updated_by = adminId;

            // SaveChangesAsync sẽ tự động kiểm tra và tạo serial nếu stock tăng
            await _context.SaveChangesAsync();

            // Lấy category name
            var categoryName = await _context.categories
                .Where(c => c.category_id == product.CategoryId)
                .Select(c => c.category_name)
                .FirstOrDefaultAsync();

            return new ProductDto
            {
                ProductId = existingProduct.product_id,
                CategoryId = existingProduct.category_id ?? 0,
                ProductName = existingProduct.product_name ?? string.Empty,
                Description = existingProduct.description ?? string.Empty,
                Price = existingProduct.price,
                Stock = existingProduct.stock ?? 0,
                WarrantyPeriod = existingProduct.warranty_period ?? 0,
                ImageUrl = existingProduct.image_url ?? "default.jpg",
                OnPrices = existingProduct.on_prices ?? 0,
                CategoryName = categoryName ?? "Chưa phân loại"
            };
        }

        // --- DELETE (Soft Delete) ---
        public async Task<bool> SoftDeleteAsync(int productId, int adminId)
        {
            var product = await _context.products
                .FirstOrDefaultAsync(p => p.product_id == productId);

            if (product == null)
            {
                return false;
            }

            product.is_disabled = true;
            product.updated_at = DateTime.UtcNow;
            product.updated_by = adminId;

            var rowsAffected = await _context.SaveChangesAsync();
            return rowsAffected > 0;
        }

        // --- REACTIVATE (Kích hoạt lại sản phẩm) ---
        public async Task<bool> ReactivateAsync(int productId, int adminId)
        {
            var product = await _context.products
                .FirstOrDefaultAsync(p => p.product_id == productId && p.is_disabled == true);

            if (product == null)
            {
                return false;
            }

            product.is_disabled = false;
            product.updated_at = DateTime.UtcNow;
            product.updated_by = adminId;

            var rowsAffected = await _context.SaveChangesAsync();
            return rowsAffected > 0;
        }

        // --- GENERATE SERIALS FOR ALL PRODUCTS (Tạo serial cho tất cả sản phẩm hiện có) ---
        /// <summary>
        /// Tạo serial numbers cho tất cả sản phẩm có stock > 0
        /// Đếm số serial hiện có và tạo thêm serial cho phần thiếu
        /// </summary>
        public async Task<int> GenerateSerialsForAllProductsAsync(int adminId)
        {
            int totalSerialsCreated = 0;

            // Lấy tất cả sản phẩm có stock > 0
            var products = await _context.products
                .Where(p => p.stock > 0 && (p.is_disabled == null || p.is_disabled == false))
                .OrderBy(p => p.product_id)
                .Select(p => new { p.product_id, p.product_name, p.stock })
                .ToListAsync();

            foreach (var product in products)
            {
                var productId = product.product_id;
                var currentStock = product.stock ?? 0;

                if (currentStock <= 0) continue;

                // Đếm số serial hiện có cho sản phẩm này (chưa bán: is_sold = false, còn bảo hành: is_disabled = false)
                var existingSerialsCount = await _context.product_serials
                    .CountAsync(ps => ps.product_id == productId 
                        && (ps.is_sold == null || ps.is_sold == false)
                        && (ps.is_disabled == null || ps.is_disabled == false));

                // Tính số serial cần tạo thêm
                var serialsNeeded = currentStock - existingSerialsCount;

                if (serialsNeeded > 0)
                {
                    // Tạo serial cho phần thiếu
                    await CreateProductSerialsAsync(productId, serialsNeeded, adminId);
                    totalSerialsCreated += serialsNeeded;
                }
            }

            return totalSerialsCreated;
        }
    }
}