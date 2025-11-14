using Dapper;
using Npgsql;
using ModernIssues.Models.DTOs;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using ModernIssues.Repositories.Interface;
using ModernIssues.Repositories.Service;
using ModernIssues.Models.Entities;
using System.Data;



namespace ModernIssues.Repositories
{

    public class ProductRepository : IProductRepository
    {
        private readonly string _connectionString;

        public ProductRepository(IConfiguration configuration)
        {
            _connectionString = configuration.GetConnectionString("DefaultConnection")
                                ?? throw new InvalidOperationException("Connection string 'DefaultConnection' not found.");
        }

        private IDbConnection Connection => new NpgsqlConnection(_connectionString);

        // --- CREATE ---
        // File: Repositories/ProductRepository.cs

        public async Task<ProductDto> CreateAsync(ProductCreateUpdateDto product, int adminId)
        {
            var sql = @"
                WITH inserted_product AS (
                    INSERT INTO products (
                        category_id, product_name, description, price, stock, warranty_period, image_url, created_by, updated_by
                    ) VALUES (
                        @CategoryId, @ProductName, @Description, @Price, @Stock, @WarrantyPeriod, @ImageUrl, @AdminId, @AdminId
                    ) 
                    -- TRẢ VỀ CÁC CỘT TỪ BẢNG PRODUCTS VÀ CATEGORY_ID
                    RETURNING * )
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
                    
                    -- LẤY CATEGORY NAME BẰNG JOIN VỚI BẢNG TẠM VỪA INSERT
                    COALESCE(c.category_name, 'Chưa phân loại') AS CategoryName 
                    
                FROM inserted_product p
                LEFT JOIN categories c ON p.category_id = c.category_id;
            ";
            
            var parameters = new 
            {
                product.CategoryId, product.ProductName, product.Description, product.Price, 
                product.Stock, product.WarrantyPeriod, product.ImageUrl, AdminId = adminId
            };

            using (var db = Connection)
            {
                return await db.QueryFirstOrDefaultAsync<ProductDto>(sql, parameters);
            }
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
        public async Task<ProductDto> UpdateAsync(int productId, ProductCreateUpdateDto product, int adminId)
        {
            var sql = @"
                UPDATE products
                SET
                    category_id = @CategoryId,
                    product_name = @ProductName,
                    description = @Description,
                    price = @Price,
                    stock = @Stock,
                    warranty_period = @WarrantyPeriod,
                    image_url = @ImageUrl,
                    updated_at = CURRENT_TIMESTAMP,
                    updated_by = @AdminId
                WHERE product_id = @ProductId
                RETURNING 
                    product_id AS ProductId,
                    category_id AS CategoryId,
                    product_name AS ProductName,
                    description AS Description,
                    price AS Price,
                    stock AS Stock,
                    warranty_period AS WarrantyPeriod,
                    image_url AS ImageUrl,
                    on_prices AS OnPrices;
            ";

            var parameters = new
            {
                product.CategoryId,
                product.ProductName,
                product.Description,
                product.Price,
                product.Stock,
                product.WarrantyPeriod,
                product.ImageUrl,
                AdminId = adminId,
                ProductId = productId
            };

            using (var db = Connection)
            {
                var updatedProduct = await db.QueryFirstOrDefaultAsync<ProductDto>(sql, parameters);
                
                // Nếu có sản phẩm được cập nhật, lấy thêm thông tin category
                if (updatedProduct != null)
                {
                    var categorySql = @"
                        SELECT COALESCE(category_name, 'Chưa phân loại') AS CategoryName
                        FROM categories 
                        WHERE category_id = @CategoryId;
                    ";
                    var categoryName = await db.QueryFirstOrDefaultAsync<string>(categorySql, new { CategoryId = product.CategoryId });
                    updatedProduct.CategoryName = categoryName ?? "Chưa phân loại";
                }
                
                return updatedProduct;
            }
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
    }
}