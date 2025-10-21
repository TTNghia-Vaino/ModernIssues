using Microsoft.AspNetCore.Mvc;
using ModernIssues.Models.DTOs;
using ModernIssues.Services;
using ModernIssues.Helpers; 
using System.Threading.Tasks;
using System;
using System.Collections.Generic;
using System.Linq;
using ModernIssues.Models.Common;
using ModernIssues.Repositories.Interface;
using ModernIssues.Repositories.Service;

// Loại bỏ các using không cần thiết ở Controller như Dapper, Npgsql, System.Data

namespace ModernIssues.Controllers
{
    [Route("api/v1/[controller]")]
    [ApiController]
    public class ProductController : ControllerBase
    {
        private readonly IProductService _productService;

        public ProductController(IProductService productService)
        {
            _productService = productService;
        }

        private int GetAdminId() => 1; // Giả lập lấy ID Admin

        // ============================================
        // 1. CREATE: POST api/v1/Product
        // ============================================
        /// <summary>
        /// Tạo mới một sản phẩm. Chỉ dành cho tài khoản Admin/Quản lý.
        /// </summary>
        /// <param name="product">Thông tin sản phẩm cần tạo.</param>
        /// <response code="201">Tạo sản phẩm thành công và trả về chi tiết sản phẩm.</response>
        /// <response code="400">Dữ liệu gửi lên không hợp lệ (ví dụ: giá <= 0 hoặc thiếu trường).</response>
        /// <response code="500">Lỗi hệ thống hoặc lỗi cơ sở dữ liệu.</response>
        [HttpPost("CreateProduct")]
        [ProducesResponseType(typeof(ApiResponse<ProductDto>), HttpStatusCodes.Created)]
        [ProducesResponseType(typeof(ApiResponse<object>), HttpStatusCodes.BadRequest)]
        public async Task<IActionResult> CreateProduct([FromBody] ProductCreateUpdateDto product)
        {
            try
            {
                var adminId = GetAdminId();
                var newProduct = await _productService.CreateProductAsync(product, adminId);

                // TRẢ VỀ THÀNH CÔNG: 201 Created
                return StatusCode(HttpStatusCodes.Created,
                    ApiResponse<ProductDto>.SuccessResponse(newProduct, "Tạo sản phẩm thành công."));
            }
            catch (ArgumentException ex)
            {
                // XỬ LÝ LỖI NGHIỆP VỤ: 400 Bad Request
                return BadRequest(ApiResponse<object>.ErrorResponse(ex.Message, new List<string> { "Lỗi logic: Giá sản phẩm phải dương." }));
            }
            catch (Exception ex)
            {
                Console.WriteLine($"[CRITICAL DB ERROR] during CREATE: {ex.Message}");
                // XỬ LÝ LỖI HỆ THỐNG: 500 Internal Server Error
                return StatusCode(HttpStatusCodes.InternalServerError,
                    ApiResponse<object>.ErrorResponse("Lỗi hệ thống khi tạo sản phẩm.", new List<string> { ex.Message }));
            }
        }

        // ============================================
        // 2. READ ALL: GET api/v1/Product
        // ============================================
        /// <summary>
        /// Lấy danh sách các sản phẩm đang hoạt động (không bị vô hiệu hóa).
        /// </summary>
        /// <remarks>
        /// Hỗ trợ phân trang qua tham số 'page' và 'limit', và hỗ trợ lọc theo danh mục (categoryId) hoặc tìm kiếm theo tên (search).
        /// </remarks>
        /// <response code="200">Trả về danh sách sản phẩm và thông tin phân trang.</response>
        /// <response code="500">Lỗi hệ thống hoặc lỗi cơ sở dữ liệu.</response>
        [HttpPost("ListProducts")]
        [ProducesResponseType(typeof(ApiResponse<ProductListResponse>), HttpStatusCodes.OK)]
        public async Task<IActionResult> GetProducts(
            [FromQuery] int page = 1,
            [FromQuery] int limit = 10,
            [FromQuery] int? categoryId = null,
            [FromQuery] string search = null)
        {
            try
            {
                var response = await _productService.GetProductsAsync(page, limit, categoryId, search);

                // TRẢ VỀ THÀNH CÔNG: 200 OK
                return Ok(ApiResponse<ProductListResponse>.SuccessResponse(response));
            }
            catch (Exception ex)
            {
                Console.WriteLine($"[CRITICAL DB ERROR] during READ ALL: {ex.Message}");
                return StatusCode(HttpStatusCodes.InternalServerError,
                    ApiResponse<object>.ErrorResponse("Lỗi hệ thống khi lấy danh sách sản phẩm.", new List<string> { ex.Message }));
            }
        }

        // ============================================
        // 3. READ ONE: GET api/v1/Product/{id}
        // ============================================
        /// <summary>
        /// Lấy thông tin chi tiết của một sản phẩm bằng ProductId.
        /// </summary>
        /// <remarks>
        /// Endpoint này join với bảng Categories để trả về cả CategoryName của sản phẩm.
        /// </remarks>
        /// <param name="id">ID của sản phẩm.</param>
        /// <response code="200">Trả về chi tiết sản phẩm.</response>
        /// <response code="404">Không tìm thấy sản phẩm.</response>
        [HttpGet("{id}")]
        [ProducesResponseType(typeof(ApiResponse<ProductDto>), HttpStatusCodes.OK)]
        [ProducesResponseType(typeof(ApiResponse<object>), HttpStatusCodes.NotFound)]
        public async Task<IActionResult> GetProductById(int id)
        {
            var product = await _productService.GetProductByIdAsync(id);

            if (product == null)
            {
                // TRẢ VỀ LỖI: 404 Not Found
                return NotFound(ApiResponse<object>.ErrorResponse($"Không tìm thấy sản phẩm với ID: {id}."));
            }

            // TRẢ VỀ THÀNH CÔNG: 200 OK
            return Ok(ApiResponse<ProductDto>.SuccessResponse(product));
        }

        // ============================================
        // 4. UPDATE: PUT api/v1/Product/{id}
        // ============================================
        /// <summary>
        /// Cập nhật toàn bộ thông tin của một sản phẩm đã tồn tại. Chỉ dành cho Admin.
        /// </summary>
        /// <remarks>
        /// Cần cung cấp toàn bộ dữ liệu ProductCreateUpdateDto. Giá trị onPrices được bỏ qua (chỉ cập nhật qua task/service khác).
        /// </remarks>
        /// <param name="id">ID của sản phẩm cần cập nhật.</param>
        /// <param name="product">Dữ liệu sản phẩm mới.</param>
        /// <response code="200">Cập nhật thành công và trả về dữ liệu mới.</response>
        /// <response code="400">Dữ liệu không hợp lệ.</response>
        /// <response code="404">Không tìm thấy sản phẩm.</response>
        [HttpPut("{id}")]
        [ProducesResponseType(typeof(ApiResponse<ProductDto>), HttpStatusCodes.OK)]
        [ProducesResponseType(typeof(ApiResponse<object>), HttpStatusCodes.BadRequest)]
        [ProducesResponseType(typeof(ApiResponse<object>), HttpStatusCodes.NotFound)]
        public async Task<IActionResult> UpdateProduct(int id, [FromBody] ProductCreateUpdateDto product)
        {
            try
            {
                var adminId = GetAdminId();
                var updatedProduct = await _productService.UpdateProductAsync(id, product, adminId);

                if (updatedProduct == null)
                {
                    // TRẢ VỀ LỖI: 404 Not Found
                    return NotFound(ApiResponse<object>.ErrorResponse($"Không tìm thấy sản phẩm với ID: {id} để cập nhật."));
                }

                // TRẢ VỀ THÀNH CÔNG: 200 OK
                return Ok(ApiResponse<ProductDto>.SuccessResponse(updatedProduct, "Cập nhật sản phẩm thành công."));
            }
            catch (ArgumentException ex)
            {
                // TRẢ VỀ LỖI: 400 Bad Request
                return BadRequest(ApiResponse<object>.ErrorResponse(ex.Message));
            }
            catch (Exception ex)
            {
                Console.WriteLine($"[CRITICAL DB ERROR] during UPDATE: {ex.Message}");
                return StatusCode(HttpStatusCodes.InternalServerError,
                    ApiResponse<object>.ErrorResponse("Lỗi hệ thống khi cập nhật sản phẩm.", new List<string> { ex.Message }));
            }
        }

        // ============================================
        // 5. DELETE: DELETE api/v1/Product/{id} (Soft Delete)
        // ============================================
        /// <summary>
        /// Vô hiệu hóa (Soft Delete) một sản phẩm theo ProductId. Chỉ dành cho Admin.
        /// </summary>
        /// <remarks>
        /// Thực hiện cập nhật cột 'is_disabled' thành TRUE thay vì xóa vật lý khỏi cơ sở dữ liệu.
        /// </remarks>
        /// <param name="id">ID của sản phẩm cần vô hiệu hóa.</param>
        /// <response code="200">Vô hiệu hóa thành công.</response>
        /// <response code="404">Không tìm thấy sản phẩm.</response>
        [HttpDelete("{id}")]
        [ProducesResponseType(typeof(ApiResponse<object>), HttpStatusCodes.OK)]
        [ProducesResponseType(typeof(ApiResponse<object>), HttpStatusCodes.NotFound)]
        public async Task<IActionResult> SoftDeleteProduct(int id)
        {
            try
            {
                var adminId = GetAdminId();
                bool success = await _productService.SoftDeleteProductAsync(id, adminId);

                if (!success)
                {
                    // TRẢ VỀ LỖI: 404 Not Found
                    return NotFound(ApiResponse<object>.ErrorResponse($"Không tìm thấy sản phẩm với ID: {id} để vô hiệu hóa."));
                }

                // TRẢ VỀ THÀNH CÔNG: 200 OK (Data là null)
                return Ok(ApiResponse<object>.SuccessResponse(null, $"Sản phẩm {id} đã được vô hiệu hóa thành công."));
            }
            catch (Exception ex)
            {
                Console.WriteLine($"[CRITICAL DB ERROR] during DELETE: {ex.Message}");
                return StatusCode(HttpStatusCodes.InternalServerError,
                    ApiResponse<object>.ErrorResponse("Lỗi hệ thống khi vô hiệu hóa sản phẩm.", new List<string> { ex.Message }));
            }
        }
    }
}