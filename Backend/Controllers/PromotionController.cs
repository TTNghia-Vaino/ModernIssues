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
        // 1. GET ALL PROMOTIONS: GET api/v1/Promotion/GetAllPromotions
        // ============================================
        /// <summary>
        /// Lấy danh sách khuyến mãi (có phân trang, tìm kiếm, lọc).
        /// </summary>
        /// <param name="page">Số trang (mặc định: 1)</param>
        /// <param name="limit">Số lượng mỗi trang (mặc định: 10, tối đa: 100)</param>
        /// <param name="search">Tìm kiếm theo tên hoặc mô tả</param>
        /// <param name="status">Lọc theo trạng thái: "active", "inactive", "expired"</param>
        /// <response code="200">Trả về danh sách khuyến mãi.</response>
        [HttpGet("GetAllPromotions")]
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

                // Reload promotion để lấy danh sách sản phẩm đầy đủ
                await _context.Entry(promotion).ReloadAsync();
                await _context.Entry(promotion).Collection(p => p.products).LoadAsync();

                // Lấy lại danh sách sản phẩm từ database để đảm bảo có đầy đủ thông tin
                var allProductsInPromotion = await _context.products
                    .Where(p => promotion.products.Any(pr => pr.product_id == p.product_id))
                    .ToListAsync();

                // Tự động cập nhật onprices cho tất cả sản phẩm trong promotion
                // Điều này đảm bảo khi tạo promotion mới, tất cả sản phẩm được cập nhật đúng
                // và nếu sản phẩm đã có promotion khác, sẽ được xử lý đúng bởi UpdateProductOnPricesAsync
                await UpdateProductOnPricesAsync(promotion, allProductsInPromotion);

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

                // Reload promotion để lấy danh sách sản phẩm mới nhất
                await _context.Entry(promotion).ReloadAsync();
                await _context.Entry(promotion).Collection(p => p.products).LoadAsync();

                // Lấy danh sách sản phẩm hiện tại trong promotion sau khi update
                var currentProductIds = promotion.products.Select(p => p.product_id).ToList();

                // Reset onprices cho sản phẩm bị loại bỏ khỏi promotion (có trong old nhưng không có trong new)
                var removedProductIds = oldProductIds.Where(id => !currentProductIds.Contains(id)).ToList();
                if (removedProductIds.Any())
                {
                    var removedProducts = await _context.products
                        .Where(p => removedProductIds.Contains(p.product_id))
                        .ToListAsync();
                    await ResetProductOnPricesAsync(removedProducts);
                }

                // Cập nhật onprices cho TẤT CẢ sản phẩm hiện tại trong promotion
                // (bao gồm cả sản phẩm mới và sản phẩm đã có từ trước)
                // Điều này đảm bảo khi thay đổi discount_value, discount_type, start_date, end_date, is_active
                // thì tất cả sản phẩm đều được cập nhật đúng
                var allCurrentProducts = await _context.products
                    .Where(p => currentProductIds.Contains(p.product_id))
                    .ToListAsync();
                
                await UpdateProductOnPricesAsync(promotion, allCurrentProducts);

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
        // 5. TOGGLE PROMOTION STATUS: PUT api/v1/Promotion/{id}/toggle
        // ============================================
        /// <summary>
        /// Vô hiệu hóa hoặc kích hoạt khuyến mãi. Chỉ dành cho Admin.
        /// Khi vô hiệu hóa, tự động reset giá sản phẩm về giá gốc.
        /// </summary>
        /// <param name="id">ID của khuyến mãi cần thay đổi trạng thái</param>
        /// <response code="200">Thay đổi trạng thái thành công.</response>
        /// <response code="404">Không tìm thấy khuyến mãi.</response>
        /// <response code="401">Chưa đăng nhập.</response>
        /// <response code="403">Không có quyền admin.</response>
        [HttpPut("{id}/toggle")]
        [ProducesResponseType(typeof(ApiResponse<PromotionDto>), 200)]
        [ProducesResponseType(typeof(ApiResponse<object>), 404)]
        [ProducesResponseType(typeof(ApiResponse<object>), 401)]
        [ProducesResponseType(typeof(ApiResponse<object>), 403)]
        public async Task<IActionResult> TogglePromotionStatus(int id)
        {
            // Kiểm tra đăng nhập
            if (!AuthHelper.IsLoggedIn(HttpContext))
            {
                return Unauthorized(ApiResponse<object>.ErrorResponse("Bạn cần đăng nhập để thực hiện thao tác này."));
            }

            // Kiểm tra quyền admin
            if (!AuthHelper.IsAdmin(HttpContext))
            {
                return StatusCode(403, ApiResponse<object>.ErrorResponse("Chỉ có quyền admin mới được thay đổi trạng thái khuyến mãi."));
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

                // Lưu trạng thái cũ
                var oldStatus = promotion.is_active ?? false;
                
                // Toggle trạng thái
                promotion.is_active = !oldStatus;
                promotion.updated_by = GetAdminId();
                promotion.updated_at = DateTime.UtcNow;

                await _context.SaveChangesAsync();

                // Reload products để đảm bảo có danh sách đầy đủ
                await _context.Entry(promotion).Collection(p => p.products).LoadAsync();
                var products = promotion.products.ToList();

                // Nếu đang vô hiệu hóa (từ active -> inactive), reset giá sản phẩm về giá gốc
                var newStatus = promotion.is_active ?? false;
                if (oldStatus && !newStatus)
                {
                    // Vô hiệu hóa: reset onprices cho tất cả sản phẩm
                    // ResetProductOnPricesAsync sẽ tự động tìm promotion active khác nếu có
                    await ResetProductOnPricesAsync(products);
                }
                // Nếu đang kích hoạt (từ inactive -> active), cập nhật giá khuyến mãi
                else if (!oldStatus && newStatus)
                {
                    // Kích hoạt: cập nhật onprices cho tất cả sản phẩm
                    // UpdateProductOnPricesAsync sẽ tự động xử lý trường hợp có nhiều promotions
                    await UpdateProductOnPricesAsync(promotion, products);
                }
                // Nếu không thay đổi trạng thái (có thể do toggle lại), vẫn cập nhật để đảm bảo onprices đúng
                else
                {
                    // Đảm bảo onprices luôn đúng với trạng thái hiện tại
                    await UpdateProductOnPricesAsync(promotion, products);
                }

                // Reload để lấy đầy đủ thông tin
                await _context.Entry(promotion).Collection(p => p.products).LoadAsync();

                var promotionDto = MapToDto(promotion);

                var statusText = (promotion.is_active ?? false) ? "kích hoạt" : "vô hiệu hóa";
                return Ok(ApiResponse<PromotionDto>.SuccessResponse(
                    promotionDto,
                    $"Đã {statusText} khuyến mãi thành công."));
            }
            catch (Exception ex)
            {
                Console.WriteLine($"[ERROR] TogglePromotionStatus: {ex.Message}");
                Console.WriteLine($"[ERROR] StackTrace: {ex.StackTrace}");
                return StatusCode(500, ApiResponse<object>.ErrorResponse(
                    "Lỗi hệ thống khi thay đổi trạng thái khuyến mãi.",
                    new List<string> { ex.Message }));
            }
        }

        // ============================================
        // 6. AUTO UPDATE PRODUCT PRICES: POST api/v1/Promotion/UpdatePrices
        // ============================================
        /// <summary>
        /// Tự động cập nhật onprices cho tất cả sản phẩm có promotion đang active.
        /// API này có thể được gọi thủ công hoặc schedule để chạy tự động định kỳ.
        /// Chỉ dành cho Admin.
        /// </summary>
        /// <param name="promotionId">ID của promotion cụ thể (tùy chọn). Nếu không có, sẽ cập nhật cho tất cả promotions đang active.</param>
        /// <response code="200">Cập nhật giá sản phẩm thành công.</response>
        /// <response code="404">Không tìm thấy promotion (nếu có promotionId).</response>
        /// <response code="401">Chưa đăng nhập.</response>
        /// <response code="403">Không có quyền admin.</response>
        [HttpPost("UpdatePrices")]
        [ProducesResponseType(typeof(ApiResponse<UpdatePricesResponse>), 200)]
        [ProducesResponseType(typeof(ApiResponse<object>), 404)]
        [ProducesResponseType(typeof(ApiResponse<object>), 401)]
        [ProducesResponseType(typeof(ApiResponse<object>), 403)]
        public async Task<IActionResult> AutoUpdateProductPrices([FromQuery] int? promotionId = null)
        {
            // Kiểm tra đăng nhập
            if (!AuthHelper.IsLoggedIn(HttpContext))
            {
                return Unauthorized(ApiResponse<object>.ErrorResponse("Bạn cần đăng nhập để thực hiện thao tác này."));
            }

            // Kiểm tra quyền admin
            if (!AuthHelper.IsAdmin(HttpContext))
            {
                return StatusCode(403, ApiResponse<object>.ErrorResponse("Chỉ có quyền admin mới được cập nhật giá sản phẩm."));
            }

            try
            {
                var now = DateTime.UtcNow;
                var updatedProductCount = 0;
                var processedPromotionCount = 0;
                var resetProductCount = 0;
                var promotionDetails = new List<PromotionUpdateDetail>();

                if (promotionId.HasValue)
                {
                    // Cập nhật cho một promotion cụ thể
                    var promotion = await _context.promotions
                        .Include(p => p.products)
                        .Where(p => p.promotion_id == promotionId.Value)
                        .FirstOrDefaultAsync();

                    if (promotion == null)
                    {
                        return NotFound(ApiResponse<object>.ErrorResponse($"Không tìm thấy khuyến mãi với ID: {promotionId.Value}."));
                    }

                    var products = promotion.products.ToList();
                    var productCount = products.Count;

                    // Kiểm tra nếu promotion đang active và trong thời gian hiệu lực
                    if (promotion.is_active == true && promotion.start_date <= now && promotion.end_date >= now)
                    {
                        await UpdateProductOnPricesAsync(promotion, products);
                        updatedProductCount = productCount;
                        promotionDetails.Add(new PromotionUpdateDetail
                        {
                            PromotionId = promotion.promotion_id,
                            PromotionName = promotion.promotion_name,
                            UpdatedProductCount = productCount,
                            Status = "updated"
                        });
                    }
                    else
                    {
                        // Promotion không active hoặc hết hạn, reset giá về giá gốc
                        await ResetProductOnPricesAsync(products);
                        resetProductCount = productCount;
                        promotionDetails.Add(new PromotionUpdateDetail
                        {
                            PromotionId = promotion.promotion_id,
                            PromotionName = promotion.promotion_name,
                            UpdatedProductCount = productCount,
                            Status = "reset"
                        });
                    }
                    processedPromotionCount = 1;
                }
                else
                {
                    // Cập nhật cho tất cả promotions
                    var allPromotions = await _context.promotions
                        .Include(p => p.products)
                        .ToListAsync();

                    var activePromotions = allPromotions
                        .Where(p => p.is_active == true 
                            && p.start_date <= now 
                            && p.end_date >= now
                            && p.discount_value.HasValue)
                        .OrderByDescending(p => p.created_at)
                        .ToList();

                    // Lấy tất cả sản phẩm có trong promotions
                    var allProductIds = allPromotions
                        .SelectMany(p => p.products.Select(pr => pr.product_id))
                        .Distinct()
                        .ToList();

                    if (allProductIds.Any())
                    {
                        var allProducts = await _context.products
                            .Where(p => allProductIds.Contains(p.product_id))
                            .ToListAsync();

                        // Dictionary để track promotion được áp dụng cho mỗi sản phẩm
                        // Ưu tiên promotion mới nhất (đã sort ở trên)
                        var productPromotionMap = new Dictionary<int, promotion>();

                        // Với mỗi sản phẩm, tìm promotion active mới nhất
                        foreach (var product in allProducts)
                        {
                            var applicablePromotion = activePromotions
                                .FirstOrDefault(p => p.products.Any(pr => pr.product_id == product.product_id));

                            if (applicablePromotion != null && !productPromotionMap.ContainsKey(product.product_id))
                            {
                                productPromotionMap[product.product_id] = applicablePromotion;
                            }
                        }

                        // Nhóm sản phẩm theo promotion để cập nhật
                        var promotionGroups = productPromotionMap
                            .GroupBy(kvp => kvp.Value.promotion_id)
                            .ToList();

                        foreach (var group in promotionGroups)
                        {
                            var promotion = group.First().Value;
                            var productIds = group.Select(g => g.Key).ToList();
                            var products = allProducts.Where(p => productIds.Contains(p.product_id)).ToList();

                            if (products.Any())
                            {
                                await UpdateProductOnPricesAsync(promotion, products);
                                updatedProductCount += products.Count;
                                promotionDetails.Add(new PromotionUpdateDetail
                                {
                                    PromotionId = promotion.promotion_id,
                                    PromotionName = promotion.promotion_name,
                                    UpdatedProductCount = products.Count,
                                    Status = "updated"
                                });
                            }
                        }

                        // Reset giá cho sản phẩm không có promotion active nào
                        var productsWithoutActivePromotion = allProducts
                            .Where(p => !productPromotionMap.ContainsKey(p.product_id))
                            .ToList();

                        if (productsWithoutActivePromotion.Any())
                        {
                            await ResetProductOnPricesAsync(productsWithoutActivePromotion);
                            resetProductCount += productsWithoutActivePromotion.Count;
                        }

                        // Thêm thông tin về promotions đã hết hạn hoặc inactive
                        var expiredOrInactivePromotions = allPromotions
                            .Where(p => p.is_active == false || p.end_date < now || p.start_date > now)
                            .ToList();

                        foreach (var promotion in expiredOrInactivePromotions)
                        {
                            var products = promotion.products.ToList();
                            if (products.Any())
                            {
                                var alreadyCounted = promotionDetails.Any(d => d.PromotionId == promotion.promotion_id);
                                if (!alreadyCounted)
                                {
                                    promotionDetails.Add(new PromotionUpdateDetail
                                    {
                                        PromotionId = promotion.promotion_id,
                                        PromotionName = promotion.promotion_name,
                                        UpdatedProductCount = 0,
                                        Status = "expired_or_inactive"
                                    });
                                }
                            }
                        }
                    }

                    processedPromotionCount = allPromotions.Count;
                }

                var response = new UpdatePricesResponse
                {
                    ProcessedPromotionCount = processedPromotionCount,
                    UpdatedProductCount = updatedProductCount,
                    ResetProductCount = resetProductCount,
                    TotalAffectedProducts = updatedProductCount + resetProductCount,
                    PromotionDetails = promotionDetails,
                    ProcessedAt = DateTime.UtcNow
                };

                var message = promotionId.HasValue
                    ? $"Đã cập nhật giá cho {updatedProductCount} sản phẩm và reset {resetProductCount} sản phẩm của promotion {promotionId.Value}."
                    : $"Đã cập nhật giá cho {updatedProductCount} sản phẩm và reset {resetProductCount} sản phẩm từ {processedPromotionCount} promotions.";

                return Ok(ApiResponse<UpdatePricesResponse>.SuccessResponse(
                    response,
                    message));
            }
            catch (Exception ex)
            {
                Console.WriteLine($"[ERROR] AutoUpdateProductPrices: {ex.Message}");
                Console.WriteLine($"[ERROR] StackTrace: {ex.StackTrace}");
                return StatusCode(500, ApiResponse<object>.ErrorResponse(
                    "Lỗi hệ thống khi cập nhật giá sản phẩm.",
                    new List<string> { ex.Message }));
            }
        }

        // ============================================
        // 7. DELETE PROMOTION: DELETE api/v1/Promotion/{id}
        // ============================================
        /// <summary>
        /// Xóa khuyến mãi. Chỉ dành cho Admin.
        /// Khi xóa, tự động reset giá sản phẩm về giá gốc và xóa banner nếu có.
        /// </summary>
        /// <param name="id">ID của khuyến mãi cần xóa</param>
        /// <response code="200">Xóa khuyến mãi thành công.</response>
        /// <response code="404">Không tìm thấy khuyến mãi.</response>
        /// <response code="401">Chưa đăng nhập.</response>
        /// <response code="403">Không có quyền admin.</response>
        [HttpDelete("{id}")]
        [ProducesResponseType(typeof(ApiResponse<object>), 200)]
        [ProducesResponseType(typeof(ApiResponse<object>), 404)]
        [ProducesResponseType(typeof(ApiResponse<object>), 401)]
        [ProducesResponseType(typeof(ApiResponse<object>), 403)]
        public async Task<IActionResult> DeletePromotion(int id)
        {
            // Kiểm tra đăng nhập
            if (!AuthHelper.IsLoggedIn(HttpContext))
            {
                return Unauthorized(ApiResponse<object>.ErrorResponse("Bạn cần đăng nhập để thực hiện thao tác này."));
            }

            // Kiểm tra quyền admin
            if (!AuthHelper.IsAdmin(HttpContext))
            {
                return StatusCode(403, ApiResponse<object>.ErrorResponse("Chỉ có quyền admin mới được xóa khuyến mãi."));
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

                // Lưu danh sách sản phẩm để reset giá sau khi xóa
                var products = promotion.products.ToList();
                var productIds = products.Select(p => p.product_id).ToList();

                // Xóa banner nếu có
                if (!string.IsNullOrEmpty(promotion.banner_url))
                {
                    try
                    {
                        var uploadPath = _webHostEnvironment.WebRootPath ?? Path.Combine(Directory.GetCurrentDirectory(), "wwwroot");
                        var bannerPath = Path.Combine(uploadPath, "Uploads", "Images", promotion.banner_url);
                        if (System.IO.File.Exists(bannerPath))
                        {
                            System.IO.File.Delete(bannerPath);
                        }
                    }
                    catch (Exception ex)
                    {
                        Console.WriteLine($"[WARNING] Cannot delete banner: {ex.Message}");
                        // Tiếp tục xóa promotion dù không xóa được banner
                    }
                }

                // Xóa promotion (sẽ tự động xóa các bản ghi trong product_promotions)
                _context.promotions.Remove(promotion);
                await _context.SaveChangesAsync();

                // Reset giá sản phẩm về giá gốc
                if (products.Any())
                {
                    await ResetProductOnPricesAsync(products);
                }

                return Ok(ApiResponse<object>.SuccessResponse(
                    new { promotionId = id },
                    "Xóa khuyến mãi thành công. Giá sản phẩm đã được reset về giá gốc."));
            }
            catch (Exception ex)
            {
                Console.WriteLine($"[ERROR] DeletePromotion: {ex.Message}");
                Console.WriteLine($"[ERROR] StackTrace: {ex.StackTrace}");
                return StatusCode(500, ApiResponse<object>.ErrorResponse(
                    "Lỗi hệ thống khi xóa khuyến mãi.",
                    new List<string> { ex.Message }));
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
        /// Tự động xử lý trường hợp sản phẩm có nhiều promotions (ưu tiên promotion mới nhất)
        /// </summary>
        private async Task UpdateProductOnPricesAsync(promotion promotion, List<product> products)
        {
            if (!products.Any() || promotion.discount_value == null)
                return;

            var now = DateTime.UtcNow;
            var productIds = products.Select(p => p.product_id).ToList();

            // Chỉ cập nhật nếu promotion đang active và trong thời gian hiệu lực
            if (promotion.is_active == true && promotion.start_date <= now && promotion.end_date >= now)
            {
                // Lấy tất cả promotions active cho các sản phẩm này để tối ưu query
                // Include products để có thể check relationship
                var allActivePromotions = await _context.promotions
                    .Include(p => p.products)
                    .Where(p => p.is_active == true
                        && p.start_date <= now
                        && p.end_date >= now
                        && p.discount_value.HasValue)
                    .ToListAsync();

                foreach (var product in products)
                {
                    // Tìm promotion mới nhất (theo created_at) đang active cho sản phẩm này
                    var bestPromotion = allActivePromotions
                        .Where(p => p.products.Any(pr => pr.product_id == product.product_id))
                        .OrderByDescending(p => p.created_at)
                        .FirstOrDefault();

                    // Nếu promotion hiện tại là promotion tốt nhất (mới nhất) hoặc không có promotion nào khác
                    if (bestPromotion == null || bestPromotion.promotion_id == promotion.promotion_id)
                    {
                        // Cập nhật onprices theo promotion hiện tại
                        var newOnPrice = CalculateOnPrice(
                            product.price,
                            promotion.discount_type ?? "percentage",
                            promotion.discount_value.Value
                        );
                        product.on_prices = newOnPrice;
                        product.updated_at = DateTime.UtcNow;
                    }
                    else if (bestPromotion != null && bestPromotion.discount_value.HasValue)
                    {
                        // Có promotion khác mới hơn, cập nhật theo promotion đó để đảm bảo luôn áp dụng promotion mới nhất
                        var newOnPrice = CalculateOnPrice(
                            product.price,
                            bestPromotion.discount_type ?? "percentage",
                            bestPromotion.discount_value.Value
                        );
                        product.on_prices = newOnPrice;
                        product.updated_at = DateTime.UtcNow;
                    }
                }

                await _context.SaveChangesAsync();
            }
            else
            {
                // Promotion không active hoặc hết hạn, reset onprices cho sản phẩm
                await ResetProductOnPricesAsync(products);
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

