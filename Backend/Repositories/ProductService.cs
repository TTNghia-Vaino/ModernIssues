using ModernIssues.Models.DTOs;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using ModernIssues.Repositories.Interface;
using ModernIssues.Repositories.Service;
using ModernIssues.Models.Entities;
using ModernIssues.Services;

namespace ModernIssues.Repositories
{


    public class ProductService : IProductService
    {
        private readonly IProductRepository _productRepository;
        private readonly IEmbeddingService _embeddingService;
        private readonly ILogger<ProductService> _logger;

        public ProductService(IProductRepository productRepository, IEmbeddingService embeddingService, ILogger<ProductService> logger)
        {
            _productRepository = productRepository;
            _embeddingService = embeddingService;
            _logger = logger;
        }

        // === CREATE ===
        public async Task<ProductDto> CreateProductAsync(ProductCreateUpdateDto product, int adminId)
        {
            if (product.Price <= 0)
            {
                throw new ArgumentException("Giá sản phẩm phải lớn hơn 0.");
            }

            // Gọi Repository với ProductCreateUpdateDto
            var createdProduct = await _productRepository.CreateAsync(product, adminId);

            // Tạo embedding cho sản phẩm mới (fire-and-forget, không block luồng chính)
            if (createdProduct != null && createdProduct.ProductId > 0 && !string.IsNullOrWhiteSpace(product.Description))
            {
                _ = Task.Run(async () =>
                {
                    try
                    {
                        await _embeddingService.CreateEmbeddingAsync(createdProduct.ProductId);
                    }
                    catch (Exception ex)
                    {
                        _logger.LogError(ex, $"[ProductService] Error creating embedding for product {createdProduct.ProductId}: {ex.Message}");
                    }
                });
            }

            return createdProduct;
        }

        // === READ ONE ===
        public async Task<ProductDto> GetProductByIdAsync(int productId)
        {
            return await _productRepository.GetByIdAsync(productId);
        }

        // === READ ALL (Phân trang) ===
        public async Task<ProductListResponse> GetProductsAsync(int page, int limit, int? categoryId, string search)
        {
            // Logic nghiệp vụ: Đảm bảo giới hạn hợp lý
            limit = Math.Clamp(limit, 1, 100);
            page = Math.Max(1, page);
            int offset = (page - 1) * limit;

            // Chạy tuần tự để tránh lỗi DbContext threading (DbContext không thread-safe)
            // Không thể chạy song song vì cả hai đều dùng chung một DbContext instance
            var products = await _productRepository.GetAllAsync(limit, offset, categoryId, search);
            var totalCount = await _productRepository.CountAllAsync(categoryId, search);

            return new ProductListResponse
            {
                TotalCount = totalCount,
                CurrentPage = page,
                Limit = limit,
                Data = products.ToList()
            };
        }

        // === UPDATE ===
        public async Task<ProductDto> UpdateProductAsync(int productId, ProductCreateUpdateDto product, int adminId)
        {
            if (product.Price <= 0)
            {
                throw new ArgumentException("Giá sản phẩm phải lớn hơn 0.");
            }

            // Gọi Repository với ProductCreateUpdateDto
            var updatedProduct = await _productRepository.UpdateAsync(productId, product, adminId);

            // Cập nhật embedding cho sản phẩm (fire-and-forget, không block luồng chính)
            if (updatedProduct != null && updatedProduct.ProductId > 0 && !string.IsNullOrWhiteSpace(product.Description))
            {
                _ = Task.Run(async () =>
                {
                    try
                    {
                        await _embeddingService.CreateEmbeddingAsync(updatedProduct.ProductId);
                    }
                    catch (Exception ex)
                    {
                        _logger.LogError(ex, $"[ProductService] Error updating embedding for product {updatedProduct.ProductId}: {ex.Message}");
                    }
                });
            }

            return updatedProduct;
        }

        // === DELETE (Soft Delete) ===
        public async Task<bool> SoftDeleteProductAsync(int productId, int adminId)
        {
            return await _productRepository.SoftDeleteAsync(productId, adminId);
        }

        // === REACTIVATE (Kích hoạt lại sản phẩm) ===
        public async Task<bool> ReactivateProductAsync(int productId, int adminId)
        {
            return await _productRepository.ReactivateAsync(productId, adminId);
        }

        // === GENERATE SERIALS (Tạo serial cho tất cả sản phẩm hiện có) ===
        public async Task<int> GenerateSerialsForAllProductsAsync(int adminId)
        {
            return await _productRepository.GenerateSerialsForAllProductsAsync(adminId);
        }
    }
}