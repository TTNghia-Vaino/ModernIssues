using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Http;
using Microsoft.EntityFrameworkCore;
using ModernIssues.Models.DTOs;
using ModernIssues.Models.Entities;
using ModernIssues.Models.Common;
using ModernIssues.Helpers;
using System;
using System.Threading.Tasks;
using System.Linq;
using System.Collections.Generic;
using Microsoft.AspNetCore.Hosting;
using System.IO;

namespace ModernIssues.Controllers
{
    [Route("/v1/[controller]")]
    [ApiController]
    public class PromotionController : ControllerBase
    {
        private readonly WebDbContext _context;
        private readonly IWebHostEnvironment _webHostEnvironment;

        public PromotionController(WebDbContext context, IWebHostEnvironment webHostEnvironment)
        {
            _context = context;
            _webHostEnvironment = webHostEnvironment;
        }

        private int GetAdminId()
        {
            var userId = AuthHelper.GetCurrentUserId(HttpContext);
            return userId ?? 1; // Fallback to 1 if null
        }

        // ============================================
        // 1. GET ALL PROMOTIONS: GET api/v1/Promotion
        // ============================================
        /// <summary>
        /// Lấy danh sách khuyến mãi (có phân trang, tìm kiếm, lọc).
        /// </summary>
        /// <param name="page">Số trang (mặc định: 1)</param>
        /// <param name="limit">Số lượng mỗi trang (mặc định: 10, tối đa: 100)</param>
        /// <param name="search">Tìm kiếm theo tên hoặc mô tả</param>
        /// <param name="status">Lọc theo trạng thái: "active", "inactive", "expired"</param>
        /// <response code="200">Trả về danh sách khuyến mãi.</response>
        [HttpGet]
        [ProducesResponseType(typeof(ApiResponse<PromotionListResponse>), 200)]
        public async Task<IActionResult> GetAllPromotions(
            [FromQuery] int page = 1,
            [FromQuery] int limit = 10,
            [FromQuery] string? search = null,
            [FromQuery] string? status = null)
        {
            try
            {
                limit = Math.Clamp(limit, 1, 100);
                page = Math.Max(1, page);
                int offset = (page - 1) * limit;

                var query = _context.promotions.AsQueryable();

                // Filter by status
                if (!string.IsNullOrEmpty(status))
                {
                    var now = DateTime.UtcNow;
                    status = status.ToLower();
                    if (status == "active")
                    {
                        query = query.Where(p => p.is_active == true 
                            && p.start_date <= now 
                            && p.end_date >= now);
                    }
                    else if (status == "inactive")
                    {
                        query = query.Where(p => p.is_active == false 
                            || p.start_date > now);
                    }
                    else if (status == "expired")
                    {
                        query = query.Where(p => p.end_date < now);
                    }
                }

                // Search by name or description
                if (!string.IsNullOrEmpty(search))
                {
                    var searchLower = search.ToLower();
                    query = query.Where(p => 
                        (p.promotion_name != null && p.promotion_name.ToLower().Contains(searchLower)) ||
                        (p.description != null && p.description.ToLower().Contains(searchLower)));
                }

                var totalCount = await query.CountAsync();

                var promotionsData = await query
                    .OrderByDescending(p => p.created_at)
                    .Skip(offset)
                    .Take(limit)
                    .Include(p => p.products)
                    .ToListAsync();

                var promotions = promotionsData.Select(p => new PromotionListDto
                {
                    PromotionId = p.promotion_id,
                    PromotionName = p.promotion_name,
                    Description = p.description,
                    DiscountType = p.discount_type ?? "percentage",
                    DiscountValue = p.discount_value ?? 0,
                    DiscountDisplay = GetDiscountDisplay(p.discount_type ?? "percentage", p.discount_value ?? 0),
                    StartDate = p.start_date,
                    EndDate = p.end_date,
                    IsActive = p.is_active ?? false,
                    Status = GetStatusText(p.is_active, p.start_date, p.end_date),
                    ProductCount = p.products.Count,
                    BannerUrl = p.banner_url
                }).ToList();

                var response = new PromotionListResponse
                {
                    TotalCount = totalCount,
                    CurrentPage = page,
                    Limit = limit,
                    Data = promotions
                };

                return Ok(ApiResponse<PromotionListResponse>.SuccessResponse(
                    response,
                    $"Lấy danh sách {promotions.Count} khuyến mãi thành công."));
            }
            catch (Exception ex)
            {
                Console.WriteLine($"[ERROR] GetAllPromotions: {ex.Message}");
                Console.WriteLine($"[ERROR] StackTrace: {ex.StackTrace}");
                return StatusCode(500, ApiResponse<object>.ErrorResponse(
                    "Lỗi hệ thống khi lấy danh sách khuyến mãi.",
                    new List<string> { ex.Message }));
            }
        }

        // ============================================
        // 2. GET PROMOTION BY ID: GET api/v1/Promotion/{id}
        // ============================================
        /// <summary>
        /// Lấy chi tiết khuyến mãi theo ID.
        /// </summary>
        /// <param name="id">ID của khuyến mãi</param>
        /// <response code="200">Trả về chi tiết khuyến mãi.</response>
        /// <response code="404">Không tìm thấy khuyến mãi.</response>
        [HttpGet("{id}")]
        [ProducesResponseType(typeof(ApiResponse<PromotionDto>), 200)]
        [ProducesResponseType(typeof(ApiResponse<object>), 404)]
        public async Task<IActionResult> GetPromotionById(int id)
        {
            try
            {
                var promotion = await _context.promotions
                    .Include(p => p.products)
                    .Where(p => p.promotion_id == id)
                    .FirstOrDefaultAsync();

                if (promotion == null)
                {
                    return NotFound(ApiResponse<object>.ErrorResponse($"Không tìm thấy khuyến mãi với ID: {id}."));
                }

                var promotionDto = new PromotionDto
                {
                    PromotionId = promotion.promotion_id,
                    PromotionName = promotion.promotion_name,
                    Description = promotion.description,
                    DiscountType = promotion.discount_type ?? "percentage",
                    DiscountValue = promotion.discount_value ?? 0,
                    StartDate = promotion.start_date,
                    EndDate = promotion.end_date,
                    IsActive = promotion.is_active ?? false,
                    BannerUrl = promotion.banner_url,
                    CreatedAt = promotion.created_at,
                    UpdatedAt = promotion.updated_at,
                    Products = promotion.products.Select(p => new PromotionProductDto
                    {
                        ProductId = p.product_id,
                        ProductName = p.product_name,
                        ImageUrl = p.image_url,
                        Price = p.price,
                        CategoryId = p.category_id,
                        CategoryName = p.category != null ? p.category.category_name : null
                    }).ToList(),
                    CategoryIds = null, // Không lưu categories, chỉ lưu products vào product_promotions
                    ProductIds = promotion.products.Select(p => p.product_id).ToList()
                };

                return Ok(ApiResponse<PromotionDto>.SuccessResponse(
                    promotionDto,
                    "Lấy chi tiết khuyến mãi thành công."));
            }
            catch (Exception ex)
            {
                Console.WriteLine($"[ERROR] GetPromotionById: {ex.Message}");
                Console.WriteLine($"[ERROR] StackTrace: {ex.StackTrace}");
                return StatusCode(500, ApiResponse<object>.ErrorResponse(
                    "Lỗi hệ thống khi lấy chi tiết khuyến mãi.",
                    new List<string> { ex.Message }));
            }
        }

        // ============================================
        // 3. CREATE PROMOTION: POST api/v1/Promotion
        // ============================================
        /// <summary>
        /// Tạo khuyến mãi mới. Có thể upload banner và chọn danh mục/sản phẩm.
        /// Khi chọn danh mục, tự động lấy tất cả sản phẩm trong danh mục đó.
        /// </summary>
        /// <param name="promotionData">Dữ liệu khuyến mãi bao gồm thông tin và file banner (tùy chọn)</param>
        /// <response code="201">Tạo khuyến mãi thành công.</response>
        /// <response code="400">Dữ liệu không hợp lệ.</response>
        /// <response code="401">Chưa đăng nhập.</response>
        /// <response code="403">Không có quyền admin.</response>
        [HttpPost]
        [Consumes("multipart/form-data")]
        [ProducesResponseType(typeof(ApiResponse<PromotionDto>), 201)]
        [ProducesResponseType(typeof(ApiResponse<object>), 400)]
        [ProducesResponseType(typeof(ApiResponse<object>), 401)]
        [ProducesResponseType(typeof(ApiResponse<object>), 403)]
        public async Task<IActionResult> CreatePromotion([FromForm] PromotionWithImageDto promotionData)
        {
            // Kiểm tra đăng nhập
            if (!AuthHelper.IsLoggedIn(HttpContext))
            {
                return Unauthorized(ApiResponse<object>.ErrorResponse("Bạn cần đăng nhập để thực hiện thao tác này."));
            }

            // Kiểm tra quyền admin
            if (!AuthHelper.IsAdmin(HttpContext))
            {
                return StatusCode(403, ApiResponse<object>.ErrorResponse("Chỉ có quyền admin mới được tạo khuyến mãi."));
            }

            try
            {
                // Validate dữ liệu
                if (string.IsNullOrWhiteSpace(promotionData.PromotionName))
                {
                    return BadRequest(ApiResponse<object>.ErrorResponse("Tên chương trình khuyến mãi không được để trống."));
                }

                // Validate discount type và value
                if (promotionData.DiscountType != "percentage" && promotionData.DiscountType != "fixed_amount")
                {
                    return BadRequest(ApiResponse<object>.ErrorResponse("Loại khuyến mãi không hợp lệ. Chỉ chấp nhận: 'percentage' hoặc 'fixed_amount'."));
                }

                if (promotionData.DiscountType == "percentage")
                {
                    if (promotionData.DiscountValue < 0 || promotionData.DiscountValue > 100)
                    {
                        return BadRequest(ApiResponse<object>.ErrorResponse("Phần trăm giảm giá phải từ 0 đến 100."));
                    }
                }
                else if (promotionData.DiscountType == "fixed_amount")
                {
                    if (promotionData.DiscountValue < 0)
                    {
                        return BadRequest(ApiResponse<object>.ErrorResponse("Số tiền giảm giá phải lớn hơn hoặc bằng 0."));
                    }
                }

                if (promotionData.EndDate <= promotionData.StartDate)
                {
                    return BadRequest(ApiResponse<object>.ErrorResponse("Ngày kết thúc phải sau ngày bắt đầu."));
                }

                // Parse category IDs và product IDs
                var categoryIds = ParseIds(promotionData.CategoryIds);
                var productIds = ParseIds(promotionData.ProductIds);

                // Lấy tất cả sản phẩm từ các danh mục đã chọn
                var productsFromCategories = new List<int>();
                if (categoryIds != null && categoryIds.Any())
                {
                    productsFromCategories = await _context.products
                        .Where(p => p.category_id != null && categoryIds.Contains(p.category_id.Value))
                        .Select(p => p.product_id)
                        .ToListAsync();
                }

                // Gộp danh sách sản phẩm: từ danh mục + sản phẩm riêng lẻ (loại bỏ trùng lặp)
                var allProductIds = productsFromCategories
                    .Union(productIds ?? new List<int>())
                    .Distinct()
                    .ToList();

                if (!allProductIds.Any())
                {
                    return BadRequest(ApiResponse<object>.ErrorResponse("Vui lòng chọn ít nhất một danh mục hoặc sản phẩm."));
                }

                // Kiểm tra sản phẩm có tồn tại không
                var validProductIds = await _context.products
                    .Where(p => allProductIds.Contains(p.product_id))
                    .Select(p => p.product_id)
                    .ToListAsync();

                if (!validProductIds.Any())
                {
                    return BadRequest(ApiResponse<object>.ErrorResponse("Không tìm thấy sản phẩm nào hợp lệ."));
                }

                // Kiểm tra danh mục có tồn tại không
                var validCategoryIds = new List<int>();
                if (categoryIds != null && categoryIds.Any())
                {
                    validCategoryIds = await _context.categories
                        .Where(c => categoryIds.Contains(c.category_id))
                        .Select(c => c.category_id)
                        .ToListAsync();
                }

                // Xử lý upload banner
                string? bannerUrl = null;
                if (promotionData.BannerFile != null && promotionData.BannerFile.Length > 0)
                {
                    try
                    {
                        if (!ImageUploadHelper.IsValidImage(promotionData.BannerFile))
                        {
                            return BadRequest(ApiResponse<object>.ErrorResponse("File banner không hợp lệ. Chỉ chấp nhận file ảnh (jpg, jpeg, png, gif, bmp, webp) và kích thước tối đa 5MB."));
                        }

                        var uploadPath = _webHostEnvironment.WebRootPath ?? Path.Combine(Directory.GetCurrentDirectory(), "wwwroot");
                        var fileName = await ImageUploadHelper.UploadImageAsync(promotionData.BannerFile, uploadPath);
                        if (!string.IsNullOrEmpty(fileName))
                        {
                            bannerUrl = fileName;
                        }
                    }
                    catch (ArgumentException ex)
                    {
                        return BadRequest(ApiResponse<object>.ErrorResponse($"Lỗi upload banner: {ex.Message}"));
                    }
                }

                // Tạo promotion mới
                // Đảm bảo DateTime là UTC để tương thích với PostgreSQL
                var startDate = EnsureUtc(promotionData.StartDate);
                var endDate = EnsureUtc(promotionData.EndDate);

                var promotion = new promotion
                {
                    promotion_name = promotionData.PromotionName,
                    description = promotionData.Description,
                    discount_type = promotionData.DiscountType,
                    discount_value = promotionData.DiscountValue,
                    start_date = startDate,
                    end_date = endDate,
                    is_active = promotionData.IsActive,
                    banner_url = bannerUrl,
                    created_by = GetAdminId(),
                    created_at = DateTime.UtcNow,
                    updated_at = DateTime.UtcNow
                };

                _context.promotions.Add(promotion);
                await _context.SaveChangesAsync();

                // Đảm bảo promotion_id đã được set sau khi SaveChanges
                await _context.Entry(promotion).ReloadAsync();

                // Load collection products để đảm bảo navigation property được khởi tạo
                await _context.Entry(promotion).Collection(p => p.products).LoadAsync();

                // Thêm sản phẩm vào promotion
                var products = await _context.products
                    .Where(p => validProductIds.Contains(p.product_id))
                    .ToListAsync();

                // Thêm products vào promotion collection
                foreach (var product in products)
                {
                    // Kiểm tra xem product đã có trong collection chưa
                    if (!promotion.products.Any(p => p.product_id == product.product_id))
                    {
                        promotion.products.Add(product);
                    }
                }

                // Lưu vào database (tự động lưu vào bảng product_promotions)
                await _context.SaveChangesAsync();

                // Tự động cập nhật onprices cho tất cả sản phẩm trong promotion
                await UpdateProductOnPricesAsync(promotion, products);

                // Reload để lấy đầy đủ thông tin
                await _context.Entry(promotion).Collection(p => p.products).LoadAsync();

                var promotionDto = MapToDto(promotion);

                return StatusCode(201, ApiResponse<PromotionDto>.SuccessResponse(
                    promotionDto,
                    "Tạo khuyến mãi thành công."));
            }
            catch (Exception ex)
            {
                var errorMessages = new List<string> { ex.Message };
                if (ex.InnerException != null)
                {
                    errorMessages.Add($"Inner Exception: {ex.InnerException.Message}");
                    Console.WriteLine($"[ERROR] CreatePromotion InnerException: {ex.InnerException.Message}");
                }
                Console.WriteLine($"[ERROR] CreatePromotion: {ex.Message}");
                Console.WriteLine($"[ERROR] StackTrace: {ex.StackTrace}");
                return StatusCode(500, ApiResponse<object>.ErrorResponse(
                    "Lỗi hệ thống khi tạo khuyến mãi.",
                    errorMessages));
            }
        }

        // ============================================
        // 4. UPDATE PROMOTION: PUT api/v1/Promotion/{id}
        // ============================================
        /// <summary>
        /// Cập nhật khuyến mãi. Có thể upload banner mới và thay đổi danh mục/sản phẩm.
        /// Khi chọn danh mục, tự động lấy tất cả sản phẩm trong danh mục đó.
        /// </summary>
        /// <param name="id">ID của khuyến mãi cần cập nhật</param>
        /// <param name="promotionData">Dữ liệu khuyến mãi bao gồm thông tin và file banner (tùy chọn)</param>
        /// <response code="200">Cập nhật khuyến mãi thành công.</response>
        /// <response code="400">Dữ liệu không hợp lệ.</response>
        /// <response code="404">Không tìm thấy khuyến mãi.</response>
        /// <response code="401">Chưa đăng nhập.</response>
        /// <response code="403">Không có quyền admin.</response>
        [HttpPut("{id}")]
        [Consumes("multipart/form-data")]
        [ProducesResponseType(typeof(ApiResponse<PromotionDto>), 200)]
        [ProducesResponseType(typeof(ApiResponse<object>), 400)]
        [ProducesResponseType(typeof(ApiResponse<object>), 404)]
        [ProducesResponseType(typeof(ApiResponse<object>), 401)]
        [ProducesResponseType(typeof(ApiResponse<object>), 403)]
        public async Task<IActionResult> UpdatePromotion(int id, [FromForm] PromotionWithImageDto promotionData)
        {
            // Kiểm tra đăng nhập
            if (!AuthHelper.IsLoggedIn(HttpContext))
            {
                return Unauthorized(ApiResponse<object>.ErrorResponse("Bạn cần đăng nhập để thực hiện thao tác này."));
            }

            // Kiểm tra quyền admin
            if (!AuthHelper.IsAdmin(HttpContext))
            {
                return StatusCode(403, ApiResponse<object>.ErrorResponse("Chỉ có quyền admin mới được cập nhật khuyến mãi."));
            }

            try
            {
                var promotion = await _context.promotions
                    .Include(p => p.products)
                    .Where(p => p.promotion_id == id)
                    .FirstOrDefaultAsync();

                if (promotion == null)
                {
                    return NotFound(ApiResponse<object>.ErrorResponse($"Không tìm thấy khuyến mãi với ID: {id}."));
                }

                // Validate dữ liệu
                if (string.IsNullOrWhiteSpace(promotionData.PromotionName))
                {
                    return BadRequest(ApiResponse<object>.ErrorResponse("Tên chương trình khuyến mãi không được để trống."));
                }

                // Validate discount type và value
                if (promotionData.DiscountType != "percentage" && promotionData.DiscountType != "fixed_amount")
                {
                    return BadRequest(ApiResponse<object>.ErrorResponse("Loại khuyến mãi không hợp lệ. Chỉ chấp nhận: 'percentage' hoặc 'fixed_amount'."));
                }

                if (promotionData.DiscountType == "percentage")
                {
                    if (promotionData.DiscountValue < 0 || promotionData.DiscountValue > 100)
                    {
                        return BadRequest(ApiResponse<object>.ErrorResponse("Phần trăm giảm giá phải từ 0 đến 100."));
                    }
                }
                else if (promotionData.DiscountType == "fixed_amount")
                {
                    if (promotionData.DiscountValue < 0)
                    {
                        return BadRequest(ApiResponse<object>.ErrorResponse("Số tiền giảm giá phải lớn hơn hoặc bằng 0."));
                    }
                }

                if (promotionData.EndDate <= promotionData.StartDate)
                {
                    return BadRequest(ApiResponse<object>.ErrorResponse("Ngày kết thúc phải sau ngày bắt đầu."));
                }

                // Parse category IDs và product IDs
                var categoryIds = ParseIds(promotionData.CategoryIds);
                var productIds = ParseIds(promotionData.ProductIds);

                // Lấy tất cả sản phẩm từ các danh mục đã chọn
                var productsFromCategories = new List<int>();
                if (categoryIds != null && categoryIds.Any())
                {
                    productsFromCategories = await _context.products
                        .Where(p => p.category_id != null && categoryIds.Contains(p.category_id.Value))
                        .Select(p => p.product_id)
                        .ToListAsync();
                }

                // Gộp danh sách sản phẩm: từ danh mục + sản phẩm riêng lẻ (loại bỏ trùng lặp)
                var allProductIds = productsFromCategories
                    .Union(productIds ?? new List<int>())
                    .Distinct()
                    .ToList();

                if (!allProductIds.Any())
                {
                    return BadRequest(ApiResponse<object>.ErrorResponse("Vui lòng chọn ít nhất một danh mục hoặc sản phẩm."));
                }

                // Kiểm tra sản phẩm có tồn tại không
                var validProductIds = await _context.products
                    .Where(p => allProductIds.Contains(p.product_id))
                    .Select(p => p.product_id)
                    .ToListAsync();

                if (!validProductIds.Any())
                {
                    return BadRequest(ApiResponse<object>.ErrorResponse("Không tìm thấy sản phẩm nào hợp lệ."));
                }

                // Xử lý upload banner mới (nếu có)
                if (promotionData.BannerFile != null && promotionData.BannerFile.Length > 0)
                {
                    try
                    {
                        if (!ImageUploadHelper.IsValidImage(promotionData.BannerFile))
                        {
                            return BadRequest(ApiResponse<object>.ErrorResponse("File banner không hợp lệ. Chỉ chấp nhận file ảnh (jpg, jpeg, png, gif, bmp, webp) và kích thước tối đa 5MB."));
                        }

                        var uploadPath = _webHostEnvironment.WebRootPath ?? Path.Combine(Directory.GetCurrentDirectory(), "wwwroot");
                        var fileName = await ImageUploadHelper.UploadImageAsync(promotionData.BannerFile, uploadPath);
                        if (!string.IsNullOrEmpty(fileName))
                        {
                            // Xóa banner cũ nếu có
                            if (!string.IsNullOrEmpty(promotion.banner_url))
                            {
                                try
                                {
                                    var oldBannerPath = Path.Combine(uploadPath, "Uploads", "Images", promotion.banner_url);
                                    if (System.IO.File.Exists(oldBannerPath))
                                    {
                                        System.IO.File.Delete(oldBannerPath);
                                    }
                                }
                                catch { /* Ignore delete errors */ }
                            }
                            promotion.banner_url = fileName;
                        }
                    }
                    catch (ArgumentException ex)
                    {
                        return BadRequest(ApiResponse<object>.ErrorResponse($"Lỗi upload banner: {ex.Message}"));
                    }
                }

                // Lưu danh sách sản phẩm cũ để cập nhật onprices sau
                var oldProductIds = promotion.products.Select(p => p.product_id).ToList();

                // Cập nhật thông tin promotion
                // Đảm bảo DateTime là UTC để tương thích với PostgreSQL
                var startDate = EnsureUtc(promotionData.StartDate);
                var endDate = EnsureUtc(promotionData.EndDate);

                promotion.promotion_name = promotionData.PromotionName;
                promotion.description = promotionData.Description;
                promotion.discount_type = promotionData.DiscountType;
                promotion.discount_value = promotionData.DiscountValue;
                promotion.start_date = startDate;
                promotion.end_date = endDate;
                promotion.is_active = promotionData.IsActive;
                promotion.updated_by = GetAdminId();
                promotion.updated_at = DateTime.UtcNow;

                // Load collection products để đảm bảo navigation property được khởi tạo
                await _context.Entry(promotion).Collection(p => p.products).LoadAsync();

                // Xóa tất cả sản phẩm cũ
                promotion.products.Clear();

                // Thêm sản phẩm mới (tự động lưu vào bảng product_promotions)
                var products = await _context.products
                    .Where(p => validProductIds.Contains(p.product_id))
                    .ToListAsync();

                // Thêm products vào promotion collection
                foreach (var product in products)
                {
                    promotion.products.Add(product);
                }

                // Lưu vào database (tự động lưu vào bảng product_promotions)
                await _context.SaveChangesAsync();

                // Cập nhật onprices cho sản phẩm cũ (reset về giá gốc)
                var oldProducts = await _context.products
                    .Where(p => oldProductIds.Contains(p.product_id) && !validProductIds.Contains(p.product_id))
                    .ToListAsync();
                await ResetProductOnPricesAsync(oldProducts);

                // Tự động cập nhật onprices cho tất cả sản phẩm mới trong promotion
                await UpdateProductOnPricesAsync(promotion, products);

                // Reload để lấy đầy đủ thông tin
                await _context.Entry(promotion).Collection(p => p.products).LoadAsync();

                var promotionDto = MapToDto(promotion);

                return Ok(ApiResponse<PromotionDto>.SuccessResponse(
                    promotionDto,
                    "Cập nhật khuyến mãi thành công."));
            }
            catch (Exception ex)
            {
                var errorMessages = new List<string> { ex.Message };
                if (ex.InnerException != null)
                {
                    errorMessages.Add($"Inner Exception: {ex.InnerException.Message}");
                    Console.WriteLine($"[ERROR] UpdatePromotion InnerException: {ex.InnerException.Message}");
                }
                Console.WriteLine($"[ERROR] UpdatePromotion: {ex.Message}");
                Console.WriteLine($"[ERROR] StackTrace: {ex.StackTrace}");
                return StatusCode(500, ApiResponse<object>.ErrorResponse(
                    "Lỗi hệ thống khi cập nhật khuyến mãi.",
                    errorMessages));
            }
        }

        // ============================================
        // Helper Methods
        // ============================================

        /// <summary>
        /// Convert DateTime sang UTC để tương thích với PostgreSQL
        /// </summary>
        private static DateTime EnsureUtc(DateTime dateTime)
        {
            if (dateTime.Kind == DateTimeKind.Utc)
                return dateTime;
            
            if (dateTime.Kind == DateTimeKind.Local)
                return dateTime.ToUniversalTime();
            
            // Unspecified: giả định là UTC (thường từ JSON parse)
            return DateTime.SpecifyKind(dateTime, DateTimeKind.Utc);
        }

        private List<int>? ParseIds(string? idsString)
        {
            if (string.IsNullOrWhiteSpace(idsString))
                return null;

            try
            {
                // Thử parse JSON array string: "[1,2,3]"
                if (idsString.TrimStart().StartsWith("["))
                {
                    var jsonArray = System.Text.Json.JsonSerializer.Deserialize<List<int>>(idsString);
                    return jsonArray?.Where(id => id > 0).ToList();
                }

                // Parse comma-separated: "1,2,3"
                return idsString.Split(',', StringSplitOptions.RemoveEmptyEntries)
                    .Select(s => int.TryParse(s.Trim(), out var id) ? id : 0)
                    .Where(id => id > 0)
                    .ToList();
            }
            catch
            {
                return null;
            }
        }

        private static string GetStatusText(bool? isActive, DateTime startDate, DateTime endDate)
        {
            var now = DateTime.UtcNow;
            if (isActive == false || startDate > now)
            {
                return "Chưa kích hoạt";
            }
            if (endDate < now)
            {
                return "Đã hết hạn";
            }
            return "Đang hoạt động";
        }

        private PromotionDto MapToDto(promotion p)
        {
            return new PromotionDto
            {
                PromotionId = p.promotion_id,
                PromotionName = p.promotion_name,
                Description = p.description,
                DiscountType = p.discount_type ?? "percentage",
                DiscountValue = p.discount_value ?? 0,
                StartDate = p.start_date,
                EndDate = p.end_date,
                IsActive = p.is_active ?? false,
                BannerUrl = p.banner_url,
                CreatedAt = p.created_at,
                UpdatedAt = p.updated_at,
                Products = p.products.Select(pr => new PromotionProductDto
                {
                    ProductId = pr.product_id,
                    ProductName = pr.product_name,
                    ImageUrl = pr.image_url,
                    Price = pr.price,
                    CategoryId = pr.category_id,
                    CategoryName = pr.category != null ? pr.category.category_name : null
                }).ToList(),
                CategoryIds = null, // Không lưu categories, chỉ lưu products vào product_promotions
                ProductIds = p.products.Select(pr => pr.product_id).ToList()
            };
        }

        /// <summary>
        /// Tính toán giá sau khuyến mãi (onprices) dựa trên loại khuyến mãi
        /// </summary>
        private decimal CalculateOnPrice(decimal originalPrice, string discountType, decimal discountValue)
        {
            if (discountType == "percentage")
            {
                // Giảm theo phần trăm: onprices = price * (1 - discountValue/100)
                var discountAmount = originalPrice * (discountValue / 100m);
                return Math.Max(0, originalPrice - discountAmount);
            }
            else if (discountType == "fixed_amount")
            {
                // Giảm theo số tiền trực tiếp: onprices = price - discountValue
                return Math.Max(0, originalPrice - discountValue);
            }
            return originalPrice;
        }

        /// <summary>
        /// Cập nhật onprices cho các sản phẩm trong promotion
        /// </summary>
        private async Task UpdateProductOnPricesAsync(promotion promotion, List<product> products)
        {
            if (!products.Any() || promotion.discount_value == null)
                return;

            var now = DateTime.UtcNow;
            // Chỉ cập nhật nếu promotion đang active và trong thời gian hiệu lực
            if (promotion.is_active == true && promotion.start_date <= now && promotion.end_date >= now)
            {
                foreach (var product in products)
                {
                    var newOnPrice = CalculateOnPrice(
                        product.price,
                        promotion.discount_type ?? "percentage",
                        promotion.discount_value.Value
                    );
                    product.on_prices = newOnPrice;
                    product.updated_at = DateTime.UtcNow;
                }

                await _context.SaveChangesAsync();
            }
        }

        /// <summary>
        /// Reset onprices về giá gốc cho các sản phẩm (khi promotion hết hạn hoặc bị xóa)
        /// </summary>
        private async Task ResetProductOnPricesAsync(List<product> products)
        {
            if (!products.Any())
                return;

            foreach (var product in products)
            {
                // Kiểm tra xem sản phẩm có promotion khác đang active không
                var activePromotions = await _context.promotions
                    .Where(p => p.products.Any(pr => pr.product_id == product.product_id)
                        && p.is_active == true
                        && p.start_date <= DateTime.UtcNow
                        && p.end_date >= DateTime.UtcNow)
                    .OrderByDescending(p => p.created_at)
                    .FirstOrDefaultAsync();

                if (activePromotions != null && activePromotions.discount_value.HasValue)
                {
                    // Áp dụng promotion mới nhất
                    product.on_prices = CalculateOnPrice(
                        product.price,
                        activePromotions.discount_type ?? "percentage",
                        activePromotions.discount_value.Value
                    );
                }
                else
                {
                    // Không có promotion nào, reset về giá gốc
                    product.on_prices = product.price;
                }
                product.updated_at = DateTime.UtcNow;
            }

            await _context.SaveChangesAsync();
        }

        /// <summary>
        /// Lấy chuỗi hiển thị discount: "20%" hoặc "50,000 VNĐ"
        /// </summary>
        private static string GetDiscountDisplay(string discountType, decimal discountValue)
        {
            if (discountType == "percentage")
            {
                return $"{discountValue:F0}%";
            }
            else if (discountType == "fixed_amount")
            {
                return $"{discountValue:N0} VNĐ";
            }
            return string.Empty;
        }
    }
}

