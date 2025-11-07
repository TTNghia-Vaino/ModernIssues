using ModernIssues.Models.DTOs;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using ModernIssues.Repositories.Interface;
using ModernIssues.Repositories.Service;

namespace ModernIssues.Repositories
{


    public class ProductService : IProductService
    {
        private readonly IProductRepository _productRepository;

        public ProductService(IProductRepository productRepository)
        {
            _productRepository = productRepository;
        }

        // === CREATE ===
        public async Task<ProductDto> CreateProductAsync(ProductCreateUpdateDto product, int adminId)
        {
            if (product.Price <= 0)
            {
                throw new ArgumentException("Giá sản phẩm phải lớn hơn 0.");
            }

            // Gọi Repository với ProductCreateUpdateDto
            return await _productRepository.CreateAsync(product, adminId);
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

            // Chạy tuần tự vì DbContext không thread-safe
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
            return await _productRepository.UpdateAsync(productId, product, adminId);
        }

        // === DELETE (Soft Delete) ===
        public async Task<bool> SoftDeleteProductAsync(int productId, int adminId)
        {
            return await _productRepository.SoftDeleteAsync(productId, adminId);
        }
    }
}