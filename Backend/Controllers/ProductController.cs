using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Http;
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
using Microsoft.AspNetCore.Hosting;

// Loại bỏ các using không cần thiết ở Controller như Dapper, Npgsql, System.Data

namespace ModernIssues.Controllers
{
    [Route("/v1/[controller]")]
    [ApiController]
    public class ProductController : ControllerBase
    {
        private readonly IProductService _productService;
        private readonly IWebHostEnvironment _webHostEnvironment;

        public ProductController(IProductService productService, IWebHostEnvironment webHostEnvironment)
        {
            _productService = productService;
            _webHostEnvironment = webHostEnvironment;
        }

        private int GetAdminId() => 1; // Giả lập lấy ID Admin

        /// <summary>
        /// Lấy thông tin user hiện tại
        /// </summary>
        /// <returns>Thông tin user hoặc null nếu chưa đăng nhập</returns>
        [HttpGet("CurrentUser")]
        [ProducesResponseType(typeof(ApiResponse<object>), HttpStatusCodes.OK)]
        [ProducesResponseType(typeof(ApiResponse<object>), HttpStatusCodes.Unauthorized)]
        public IActionResult GetCurrentUser()
        {
            if (!AuthHelper.IsLoggedIn(HttpContext))
            {
                return Unauthorized(ApiResponse<object>.ErrorResponse("Bạn cần đăng nhập để xem thông tin này."));
            }

            var userInfo = AuthHelper.GetCurrentUser(HttpContext);
            return Ok(ApiResponse<object>.SuccessResponse(userInfo, "Lấy thông tin user thành công."));
        }




        // ============================================
        // 1. CREATE PRODUCT: POST api/v1/Product/CreateProduct
        // ============================================
        /// <summary>
        /// Tạo sản phẩm mới. Có thể upload ảnh hoặc sử dụng ảnh mặc định.
        /// </summary>
        /// <param name="productData">Dữ liệu sản phẩm bao gồm thông tin và file ảnh (tùy chọn).</param>
        /// <response code="201">Tạo sản phẩm thành công.</response>
        /// <response code="400">Dữ liệu không hợp lệ.</response>
        /// <response code="401">Chưa đăng nhập.</response>
        /// <response code="403">Không có quyền admin.</response>
        [HttpPost("CreateProduct")]
        [Consumes("multipart/form-data")]
        [ProducesResponseType(typeof(ApiResponse<ProductDto>), HttpStatusCodes.Created)]
        [ProducesResponseType(typeof(ApiResponse<object>), HttpStatusCodes.BadRequest)]
        [ProducesResponseType(typeof(ApiResponse<object>), HttpStatusCodes.Unauthorized)]
        [ProducesResponseType(typeof(ApiResponse<object>), HttpStatusCodes.Forbidden)]
        public async Task<IActionResult> CreateProduct([FromForm] ProductWithImageDto productData)
        {
            // Kiểm tra đăng nhập
            if (!AuthHelper.IsLoggedIn(HttpContext))
            {
                return Unauthorized(ApiResponse<object>.ErrorResponse("Bạn cần đăng nhập để thực hiện thao tác này."));
            }

            // Kiểm tra quyền admin
            if (!AuthHelper.IsAdmin(HttpContext))
            {
                return StatusCode(HttpStatusCodes.Forbidden, 
                    ApiResponse<object>.ErrorResponse("Chỉ có quyền admin mới được tạo sản phẩm."));
            }

            try
            {
                var adminId = GetAdminId();
                
                // Tạo ProductCreateUpdateDto từ form data
                var product = new ProductCreateUpdateDto
                {
                    ProductName = productData.ProductName,
                    Description = productData.Description,
                    Price = productData.Price,
                    CategoryId = productData.CategoryId,
                    Stock = productData.Stock,
                    WarrantyPeriod = productData.WarrantyPeriod,
                    ImageUrl = "default.jpg" // Ảnh mặc định
                };
                
                // Xử lý upload ảnh nếu có
                if (productData.ImageFile != null && productData.ImageFile.Length > 0)
                {
                    try
                    {
                        // Sử dụng đường dẫn tuyệt đối nếu WebRootPath null
                        var uploadPath = _webHostEnvironment.WebRootPath ?? Path.Combine(Directory.GetCurrentDirectory(), "wwwroot");
                        var fileName = await ImageUploadHelper.UploadImageAsync(productData.ImageFile, uploadPath);
                        if (!string.IsNullOrEmpty(fileName))
                        {
                            product.ImageUrl = fileName;
                        }
                    }
                    catch (ArgumentException ex)
                    {
                        return BadRequest(ApiResponse<object>.ErrorResponse($"Lỗi upload ảnh: {ex.Message}"));
                    }
                }
                // Nếu không có ảnh upload, sử dụng ảnh mặc định "default.jpg"
                
                var newProduct = await _productService.CreateProductAsync(product, adminId);

                // TRẢ VỀ THÀNH CÔNG: 201 Created
                return StatusCode(HttpStatusCodes.Created,
                    ApiResponse<ProductDto>.SuccessResponse(newProduct, "Tạo sản phẩm thành công."));
            }
            catch (ArgumentException ex)
            {
                return BadRequest(ApiResponse<object>.ErrorResponse(ex.Message));
            }
            catch (Exception ex)
            {
                Console.WriteLine($"[CRITICAL DB ERROR] during CREATE: {ex.Message}");
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
        /// Cập nhật sản phẩm với khả năng upload ảnh mới. Chỉ dành cho Admin.
        /// </summary>
        /// <param name="id">ID của sản phẩm cần cập nhật.</param>
        /// <param name="productData">Dữ liệu sản phẩm bao gồm thông tin và file ảnh (tùy chọn).</param>
        /// <response code="200">Cập nhật thành công và trả về dữ liệu mới.</response>
        /// <response code="400">Dữ liệu không hợp lệ.</response>
        /// <response code="404">Không tìm thấy sản phẩm.</response>
        /// <response code="401">Chưa đăng nhập.</response>
        /// <response code="403">Không có quyền admin.</response>
        [HttpPut("{id}")]
        [Consumes("multipart/form-data")]
        [ProducesResponseType(typeof(ApiResponse<ProductDto>), HttpStatusCodes.OK)]
        [ProducesResponseType(typeof(ApiResponse<object>), HttpStatusCodes.BadRequest)]
        [ProducesResponseType(typeof(ApiResponse<object>), HttpStatusCodes.NotFound)]
        [ProducesResponseType(typeof(ApiResponse<object>), HttpStatusCodes.Unauthorized)]
        [ProducesResponseType(typeof(ApiResponse<object>), HttpStatusCodes.Forbidden)]
        public async Task<IActionResult> UpdateProduct(int id, [FromForm] ProductUpdateWithImageDto productData)
        {
            // Kiểm tra đăng nhập
            if (!AuthHelper.IsLoggedIn(HttpContext))
            {
                return Unauthorized(ApiResponse<object>.ErrorResponse("Bạn cần đăng nhập để thực hiện thao tác này."));
            }

            // Kiểm tra quyền admin
            if (!AuthHelper.IsAdmin(HttpContext))
            {
                return StatusCode(HttpStatusCodes.Forbidden, 
                    ApiResponse<object>.ErrorResponse("Chỉ có quyền admin mới được cập nhật sản phẩm."));
            }

            try
            {
                var adminId = GetAdminId();
                
                // Tạo ProductCreateUpdateDto từ form data
                var product = new ProductCreateUpdateDto
                {
                    ProductName = productData.ProductName,
                    Description = productData.Description,
                    Price = productData.Price,
                    CategoryId = productData.CategoryId,
                    Stock = productData.Stock,
                    WarrantyPeriod = productData.WarrantyPeriod,
                    ImageUrl = productData.CurrentImageUrl ?? "default.jpg" // Giữ ảnh hiện tại hoặc dùng mặc định
                };
                
                // Xử lý upload ảnh mới nếu có
                if (productData.ImageFile != null && productData.ImageFile.Length > 0)
                {
                    try
                    {
                        // Sử dụng đường dẫn tuyệt đối nếu WebRootPath null
                        var uploadPath = _webHostEnvironment.WebRootPath ?? Path.Combine(Directory.GetCurrentDirectory(), "wwwroot");
                        var fileName = await ImageUploadHelper.UploadImageAsync(productData.ImageFile, uploadPath);
                        if (!string.IsNullOrEmpty(fileName))
                        {
                            product.ImageUrl = fileName;
                        }
                    }
                    catch (ArgumentException ex)
                    {
                        return BadRequest(ApiResponse<object>.ErrorResponse($"Lỗi upload ảnh: {ex.Message}"));
                    }
                }
                // Nếu không có ảnh mới, giữ nguyên ảnh hiện tại
                
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
        [ProducesResponseType(typeof(ApiResponse<object>), HttpStatusCodes.Unauthorized)]
        [ProducesResponseType(typeof(ApiResponse<object>), HttpStatusCodes.Forbidden)]
        public async Task<IActionResult> SoftDeleteProduct(int id)
        {
            // Kiểm tra đăng nhập
            if (!AuthHelper.IsLoggedIn(HttpContext))
            {
                return Unauthorized(ApiResponse<object>.ErrorResponse("Bạn cần đăng nhập để thực hiện thao tác này."));
            }

            // Kiểm tra quyền admin
            if (!AuthHelper.IsAdmin(HttpContext))
            {
                return StatusCode(HttpStatusCodes.Forbidden, 
                    ApiResponse<object>.ErrorResponse("Chỉ có quyền admin mới được xóa sản phẩm."));
            }

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