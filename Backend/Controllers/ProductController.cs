using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Http;
using ModernIssues.Models.DTOs;
using ModernIssues.Services;
using ModernIssues.Helpers; 
using System.Threading.Tasks;
using System;
using System.Collections.Generic;
using System.Linq;
using System.IO;
using ModernIssues.Models.Common;
using ModernIssues.Repositories.Interface;
using ModernIssues.Repositories.Service;
using Microsoft.AspNetCore.Hosting;
using ModernIssues.Models.Entities;
using Microsoft.EntityFrameworkCore;

// Loại bỏ các using không cần thiết ở Controller như Dapper, Npgsql, System.Data

namespace ModernIssues.Controllers
{
    [Route("/v1/[controller]")]
    [ApiController]
    public class ProductController : ControllerBase
    {
        private readonly IProductService _productService;
        private readonly IWebHostEnvironment _webHostEnvironment;
        private readonly WebDbContext _context;
        private readonly ILogService _logService;

        public ProductController(IProductService productService, IWebHostEnvironment webHostEnvironment, WebDbContext context, ILogService logService)
        {
            _productService = productService;
            _webHostEnvironment = webHostEnvironment;
            _context = context;
            _logService = logService;
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
                
                // Validation dữ liệu đầu vào
                if (string.IsNullOrWhiteSpace(productData.ProductName))
                {
                    return BadRequest(ApiResponse<object>.ErrorResponse("Tên sản phẩm không được để trống."));
                }

                if (productData.Price <= 0)
                {
                    return BadRequest(ApiResponse<object>.ErrorResponse("Giá sản phẩm phải lớn hơn 0."));
                }

                if (productData.CategoryId <= 0)
                {
                    return BadRequest(ApiResponse<object>.ErrorResponse("Danh mục sản phẩm không hợp lệ."));
                }

                if (productData.Stock < 0)
                {
                    return BadRequest(ApiResponse<object>.ErrorResponse("Số lượng tồn kho không được âm."));
                }

                if (productData.WarrantyPeriod < 0)
                {
                    return BadRequest(ApiResponse<object>.ErrorResponse("Thời gian bảo hành không được âm."));
                }

                // Kiểm tra category có tồn tại không
                var categoryExists = await _context.categories.AnyAsync(c => c.category_id == productData.CategoryId);
                if (!categoryExists)
                {
                    return BadRequest(ApiResponse<object>.ErrorResponse($"Danh mục với ID {productData.CategoryId} không tồn tại."));
                }

                // Validation: Kiểm tra phải có đủ 3 ảnh
                if (productData.ImageFile == null || productData.ImageFile.Length == 0)
                {
                    return BadRequest(ApiResponse<object>.ErrorResponse("Vui lòng upload ảnh thứ nhất cho sản phẩm."));
                }
                if (productData.ImageFile2 == null || productData.ImageFile2.Length == 0)
                {
                    return BadRequest(ApiResponse<object>.ErrorResponse("Vui lòng upload ảnh thứ hai cho sản phẩm."));
                }
                if (productData.ImageFile3 == null || productData.ImageFile3.Length == 0)
                {
                    return BadRequest(ApiResponse<object>.ErrorResponse("Vui lòng upload ảnh thứ ba cho sản phẩm."));
                }

                // Xác định ảnh sẽ sử dụng
                string imageUrlToUse = "default.jpg";
                string imageUrl2ToUse = "default.jpg";
                string imageUrl3ToUse = "default.jpg";
                
                try
                {
                    // Đảm bảo đường dẫn upload luôn đúng
                    var uploadPath = _webHostEnvironment.WebRootPath;
                    if (string.IsNullOrEmpty(uploadPath))
                    {
                        uploadPath = Path.Combine(Directory.GetCurrentDirectory(), "wwwroot");
                    }
                    
                    // Tạo thư mục nếu chưa tồn tại
                    var uploadsDir = Path.Combine(uploadPath, "Uploads", "Images");
                    if (!Directory.Exists(uploadsDir))
                    {
                        Directory.CreateDirectory(uploadsDir);
                    }

                    Console.WriteLine($"[ProductController.CreateProduct] Upload path: {uploadPath}");
                    Console.WriteLine($"[ProductController.CreateProduct] Uploads directory: {uploadsDir}");

                    // Upload ảnh thứ nhất
                    var fileName = await ImageUploadHelper.UploadImageAsync(productData.ImageFile, uploadPath);
                    if (!string.IsNullOrEmpty(fileName))
                    {
                        imageUrlToUse = fileName;
                        Console.WriteLine($"[ProductController.CreateProduct] Image 1 uploaded: {fileName}");
                    }

                    // Upload ảnh thứ hai
                    Console.WriteLine($"[ProductController.CreateProduct] Starting upload Image 2, FileName: {productData.ImageFile2?.FileName}, Length: {productData.ImageFile2?.Length}");
                    var fileName2 = await ImageUploadHelper.UploadImageAsync(productData.ImageFile2, uploadPath);
                    if (!string.IsNullOrEmpty(fileName2))
                    {
                        imageUrl2ToUse = fileName2;
                        var filePath2 = Path.Combine(uploadsDir, fileName2);
                        var fileExists2 = System.IO.File.Exists(filePath2);
                        Console.WriteLine($"[ProductController.CreateProduct] Image 2 uploaded: {fileName2}, FullPath: {filePath2}, FileExists: {fileExists2}");
                    }
                    else
                    {
                        Console.WriteLine($"[ProductController.CreateProduct] Image 2 upload returned null or empty");
                    }

                    // Upload ảnh thứ ba
                    Console.WriteLine($"[ProductController.CreateProduct] Starting upload Image 3, FileName: {productData.ImageFile3?.FileName}, Length: {productData.ImageFile3?.Length}");
                    var fileName3 = await ImageUploadHelper.UploadImageAsync(productData.ImageFile3, uploadPath);
                    if (!string.IsNullOrEmpty(fileName3))
                    {
                        imageUrl3ToUse = fileName3;
                        var filePath3 = Path.Combine(uploadsDir, fileName3);
                        var fileExists3 = System.IO.File.Exists(filePath3);
                        Console.WriteLine($"[ProductController.CreateProduct] Image 3 uploaded: {fileName3}, FullPath: {filePath3}, FileExists: {fileExists3}");
                    }
                    else
                    {
                        Console.WriteLine($"[ProductController.CreateProduct] Image 3 upload returned null or empty");
                    }
                }
                catch (ArgumentException ex)
                {
                    Console.WriteLine($"[ProductController.CreateProduct] Upload image error: {ex.Message}");
                    return BadRequest(ApiResponse<object>.ErrorResponse($"Lỗi upload ảnh: {ex.Message}"));
                }
                catch (Exception ex)
                {
                    Console.WriteLine($"[ProductController.CreateProduct] Upload image exception: {ex.Message}");
                    Console.WriteLine($"[ProductController.CreateProduct] StackTrace: {ex.StackTrace}");
                    return BadRequest(ApiResponse<object>.ErrorResponse($"Lỗi hệ thống khi upload ảnh: {ex.Message}"));
                }
                
                // Tạo ProductCreateUpdateDto từ form data
                var product = new ProductCreateUpdateDto
                {
                    ProductName = productData.ProductName.Trim(),
                    Description = productData.Description?.Trim() ?? string.Empty,
                    Price = productData.Price,
                    CategoryId = productData.CategoryId,
                    Stock = productData.Stock,
                    WarrantyPeriod = productData.WarrantyPeriod,
                    ImageUrl = imageUrlToUse,
                    ImageUrl2 = imageUrl2ToUse,
                    ImageUrl3 = imageUrl3ToUse,
                    Specifications = productData.Specifications?.Trim(),
                    Brand = productData.Brand?.Trim()
                };
                
                Console.WriteLine($"[ProductController.CreateProduct] Creating product: {product.ProductName}, ImageUrl: {imageUrlToUse}");
                
                var newProduct = await _productService.CreateProductAsync(product, adminId);

                // Kiểm tra kết quả tạo sản phẩm
                if (newProduct == null || newProduct.ProductId == 0)
                {
                    Console.WriteLine($"[ProductController.CreateProduct] Failed to create product");
                    return StatusCode(HttpStatusCodes.InternalServerError,
                        ApiResponse<object>.ErrorResponse("Không thể tạo sản phẩm. Vui lòng thử lại."));
                }

                Console.WriteLine($"[ProductController.CreateProduct] Product created successfully: {newProduct.ProductId} - {newProduct.ProductName}");

                // TRẢ VỀ THÀNH CÔNG: 201 Created
                return StatusCode(HttpStatusCodes.Created,
                    ApiResponse<ProductDto>.SuccessResponse(newProduct, "Tạo sản phẩm thành công."));
            }
            catch (ArgumentException ex)
            {
                Console.WriteLine($"[ProductController.CreateProduct] ArgumentException: {ex.Message}");
                return BadRequest(ApiResponse<object>.ErrorResponse(ex.Message));
            }
            catch (Exception ex)
            {
                Console.WriteLine($"[CRITICAL DB ERROR] during CREATE: {ex.Message}");
                Console.WriteLine($"[CRITICAL DB ERROR] StackTrace: {ex.StackTrace}");
                if (ex.InnerException != null)
                {
                    Console.WriteLine($"[CRITICAL DB ERROR] InnerException: {ex.InnerException.Message}");
                }
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
        // GET LATEST PRODUCTS: GET api/v1/Product/GetLatestProducts
        // ============================================
        /// <summary>
        /// Lấy danh sách 10 sản phẩm mới nhất trong Database. Dùng cho trang home page.
        /// </summary>
        /// <response code="200">Trả về danh sách 10 sản phẩm mới nhất.</response>
        /// <response code="500">Lỗi hệ thống.</response>
        [HttpGet("GetLatestProducts")]
        [ProducesResponseType(typeof(ApiResponse<List<ProductDto>>), HttpStatusCodes.OK)]
        [ProducesResponseType(typeof(ApiResponse<object>), HttpStatusCodes.InternalServerError)]
        public async Task<IActionResult> GetLatestProducts()
        {
            try
            {
                var products = await (from p in _context.products
                                    join c in _context.categories on p.category_id equals c.category_id into categoryGroup
                                    from c in categoryGroup.DefaultIfEmpty()
                                    where (p.is_disabled == null || p.is_disabled == false)
                                    orderby p.created_at descending, p.product_id descending
                                    select new
                                    {
                                        Product = p,
                                        Category = c,
                                        StockValue = p.stock ?? 0
                                    })
                                    .Take(10)
                                    .ToListAsync();

                var productDtos = products.Select(x =>
                {
                    var dto = new ProductDto
                    {
                        ProductId = x.Product.product_id,
                        CategoryId = x.Product.category_id ?? 0,
                        ProductName = x.Product.product_name ?? string.Empty,
                        Description = x.Product.description ?? string.Empty,
                        Price = x.Product.price,
                        Stock = x.StockValue,
                        WarrantyPeriod = x.Product.warranty_period ?? 0,
                        ImageUrl = x.Product.image_url ?? string.Empty,
                        ImageUrl2 = x.Product.image_url_2,
                        ImageUrl3 = x.Product.image_url_3,
                        Specifications = x.Product.specifications,
                        Brand = x.Product.brand,
                        OnPrices = x.Product.on_prices ?? 0, // Giá khuyến mãi: 0 = không khuyến mãi, > 0 = có khuyến mãi
                        CategoryName = x.Category != null ? x.Category.category_name ?? "Chưa phân loại" : "Chưa phân loại",
                        IsDisabled = false
                    };

                    // Xác định trạng thái và màu sắc
                    if (x.StockValue <= 0)
                    {
                        dto.StatusText = "Hết hàng";
                        dto.StatusColor = "#ff4444"; // Đỏ
                    }
                    else
                    {
                        dto.StatusText = "Đang hoạt động";
                        dto.StatusColor = "#4CAF50"; // Xanh lá
                    }

                    return dto;
                }).ToList();

                return Ok(ApiResponse<List<ProductDto>>.SuccessResponse(productDtos, "Lấy danh sách sản phẩm mới nhất thành công."));
            }
            catch (Exception ex)
            {
                Console.WriteLine($"[CRITICAL ERROR] GetLatestProducts: {ex.Message}");
                return StatusCode(HttpStatusCodes.InternalServerError,
                    ApiResponse<object>.ErrorResponse("Lỗi hệ thống khi lấy danh sách sản phẩm mới nhất.", new List<string> { ex.Message }));
            }
        }

        // ============================================
        // GET BRANDS: GET api/v1/Product/GetBrands
        // ============================================
        /// <summary>
        /// Lấy danh sách tất cả các thương hiệu (brand) có trong database. Dùng để hiển thị filter hoặc dropdown.
        /// </summary>
        /// <response code="200">Trả về danh sách các thương hiệu.</response>
        /// <response code="500">Lỗi hệ thống.</response>
        [HttpGet("GetBrands")]
        [ProducesResponseType(typeof(ApiResponse<List<string>>), HttpStatusCodes.OK)]
        [ProducesResponseType(typeof(ApiResponse<object>), HttpStatusCodes.InternalServerError)]
        public async Task<IActionResult> GetBrands()
        {
            try
            {
                var brands = await _context.products
                    .Where(p => !string.IsNullOrWhiteSpace(p.brand) && (p.is_disabled == null || p.is_disabled == false))
                    .Select(p => p.brand!)
                    .Distinct()
                    .OrderBy(b => b)
                    .ToListAsync();

                return Ok(ApiResponse<List<string>>.SuccessResponse(brands, "Lấy danh sách thương hiệu thành công."));
            }
            catch (Exception ex)
            {
                Console.WriteLine($"[CRITICAL ERROR] GetBrands: {ex.Message}");
                return StatusCode(HttpStatusCodes.InternalServerError,
                    ApiResponse<object>.ErrorResponse("Lỗi hệ thống khi lấy danh sách thương hiệu.", new List<string> { ex.Message }));
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

            // Track log: User xem sản phẩm (fire-and-forget với scope mới)
            var userId = AuthHelper.GetCurrentUserId(HttpContext);
            _ = _logService.CreateLogInNewScopeAsync(userId, id, "view_product");

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
                
                // Validation dữ liệu đầu vào
                if (string.IsNullOrWhiteSpace(productData.ProductName))
                {
                    return BadRequest(ApiResponse<object>.ErrorResponse("Tên sản phẩm không được để trống."));
                }

                if (productData.Price <= 0)
                {
                    return BadRequest(ApiResponse<object>.ErrorResponse("Giá sản phẩm phải lớn hơn 0."));
                }

                if (productData.CategoryId <= 0)
                {
                    return BadRequest(ApiResponse<object>.ErrorResponse("Danh mục sản phẩm không hợp lệ."));
                }

                if (productData.Stock < 0)
                {
                    return BadRequest(ApiResponse<object>.ErrorResponse("Số lượng tồn kho không được âm."));
                }

                if (productData.WarrantyPeriod < 0)
                {
                    return BadRequest(ApiResponse<object>.ErrorResponse("Thời gian bảo hành không được âm."));
                }

                // Kiểm tra category có tồn tại không
                var categoryExists = await _context.categories.AnyAsync(c => c.category_id == productData.CategoryId);
                if (!categoryExists)
                {
                    return BadRequest(ApiResponse<object>.ErrorResponse($"Danh mục với ID {productData.CategoryId} không tồn tại."));
                }

                // Lấy sản phẩm hiện tại để giữ nguyên ảnh nếu không có ảnh mới
                var existingProduct = await _context.products
                    .Where(p => p.product_id == id)
                    .Select(p => new { p.image_url, p.image_url_2, p.image_url_3, p.is_disabled })
                    .FirstOrDefaultAsync();

                if (existingProduct == null)
                {
                    return NotFound(ApiResponse<object>.ErrorResponse($"Không tìm thấy sản phẩm với ID: {id} để cập nhật."));
                }

                // Xác định ảnh sẽ sử dụng: ưu tiên ảnh mới upload, sau đó là CurrentImageUrl từ form, cuối cùng là ảnh hiện tại trong DB
                string imageUrlToUse = existingProduct.image_url ?? "default.jpg";
                string imageUrl2ToUse = existingProduct.image_url_2 ?? "default.jpg";
                string imageUrl3ToUse = existingProduct.image_url_3 ?? "default.jpg";
                
                // Nếu có CurrentImageUrl từ form, ưu tiên dùng nó (trừ khi có ảnh mới upload)
                if (!string.IsNullOrWhiteSpace(productData.CurrentImageUrl) && 
                    (productData.ImageFile == null || productData.ImageFile.Length == 0))
                {
                    imageUrlToUse = productData.CurrentImageUrl;
                }
                if (!string.IsNullOrWhiteSpace(productData.CurrentImageUrl2) && 
                    (productData.ImageFile2 == null || productData.ImageFile2.Length == 0))
                {
                    imageUrl2ToUse = productData.CurrentImageUrl2;
                }
                if (!string.IsNullOrWhiteSpace(productData.CurrentImageUrl3) && 
                    (productData.ImageFile3 == null || productData.ImageFile3.Length == 0))
                {
                    imageUrl3ToUse = productData.CurrentImageUrl3;
                }

                // Xử lý upload ảnh mới nếu có
                try
                {
                    // Đảm bảo đường dẫn upload luôn đúng
                    var uploadPath = _webHostEnvironment.WebRootPath;
                    if (string.IsNullOrEmpty(uploadPath))
                    {
                        uploadPath = Path.Combine(Directory.GetCurrentDirectory(), "wwwroot");
                    }
                    
                    // Tạo thư mục nếu chưa tồn tại
                    var uploadsDir = Path.Combine(uploadPath, "Uploads", "Images");
                    if (!Directory.Exists(uploadsDir))
                    {
                        Directory.CreateDirectory(uploadsDir);
                    }

                    Console.WriteLine($"[ProductController.UpdateProduct] Upload path: {uploadPath}");
                    Console.WriteLine($"[ProductController.UpdateProduct] Uploads directory: {uploadsDir}");

                    // Upload ảnh thứ nhất nếu có
                    if (productData.ImageFile != null && productData.ImageFile.Length > 0)
                    {
                        var fileName = await ImageUploadHelper.UploadImageAsync(productData.ImageFile, uploadPath);
                        if (!string.IsNullOrEmpty(fileName))
                        {
                            imageUrlToUse = fileName;
                            Console.WriteLine($"[ProductController.UpdateProduct] New image 1 uploaded: {fileName}");
                        }
                    }

                    // Upload ảnh thứ hai nếu có
                    if (productData.ImageFile2 != null && productData.ImageFile2.Length > 0)
                    {
                        Console.WriteLine($"[ProductController.UpdateProduct] Starting upload Image 2, FileName: {productData.ImageFile2.FileName}, Length: {productData.ImageFile2.Length}");
                        var fileName2 = await ImageUploadHelper.UploadImageAsync(productData.ImageFile2, uploadPath);
                        if (!string.IsNullOrEmpty(fileName2))
                        {
                            imageUrl2ToUse = fileName2;
                            var filePath2 = Path.Combine(uploadsDir, fileName2);
                            var fileExists2 = System.IO.File.Exists(filePath2);
                            Console.WriteLine($"[ProductController.UpdateProduct] New image 2 uploaded: {fileName2}, FullPath: {filePath2}, FileExists: {fileExists2}");
                        }
                        else
                        {
                            Console.WriteLine($"[ProductController.UpdateProduct] Image 2 upload returned null or empty");
                        }
                    }

                    // Upload ảnh thứ ba nếu có
                    if (productData.ImageFile3 != null && productData.ImageFile3.Length > 0)
                    {
                        Console.WriteLine($"[ProductController.UpdateProduct] Starting upload Image 3, FileName: {productData.ImageFile3.FileName}, Length: {productData.ImageFile3.Length}");
                        var fileName3 = await ImageUploadHelper.UploadImageAsync(productData.ImageFile3, uploadPath);
                        if (!string.IsNullOrEmpty(fileName3))
                        {
                            imageUrl3ToUse = fileName3;
                            var filePath3 = Path.Combine(uploadsDir, fileName3);
                            var fileExists3 = System.IO.File.Exists(filePath3);
                            Console.WriteLine($"[ProductController.UpdateProduct] New image 3 uploaded: {fileName3}, FullPath: {filePath3}, FileExists: {fileExists3}");
                        }
                        else
                        {
                            Console.WriteLine($"[ProductController.UpdateProduct] Image 3 upload returned null or empty");
                        }
                    }
                }
                catch (ArgumentException ex)
                {
                    Console.WriteLine($"[ProductController.UpdateProduct] Upload image error: {ex.Message}");
                    return BadRequest(ApiResponse<object>.ErrorResponse($"Lỗi upload ảnh: {ex.Message}"));
                }
                catch (Exception ex)
                {
                    Console.WriteLine($"[ProductController.UpdateProduct] Upload image exception: {ex.Message}");
                    Console.WriteLine($"[ProductController.UpdateProduct] StackTrace: {ex.StackTrace}");
                    return BadRequest(ApiResponse<object>.ErrorResponse($"Lỗi hệ thống khi upload ảnh: {ex.Message}"));
                }
                
                // Tạo ProductCreateUpdateDto từ form data với ảnh đã xác định
                var product = new ProductCreateUpdateDto
                {
                    ProductName = productData.ProductName.Trim(),
                    Description = productData.Description?.Trim() ?? string.Empty,
                    Price = productData.Price,
                    CategoryId = productData.CategoryId,
                    Stock = productData.Stock,
                    WarrantyPeriod = productData.WarrantyPeriod,
                    ImageUrl = imageUrlToUse,
                    ImageUrl2 = imageUrl2ToUse,
                    ImageUrl3 = imageUrl3ToUse,
                    Specifications = productData.Specifications?.Trim(),
                    Brand = productData.Brand?.Trim()
                };
                
                Console.WriteLine($"[ProductController.UpdateProduct] Updating product ID: {id}, ImageUrl: {imageUrlToUse}");
                
                var updatedProduct = await _productService.UpdateProductAsync(id, product, adminId);

                if (updatedProduct == null || updatedProduct.ProductId == 0)
                {
                    Console.WriteLine($"[ProductController.UpdateProduct] Product not found after update: {id}");
                    return NotFound(ApiResponse<object>.ErrorResponse($"Không tìm thấy sản phẩm với ID: {id} để cập nhật."));
                }

                Console.WriteLine($"[ProductController.UpdateProduct] Product updated successfully: {id}");
                
                // TRẢ VỀ THÀNH CÔNG: 200 OK
                return Ok(ApiResponse<ProductDto>.SuccessResponse(updatedProduct, "Cập nhật sản phẩm thành công."));
            }
            catch (ArgumentException ex)
            {
                Console.WriteLine($"[ProductController.UpdateProduct] ArgumentException: {ex.Message}");
                return BadRequest(ApiResponse<object>.ErrorResponse(ex.Message));
            }
            catch (Exception ex)
            {
                Console.WriteLine($"[CRITICAL DB ERROR] during UPDATE: {ex.Message}");
                Console.WriteLine($"[CRITICAL DB ERROR] StackTrace: {ex.StackTrace}");
                if (ex.InnerException != null)
                {
                    Console.WriteLine($"[CRITICAL DB ERROR] InnerException: {ex.InnerException.Message}");
                }
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

                return Ok(ApiResponse<object>.SuccessResponse(null, $"Sản phẩm {id} đã được chuyển sang trạng thái không hoạt động."));

            }
            catch (Exception ex)
            {
                Console.WriteLine($"[CRITICAL DB ERROR] during DELETE: {ex.Message}");
                return StatusCode(HttpStatusCodes.InternalServerError,
                    ApiResponse<object>.ErrorResponse("Lỗi hệ thống khi vô hiệu hóa sản phẩm.", new List<string> { ex.Message }));
            }
        }

        // ============================================
        // 6. GET ALL LIST PRODUCTS (INCLUDING DISABLED): GET api/v1/Product/GetAllListProducts
        // ============================================
        /// <summary>
        /// Lấy danh sách tất cả sản phẩm (bao gồm cả vô hiệu hóa và không vô hiệu hóa). Chỉ dành cho Admin.
        /// </summary>
        /// <response code="200">Trả về danh sách tất cả sản phẩm.</response>
        /// <response code="401">Chưa đăng nhập.</response>
        /// <response code="403">Không có quyền admin.</response>
        [HttpGet("GetAllListProducts")]
        [ProducesResponseType(typeof(ApiResponse<List<ProductDto>>), HttpStatusCodes.OK)]
        [ProducesResponseType(typeof(ApiResponse<object>), HttpStatusCodes.Unauthorized)]
        [ProducesResponseType(typeof(ApiResponse<object>), HttpStatusCodes.Forbidden)]
        public async Task<IActionResult> GetAllListProducts()
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
                    ApiResponse<object>.ErrorResponse("Chỉ có quyền admin mới được xem danh sách tất cả sản phẩm."));
            }

            try
            {
                var products = await (from p in _context.products
                                     join c in _context.categories on p.category_id equals c.category_id into categoryGroup
                                     from c in categoryGroup.DefaultIfEmpty()
                                     orderby (p.is_disabled ?? false) ascending, p.product_id descending
                                     select new
                                     {
                                         Product = p,
                                         Category = c,
                                         IsDisabledValue = p.is_disabled ?? false,
                                         StockValue = p.stock ?? 0
                                     })
                                     .ToListAsync();

                var productDtos = products.Select(x =>
                {
                    var dto = new ProductDto
                    {
                        ProductId = x.Product.product_id,
                        CategoryId = x.Product.category_id ?? 0,
                        ProductName = x.Product.product_name,
                        Description = x.Product.description ?? string.Empty,
                        Price = x.Product.price,
                        Stock = x.StockValue,
                        WarrantyPeriod = x.Product.warranty_period ?? 0,
                        ImageUrl = x.Product.image_url ?? string.Empty,
                        Specifications = x.Product.specifications,
                        Brand = x.Product.brand,
                        OnPrices = x.Product.on_prices ?? 0,
                        CategoryName = x.Category != null ? x.Category.category_name ?? "Chưa phân loại" : "Chưa phân loại",
                        IsDisabled = x.IsDisabledValue
                    };

                    // Xác định trạng thái và màu sắc
                    if (x.IsDisabledValue)
                    {
                        dto.StatusText = "Không hoạt động";
                        dto.StatusColor = "#808080"; // Màu xám
                    }
                    else if (x.StockValue == 0)
                    {
                        dto.StatusText = "Hết hàng";
                        dto.StatusColor = "#FF0000"; // Màu đỏ
                    }
                    else
                    {
                        dto.StatusText = "Đang hoạt động";
                        dto.StatusColor = "#28A745"; // Màu xanh lá
                    }

                    return dto;
                }).ToList();

                return Ok(ApiResponse<List<ProductDto>>.SuccessResponse(productDtos, "Lấy danh sách tất cả sản phẩm thành công."));
            }
            catch (Exception ex)
            {
                Console.WriteLine($"[CRITICAL ERROR] GetAllListProducts: {ex.Message}");
                return StatusCode(HttpStatusCodes.InternalServerError,
                    ApiResponse<object>.ErrorResponse("Lỗi hệ thống khi lấy danh sách sản phẩm."));
            }
        }

        // ============================================
        // 7. GET PRODUCT COUNT BY CATEGORY: GET api/v1/Product/GetProductCountByCategory
        // ============================================
        /// <summary>
        /// Đếm số lượng sản phẩm của từng danh mục. Trả về danh sách các danh mục kèm số lượng sản phẩm. Chỉ dành cho Admin.
        /// </summary>
        /// <response code="200">Trả về danh sách danh mục kèm số lượng sản phẩm.</response>
        /// <response code="401">Chưa đăng nhập.</response>
        /// <response code="403">Không có quyền admin.</response>
        [HttpGet("GetProductCountByCategory")]
        [ProducesResponseType(typeof(ApiResponse<List<object>>), HttpStatusCodes.OK)]
        [ProducesResponseType(typeof(ApiResponse<object>), HttpStatusCodes.Unauthorized)]
        [ProducesResponseType(typeof(ApiResponse<object>), HttpStatusCodes.Forbidden)]
        public async Task<IActionResult> GetProductCountByCategory()
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
                    ApiResponse<object>.ErrorResponse("Chỉ có quyền admin mới được xem thống kê số lượng sản phẩm theo danh mục."));
            }

            try
            {
                // Get all categories and products
                var allCategories = await _context.categories.ToListAsync();
                var allProducts = await _context.products
                    .Where(p => p.is_disabled != true)
                    .ToListAsync();

                // Helper function to get all descendant category IDs (recursive)
                HashSet<int> GetAllDescendantIds(int categoryId, List<category> categories)
                {
                    var result = new HashSet<int> { categoryId };
                    var children = categories.Where(c => c.parent_id == categoryId).ToList();
                    foreach (var child in children)
                    {
                        result.UnionWith(GetAllDescendantIds(child.category_id, categories));
                    }
                    return result;
                }

                // Calculate product count for each category (including products from child categories)
                var categoryProductCounts = allCategories.Select(c =>
                {
                    var allCategoryIds = GetAllDescendantIds(c.category_id, allCategories);
                    var productCount = allProducts.Count(p => allCategoryIds.Contains(p.category_id ?? 0));
                    
                    return new
                    {
                        category_id = c.category_id,
                        category_name = c.category_name,
                        product_count = productCount
                    };
                })
                .OrderByDescending(x => x.product_count)
                .ThenBy(x => x.category_name)
                .ToList();

                return Ok(ApiResponse<List<object>>.SuccessResponse(
                    categoryProductCounts.Cast<object>().ToList(), 
                    "Lấy thống kê số lượng sản phẩm theo danh mục thành công (bao gồm sản phẩm của danh mục con)."));
            }
            catch (Exception ex)
            {
                Console.WriteLine($"[CRITICAL ERROR] GetProductCountByCategory: {ex.Message}");
                return StatusCode(HttpStatusCodes.InternalServerError,
                    ApiResponse<object>.ErrorResponse("Lỗi hệ thống khi lấy thống kê số lượng sản phẩm theo danh mục."));
            }
        }

        // ============================================
        // 8. REACTIVATE PRODUCT: PUT api/v1/Product/{id}/reactivate (Admin only)
        // ============================================
        /// <summary>
        /// Kích hoạt lại sản phẩm đã ngưng bán. Chỉ dành cho Admin.
        /// </summary>
        /// <param name="id">ID của sản phẩm cần kích hoạt lại.</param>
        /// <response code="200">Kích hoạt lại sản phẩm thành công.</response>
        /// <response code="404">Không tìm thấy sản phẩm hoặc sản phẩm đã được kích hoạt.</response>
        /// <response code="401">Chưa đăng nhập.</response>
        /// <response code="403">Không có quyền admin.</response>
        [HttpPut("{id}/reactivate")]
        [ProducesResponseType(typeof(ApiResponse<object>), HttpStatusCodes.OK)]
        [ProducesResponseType(typeof(ApiResponse<object>), HttpStatusCodes.NotFound)]
        [ProducesResponseType(typeof(ApiResponse<object>), HttpStatusCodes.Unauthorized)]
        [ProducesResponseType(typeof(ApiResponse<object>), HttpStatusCodes.Forbidden)]
        public async Task<IActionResult> ReactivateProduct(int id)
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
                    ApiResponse<object>.ErrorResponse("Chỉ có quyền admin mới được kích hoạt lại sản phẩm."));
            }

            try
            {
                var adminId = GetAdminId();
                
                // Kiểm tra xem sản phẩm tồn tại không
                var product = await _productService.GetProductByIdAsync(id);
                if (product == null)
                {
                    // Kiểm tra xem sản phẩm có tồn tại nhưng đã bị vô hiệu hóa không
                    var allProducts = await (from p in _context.products
                                            where p.product_id == id
                                            select p).FirstOrDefaultAsync();
                    
                    if (allProducts == null)
                    {
                        return NotFound(ApiResponse<object>.ErrorResponse($"Không tìm thấy sản phẩm với ID: {id}."));
                    }
                }

                // Thực hiện kích hoạt lại
                var success = await _productService.ReactivateProductAsync(id, adminId);
                if (!success)
                {
                    return NotFound(ApiResponse<object>.ErrorResponse($"Sản phẩm với ID: {id} đã được kích hoạt hoặc không thể kích hoạt."));
                }

                // Lấy thông tin sản phẩm sau khi kích hoạt
                var reactivatedProduct = await _productService.GetProductByIdAsync(id);

                return Ok(ApiResponse<object>.SuccessResponse(
                    new { 
                        productId = id,
                        productName = reactivatedProduct?.ProductName,
                        reactivatedBy = adminId,
                        reactivatedAt = DateTime.UtcNow
                    }, 
                    $"Sản phẩm {id} đã được kích hoạt lại thành công."));
            }
            catch (Exception ex)
            {
                Console.WriteLine($"[CRITICAL DB ERROR] during REACTIVATE: {ex.Message}");
                return StatusCode(HttpStatusCodes.InternalServerError,
                    ApiResponse<object>.ErrorResponse("Lỗi hệ thống khi kích hoạt lại sản phẩm.", new List<string> { ex.Message }));
            }
        }

        // ============================================
        // 9. CHECK SERIAL STATUS: GET api/v1/Product/CheckSerialStatus (Admin only)
        // ============================================
        /// <summary>
        /// Kiểm tra trạng thái serial numbers của tất cả sản phẩm.
        /// Hiển thị số lượng stock, số serial hiện có, và số serial cần tạo thêm.
        /// Chỉ dành cho Admin.
        /// </summary>
        /// <response code="200">Trả về trạng thái serial của tất cả sản phẩm.</response>
        /// <response code="401">Chưa đăng nhập.</response>
        /// <response code="403">Không có quyền admin.</response>
        [HttpGet("CheckSerialStatus")]
        [ProducesResponseType(typeof(ApiResponse<object>), HttpStatusCodes.OK)]
        [ProducesResponseType(typeof(ApiResponse<object>), HttpStatusCodes.Unauthorized)]
        [ProducesResponseType(typeof(ApiResponse<object>), HttpStatusCodes.Forbidden)]
        public async Task<IActionResult> CheckSerialStatus()
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
                    ApiResponse<object>.ErrorResponse("Chỉ có quyền admin mới được xem trạng thái serial."));
            }

            try
            {
                // Lấy tất cả sản phẩm có stock > 0
                var products = await _context.products
                    .Where(p => (p.stock ?? 0) > 0 && (p.is_disabled == null || p.is_disabled == false))
                    .Select(p => new { p.product_id, p.product_name, p.stock })
                    .ToListAsync();

                var statusList = new List<object>();
                int totalSerialsNeeded = 0;
                int totalProductsNeedSerials = 0;

                foreach (var product in products)
                {
                    var productId = product.product_id;
                    var currentStock = product.stock ?? 0;

                    // Đếm số serial hiện có (chưa bán: is_sold = false, còn bảo hành: is_disabled = false)
                    var existingSerialsCount = await _context.product_serials
                        .Where(ps => ps.product_id == productId 
                                  && (ps.is_sold == null || ps.is_sold == false)
                                  && (ps.is_disabled == null || ps.is_disabled == false))
                        .CountAsync();

                    var serialsNeeded = currentStock - existingSerialsCount;

                    statusList.Add(new
                    {
                        productId = productId,
                        productName = product.product_name,
                        stock = currentStock,
                        existingSerials = existingSerialsCount,
                        serialsNeeded = serialsNeeded,
                        status = serialsNeeded > 0 ? "Thiếu serial" : serialsNeeded < 0 ? "Thừa serial" : "Đủ serial"
                    });

                    if (serialsNeeded > 0)
                    {
                        totalSerialsNeeded += serialsNeeded;
                        totalProductsNeedSerials++;
                    }
                }

                return Ok(ApiResponse<object>.SuccessResponse(
                    new
                    {
                        totalProducts = products.Count,
                        totalProductsNeedSerials = totalProductsNeedSerials,
                        totalSerialsNeeded = totalSerialsNeeded,
                        products = statusList,
                        checkedAt = DateTime.UtcNow
                    },
                    $"Đã kiểm tra {products.Count} sản phẩm. Cần tạo thêm {totalSerialsNeeded} serial cho {totalProductsNeedSerials} sản phẩm."));
            }
            catch (Exception ex)
            {
                Console.WriteLine($"[CRITICAL ERROR] CheckSerialStatus: {ex.Message}");
                Console.WriteLine($"[CRITICAL ERROR] StackTrace: {ex.StackTrace}");
                return StatusCode(HttpStatusCodes.InternalServerError,
                    ApiResponse<object>.ErrorResponse("Lỗi hệ thống khi kiểm tra trạng thái serial.", new List<string> { ex.Message }));
            }
        }

        // ============================================
        // 10. GENERATE SERIALS FOR ALL PRODUCTS: POST api/v1/Product/GenerateSerialsForAllProducts (Admin only)
        // ============================================
        /// <summary>
        /// Tạo serial numbers cho tất cả sản phẩm có stock > 0.
        /// Tự động kiểm tra số lượng stocks hiện tại và tạo serial ngay lập tức cho tất cả sản phẩm thiếu serial.
        /// Đếm số serial hiện có và tạo thêm serial cho phần thiếu để đảm bảo số serial = stock.
        /// Chỉ dành cho Admin.
        /// </summary>
        /// <response code="200">Tạo serial thành công.</response>
        /// <response code="401">Chưa đăng nhập.</response>
        /// <response code="403">Không có quyền admin.</response>
        [HttpPost("GenerateSerialsForAllProducts")]
        [ProducesResponseType(typeof(ApiResponse<object>), HttpStatusCodes.OK)]
        [ProducesResponseType(typeof(ApiResponse<object>), HttpStatusCodes.Unauthorized)]
        [ProducesResponseType(typeof(ApiResponse<object>), HttpStatusCodes.Forbidden)]
        public async Task<IActionResult> GenerateSerialsForAllProducts()
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
                    ApiResponse<object>.ErrorResponse("Chỉ có quyền admin mới được tạo serial cho sản phẩm."));
            }

            try
            {
                var adminId = GetAdminId();
                
                // Gọi service để tạo serial cho tất cả sản phẩm
                var totalSerialsCreated = await _productService.GenerateSerialsForAllProductsAsync(adminId);

                return Ok(ApiResponse<object>.SuccessResponse(
                    new { 
                        totalSerialsCreated = totalSerialsCreated,
                        generatedBy = adminId,
                        generatedAt = DateTime.UtcNow,
                        message = totalSerialsCreated > 0 
                            ? $"Đã tạo thành công {totalSerialsCreated} serial numbers cho các sản phẩm có stock > 0."
                            : "Tất cả sản phẩm đã có đủ serial numbers."
                    }, 
                    totalSerialsCreated > 0 
                        ? $"Đã tạo thành công {totalSerialsCreated} serial numbers cho các sản phẩm có stock > 0."
                        : "Tất cả sản phẩm đã có đủ serial numbers."));
            }
            catch (Exception ex)
            {
                Console.WriteLine($"[CRITICAL ERROR] GenerateSerialsForAllProducts: {ex.Message}");
                Console.WriteLine($"[CRITICAL ERROR] StackTrace: {ex.StackTrace}");
                return StatusCode(HttpStatusCodes.InternalServerError,
                    ApiResponse<object>.ErrorResponse("Lỗi hệ thống khi tạo serial cho sản phẩm.", new List<string> { ex.Message }));
            }
        }

        // ============================================
        // 10. GET PRODUCT REPORT: GET api/v1/Product/GetProductReport
        // ============================================
        /// <summary>
        /// Lấy báo cáo thống kê số lượng sản phẩm được tạo theo ngày, tháng, quý, năm để vẽ biểu đồ cột. Chỉ dành cho Admin.
        /// </summary>
        /// <param name="period">Loại báo cáo: day, month, quarter, year</param>
        /// <param name="startDate">Ngày bắt đầu (tùy chọn)</param>
        /// <param name="endDate">Ngày kết thúc (tùy chọn)</param>
        /// <response code="200">Trả về báo cáo sản phẩm.</response>
        /// <response code="400">Tham số không hợp lệ.</response>
        /// <response code="401">Chưa đăng nhập.</response>
        /// <response code="403">Không có quyền admin.</response>
        [HttpGet("GetProductReport")]
        [ProducesResponseType(typeof(ApiResponse<ReportResponse>), HttpStatusCodes.OK)]
        [ProducesResponseType(typeof(ApiResponse<object>), HttpStatusCodes.BadRequest)]
        [ProducesResponseType(typeof(ApiResponse<object>), HttpStatusCodes.Unauthorized)]
        [ProducesResponseType(typeof(ApiResponse<object>), HttpStatusCodes.Forbidden)]
        public async Task<IActionResult> GetProductReport(
            [FromQuery] string period = "day",
            [FromQuery] DateTime? startDate = null,
            [FromQuery] DateTime? endDate = null)
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
                    ApiResponse<object>.ErrorResponse("Chỉ có quyền admin mới được xem báo cáo sản phẩm."));
            }

            try
            {
                // Validate period
                period = period.ToLower();
                if (period != "day" && period != "month" && period != "quarter" && period != "year")
                {
                    return BadRequest(ApiResponse<object>.ErrorResponse("Tham số period phải là: day, month, quarter, hoặc year."));
                }

                // Set default dates if not provided (convert to UTC)
                if (!endDate.HasValue)
                {
                    endDate = DateTime.SpecifyKind(DateTime.UtcNow.Date, DateTimeKind.Utc);
                }
                else
                {
                    // Ensure UTC
                    if (endDate.Value.Kind != DateTimeKind.Utc)
                    {
                        endDate = DateTime.SpecifyKind(endDate.Value.ToUniversalTime().Date, DateTimeKind.Utc);
                    }
                    else
                    {
                        endDate = DateTime.SpecifyKind(endDate.Value.Date, DateTimeKind.Utc);
                    }
                }

                if (!startDate.HasValue)
                {
                    if (period == "day" || period == "month")
                    {
                        startDate = DateTime.SpecifyKind(endDate.Value.AddDays(-30), DateTimeKind.Utc);
                    }
                    else if (period == "quarter")
                    {
                        startDate = DateTime.SpecifyKind(endDate.Value.AddYears(-1), DateTimeKind.Utc);
                    }
                    else // year
                    {
                        startDate = DateTime.SpecifyKind(endDate.Value.AddYears(-5), DateTimeKind.Utc);
                    }
                }
                else
                {
                    // Ensure UTC
                    if (startDate.Value.Kind != DateTimeKind.Utc)
                    {
                        startDate = DateTime.SpecifyKind(startDate.Value.ToUniversalTime().Date, DateTimeKind.Utc);
                    }
                    else
                    {
                        startDate = DateTime.SpecifyKind(startDate.Value.Date, DateTimeKind.Utc);
                    }
                }

                // Validate date range
                if (startDate.Value > endDate.Value)
                {
                    return BadRequest(ApiResponse<object>.ErrorResponse("Ngày bắt đầu phải nhỏ hơn hoặc bằng ngày kết thúc."));
                }

                // Load data (use UTC dates)
                var startDateUtc = startDate.Value;
                var endDateUtc = endDate.Value.AddDays(1).AddTicks(-1); // End of day
                
                var products = await _context.products
                    .Where(p => p.created_at.HasValue &&
                                p.created_at.Value >= startDateUtc &&
                                p.created_at.Value <= endDateUtc)
                    .ToListAsync();

                // Nhóm và tính toán theo period
                List<ReportDto> reportData = new List<ReportDto>();

                if (period == "day")
                {
                    reportData = products
                        .GroupBy(p => p.created_at!.Value.Date)
                        .Select(g => new ReportDto
                        {
                            Period = g.Key.ToString("yyyy-MM-dd"),
                            Count = g.Count(),
                            PeriodStart = g.Key
                        })
                        .OrderBy(x => x.PeriodStart)
                        .ToList();
                }
                else if (period == "month")
                {
                    reportData = products
                        .GroupBy(p => new { Year = p.created_at!.Value.Year, Month = p.created_at!.Value.Month })
                        .Select(g => new ReportDto
                        {
                            Period = $"{g.Key.Year}-{g.Key.Month:D2}",
                            Count = g.Count(),
                            PeriodStart = new DateTime(g.Key.Year, g.Key.Month, 1)
                        })
                        .OrderBy(x => x.PeriodStart)
                        .ToList();
                }
                else if (period == "quarter")
                {
                    reportData = products
                        .GroupBy(p => new
                        {
                            Year = p.created_at!.Value.Year,
                            Quarter = (p.created_at!.Value.Month - 1) / 3 + 1
                        })
                        .Select(g => new ReportDto
                        {
                            Period = $"Q{g.Key.Quarter} {g.Key.Year}",
                            Count = g.Count(),
                            PeriodStart = new DateTime(g.Key.Year, (g.Key.Quarter - 1) * 3 + 1, 1)
                        })
                        .OrderBy(x => x.PeriodStart)
                        .ToList();
                }
                else // year
                {
                    reportData = products
                        .GroupBy(p => p.created_at!.Value.Year)
                        .Select(g => new ReportDto
                        {
                            Period = g.Key.ToString(),
                            Count = g.Count(),
                            PeriodStart = new DateTime(g.Key, 1, 1)
                        })
                        .OrderBy(x => x.PeriodStart)
                        .ToList();
                }

                // Tạo response
                var response = new ReportResponse
                {
                    PeriodType = period,
                    TotalCount = reportData.Sum(x => x.Count),
                    Data = reportData
                };

                return Ok(ApiResponse<ReportResponse>.SuccessResponse(
                    response,
                    $"Lấy báo cáo sản phẩm theo {period} thành công."));
            }
            catch (ArgumentException ex)
            {
                return BadRequest(ApiResponse<object>.ErrorResponse(ex.Message));
            }
            catch (Exception ex)
            {
                Console.WriteLine($"[CRITICAL ERROR] GetProductReport: {ex.Message}");
                return StatusCode(HttpStatusCodes.InternalServerError,
                    ApiResponse<object>.ErrorResponse("Lỗi hệ thống khi lấy báo cáo sản phẩm.", new List<string> { ex.Message }));
            }
        }

        // ============================================
        // 10. GET BEST SELLING PRODUCTS: GET api/v1/Product/GetBestSellingProducts
        // ============================================
        /// <summary>
        /// Lấy danh sách sản phẩm bán chạy trong tháng hiện tại, sắp xếp từ nhiều đến ít.
        /// </summary>
        /// <param name="limit">Số lượng sản phẩm cần lấy (mặc định: 10, tối đa: 100)</param>
        /// <response code="200">Trả về danh sách sản phẩm bán chạy trong tháng hiện tại.</response>
        /// <response code="500">Lỗi hệ thống.</response>
        [HttpGet("GetBestSellingProducts")]
        [ProducesResponseType(typeof(ApiResponse<List<BestSellingProductDto>>), HttpStatusCodes.OK)]
        [ProducesResponseType(typeof(ApiResponse<object>), HttpStatusCodes.InternalServerError)]
        public async Task<IActionResult> GetBestSellingProducts([FromQuery] int limit = 10)
        {
            try
            {
                // Giới hạn limit hợp lý
                limit = Math.Clamp(limit, 1, 100);

                // Lấy tháng hiện tại (UTC)
                var now = DateTime.UtcNow;
                var startOfMonth = DateTime.SpecifyKind(new DateTime(now.Year, now.Month, 1), DateTimeKind.Utc);
                var endOfMonth = startOfMonth.AddMonths(1).AddTicks(-1);

                // Lấy các đơn hàng đã hoàn thành trong tháng hiện tại
                var completedStatuses = new[] { "completed", "delivered", "paid", "shipped" };
                
                var allOrders = await _context.orders
                    .Where(o => o.order_date.HasValue &&
                                o.order_date.Value >= startOfMonth &&
                                o.order_date.Value <= endOfMonth &&
                                !string.IsNullOrEmpty(o.status))
                    .ToListAsync();

                // Filter completed orders in memory
                var completedOrderIds = allOrders
                    .Where(o => completedStatuses.Contains(o.status!.ToLower()))
                    .Select(o => o.order_id)
                    .ToList();

                if (!completedOrderIds.Any())
                {
                    return Ok(ApiResponse<List<BestSellingProductDto>>.SuccessResponse(
                        new List<BestSellingProductDto>(),
                        "Không có sản phẩm bán chạy trong tháng hiện tại."));
                }

                // Query để lấy sản phẩm bán chạy (chỉ lấy thông tin cần thiết)
                var bestSellingProducts = await (from od in _context.order_details
                                                 join p in _context.products on od.product_id equals p.product_id
                                                 where completedOrderIds.Contains(od.order_id) &&
                                                       (p.is_disabled == null || p.is_disabled == false)
                                                 group new { od, p } by new
                                                 {
                                                     p.product_id,
                                                     p.product_name,
                                                     p.image_url
                                                 } into g
                                                 select new
                                                 {
                                                     ProductId = g.Key.product_id,
                                                     ProductName = g.Key.product_name,
                                                     ImageUrl = g.Key.image_url ?? string.Empty,
                                                     TotalSold = g.Sum(x => x.od.quantity)
                                                 })
                                                 .OrderByDescending(x => x.TotalSold)
                                                 .ThenByDescending(x => x.ProductId)
                                                 .Take(limit)
                                                 .ToListAsync();

                // Chuyển đổi sang DTO
                var result = bestSellingProducts.Select(x => new BestSellingProductDto
                {
                    ProductId = x.ProductId,
                    ProductName = x.ProductName,
                    ImageUrl = x.ImageUrl,
                    TotalSold = x.TotalSold
                }).ToList();

                return Ok(ApiResponse<List<BestSellingProductDto>>.SuccessResponse(
                    result,
                    $"Lấy danh sách {result.Count} sản phẩm bán chạy trong tháng hiện tại thành công."));
            }
            catch (Exception ex)
            {
                Console.WriteLine($"[CRITICAL ERROR] GetBestSellingProducts: {ex.Message}");
                return StatusCode(HttpStatusCodes.InternalServerError,
                    ApiResponse<object>.ErrorResponse("Lỗi hệ thống khi lấy danh sách sản phẩm bán chạy.", new List<string> { ex.Message }));
            }
        }

    }
}