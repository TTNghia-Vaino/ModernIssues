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
                    $"Lấy danh sách {promotions.Count} khuyến mãi thành công.",
                    HttpContext));
            }
            catch (Exception ex)
            {
                Console.WriteLine($"[ERROR] GetAllPromotions: {ex.Message}");
                Console.WriteLine($"[ERROR] StackTrace: {ex.StackTrace}");
                return StatusCode(500, ApiResponse<object>.ErrorResponse(
                    "Lỗi hệ thống khi lấy danh sách khuyến mãi.",
                    new List<string> { ex.Message },
                    HttpContext));
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
                    return NotFound(ApiResponse<object>.ErrorResponse($"Không tìm thấy khuyến mãi với ID: {id}.", null, HttpContext));
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
                    "Lấy chi tiết khuyến mãi thành công.",
                    HttpContext));
            }
            catch (Exception ex)
            {
                Console.WriteLine($"[ERROR] GetPromotionById: {ex.Message}");
                Console.WriteLine($"[ERROR] StackTrace: {ex.StackTrace}");
                return StatusCode(500, ApiResponse<object>.ErrorResponse(
                    "Lỗi hệ thống khi lấy chi tiết khuyến mãi.",
                    new List<string> { ex.Message },
                    HttpContext));
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
                return Unauthorized(ApiResponse<object>.ErrorResponse("Bạn cần đăng nhập để thực hiện thao tác này.", null, HttpContext));
            }

            // Kiểm tra quyền admin
            if (!AuthHelper.IsAdmin(HttpContext))
            {
                return StatusCode(403, ApiResponse<object>.ErrorResponse("Chỉ có quyền admin mới được tạo khuyến mãi.", null, HttpContext));
            }

            try
            {
                // Validate dữ liệu
                if (string.IsNullOrWhiteSpace(promotionData.PromotionName))
                {
                    return BadRequest(ApiResponse<object>.ErrorResponse("Tên chương trình khuyến mãi không được để trống.", null, HttpContext));
                }

                // Validate discount type và value
                if (promotionData.DiscountType != "percentage" && promotionData.DiscountType != "fixed_amount")
                {
                    return BadRequest(ApiResponse<object>.ErrorResponse("Loại khuyến mãi không hợp lệ. Chỉ chấp nhận: 'percentage' hoặc 'fixed_amount'.", null, HttpContext));
                }

                if (promotionData.DiscountType == "percentage")
                {
                    if (promotionData.DiscountValue < 0 || promotionData.DiscountValue > 100)
                    {
                        return BadRequest(ApiResponse<object>.ErrorResponse("Phần trăm giảm giá phải từ 0 đến 100.", null, HttpContext));
                    }
                }
                else if (promotionData.DiscountType == "fixed_amount")
                {
                    if (promotionData.DiscountValue < 0)
                    {
                        return BadRequest(ApiResponse<object>.ErrorResponse("Số tiền giảm giá phải lớn hơn hoặc bằng 0.", null, HttpContext));
                    }
                }

                if (promotionData.EndDate <= promotionData.StartDate)
                {
                    return BadRequest(ApiResponse<object>.ErrorResponse("Ngày kết thúc phải sau ngày bắt đầu.", null, HttpContext));
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
                    return BadRequest(ApiResponse<object>.ErrorResponse("Vui lòng chọn ít nhất một danh mục hoặc sản phẩm.", null, HttpContext));
                }

                // Kiểm tra sản phẩm có tồn tại không
                var validProductIds = await _context.products
                    .Where(p => allProductIds.Contains(p.product_id))
                    .Select(p => p.product_id)
                    .ToListAsync();

                if (!validProductIds.Any())
                {
                    return BadRequest(ApiResponse<object>.ErrorResponse("Không tìm thấy sản phẩm nào hợp lệ.", null, HttpContext));
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
                            return BadRequest(ApiResponse<object>.ErrorResponse("File banner không hợp lệ. Chỉ chấp nhận file ảnh (jpg, jpeg, png, gif, bmp, webp) và kích thước tối đa 5MB.", null, HttpContext));
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
                        return BadRequest(ApiResponse<object>.ErrorResponse($"Lỗi upload banner: {ex.Message}", null, HttpContext));
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

                // Kiểm tra sản phẩm đã có promotion active khác không
                // Lấy TẤT CẢ promotions active có chứa các sản phẩm này (không chỉ promotion tốt nhất)
                var now = DateTime.UtcNow;
                var allActivePromotions = await _context.promotions
                    .Include(p => p.products)
                    .Where(p => p.is_active == true
                        && p.start_date <= now
                        && p.end_date >= now
                        && p.discount_value.HasValue)
                    .ToListAsync();

                var productsWithPromotions = await GetProductsWithActivePromotionsAsync(validProductIds);

                var productsToAdd = new List<product>();
                var promotionsToUpdate = new Dictionary<int, List<product>>(); // promotion_id -> list of products to remove
                var productsToSkip = new List<int>(); // Sản phẩm không được thêm vào vì đã có promotion tốt hơn

                foreach (var product in products)
                {
                    var productId = product.product_id;
                    
                    // Kiểm tra xem product đã có trong collection chưa
                    if (promotion.products.Any(p => p.product_id == productId))
                        continue;

                    // Kiểm tra sản phẩm có promotion active khác không
                    if (productsWithPromotions.TryGetValue(productId, out var existingBestPromotion))
                    {
                        // So sánh promotion mới với promotion tốt nhất hiện tại
                        var isNewPromotionBetter = IsPromotionBetter(
                            promotion,
                            existingBestPromotion,
                            product.price
                        );

                        if (isNewPromotionBetter)
                        {
                            // Promotion mới tốt hơn, thêm sản phẩm vào promotion mới
                            productsToAdd.Add(product);
                            
                            // Tìm TẤT CẢ các promotion active khác có chứa sản phẩm này và xóa sản phẩm khỏi chúng
                            var otherPromotionsWithProduct = allActivePromotions
                                .Where(p => p.promotion_id != promotion.promotion_id 
                                    && p.products.Any(pr => pr.product_id == productId))
                                .ToList();

                            foreach (var otherPromotion in otherPromotionsWithProduct)
                            {
                                if (!promotionsToUpdate.ContainsKey(otherPromotion.promotion_id))
                                {
                                    promotionsToUpdate[otherPromotion.promotion_id] = new List<product>();
                                }
                                promotionsToUpdate[otherPromotion.promotion_id].Add(product);
                            }
                        }
                        else
                        {
                            // Promotion hiện tại tốt hơn hoặc bằng, không thêm sản phẩm vào promotion mới
                            productsToSkip.Add(productId);
                        }
                    }
                    else
                    {
                        // Sản phẩm chưa có promotion nào, thêm vào promotion mới
                        // Nhưng vẫn cần kiểm tra xem có promotion nào khác đang chứa sản phẩm này không (để xóa)
                        var otherPromotionsWithProduct = allActivePromotions
                            .Where(p => p.promotion_id != promotion.promotion_id 
                                && p.products.Any(pr => pr.product_id == productId))
                            .ToList();

                        if (otherPromotionsWithProduct.Any())
                        {
                            // Sản phẩm đang ở promotion khác, xóa khỏi tất cả các promotion đó
                            foreach (var otherPromotion in otherPromotionsWithProduct)
                            {
                                if (!promotionsToUpdate.ContainsKey(otherPromotion.promotion_id))
                                {
                                    promotionsToUpdate[otherPromotion.promotion_id] = new List<product>();
                                }
                                promotionsToUpdate[otherPromotion.promotion_id].Add(product);
                            }
                        }

                        productsToAdd.Add(product);
                    }
                }

                // Xóa sản phẩm khỏi TẤT CẢ các promotion khác để đảm bảo không có chồng đè
                foreach (var kvp in promotionsToUpdate)
                {
                    var oldPromotionId = kvp.Key;
                    var productsToRemove = kvp.Value;
                    
                    var oldPromotion = await _context.promotions
                        .Include(p => p.products)
                        .Where(p => p.promotion_id == oldPromotionId)
                        .FirstOrDefaultAsync();

                    if (oldPromotion != null)
                    {
                        foreach (var productToRemove in productsToRemove)
                        {
                            var productId = productToRemove.product_id;
                            var productInCollection = oldPromotion.products.FirstOrDefault(p => p.product_id == productId);
                            if (productInCollection != null)
                            {
                                oldPromotion.products.Remove(productInCollection);
                            }
                        }
                    }
                }

                // Thêm sản phẩm vào promotion mới
                foreach (var product in productsToAdd)
                {
                    promotion.products.Add(product);
                }

                // Lưu vào database (tự động lưu vào bảng product_promotions)
                await _context.SaveChangesAsync();

                // Nếu có sản phẩm bị xóa khỏi promotion cũ, cập nhật lại giá cho chúng
                foreach (var kvp in promotionsToUpdate)
                {
                    var productsToRemove = kvp.Value;
                    if (productsToRemove.Any())
                    {
                        await ResetProductOnPricesAsync(productsToRemove);
                    }
                }

                // Reload promotion để lấy danh sách sản phẩm đầy đủ
                await _context.Entry(promotion).ReloadAsync();
                await _context.Entry(promotion).Collection(p => p.products).LoadAsync();

                // Lấy lại danh sách sản phẩm từ database để đảm bảo có đầy đủ thông tin
                // Extract product IDs first to avoid LINQ translation issues
                var promotionProductIds = promotion.products.Select(pr => pr.product_id).ToList();
                var allProductsInPromotion = promotionProductIds.Any() 
                    ? await _context.products
                        .Where(p => promotionProductIds.Contains(p.product_id))
                        .ToListAsync()
                    : new List<product>();

                // Tự động cập nhật onprices cho tất cả sản phẩm trong promotion
                // Điều này đảm bảo khi tạo promotion mới, tất cả sản phẩm được cập nhật đúng
                await UpdateProductOnPricesAsync(promotion, allProductsInPromotion);

                var promotionDto = MapToDto(promotion);

                // Tính số sản phẩm đã được thêm và số sản phẩm bị bỏ qua
                var addedCount = productsToAdd.Count;
                var skippedCount = productsToSkip.Count;
                
                var message = "Tạo khuyến mãi thành công.";
                if (skippedCount > 0)
                {
                    message += $" Đã thêm {addedCount} sản phẩm. {skippedCount} sản phẩm đã có khuyến mãi tốt hơn nên không được thêm vào (tự động lọc và ẩn).";
                }
                else
                {
                    message += $" Đã thêm {addedCount} sản phẩm vào khuyến mãi.";
                }

                return StatusCode(201, ApiResponse<PromotionDto>.SuccessResponse(
                    promotionDto,
                    message,
                    HttpContext));
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
                    errorMessages,
                    HttpContext));
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
                return Unauthorized(ApiResponse<object>.ErrorResponse("Bạn cần đăng nhập để thực hiện thao tác này.", null, HttpContext));
            }

            // Kiểm tra quyền admin
            if (!AuthHelper.IsAdmin(HttpContext))
            {
                return StatusCode(403, ApiResponse<object>.ErrorResponse("Chỉ có quyền admin mới được cập nhật khuyến mãi.", null, HttpContext));
            }

            try
            {
                var promotion = await _context.promotions
                    .Include(p => p.products)
                    .Where(p => p.promotion_id == id)
                    .FirstOrDefaultAsync();

                if (promotion == null)
                {
                    return NotFound(ApiResponse<object>.ErrorResponse($"Không tìm thấy khuyến mãi với ID: {id}.", null, HttpContext));
                }

                // Validate dữ liệu
                if (string.IsNullOrWhiteSpace(promotionData.PromotionName))
                {
                    return BadRequest(ApiResponse<object>.ErrorResponse("Tên chương trình khuyến mãi không được để trống.", null, HttpContext));
                }

                // Validate discount type và value
                if (promotionData.DiscountType != "percentage" && promotionData.DiscountType != "fixed_amount")
                {
                    return BadRequest(ApiResponse<object>.ErrorResponse("Loại khuyến mãi không hợp lệ. Chỉ chấp nhận: 'percentage' hoặc 'fixed_amount'.", null, HttpContext));
                }

                if (promotionData.DiscountType == "percentage")
                {
                    if (promotionData.DiscountValue < 0 || promotionData.DiscountValue > 100)
                    {
                        return BadRequest(ApiResponse<object>.ErrorResponse("Phần trăm giảm giá phải từ 0 đến 100.", null, HttpContext));
                    }
                }
                else if (promotionData.DiscountType == "fixed_amount")
                {
                    if (promotionData.DiscountValue < 0)
                    {
                        return BadRequest(ApiResponse<object>.ErrorResponse("Số tiền giảm giá phải lớn hơn hoặc bằng 0.", null, HttpContext));
                    }
                }

                if (promotionData.EndDate <= promotionData.StartDate)
                {
                    return BadRequest(ApiResponse<object>.ErrorResponse("Ngày kết thúc phải sau ngày bắt đầu.", null, HttpContext));
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
                    return BadRequest(ApiResponse<object>.ErrorResponse("Vui lòng chọn ít nhất một danh mục hoặc sản phẩm.", null, HttpContext));
                }

                // Kiểm tra sản phẩm có tồn tại không
                var validProductIds = await _context.products
                    .Where(p => allProductIds.Contains(p.product_id))
                    .Select(p => p.product_id)
                    .ToListAsync();

                if (!validProductIds.Any())
                {
                    return BadRequest(ApiResponse<object>.ErrorResponse("Không tìm thấy sản phẩm nào hợp lệ.", null, HttpContext));
                }

                // Xử lý upload banner mới (nếu có)
                if (promotionData.BannerFile != null && promotionData.BannerFile.Length > 0)
                {
                    try
                    {
                        if (!ImageUploadHelper.IsValidImage(promotionData.BannerFile))
                        {
                            return BadRequest(ApiResponse<object>.ErrorResponse("File banner không hợp lệ. Chỉ chấp nhận file ảnh (jpg, jpeg, png, gif, bmp, webp) và kích thước tối đa 5MB.", null, HttpContext));
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
                        return BadRequest(ApiResponse<object>.ErrorResponse($"Lỗi upload banner: {ex.Message}", null, HttpContext));
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

                // Thêm sản phẩm mới (tự động lưu vào bảng product_promotions)
                var products = await _context.products
                    .Where(p => validProductIds.Contains(p.product_id))
                    .ToListAsync();

                // Kiểm tra sản phẩm đã có promotion active khác không (trừ promotion hiện tại)
                // Lấy TẤT CẢ promotions active có chứa các sản phẩm này (không chỉ promotion tốt nhất)
                var now = DateTime.UtcNow;
                var allActivePromotions = await _context.promotions
                    .Include(p => p.products)
                    .Where(p => p.is_active == true
                        && p.start_date <= now
                        && p.end_date >= now
                        && p.discount_value.HasValue)
                    .ToListAsync();

                var productsWithPromotions = await GetProductsWithActivePromotionsAsync(validProductIds, promotion.promotion_id);

                var productsToAdd = new List<product>();
                var promotionsToUpdate = new Dictionary<int, List<product>>(); // promotion_id -> list of products to remove
                var productsToSkip = new List<int>(); // Sản phẩm không được thêm vào vì đã có promotion tốt hơn

                // Lấy danh sách product IDs hiện tại trong promotion
                var currentProductIds = promotion.products.Select(p => p.product_id).ToList();

                foreach (var product in products)
                {
                    var productId = product.product_id;
                    
                    // Nếu sản phẩm đã có trong promotion hiện tại, giữ lại
                    if (currentProductIds.Contains(productId))
                    {
                        productsToAdd.Add(product);
                        continue;
                    }

                    // Kiểm tra sản phẩm có promotion active khác không
                    if (productsWithPromotions.TryGetValue(productId, out var existingBestPromotion))
                    {
                        // So sánh promotion hiện tại với promotion tốt nhất khác
                        var isCurrentPromotionBetter = IsPromotionBetter(
                            promotion,
                            existingBestPromotion,
                            product.price
                        );

                        if (isCurrentPromotionBetter)
                        {
                            // Promotion hiện tại tốt hơn, thêm sản phẩm vào promotion hiện tại
                            productsToAdd.Add(product);
                            
                            // Tìm TẤT CẢ các promotion active khác có chứa sản phẩm này và xóa sản phẩm khỏi chúng
                            var otherPromotionsWithProduct = allActivePromotions
                                .Where(p => p.promotion_id != promotion.promotion_id 
                                    && p.products.Any(pr => pr.product_id == productId))
                                .ToList();

                            foreach (var otherPromotion in otherPromotionsWithProduct)
                            {
                                if (!promotionsToUpdate.ContainsKey(otherPromotion.promotion_id))
                                {
                                    promotionsToUpdate[otherPromotion.promotion_id] = new List<product>();
                                }
                                promotionsToUpdate[otherPromotion.promotion_id].Add(product);
                            }
                        }
                        else
                        {
                            // Promotion khác tốt hơn hoặc bằng, không thêm sản phẩm vào promotion hiện tại
                            productsToSkip.Add(productId);
                        }
                    }
                    else
                    {
                        // Sản phẩm chưa có promotion nào hoặc chỉ có promotion hiện tại
                        // Nhưng vẫn cần kiểm tra xem có promotion nào khác đang chứa sản phẩm này không (để xóa)
                        var otherPromotionsWithProduct = allActivePromotions
                            .Where(p => p.promotion_id != promotion.promotion_id 
                                && p.products.Any(pr => pr.product_id == productId))
                            .ToList();

                        if (otherPromotionsWithProduct.Any())
                        {
                            // Sản phẩm đang ở promotion khác, xóa khỏi tất cả các promotion đó
                            foreach (var otherPromotion in otherPromotionsWithProduct)
                            {
                                if (!promotionsToUpdate.ContainsKey(otherPromotion.promotion_id))
                                {
                                    promotionsToUpdate[otherPromotion.promotion_id] = new List<product>();
                                }
                                promotionsToUpdate[otherPromotion.promotion_id].Add(product);
                            }
                        }

                        productsToAdd.Add(product);
                    }
                }

                // Xóa sản phẩm khỏi TẤT CẢ các promotion khác để đảm bảo không có chồng đè
                foreach (var kvp in promotionsToUpdate)
                {
                    var otherPromotionId = kvp.Key;
                    var productsToRemove = kvp.Value;
                    
                    var otherPromotion = await _context.promotions
                        .Include(p => p.products)
                        .Where(p => p.promotion_id == otherPromotionId)
                        .FirstOrDefaultAsync();

                    if (otherPromotion != null)
                    {
                        foreach (var productToRemove in productsToRemove)
                        {
                            var productId = productToRemove.product_id;
                            var productInCollection = otherPromotion.products.FirstOrDefault(p => p.product_id == productId);
                            if (productInCollection != null)
                            {
                                otherPromotion.products.Remove(productInCollection);
                            }
                        }
                    }
                }

                // Xóa tất cả sản phẩm cũ và thêm lại danh sách mới
                promotion.products.Clear();
                foreach (var product in productsToAdd)
                {
                    promotion.products.Add(product);
                }

                // Lưu vào database (tự động lưu vào bảng product_promotions)
                await _context.SaveChangesAsync();

                // Nếu có sản phẩm bị xóa khỏi promotion khác, cập nhật lại giá cho chúng
                foreach (var kvp in promotionsToUpdate)
                {
                    var productsToRemove = kvp.Value;
                    if (productsToRemove.Any())
                    {
                        await ResetProductOnPricesAsync(productsToRemove);
                    }
                }

                // Reload promotion để lấy danh sách sản phẩm mới nhất
                await _context.Entry(promotion).ReloadAsync();
                await _context.Entry(promotion).Collection(p => p.products).LoadAsync();

                // Lấy danh sách sản phẩm hiện tại trong promotion sau khi update
                var updatedProductIds = promotion.products.Select(p => p.product_id).ToList();

                // Reset onprices cho sản phẩm bị loại bỏ khỏi promotion (có trong old nhưng không có trong new)
                var removedProductIds = oldProductIds.Where(id => !updatedProductIds.Contains(id)).ToList();
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
                    .Where(p => updatedProductIds.Contains(p.product_id))
                    .ToListAsync();
                
                await UpdateProductOnPricesAsync(promotion, allCurrentProducts);

                // Reload để lấy đầy đủ thông tin
                await _context.Entry(promotion).Collection(p => p.products).LoadAsync();

                var promotionDto = MapToDto(promotion);

                // Tính số sản phẩm đã được thêm và số sản phẩm bị bỏ qua
                var addedCount = productsToAdd.Count;
                var skippedCount = productsToSkip.Count;
                
                var message = "Cập nhật khuyến mãi thành công.";
                if (skippedCount > 0)
                {
                    message += $" Đã thêm {addedCount} sản phẩm. {skippedCount} sản phẩm đã có khuyến mãi tốt hơn nên không được thêm vào (tự động lọc và ẩn).";
                }
                else
                {
                    message += $" Đã cập nhật {addedCount} sản phẩm trong khuyến mãi.";
                }

                return Ok(ApiResponse<PromotionDto>.SuccessResponse(
                    promotionDto,
                    message,
                    HttpContext));
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
                    errorMessages,
                    HttpContext));
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
                return Unauthorized(ApiResponse<object>.ErrorResponse("Bạn cần đăng nhập để thực hiện thao tác này.", null, HttpContext));
            }

            // Kiểm tra quyền admin
            if (!AuthHelper.IsAdmin(HttpContext))
            {
                return StatusCode(403, ApiResponse<object>.ErrorResponse("Chỉ có quyền admin mới được thay đổi trạng thái khuyến mãi.", null, HttpContext));
            }

            try
            {
                var promotion = await _context.promotions
                    .Include(p => p.products)
                    .Where(p => p.promotion_id == id)
                    .FirstOrDefaultAsync();

                if (promotion == null)
                {
                    return NotFound(ApiResponse<object>.ErrorResponse($"Không tìm thấy khuyến mãi với ID: {id}.", null, HttpContext));
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
                    $"Đã {statusText} khuyến mãi thành công.",
                    HttpContext));
            }
            catch (Exception ex)
            {
                Console.WriteLine($"[ERROR] TogglePromotionStatus: {ex.Message}");
                Console.WriteLine($"[ERROR] StackTrace: {ex.StackTrace}");
                return StatusCode(500, ApiResponse<object>.ErrorResponse(
                    "Lỗi hệ thống khi thay đổi trạng thái khuyến mãi.",
                    new List<string> { ex.Message },
                    HttpContext));
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
                return Unauthorized(ApiResponse<object>.ErrorResponse("Bạn cần đăng nhập để thực hiện thao tác này.", null, HttpContext));
            }

            // Kiểm tra quyền admin
            if (!AuthHelper.IsAdmin(HttpContext))
            {
                return StatusCode(403, ApiResponse<object>.ErrorResponse("Chỉ có quyền admin mới được cập nhật giá sản phẩm.", null, HttpContext));
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
                        return NotFound(ApiResponse<object>.ErrorResponse($"Không tìm thấy khuyến mãi với ID: {promotionId.Value}.", null, HttpContext));
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

                        // Với mỗi sản phẩm, tìm promotion active tốt nhất (giảm nhiều tiền nhất)
                        foreach (var product in allProducts)
                        {
                            // Extract product_id to avoid LINQ translation issues
                            var productId = product.product_id;
                            
                            var applicablePromotions = activePromotions
                                .Where(p => p.products.Any(pr => pr.product_id == productId))
                                .ToList();

                            if (applicablePromotions.Any() && !productPromotionMap.ContainsKey(productId))
                            {
                                // Tìm promotion tốt nhất (giảm nhiều tiền nhất)
                                var bestPromotion = applicablePromotions
                                    .OrderByDescending(p => CalculateDiscountAmount(
                                        product.price,
                                        p.discount_type ?? "percentage",
                                        p.discount_value ?? 0
                                    ))
                                    .FirstOrDefault();

                                if (bestPromotion != null)
                                {
                                    productPromotionMap[productId] = bestPromotion;
                                }
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
                    message,
                    HttpContext));
            }
            catch (Exception ex)
            {
                Console.WriteLine($"[ERROR] AutoUpdateProductPrices: {ex.Message}");
                Console.WriteLine($"[ERROR] StackTrace: {ex.StackTrace}");
                return StatusCode(500, ApiResponse<object>.ErrorResponse(
                    "Lỗi hệ thống khi cập nhật giá sản phẩm.",
                    new List<string> { ex.Message },
                    HttpContext));
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
                return Unauthorized(ApiResponse<object>.ErrorResponse("Bạn cần đăng nhập để thực hiện thao tác này.", null, HttpContext));
            }

            // Kiểm tra quyền admin
            if (!AuthHelper.IsAdmin(HttpContext))
            {
                return StatusCode(403, ApiResponse<object>.ErrorResponse("Chỉ có quyền admin mới được xóa khuyến mãi.", null, HttpContext));
            }

            try
            {
                var promotion = await _context.promotions
                    .Include(p => p.products)
                    .Where(p => p.promotion_id == id)
                    .FirstOrDefaultAsync();

                if (promotion == null)
                {
                    return NotFound(ApiResponse<object>.ErrorResponse($"Không tìm thấy khuyến mãi với ID: {id}.", null, HttpContext));
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
                    "Xóa khuyến mãi thành công. Giá sản phẩm đã được reset về giá gốc.",
                    HttpContext));
            }
            catch (Exception ex)
            {
                Console.WriteLine($"[ERROR] DeletePromotion: {ex.Message}");
                Console.WriteLine($"[ERROR] StackTrace: {ex.StackTrace}");
                return StatusCode(500, ApiResponse<object>.ErrorResponse(
                    "Lỗi hệ thống khi xóa khuyến mãi.",
                    new List<string> { ex.Message },
                    HttpContext));
            }
        }

        // ============================================
        // 8. GET AVAILABLE PRODUCTS FOR PROMOTION: GET api/v1/Promotion/AvailableProducts
        // ============================================
        /// <summary>
        /// Lấy danh sách sản phẩm có thể thêm vào promotion.
        /// Tự động lọc và ẩn những sản phẩm đã có promotion tốt hơn.
        /// </summary>
        /// <param name="promotionId">ID của promotion đang chỉnh sửa (tùy chọn). Nếu có, sẽ loại trừ sản phẩm đã có trong promotion này.</param>
        /// <param name="discountType">Loại khuyến mãi: "percentage" hoặc "fixed_amount"</param>
        /// <param name="discountValue">Giá trị khuyến mãi</param>
        /// <param name="categoryId">Lọc theo danh mục (tùy chọn)</param>
        /// <param name="search">Tìm kiếm theo tên sản phẩm (tùy chọn)</param>
        /// <param name="page">Số trang (mặc định: 1)</param>
        /// <param name="limit">Số lượng mỗi trang (mặc định: 10, tối đa: 100)</param>
        /// <response code="200">Trả về danh sách sản phẩm có thể thêm vào promotion.</response>
        /// <response code="401">Chưa đăng nhập.</response>
        /// <response code="403">Không có quyền admin.</response>
        [HttpGet("AvailableProducts")]
        [ProducesResponseType(typeof(ApiResponse<AvailableProductsResponse>), 200)]
        [ProducesResponseType(typeof(ApiResponse<object>), 401)]
        [ProducesResponseType(typeof(ApiResponse<object>), 403)]
        public async Task<IActionResult> GetAvailableProductsForPromotion(
            [FromQuery] int? promotionId = null,
            [FromQuery] string discountType = "percentage",
            [FromQuery] decimal discountValue = 0,
            [FromQuery] int? categoryId = null,
            [FromQuery] string? search = null,
            [FromQuery] int page = 1,
            [FromQuery] int limit = 10)
        {
            // Kiểm tra đăng nhập
            if (!AuthHelper.IsLoggedIn(HttpContext))
            {
                return Unauthorized(ApiResponse<object>.ErrorResponse("Bạn cần đăng nhập để thực hiện thao tác này.", null, HttpContext));
            }

            // Kiểm tra quyền admin
            if (!AuthHelper.IsAdmin(HttpContext))
            {
                return StatusCode(403, ApiResponse<object>.ErrorResponse("Chỉ có quyền admin mới được xem danh sách sản phẩm.", null, HttpContext));
            }

            try
            {
                limit = Math.Clamp(limit, 1, 100);
                page = Math.Max(1, page);
                int offset = (page - 1) * limit;

                var now = DateTime.UtcNow;

                // Lấy promotion hiện tại nếu có
                promotion? currentPromotion = null;
                if (promotionId.HasValue)
                {
                    currentPromotion = await _context.promotions
                        .Include(p => p.products)
                        .Where(p => p.promotion_id == promotionId.Value)
                        .FirstOrDefaultAsync();
                }

                // Query sản phẩm
                var query = _context.products.AsQueryable();

                // Lọc theo danh mục
                if (categoryId.HasValue)
                {
                    query = query.Where(p => p.category_id == categoryId.Value);
                }

                // Tìm kiếm theo tên
                if (!string.IsNullOrEmpty(search))
                {
                    var searchLower = search.ToLower();
                    query = query.Where(p => p.product_name.ToLower().Contains(searchLower));
                }

                // Lấy tất cả sản phẩm để kiểm tra promotion
                var allProducts = await query
                    .Include(p => p.category)
                    .ToListAsync();

                // Lấy tất cả promotions active (trừ promotion hiện tại nếu có)
                var activePromotions = await _context.promotions
                    .Include(p => p.products)
                    .Where(p => p.is_active == true
                        && p.start_date <= now
                        && p.end_date >= now
                        && p.discount_value.HasValue
                        && (!promotionId.HasValue || p.promotion_id != promotionId.Value))
                    .ToListAsync();

                // Lọc sản phẩm có thể thêm vào promotion
                // Chỉ hiển thị sản phẩm chưa có promotion HOẶC có promotion nhưng promotion mới tốt hơn
                var availableProducts = new List<AvailableProductDto>();
                var skippedProducts = new List<AvailableProductDto>();

                // Tạo promotion mới giả định để so sánh
                var newPromotion = new promotion
                {
                    discount_type = discountType,
                    discount_value = discountValue
                };

                foreach (var product in allProducts)
                {
                    var productId = product.product_id;
                    
                    // Bỏ qua sản phẩm đã có trong promotion hiện tại (nếu đang edit)
                    if (currentPromotion != null && currentPromotion.products.Any(p => p.product_id == productId))
                    {
                        // Sản phẩm đã có trong promotion hiện tại, luôn hiển thị
                        availableProducts.Add(new AvailableProductDto
                        {
                            ProductId = product.product_id,
                            ProductName = product.product_name,
                            ImageUrl = product.image_url,
                            Price = product.price,
                            CategoryId = product.category_id,
                            CategoryName = product.category?.category_name,
                            CurrentPromotionId = currentPromotion.promotion_id,
                            CurrentPromotionName = currentPromotion.promotion_name,
                            CurrentDiscountDisplay = GetDiscountDisplay(
                                currentPromotion.discount_type ?? "percentage",
                                currentPromotion.discount_value ?? 0)
                        });
                        continue;
                    }
                    
                    // Tìm promotion tốt nhất hiện tại cho sản phẩm này (trừ promotion hiện tại nếu đang edit)
                    var currentBestPromotion = activePromotions
                        .Where(p => p.products.Any(pr => pr.product_id == productId))
                        .OrderByDescending(p => CalculateDiscountAmount(
                            product.price,
                            p.discount_type ?? "percentage",
                            p.discount_value ?? 0
                        ))
                        .FirstOrDefault();

                    var productDto = new AvailableProductDto
                    {
                        ProductId = product.product_id,
                        ProductName = product.product_name,
                        ImageUrl = product.image_url,
                        Price = product.price,
                        CategoryId = product.category_id,
                        CategoryName = product.category?.category_name,
                        CurrentPromotionId = currentBestPromotion?.promotion_id,
                        CurrentPromotionName = currentBestPromotion?.promotion_name,
                        CurrentDiscountDisplay = currentBestPromotion != null 
                            ? GetDiscountDisplay(
                                currentBestPromotion.discount_type ?? "percentage",
                                currentBestPromotion.discount_value ?? 0)
                            : null
                    };

                    if (currentBestPromotion != null)
                    {
                        // Sản phẩm đang có promotion active
                        // So sánh promotion mới với promotion hiện tại
                        var isNewPromotionBetter = IsPromotionBetter(
                            newPromotion,
                            currentBestPromotion,
                            product.price
                        );

                        if (isNewPromotionBetter)
                        {
                            // Promotion mới tốt hơn, có thể thêm vào (sẽ tự động xóa khỏi promotion cũ)
                            availableProducts.Add(productDto);
                        }
                        else
                        {
                            // Promotion hiện tại tốt hơn hoặc bằng, tự động lọc và ẩn đi
                            skippedProducts.Add(productDto);
                        }
                    }
                    else
                    {
                        // Sản phẩm chưa có promotion, có thể thêm vào
                        availableProducts.Add(productDto);
                    }
                }

                // Phân trang
                var totalCount = availableProducts.Count;
                var pagedProducts = availableProducts
                    .Skip(offset)
                    .Take(limit)
                    .ToList();

                var response = new AvailableProductsResponse
                {
                    TotalCount = totalCount,
                    CurrentPage = page,
                    Limit = limit,
                    AvailableProducts = pagedProducts,
                    SkippedCount = skippedProducts.Count,
                    SkippedProducts = skippedProducts.Take(10).ToList() // Chỉ hiển thị 10 sản phẩm đầu tiên bị bỏ qua
                };

                return Ok(ApiResponse<AvailableProductsResponse>.SuccessResponse(
                    response,
                    $"Tìm thấy {totalCount} sản phẩm có thể thêm vào khuyến mãi. {skippedProducts.Count} sản phẩm đã có khuyến mãi tốt hơn.",
                    HttpContext));
            }
            catch (Exception ex)
            {
                Console.WriteLine($"[ERROR] GetAvailableProductsForPromotion: {ex.Message}");
                Console.WriteLine($"[ERROR] StackTrace: {ex.StackTrace}");
                return StatusCode(500, ApiResponse<object>.ErrorResponse(
                    "Lỗi hệ thống khi lấy danh sách sản phẩm.",
                    new List<string> { ex.Message },
                    HttpContext));
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
        /// Tính toán giá sau khuyến mãi (on_prices) dựa trên loại khuyến mãi
        /// - Nếu promotion theo %: on_prices = giá_gốc - (giá_gốc × %)
        ///   Ví dụ: price = 1000, discountValue = 20 (giảm 20%) => on_prices = 1000 - (1000 × 0.2) = 800
        /// - Nếu promotion theo tiền mặt: on_prices = giá_gốc - tiền_khuyến_mãi
        ///   Ví dụ: price = 1000, discountValue = 200 => on_prices = 1000 - 200 = 800
        /// - Nếu không có khuyến mãi: on_prices = 0
        /// </summary>
        private decimal CalculateOnPrice(decimal originalPrice, string discountType, decimal discountValue)
        {
            if (discountType == "percentage")
            {
                // Giảm theo phần trăm: on_prices = giá_gốc - (giá_gốc × %)
                // Ví dụ: price = 1000, discountValue = 20 (giảm 20%) 
                // => on_prices = 1000 - (1000 × 20/100) = 1000 - 200 = 800
                var remainingPercentage = 100m - discountValue;
                return Math.Max(0, originalPrice * (remainingPercentage / 100m));
            }
            else if (discountType == "fixed_amount")
            {
                // Giảm theo số tiền trực tiếp: on_prices = giá_gốc - tiền_khuyến_mãi
                // Ví dụ: price = 1000, discountValue = 200 => on_prices = 1000 - 200 = 800
                return Math.Max(0, originalPrice - discountValue);
            }
            // Không có khuyến mãi: on_prices = 0
            return 0;
        }

        /// <summary>
        /// Tính số tiền giảm thực tế từ một promotion cho một sản phẩm
        /// </summary>
        private decimal CalculateDiscountAmount(decimal originalPrice, string discountType, decimal discountValue)
        {
            if (discountType == "percentage")
            {
                return originalPrice * (discountValue / 100m);
            }
            else if (discountType == "fixed_amount")
            {
                return discountValue;
            }
            return 0;
        }

        /// <summary>
        /// So sánh 2 promotions để xem promotion nào tốt hơn (giảm nhiều tiền hơn)
        /// Trả về true nếu promotion1 tốt hơn promotion2
        /// </summary>
        private bool IsPromotionBetter(promotion promotion1, promotion promotion2, decimal productPrice)
        {
            if (promotion1 == null) return false;
            if (promotion2 == null) return true;

            var discount1 = CalculateDiscountAmount(
                productPrice,
                promotion1.discount_type ?? "percentage",
                promotion1.discount_value ?? 0
            );

            var discount2 = CalculateDiscountAmount(
                productPrice,
                promotion2.discount_type ?? "percentage",
                promotion2.discount_value ?? 0
            );

            // Promotion tốt hơn nếu giảm nhiều tiền hơn
            return discount1 > discount2;
        }

        /// <summary>
        /// Lấy danh sách sản phẩm và promotion active hiện tại của chúng
        /// </summary>
        private async Task<Dictionary<int, promotion>> GetProductsWithActivePromotionsAsync(List<int> productIds, int? excludePromotionId = null)
        {
            var now = DateTime.UtcNow;
            var result = new Dictionary<int, promotion>();

            if (!productIds.Any())
                return result;

            // Lấy tất cả promotions active
            var activePromotions = await _context.promotions
                .Include(p => p.products)
                .Where(p => p.is_active == true
                    && p.start_date <= now
                    && p.end_date >= now
                    && p.discount_value.HasValue
                    && (excludePromotionId == null || p.promotion_id != excludePromotionId.Value))
                .ToListAsync();

            // Lấy thông tin sản phẩm để có giá
            var products = await _context.products
                .Where(p => productIds.Contains(p.product_id))
                .ToListAsync();

            foreach (var product in products)
            {
                var productId = product.product_id;
                
                // Tìm tất cả promotions có chứa sản phẩm này
                var applicablePromotions = activePromotions
                    .Where(p => p.products.Any(pr => pr.product_id == productId))
                    .ToList();

                if (applicablePromotions.Any())
                {
                    // Tìm promotion tốt nhất (giảm nhiều tiền nhất)
                    var bestPromotion = applicablePromotions
                        .OrderByDescending(p => CalculateDiscountAmount(
                            product.price,
                            p.discount_type ?? "percentage",
                            p.discount_value ?? 0
                        ))
                        .FirstOrDefault();

                    if (bestPromotion != null)
                    {
                        result[productId] = bestPromotion;
                    }
                }
            }

            return result;
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
                    // Extract product_id to avoid LINQ translation issues
                    var productId = product.product_id;
                    
                    // Tìm tất cả promotions đang active cho sản phẩm này
                    var applicablePromotions = allActivePromotions
                        .Where(p => p.products.Any(pr => pr.product_id == productId))
                        .ToList();

                    if (!applicablePromotions.Any())
                    {
                        // Không có promotion nào, reset về 0
                        product.on_prices = 0;
                        product.updated_at = DateTime.UtcNow;
                        continue;
                    }

                    // Tìm promotion tốt nhất (giảm nhiều tiền nhất) thay vì promotion mới nhất
                    var bestPromotion = applicablePromotions
                        .OrderByDescending(p => CalculateDiscountAmount(
                            product.price,
                            p.discount_type ?? "percentage",
                            p.discount_value ?? 0
                        ))
                        .FirstOrDefault();

                    if (bestPromotion != null && bestPromotion.discount_value.HasValue)
                    {
                        // Cập nhật onprices theo promotion tốt nhất
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

            var now = DateTime.UtcNow;
            var productIds = products.Select(p => p.product_id).ToList();

            // Load all active promotions with their products to avoid LINQ translation issues
            // This is done once outside the loop for better performance
            var allActivePromotions = await _context.promotions
                .Include(p => p.products)
                .Where(p => p.is_active == true
                    && p.start_date <= now
                    && p.end_date >= now
                    && p.discount_value.HasValue)
                .ToListAsync();

            foreach (var product in products)
            {
                // Extract product_id to avoid LINQ translation issues
                var productId = product.product_id;
                
                // Kiểm tra xem sản phẩm có promotion khác đang active không
                // Filter in memory to avoid LINQ translation issues
                var applicablePromotions = allActivePromotions
                    .Where(p => p.products.Any(pr => pr.product_id == productId))
                    .ToList();

                if (applicablePromotions.Any())
                {
                    // Tìm promotion tốt nhất (giảm nhiều tiền nhất) thay vì promotion mới nhất
                    var bestPromotion = applicablePromotions
                        .OrderByDescending(p => CalculateDiscountAmount(
                            product.price,
                            p.discount_type ?? "percentage",
                            p.discount_value ?? 0
                        ))
                        .FirstOrDefault();

                    if (bestPromotion != null && bestPromotion.discount_value.HasValue)
                    {
                        // Áp dụng promotion tốt nhất
                        product.on_prices = CalculateOnPrice(
                            product.price,
                            bestPromotion.discount_type ?? "percentage",
                            bestPromotion.discount_value.Value
                        );
                    }
                    else
                    {
                        product.on_prices = 0;
                    }
                }
                else
                {
                    // Không có promotion nào, reset về 0
                    product.on_prices = 0;
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

