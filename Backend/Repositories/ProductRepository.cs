using Dapper;
using Npgsql;
using ModernIssues.Models.DTOs;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using ModernIssues.Repositories.Interface;
using ModernIssues.Repositories.Service;
using ModernIssues.Models.Entities;
using System.Data;
using Microsoft.EntityFrameworkCore;



namespace ModernIssues.Repositories
{

    public class ProductRepository : IProductRepository
    {
        private readonly string _connectionString;
        private readonly WebDbContext _context;

        public ProductRepository(IConfiguration configuration, WebDbContext context)
        {
            _connectionString = configuration.GetConnectionString("DefaultConnection")
                                ?? throw new InvalidOperationException("Connection string 'DefaultConnection' not found.");
            _context = context;
        }

        private IDbConnection Connection => new NpgsqlConnection(_connectionString);

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
                ProductName = newProduct.product_name,
                Description = newProduct.description,
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
            var sql = @"
                SELECT 
                    p.product_id AS ProductId,
                    p.category_id AS CategoryId,
                    p.product_name AS ProductName,
                    p.description AS Description,
                    p.price AS Price,
                    p.stock AS Stock,
                    p.warranty_period AS WarrantyPeriod,
                    p.image_url AS ImageUrl,
                    p.on_prices AS OnPrices,
                    COALESCE(c.category_name, 'Chưa phân loại') AS CategoryName
                FROM products p
                LEFT JOIN categories c ON p.category_id = c.category_id
                WHERE p.product_id = @ProductId AND p.is_disabled = FALSE;
            ";
            using (var db = Connection)
            {
                return await db.QueryFirstOrDefaultAsync<ProductDto>(sql, new { ProductId = productId });
            }
        }

        // --- READ ALL ---
        public async Task<IEnumerable<ProductDto>> GetAllAsync(int limit, int offset, int? categoryId, string search)
        {
            var whereConditions = new List<string>();
            var parameters = new DynamicParameters();

            // Phân trang
            parameters.Add("Limit", limit);
            parameters.Add("Offset", offset);

            // Chỉ lấy sản phẩm chưa bị ẩn
            whereConditions.Add("p.is_disabled = FALSE");

            // Nếu có categoryId -> lọc theo
            if (categoryId.HasValue && categoryId.Value > 0)
            {
                whereConditions.Add("p.category_id = @CategoryId");
                parameters.Add("CategoryId", categoryId.Value);
            }

            // Nếu có từ khóa tìm kiếm -> thêm điều kiện search
            if (!string.IsNullOrWhiteSpace(search))
            {
                whereConditions.Add("(p.product_name ILIKE @Search OR c.category_name ILIKE @Search)");
                parameters.Add("Search", $"%{search}%");
            }

            // Ghép WHERE cuối cùng
            var whereClause = whereConditions.Any() ? "WHERE " + string.Join(" AND ", whereConditions) : "";

            // Truy vấn chính
            var sql = $@"
                SELECT
                    p.product_id AS ProductId,
                    p.category_id AS CategoryId,
                    p.product_name AS ProductName,
                    p.description AS Description,
                    p.price AS Price,
                    p.stock AS Stock,
                    p.warranty_period AS WarrantyPeriod, 
                    p.image_url AS ImageUrl,
                    p.on_prices AS OnPrices,
                    COALESCE(c.category_name, 'Chưa phân loại') AS CategoryName
                FROM products p
                LEFT JOIN categories c ON p.category_id = c.category_id
                {whereClause}
                ORDER BY p.product_id DESC
                LIMIT @Limit OFFSET @Offset;
            ";

            using (var db = Connection)
            {
                return await db.QueryAsync<ProductDto>(sql, parameters);
            }
        }

        // --- COUNT ALL (Hỗ trợ phân trang) ---
        public async Task<int> CountAllAsync(int? categoryId, string search)
        {
            var whereConditions = new List<string> { "is_disabled = FALSE" };
            var parameters = new DynamicParameters();

            if (categoryId.HasValue)
            {
                whereConditions.Add("category_id = @CategoryId");
                parameters.Add("CategoryId", categoryId.Value);
            }
            if (!string.IsNullOrEmpty(search))
            {
                whereConditions.Add("product_name ILIKE @Search");
                parameters.Add("Search", $"%{search}%");
            }

            var whereClause = whereConditions.Any() ? "WHERE " + string.Join(" AND ", whereConditions) : "";

            var sql = $"SELECT COUNT(*) FROM products {whereClause};";

            using (var db = Connection)
            {
                return await db.ExecuteScalarAsync<int>(sql, parameters);
            }
        }

        // --- UPDATE ---
        // Sử dụng EF Core để tự động trigger SaveChangesAsync và tạo serial
        public async Task<ProductDto> UpdateAsync(int productId, ProductCreateUpdateDto product, int adminId)
        {
            var existingProduct = await _context.products
                .FirstOrDefaultAsync(p => p.product_id == productId);

            if (existingProduct == null)
            {
                return null;
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
                ProductName = existingProduct.product_name,
                Description = existingProduct.description,
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
            var sql = @"
                UPDATE products
                SET is_disabled = TRUE, updated_at = CURRENT_TIMESTAMP, updated_by = @AdminId
                WHERE product_id = @ProductId;
            ";

            using (var db = Connection)
            {
                var rowsAffected = await db.ExecuteAsync(sql, new { ProductId = productId, AdminId = adminId });
                return rowsAffected > 0; // Trả về true nếu có ít nhất một dòng bị ảnh hưởng
            }
        }

        // --- REACTIVATE (Kích hoạt lại sản phẩm) ---
        public async Task<bool> ReactivateAsync(int productId, int adminId)
        {
            var sql = @"
                UPDATE products
                SET is_disabled = FALSE, updated_at = CURRENT_TIMESTAMP, updated_by = @AdminId
                WHERE product_id = @ProductId AND is_disabled = TRUE;
            ";

            using (var db = Connection)
            {
                var rowsAffected = await db.ExecuteAsync(sql, new { ProductId = productId, AdminId = adminId });
                return rowsAffected > 0; // Trả về true nếu có ít nhất một dòng bị ảnh hưởng
            }
        }

        // --- GENERATE SERIALS FOR ALL PRODUCTS (Tạo serial cho tất cả sản phẩm hiện có) ---
        /// <summary>
        /// Tạo serial numbers cho tất cả sản phẩm có stock > 0
        /// Đếm số serial hiện có và tạo thêm serial cho phần thiếu
        /// </summary>
        public async Task<int> GenerateSerialsForAllProductsAsync(int adminId)
        {
            int totalSerialsCreated = 0;

            using (var db = Connection)
            {
                // Lấy tất cả sản phẩm có stock > 0
                var productsSql = @"
                    SELECT product_id, product_name, stock 
                    FROM products 
                    WHERE stock > 0 AND (is_disabled IS NULL OR is_disabled = FALSE)
                    ORDER BY product_id;
                ";

                var products = await db.QueryAsync<(int product_id, string product_name, int? stock)>(productsSql);

                foreach (var product in products)
                {
                    var productId = product.product_id;
                    var currentStock = product.stock ?? 0;

                    if (currentStock <= 0) continue;

                    // Đếm số serial hiện có cho sản phẩm này (chưa bán: is_sold = false, còn bảo hành: is_disabled = false)
                    var existingSerialsSql = @"
                        SELECT COUNT(*) 
                        FROM product_serials 
                        WHERE product_id = @ProductId 
                        AND (is_sold IS NULL OR is_sold = FALSE)
                        AND (is_disabled IS NULL OR is_disabled = FALSE);
                    ";

                    var existingSerialsCount = await db.QueryFirstOrDefaultAsync<int>(
                        existingSerialsSql, 
                        new { ProductId = productId }
                    );

                    // Tính số serial cần tạo thêm
                    var serialsNeeded = currentStock - existingSerialsCount;

                    if (serialsNeeded > 0)
                    {
                        // Tạo serial cho phần thiếu
                        await CreateProductSerialsAsync(productId, serialsNeeded, adminId);
                        totalSerialsCreated += serialsNeeded;
                    }
                }
            }

            return totalSerialsCreated;
        }
    }
}