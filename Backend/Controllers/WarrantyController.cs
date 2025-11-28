using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Http;
using Microsoft.EntityFrameworkCore;
using ModernIssues.Models.DTOs;
using ModernIssues.Models.Entities;
using ModernIssues.Models.Common;
using ModernIssues.Helpers;
using Microsoft.AspNetCore.Hosting;
using System;
using System.Threading.Tasks;
using System.Linq;
using System.Collections.Generic;
using System.IO;

namespace ModernIssues.Controllers
{
    [Route("/v1/[controller]")]
    [ApiController]
    public class WarrantyController : ControllerBase
    {
        private readonly WebDbContext _context;
        private readonly IWebHostEnvironment _webHostEnvironment;

        public WarrantyController(WebDbContext context, IWebHostEnvironment webHostEnvironment)
        {
            _context = context;
            _webHostEnvironment = webHostEnvironment;
        }

        // ============================================
        // 1. GET MY WARRANTIES: GET api/v1/Warranty/GetMyWarranties
        // ============================================
        /// <summary>
        /// Lấy danh sách bảo hành của người dùng hiện tại.
        /// </summary>
        /// <response code="200">Trả về danh sách bảo hành.</response>
        /// <response code="401">Chưa đăng nhập.</response>
        [HttpGet("GetMyWarranties")]
        [ProducesResponseType(typeof(ApiResponse<List<WarrantyDto>>), 200)]
        [ProducesResponseType(typeof(ApiResponse<object>), 401)]
        public async Task<IActionResult> GetMyWarranties()
        {
            // Kiểm tra đăng nhập
            if (!AuthHelper.IsLoggedIn(HttpContext))
            {
                return Unauthorized(ApiResponse<object>.ErrorResponse("Bạn cần đăng nhập để xem thông tin bảo hành."));
            }

            try
            {
                var userId = AuthHelper.GetCurrentUserId(HttpContext);
                if (!userId.HasValue)
                {
                    return Unauthorized(ApiResponse<object>.ErrorResponse("Không thể xác định người dùng hiện tại."));
                }

                var now = DateTime.UtcNow;

                var warranties = await (from w in _context.warranties
                                       join p in _context.products on w.product_id equals p.product_id
                                       join u in _context.users on w.user_id equals u.user_id
                                       where w.user_id == userId.Value &&
                                             (w.is_disabled == null || w.is_disabled == false)
                                       select new WarrantyDto
                                       {
                                           WarrantyId = w.warranty_id,
                                           ProductId = w.product_id,
                                           ProductName = p.product_name,
                                           ProductImageUrl = p.image_url,
                                           UserId = w.user_id,
                                           Username = u.username,
                                           OrderId = w.order_id,
                                           StartDate = w.start_date,
                                           EndDate = w.end_date,
                                           SerialNumber = w.serial_number,
                                           Status = w.status,
                                           StatusDisplay = w.status == "active" ? "Đang bảo hành" :
                                                          w.status == "expired" ? "Hết hạn" :
                                                          w.status == "used" ? "Đã sử dụng" :
                                                          w.status == "cancelled" ? "Đã hủy" : w.status ?? "active",
                                           CreatedAt = w.created_at,
                                           UpdatedAt = w.updated_at,
                                           IsExpired = w.end_date < now,
                                           DaysRemaining = w.end_date >= now ? (int?)(w.end_date - now).Days : null
                                       })
                                       .OrderByDescending(w => w.CreatedAt)
                                       .ToListAsync();

                return Ok(ApiResponse<List<WarrantyDto>>.SuccessResponse(
                    warranties,
                    $"Lấy danh sách {warranties.Count} bảo hành thành công."));
            }
            catch (Exception ex)
            {
                Console.WriteLine($"[CRITICAL ERROR] GetMyWarranties: {ex.Message}");
                return StatusCode(500, ApiResponse<object>.ErrorResponse(
                    "Lỗi hệ thống khi lấy danh sách bảo hành.",
                    new List<string> { ex.Message }));
            }
        }

        // ============================================
        // 2. GET WARRANTY BY ID: GET api/v1/Warranty/{id}
        // ============================================
        /// <summary>
        /// Lấy thông tin chi tiết bảo hành theo ID.
        /// </summary>
        /// <param name="id">ID của bảo hành.</param>
        /// <response code="200">Trả về thông tin bảo hành.</response>
        /// <response code="401">Chưa đăng nhập.</response>
        /// <response code="403">Không có quyền xem.</response>
        /// <response code="404">Không tìm thấy bảo hành.</response>
        [HttpGet("{id}")]
        [ProducesResponseType(typeof(ApiResponse<WarrantyDto>), 200)]
        [ProducesResponseType(typeof(ApiResponse<object>), 401)]
        [ProducesResponseType(typeof(ApiResponse<object>), 403)]
        [ProducesResponseType(typeof(ApiResponse<object>), 404)]
        public async Task<IActionResult> GetWarrantyById(int id)
        {
            // Kiểm tra đăng nhập
            if (!AuthHelper.IsLoggedIn(HttpContext))
            {
                return Unauthorized(ApiResponse<object>.ErrorResponse("Bạn cần đăng nhập để xem thông tin bảo hành."));
            }

            try
            {
                var userId = AuthHelper.GetCurrentUserId(HttpContext);
                var isAdmin = AuthHelper.IsAdmin(HttpContext);

                if (!userId.HasValue)
                {
                    return Unauthorized(ApiResponse<object>.ErrorResponse("Không thể xác định người dùng hiện tại."));
                }

                var now = DateTime.UtcNow;

                var warranty = await (from w in _context.warranties
                                    join p in _context.products on w.product_id equals p.product_id
                                    join u in _context.users on w.user_id equals u.user_id
                                    where w.warranty_id == id &&
                                          (w.is_disabled == null || w.is_disabled == false)
                                    select new WarrantyDto
                                    {
                                        WarrantyId = w.warranty_id,
                                        ProductId = w.product_id,
                                        ProductName = p.product_name,
                                        ProductImageUrl = p.image_url,
                                        UserId = w.user_id,
                                        Username = u.username,
                                        OrderId = w.order_id,
                                        StartDate = w.start_date,
                                        EndDate = w.end_date,
                                        SerialNumber = w.serial_number,
                                        Status = w.status,
                                        StatusDisplay = w.status == "active" ? "Đang bảo hành" :
                                                       w.status == "expired" ? "Hết hạn" :
                                                       w.status == "used" ? "Đã sử dụng" :
                                                       w.status == "cancelled" ? "Đã hủy" : w.status ?? "active",
                                        CreatedAt = w.created_at,
                                        UpdatedAt = w.updated_at,
                                        IsExpired = w.end_date < now,
                                        DaysRemaining = w.end_date >= now ? (int?)(w.end_date - now).Days : null
                                    })
                                    .FirstOrDefaultAsync();

                if (warranty == null)
                {
                    return NotFound(ApiResponse<object>.ErrorResponse($"Không tìm thấy bảo hành với ID: {id}."));
                }

                // User chỉ được xem bảo hành của chính mình, Admin có thể xem tất cả
                if (!isAdmin && warranty.UserId != userId.Value)
                {
                    return StatusCode(403, ApiResponse<object>.ErrorResponse("Bạn chỉ có thể xem bảo hành của chính mình."));
                }

                return Ok(ApiResponse<WarrantyDto>.SuccessResponse(warranty));
            }
            catch (Exception ex)
            {
                Console.WriteLine($"[CRITICAL ERROR] GetWarrantyById: {ex.Message}");
                return StatusCode(500, ApiResponse<object>.ErrorResponse(
                    "Lỗi hệ thống khi lấy thông tin bảo hành.",
                    new List<string> { ex.Message }));
            }
        }

        // ============================================
        // 3. GET ALL WARRANTIES: GET api/v1/Warranty/GetAllWarranties (Admin only)
        // ============================================
        /// <summary>
        /// Lấy danh sách tất cả bảo hành. Chỉ dành cho Admin.
        /// </summary>
        /// <param name="page">Số trang (mặc định: 1)</param>
        /// <param name="limit">Số lượng mỗi trang (mặc định: 10)</param>
        /// <param name="status">Lọc theo trạng thái (tùy chọn)</param>
        /// <response code="200">Trả về danh sách bảo hành.</response>
        /// <response code="401">Chưa đăng nhập.</response>
        /// <response code="403">Không có quyền admin.</response>
        [HttpGet("GetAllWarranties")]
        [ProducesResponseType(typeof(ApiResponse<object>), 200)]
        [ProducesResponseType(typeof(ApiResponse<object>), 401)]
        [ProducesResponseType(typeof(ApiResponse<object>), 403)]
        public async Task<IActionResult> GetAllWarranties(
            [FromQuery] int page = 1,
            [FromQuery] int limit = 10,
            [FromQuery] string? status = null)
        {
            // Kiểm tra đăng nhập
            if (!AuthHelper.IsLoggedIn(HttpContext))
            {
                return Unauthorized(ApiResponse<object>.ErrorResponse("Bạn cần đăng nhập để thực hiện thao tác này."));
            }

            // Kiểm tra quyền admin
            if (!AuthHelper.IsAdmin(HttpContext))
            {
                return StatusCode(403, ApiResponse<object>.ErrorResponse("Chỉ có quyền admin mới được xem danh sách tất cả bảo hành."));
            }

            try
            {
                limit = Math.Clamp(limit, 1, 100);
                page = Math.Max(1, page);
                int offset = (page - 1) * limit;

                var now = DateTime.UtcNow;

                var query = from w in _context.warranties
                           join p in _context.products on w.product_id equals p.product_id
                           join u in _context.users on w.user_id equals u.user_id
                           where (w.is_disabled == null || w.is_disabled == false)
                           select new { w, p, u };

                // Filter by status if provided
                if (!string.IsNullOrEmpty(status))
                {
                    query = query.Where(x => x.w.status != null && x.w.status.ToLower() == status.ToLower());
                }

                var totalCount = await query.CountAsync();

                var warranties = await query
                    .OrderByDescending(x => x.w.created_at)
                    .Skip(offset)
                    .Take(limit)
                    .Select(x => new WarrantyDto
                    {
                        WarrantyId = x.w.warranty_id,
                        ProductId = x.w.product_id,
                        ProductName = x.p.product_name,
                        ProductImageUrl = x.p.image_url,
                        UserId = x.w.user_id,
                        Username = x.u.username,
                        OrderId = x.w.order_id,
                        StartDate = x.w.start_date,
                        EndDate = x.w.end_date,
                        SerialNumber = x.w.serial_number,
                        Status = x.w.status,
                        StatusDisplay = x.w.status == "active" ? "Đang bảo hành" :
                                       x.w.status == "expired" ? "Hết hạn" :
                                       x.w.status == "used" ? "Đã sử dụng" :
                                       x.w.status == "cancelled" ? "Đã hủy" : x.w.status ?? "active",
                        CreatedAt = x.w.created_at,
                        UpdatedAt = x.w.updated_at,
                        IsExpired = x.w.end_date < now,
                        DaysRemaining = x.w.end_date >= now ? (int?)(x.w.end_date - now).Days : null
                    })
                    .ToListAsync();

                var response = new
                {
                    TotalCount = totalCount,
                    CurrentPage = page,
                    Limit = limit,
                    Data = warranties
                };

                return Ok(ApiResponse<object>.SuccessResponse(
                    response,
                    $"Lấy danh sách {warranties.Count} bảo hành thành công."));
            }
            catch (Exception ex)
            {
                Console.WriteLine($"[CRITICAL ERROR] GetAllWarranties: {ex.Message}");
                return StatusCode(500, ApiResponse<object>.ErrorResponse(
                    "Lỗi hệ thống khi lấy danh sách bảo hành.",
                    new List<string> { ex.Message }));
            }
        }

        // ============================================
        // 4. UPDATE WARRANTY: PUT api/v1/Warranty/{id} (Admin only)
        // ============================================
        /// <summary>
        /// Cập nhật thông tin bảo hành (serial number, status). Chỉ dành cho Admin.
        /// </summary>
        /// <param name="id">ID của bảo hành.</param>
        /// <param name="updateDto">Thông tin cập nhật.</param>
        /// <response code="200">Cập nhật thành công.</response>
        /// <response code="400">Dữ liệu không hợp lệ.</response>
        /// <response code="401">Chưa đăng nhập.</response>
        /// <response code="403">Không có quyền admin.</response>
        /// <response code="404">Không tìm thấy bảo hành.</response>
        [HttpPut("{id}")]
        [ProducesResponseType(typeof(ApiResponse<WarrantyDto>), 200)]
        [ProducesResponseType(typeof(ApiResponse<object>), 400)]
        [ProducesResponseType(typeof(ApiResponse<object>), 401)]
        [ProducesResponseType(typeof(ApiResponse<object>), 403)]
        [ProducesResponseType(typeof(ApiResponse<object>), 404)]
        public async Task<IActionResult> UpdateWarranty(int id, [FromBody] WarrantyUpdateDto updateDto)
        {
            // Kiểm tra đăng nhập
            if (!AuthHelper.IsLoggedIn(HttpContext))
            {
                return Unauthorized(ApiResponse<object>.ErrorResponse("Bạn cần đăng nhập để thực hiện thao tác này."));
            }

            // Kiểm tra quyền admin
            if (!AuthHelper.IsAdmin(HttpContext))
            {
                return StatusCode(403, ApiResponse<object>.ErrorResponse("Chỉ có quyền admin mới được cập nhật bảo hành."));
            }

            try
            {
                var adminId = AuthHelper.GetCurrentUserId(HttpContext);
                if (!adminId.HasValue)
                {
                    return Unauthorized(ApiResponse<object>.ErrorResponse("Không thể xác định người dùng hiện tại."));
                }

                var warranty = await _context.warranties
                    .Where(w => w.warranty_id == id && (w.is_disabled == null || w.is_disabled == false))
                    .FirstOrDefaultAsync();

                if (warranty == null)
                {
                    return NotFound(ApiResponse<object>.ErrorResponse($"Không tìm thấy bảo hành với ID: {id}."));
                }

                // Cập nhật thông tin
                if (!string.IsNullOrEmpty(updateDto.SerialNumber))
                {
                    warranty.serial_number = updateDto.SerialNumber;
                }

                if (!string.IsNullOrEmpty(updateDto.Status))
                {
                    warranty.status = updateDto.Status;
                }

                warranty.updated_at = DateTime.UtcNow;
                warranty.updated_by = adminId.Value;

                await _context.SaveChangesAsync();

                // Lấy thông tin đầy đủ sau khi cập nhật
                var now = DateTime.UtcNow;
                var updatedWarranty = await (from w in _context.warranties
                                           join p in _context.products on w.product_id equals p.product_id
                                           join u in _context.users on w.user_id equals u.user_id
                                           where w.warranty_id == id
                                           select new WarrantyDto
                                           {
                                               WarrantyId = w.warranty_id,
                                               ProductId = w.product_id,
                                               ProductName = p.product_name,
                                               ProductImageUrl = p.image_url,
                                               UserId = w.user_id,
                                               Username = u.username,
                                               OrderId = w.order_id,
                                               StartDate = w.start_date,
                                               EndDate = w.end_date,
                                               SerialNumber = w.serial_number,
                                               Status = w.status,
                                               StatusDisplay = w.status == "active" ? "Đang bảo hành" :
                                                              w.status == "expired" ? "Hết hạn" :
                                                              w.status == "used" ? "Đã sử dụng" :
                                                              w.status == "cancelled" ? "Đã hủy" : w.status ?? "active",
                                               CreatedAt = w.created_at,
                                               UpdatedAt = w.updated_at,
                                               IsExpired = w.end_date < now,
                                               DaysRemaining = w.end_date >= now ? (int?)(w.end_date - now).Days : null
                                           })
                                           .FirstOrDefaultAsync();

                return Ok(ApiResponse<WarrantyDto>.SuccessResponse(
                    updatedWarranty!,
                    "Cập nhật bảo hành thành công."));
            }
            catch (Exception ex)
            {
                Console.WriteLine($"[CRITICAL ERROR] UpdateWarranty: {ex.Message}");
                return StatusCode(500, ApiResponse<object>.ErrorResponse(
                    "Lỗi hệ thống khi cập nhật bảo hành.",
                    new List<string> { ex.Message }));
            }
        }

        // ============================================
        // 5. CREATE WARRANTY: POST api/v1/Warranty (Admin only)
        // ============================================
        /// <summary>
        /// Tạo bảo hành mới với serial number. Chỉ dành cho Admin.
        /// </summary>
        /// <param name="createDto">Thông tin bảo hành cần tạo.</param>
        /// <response code="201">Tạo bảo hành thành công.</response>
        /// <response code="400">Dữ liệu không hợp lệ.</response>
        /// <response code="401">Chưa đăng nhập.</response>
        /// <response code="403">Không có quyền admin.</response>
        [HttpPost]
        [ProducesResponseType(typeof(ApiResponse<WarrantyDto>), 201)]
        [ProducesResponseType(typeof(ApiResponse<object>), 400)]
        [ProducesResponseType(typeof(ApiResponse<object>), 401)]
        [ProducesResponseType(typeof(ApiResponse<object>), 403)]
        public async Task<IActionResult> CreateWarranty([FromBody] WarrantyCreateDto createDto)
        {
            // Kiểm tra đăng nhập
            if (!AuthHelper.IsLoggedIn(HttpContext))
            {
                return Unauthorized(ApiResponse<object>.ErrorResponse("Bạn cần đăng nhập để thực hiện thao tác này."));
            }

            // Kiểm tra quyền admin
            if (!AuthHelper.IsAdmin(HttpContext))
            {
                return StatusCode(403, ApiResponse<object>.ErrorResponse("Chỉ có quyền admin mới được tạo bảo hành."));
            }

            try
            {
                var adminId = AuthHelper.GetCurrentUserId(HttpContext);
                if (!adminId.HasValue)
                {
                    return Unauthorized(ApiResponse<object>.ErrorResponse("Không thể xác định người dùng hiện tại."));
                }

                // Validate
                if (string.IsNullOrWhiteSpace(createDto.SerialNumber))
                {
                    return BadRequest(ApiResponse<object>.ErrorResponse("Serial number là bắt buộc."));
                }

                if (createDto.EndDate <= createDto.StartDate)
                {
                    return BadRequest(ApiResponse<object>.ErrorResponse("Ngày kết thúc phải lớn hơn ngày bắt đầu."));
                }

                // Kiểm tra serial number đã tồn tại chưa
                var existingWarranty = await _context.warranties
                    .Where(w => w.serial_number.ToUpper() == createDto.SerialNumber.ToUpper() &&
                                (w.is_disabled == null || w.is_disabled == false))
                    .FirstOrDefaultAsync();

                if (existingWarranty != null)
                {
                    return BadRequest(ApiResponse<object>.ErrorResponse($"Serial number '{createDto.SerialNumber}' đã được sử dụng cho bảo hành khác."));
                }

                // Kiểm tra product, user, order có tồn tại không
                var product = await _context.products.FindAsync(createDto.ProductId);
                if (product == null)
                {
                    return BadRequest(ApiResponse<object>.ErrorResponse($"Không tìm thấy sản phẩm với ID: {createDto.ProductId}."));
                }

                var user = await _context.users.FindAsync(createDto.UserId);
                if (user == null)
                {
                    return BadRequest(ApiResponse<object>.ErrorResponse($"Không tìm thấy người dùng với ID: {createDto.UserId}."));
                }

                var order = await _context.orders.FindAsync(createDto.OrderId);
                if (order == null)
                {
                    return BadRequest(ApiResponse<object>.ErrorResponse($"Không tìm thấy đơn hàng với ID: {createDto.OrderId}."));
                }

                // Tạo warranty mới
                var warranty = new warranty
                {
                    product_id = createDto.ProductId,
                    user_id = createDto.UserId,
                    order_id = createDto.OrderId,
                    serial_number = createDto.SerialNumber,
                    start_date = DateTime.SpecifyKind(createDto.StartDate, DateTimeKind.Utc),
                    end_date = DateTime.SpecifyKind(createDto.EndDate, DateTimeKind.Utc),
                    status = createDto.Status ?? "active",
                    created_at = DateTime.UtcNow,
                    updated_at = DateTime.UtcNow,
                    created_by = adminId.Value,
                    updated_by = adminId.Value,
                    is_disabled = false
                };

                _context.warranties.Add(warranty);
                await _context.SaveChangesAsync();

                // Lấy thông tin đầy đủ sau khi tạo
                var now = DateTime.UtcNow;
                var newWarranty = await (from w in _context.warranties
                                       join p in _context.products on w.product_id equals p.product_id
                                       join u in _context.users on w.user_id equals u.user_id
                                       where w.warranty_id == warranty.warranty_id
                                       select new WarrantyDto
                                       {
                                           WarrantyId = w.warranty_id,
                                           ProductId = w.product_id,
                                           ProductName = p.product_name,
                                           ProductImageUrl = p.image_url,
                                           UserId = w.user_id,
                                           Username = u.username,
                                           OrderId = w.order_id,
                                           StartDate = w.start_date,
                                           EndDate = w.end_date,
                                           SerialNumber = w.serial_number,
                                           Status = w.status,
                                           StatusDisplay = w.status == "active" ? "Đang bảo hành" :
                                                          w.status == "expired" ? "Hết hạn" :
                                                          w.status == "used" ? "Đã sử dụng" :
                                                          w.status == "cancelled" ? "Đã hủy" : w.status ?? "active",
                                           CreatedAt = w.created_at,
                                           UpdatedAt = w.updated_at,
                                           IsExpired = w.end_date < now,
                                           DaysRemaining = w.end_date >= now ? (int?)(w.end_date - now).Days : null
                                       })
                                       .FirstOrDefaultAsync();

                return StatusCode(201, ApiResponse<WarrantyDto>.SuccessResponse(
                    newWarranty!,
                    "Tạo bảo hành thành công."));
            }
            catch (Exception ex)
            {
                Console.WriteLine($"[CRITICAL ERROR] CreateWarranty: {ex.Message}");
                return StatusCode(500, ApiResponse<object>.ErrorResponse(
                    "Lỗi hệ thống khi tạo bảo hành.",
                    new List<string> { ex.Message }));
            }
        }

        // ============================================
        // 6. GET WARRANTY BY SERIAL NUMBER: GET api/v1/Warranty/GetBySerialNumber/{serialNumber}
        // ============================================
        /// <summary>
        /// Tìm kiếm bảo hành theo serial number.
        /// </summary>
        /// <param name="serialNumber">Serial number của sản phẩm.</param>
        /// <response code="200">Trả về thông tin bảo hành.</response>
        /// <response code="401">Chưa đăng nhập.</response>
        /// <response code="403">Không có quyền xem.</response>
        /// <response code="404">Không tìm thấy bảo hành.</response>
        [HttpGet("GetBySerialNumber/{serialNumber}")]
        [ProducesResponseType(typeof(ApiResponse<WarrantyDto>), 200)]
        [ProducesResponseType(typeof(ApiResponse<object>), 401)]
        [ProducesResponseType(typeof(ApiResponse<object>), 403)]
        [ProducesResponseType(typeof(ApiResponse<object>), 404)]
        public async Task<IActionResult> GetWarrantyBySerialNumber(string serialNumber)
        {
            // Kiểm tra đăng nhập
            if (!AuthHelper.IsLoggedIn(HttpContext))
            {
                return Unauthorized(ApiResponse<object>.ErrorResponse("Bạn cần đăng nhập để xem thông tin bảo hành."));
            }

            try
            {
                var userId = AuthHelper.GetCurrentUserId(HttpContext);
                var isAdmin = AuthHelper.IsAdmin(HttpContext);

                if (!userId.HasValue)
                {
                    return Unauthorized(ApiResponse<object>.ErrorResponse("Không thể xác định người dùng hiện tại."));
                }

                var now = DateTime.UtcNow;

                var warranty = await (from w in _context.warranties
                                    join p in _context.products on w.product_id equals p.product_id
                                    join u in _context.users on w.user_id equals u.user_id
                                    where w.serial_number.ToUpper() == serialNumber.ToUpper() &&
                                          (w.is_disabled == null || w.is_disabled == false)
                                    select new WarrantyDto
                                    {
                                        WarrantyId = w.warranty_id,
                                        ProductId = w.product_id,
                                        ProductName = p.product_name,
                                        ProductImageUrl = p.image_url,
                                        UserId = w.user_id,
                                        Username = u.username,
                                        OrderId = w.order_id,
                                        StartDate = w.start_date,
                                        EndDate = w.end_date,
                                        SerialNumber = w.serial_number,
                                        Status = w.status,
                                        StatusDisplay = w.status == "active" ? "Đang bảo hành" :
                                                       w.status == "expired" ? "Hết hạn" :
                                                       w.status == "used" ? "Đã sử dụng" :
                                                       w.status == "cancelled" ? "Đã hủy" : w.status ?? "active",
                                        CreatedAt = w.created_at,
                                        UpdatedAt = w.updated_at,
                                        IsExpired = w.end_date < now,
                                        DaysRemaining = w.end_date >= now ? (int?)(w.end_date - now).Days : null
                                    })
                                    .FirstOrDefaultAsync();

                if (warranty == null)
                {
                    return NotFound(ApiResponse<object>.ErrorResponse($"Không tìm thấy bảo hành với serial number: {serialNumber}."));
                }

                // User chỉ được xem bảo hành của chính mình, Admin có thể xem tất cả
                if (!isAdmin && warranty.UserId != userId.Value)
                {
                    return StatusCode(403, ApiResponse<object>.ErrorResponse("Bạn chỉ có thể xem bảo hành của chính mình."));
                }

                return Ok(ApiResponse<WarrantyDto>.SuccessResponse(warranty));
            }
            catch (Exception ex)
            {
                Console.WriteLine($"[CRITICAL ERROR] GetWarrantyBySerialNumber: {ex.Message}");
                return StatusCode(500, ApiResponse<object>.ErrorResponse(
                    "Lỗi hệ thống khi tìm kiếm bảo hành.",
                    new List<string> { ex.Message }));
            }
        }

        // ============================================
        // 7. GET WARRANTY HISTORY: GET api/v1/Warranty/{warrantyId}/History
        // ============================================
        /// <summary>
        /// Lấy lịch sử bảo hành (các lần bảo hành lần 1, 2, 3, 4...) của một warranty.
        /// </summary>
        /// <param name="warrantyId">ID của warranty cần xem lịch sử</param>
        /// <response code="200">Trả về danh sách lịch sử bảo hành.</response>
        /// <response code="401">Chưa đăng nhập.</response>
        /// <response code="403">Không có quyền xem bảo hành này.</response>
        /// <response code="404">Không tìm thấy warranty.</response>
        [HttpGet("{warrantyId}/History")]
        [ProducesResponseType(typeof(ApiResponse<List<WarrantyDetailDto>>), 200)]
        [ProducesResponseType(typeof(ApiResponse<object>), 401)]
        [ProducesResponseType(typeof(ApiResponse<object>), 403)]
        [ProducesResponseType(typeof(ApiResponse<object>), 404)]
        public async Task<IActionResult> GetWarrantyHistory(int warrantyId)
        {
            // Kiểm tra đăng nhập
            if (!AuthHelper.IsLoggedIn(HttpContext))
            {
                return Unauthorized(ApiResponse<object>.ErrorResponse("Bạn cần đăng nhập để xem lịch sử bảo hành."));
            }

            try
            {
                var userId = AuthHelper.GetCurrentUserId(HttpContext);
                var isAdmin = AuthHelper.IsAdmin(HttpContext);

                if (!userId.HasValue)
                {
                    return Unauthorized(ApiResponse<object>.ErrorResponse("Không thể xác định người dùng hiện tại."));
                }

                // Kiểm tra warranty có tồn tại và user có quyền xem không
                var warranty = await _context.warranties
                    .Where(w => w.warranty_id == warrantyId && (w.is_disabled == null || w.is_disabled == false))
                    .FirstOrDefaultAsync();

                if (warranty == null)
                {
                    return NotFound(ApiResponse<object>.ErrorResponse($"Không tìm thấy bảo hành với ID: {warrantyId}."));
                }

                // User chỉ được xem lịch sử bảo hành của chính mình, Admin có thể xem tất cả
                if (!isAdmin && warranty.user_id != userId.Value)
                {
                    return StatusCode(403, ApiResponse<object>.ErrorResponse("Bạn chỉ có thể xem lịch sử bảo hành của chính mình."));
                }

                // Lấy lịch sử bảo hành (warranty_details)
                var history = await (from wd in _context.warranty_details
                                    join creator in _context.users on wd.created_by equals creator.user_id into creatorGroup
                                    from creator in creatorGroup.DefaultIfEmpty()
                                    join handler in _context.users on wd.handled_by equals handler.user_id into handlerGroup
                                    from handler in handlerGroup.DefaultIfEmpty()
                                    where wd.warranty_id == warrantyId
                                          && (wd.is_disabled == null || wd.is_disabled == false)
                                    select new WarrantyDetailDto
                                    {
                                        DetailId = wd.detail_id,
                                        WarrantyId = wd.warranty_id,
                                        ClaimNumber = wd.claim_number,
                                        Status = wd.status ?? "pending",
                                        StatusDisplay = wd.status == "pending" ? "Chờ xử lý" :
                                                       wd.status == "approved" ? "Đã duyệt" :
                                                       wd.status == "processing" ? "Đang xử lý" :
                                                       wd.status == "completed" ? "Hoàn thành" :
                                                       wd.status == "rejected" ? "Từ chối" :
                                                       wd.status == "cancelled" ? "Đã hủy" : wd.status ?? "Chờ xử lý",
                                        Description = wd.description,
                                        Solution = wd.solution,
                                        RequestDate = wd.request_date,
                                        ServiceDate = wd.service_date,
                                        CompletedDate = wd.completed_date,
                                        Cost = wd.cost,
                                        CreatedBy = wd.created_by,
                                        CreatedByName = creator.username,
                                        HandledBy = wd.handled_by,
                                        HandledByName = handler != null ? handler.username : null,
                                        Notes = wd.notes,
                                        ImageUrls = wd.image_urls,
                                        CreatedAt = wd.created_at,
                                        UpdatedAt = wd.updated_at
                                    })
                                    .OrderBy(h => h.ClaimNumber) // Sắp xếp theo số thứ tự lần bảo hành (1, 2, 3, 4...)
                                    .ToListAsync();

                return Ok(ApiResponse<List<WarrantyDetailDto>>.SuccessResponse(
                    history,
                    $"Lấy lịch sử {history.Count} lần bảo hành thành công."));
            }
            catch (Exception ex)
            {
                Console.WriteLine($"[CRITICAL ERROR] GetWarrantyHistory: {ex.Message}");
                Console.WriteLine($"[CRITICAL ERROR] StackTrace: {ex.StackTrace}");
                return StatusCode(500, ApiResponse<object>.ErrorResponse(
                    "Lỗi hệ thống khi lấy lịch sử bảo hành.",
                    new List<string> { ex.Message }));
            }
        }

        // ============================================
        // 8. CREATE WARRANTY CLAIM: POST api/v1/Warranty/Claim
        // ============================================
        /// <summary>
        /// Tạo yêu cầu bảo hành mới (User tạo warranty_detail).
        /// Mỗi lần tạo là một lần bảo hành (lần 1, 2, 3, 4...) và tự động tính claim_number.
        /// </summary>
        /// <param name="createDto">Thông tin yêu cầu bảo hành</param>
        /// <response code="201">Tạo yêu cầu bảo hành thành công.</response>
        /// <response code="400">Dữ liệu không hợp lệ.</response>
        /// <response code="401">Chưa đăng nhập.</response>
        /// <response code="403">Không có quyền tạo yêu cầu bảo hành cho warranty này.</response>
        /// <response code="404">Không tìm thấy warranty.</response>
        [HttpPost("Claim")]
        [ProducesResponseType(typeof(ApiResponse<WarrantyDetailDto>), 201)]
        [ProducesResponseType(typeof(ApiResponse<object>), 400)]
        [ProducesResponseType(typeof(ApiResponse<object>), 401)]
        [ProducesResponseType(typeof(ApiResponse<object>), 403)]
        [ProducesResponseType(typeof(ApiResponse<object>), 404)]
        public async Task<IActionResult> CreateWarrantyClaim([FromBody] WarrantyDetailCreateDto createDto)
        {
            // Kiểm tra đăng nhập
            if (!AuthHelper.IsLoggedIn(HttpContext))
            {
                return Unauthorized(ApiResponse<object>.ErrorResponse("Bạn cần đăng nhập để tạo yêu cầu bảo hành."));
            }

            try
            {
                var userId = AuthHelper.GetCurrentUserId(HttpContext);
                if (!userId.HasValue)
                {
                    return Unauthorized(ApiResponse<object>.ErrorResponse("Không thể xác định người dùng hiện tại."));
                }

                if (createDto == null)
                {
                    return BadRequest(ApiResponse<object>.ErrorResponse("Dữ liệu yêu cầu bảo hành không được để trống."));
                }

                // Kiểm tra warranty có tồn tại không
                var warranty = await _context.warranties
                    .Where(w => w.warranty_id == createDto.WarrantyId && (w.is_disabled == null || w.is_disabled == false))
                    .FirstOrDefaultAsync();

                if (warranty == null)
                {
                    return NotFound(ApiResponse<object>.ErrorResponse($"Không tìm thấy bảo hành với ID: {createDto.WarrantyId}."));
                }

                // User chỉ được tạo yêu cầu bảo hành cho warranty của chính mình
                if (warranty.user_id != userId.Value)
                {
                    return StatusCode(403, ApiResponse<object>.ErrorResponse("Bạn chỉ có thể tạo yêu cầu bảo hành cho sản phẩm của chính mình."));
                }

                // Kiểm tra warranty còn trong thời hạn không
                var now = DateTime.UtcNow;
                if (warranty.end_date < now)
                {
                    return BadRequest(ApiResponse<object>.ErrorResponse("Bảo hành đã hết hạn. Không thể tạo yêu cầu bảo hành mới."));
                }

                // Tính claim_number tự động: số lượng warranty_details hiện có + 1
                var existingCount = await _context.warranty_details
                    .Where(wd => wd.warranty_id == createDto.WarrantyId && (wd.is_disabled == null || wd.is_disabled == false))
                    .CountAsync();

                var claimNumber = existingCount + 1;

                // Tạo warranty_detail mới
                var warrantyDetail = new warranty_detail
                {
                    warranty_id = createDto.WarrantyId,
                    claim_number = claimNumber,
                    status = "pending",
                    description = createDto.Description,
                    notes = createDto.Notes,
                    image_urls = createDto.ImageUrls,
                    request_date = now,
                    created_by = userId.Value,
                    created_at = now,
                    updated_at = now,
                    is_disabled = false
                };

                _context.warranty_details.Add(warrantyDetail);
                await _context.SaveChangesAsync();

                // Lấy lại warranty_detail với đầy đủ thông tin
                var newWarrantyDetail = await (from wd in _context.warranty_details
                                              join creator in _context.users on wd.created_by equals creator.user_id
                                              where wd.detail_id == warrantyDetail.detail_id
                                              select new WarrantyDetailDto
                                              {
                                                  DetailId = wd.detail_id,
                                                  WarrantyId = wd.warranty_id,
                                                  ClaimNumber = wd.claim_number,
                                                  Status = wd.status ?? "pending",
                                                  StatusDisplay = "Chờ xử lý",
                                                  Description = wd.description,
                                                  Solution = wd.solution,
                                                  RequestDate = wd.request_date,
                                                  ServiceDate = wd.service_date,
                                                  CompletedDate = wd.completed_date,
                                                  Cost = wd.cost,
                                                  CreatedBy = wd.created_by,
                                                  CreatedByName = creator.username,
                                                  HandledBy = wd.handled_by,
                                                  HandledByName = null,
                                                  Notes = wd.notes,
                                                  ImageUrls = wd.image_urls,
                                                  CreatedAt = wd.created_at,
                                                  UpdatedAt = wd.updated_at
                                              })
                                              .FirstOrDefaultAsync();

                return StatusCode(201, ApiResponse<WarrantyDetailDto>.SuccessResponse(
                    newWarrantyDetail!,
                    $"Tạo yêu cầu bảo hành lần {claimNumber} thành công."));
            }
            catch (Exception ex)
            {
                Console.WriteLine($"[CRITICAL ERROR] CreateWarrantyClaim: {ex.Message}");
                Console.WriteLine($"[CRITICAL ERROR] StackTrace: {ex.StackTrace}");
                return StatusCode(500, ApiResponse<object>.ErrorResponse(
                    "Lỗi hệ thống khi tạo yêu cầu bảo hành.",
                    new List<string> { ex.Message }));
            }
        }

        // ============================================
        // 9. UPDATE WARRANTY CLAIM: PUT api/v1/Warranty/Claim/{detailId}
        // ============================================
        /// <summary>
        /// Cập nhật yêu cầu bảo hành (Admin xử lý).
        /// Admin có thể cập nhật status, solution, dates, cost khi xử lý yêu cầu.
        /// </summary>
        /// <param name="detailId">ID của warranty_detail cần cập nhật</param>
        /// <param name="updateDto">Thông tin cập nhật</param>
        /// <response code="200">Cập nhật yêu cầu bảo hành thành công.</response>
        /// <response code="400">Dữ liệu không hợp lệ.</response>
        /// <response code="401">Chưa đăng nhập.</response>
        /// <response code="403">Chỉ admin mới được cập nhật yêu cầu bảo hành.</response>
        /// <response code="404">Không tìm thấy warranty_detail.</response>
        [HttpPut("Claim/{detailId}")]
        [ProducesResponseType(typeof(ApiResponse<WarrantyDetailDto>), 200)]
        [ProducesResponseType(typeof(ApiResponse<object>), 400)]
        [ProducesResponseType(typeof(ApiResponse<object>), 401)]
        [ProducesResponseType(typeof(ApiResponse<object>), 403)]
        [ProducesResponseType(typeof(ApiResponse<object>), 404)]
        public async Task<IActionResult> UpdateWarrantyClaim(int detailId, [FromBody] WarrantyDetailUpdateDto updateDto)
        {
            // Kiểm tra đăng nhập
            if (!AuthHelper.IsLoggedIn(HttpContext))
            {
                return Unauthorized(ApiResponse<object>.ErrorResponse("Bạn cần đăng nhập để cập nhật yêu cầu bảo hành."));
            }

            // Kiểm tra quyền admin
            if (!AuthHelper.IsAdmin(HttpContext))
            {
                return StatusCode(403, ApiResponse<object>.ErrorResponse("Chỉ có quyền admin mới được cập nhật yêu cầu bảo hành."));
            }

            try
            {
                var adminId = AuthHelper.GetCurrentUserId(HttpContext);
                if (!adminId.HasValue)
                {
                    return Unauthorized(ApiResponse<object>.ErrorResponse("Không thể xác định người dùng hiện tại."));
                }

                if (updateDto == null)
                {
                    return BadRequest(ApiResponse<object>.ErrorResponse("Dữ liệu cập nhật không được để trống."));
                }

                // Lấy warranty_detail
                var warrantyDetail = await _context.warranty_details
                    .Where(wd => wd.detail_id == detailId && (wd.is_disabled == null || wd.is_disabled == false))
                    .FirstOrDefaultAsync();

                if (warrantyDetail == null)
                {
                    return NotFound(ApiResponse<object>.ErrorResponse($"Không tìm thấy yêu cầu bảo hành với ID: {detailId}."));
                }

                // Cập nhật thông tin
                if (!string.IsNullOrEmpty(updateDto.Status))
                {
                    warrantyDetail.status = updateDto.Status;
                    
                    // Tự động set dates dựa vào status
                    if (updateDto.Status == "processing" && warrantyDetail.service_date == null)
                    {
                        warrantyDetail.service_date = DateTime.UtcNow;
                        warrantyDetail.handled_by = adminId.Value;
                    }
                    else if (updateDto.Status == "completed" && warrantyDetail.completed_date == null)
                    {
                        warrantyDetail.completed_date = DateTime.UtcNow;
                        warrantyDetail.handled_by = adminId.Value;
                    }
                    else if (updateDto.Status == "approved" && warrantyDetail.handled_by == null)
                    {
                        warrantyDetail.handled_by = adminId.Value;
                    }
                }

                if (updateDto.Solution != null)
                {
                    warrantyDetail.solution = updateDto.Solution;
                }

                if (updateDto.ServiceDate.HasValue)
                {
                    warrantyDetail.service_date = updateDto.ServiceDate.Value;
                }

                if (updateDto.CompletedDate.HasValue)
                {
                    warrantyDetail.completed_date = updateDto.CompletedDate.Value;
                }

                if (updateDto.Cost.HasValue)
                {
                    warrantyDetail.cost = updateDto.Cost.Value;
                }

                if (updateDto.Notes != null)
                {
                    warrantyDetail.notes = updateDto.Notes;
                }

                warrantyDetail.updated_at = DateTime.UtcNow;
                warrantyDetail.updated_by = adminId.Value;

                await _context.SaveChangesAsync();

                // Lấy lại warranty_detail với đầy đủ thông tin
                var updatedWarrantyDetail = await (from wd in _context.warranty_details
                                                  join creator in _context.users on wd.created_by equals creator.user_id
                                                  join handler in _context.users on wd.handled_by equals handler.user_id into handlerGroup
                                                  from handler in handlerGroup.DefaultIfEmpty()
                                                  where wd.detail_id == detailId
                                                  select new WarrantyDetailDto
                                                  {
                                                      DetailId = wd.detail_id,
                                                      WarrantyId = wd.warranty_id,
                                                      ClaimNumber = wd.claim_number,
                                                      Status = wd.status ?? "pending",
                                                      StatusDisplay = wd.status == "pending" ? "Chờ xử lý" :
                                                                     wd.status == "approved" ? "Đã duyệt" :
                                                                     wd.status == "processing" ? "Đang xử lý" :
                                                                     wd.status == "completed" ? "Hoàn thành" :
                                                                     wd.status == "rejected" ? "Từ chối" :
                                                                     wd.status == "cancelled" ? "Đã hủy" : wd.status ?? "Chờ xử lý",
                                                      Description = wd.description,
                                                      Solution = wd.solution,
                                                      RequestDate = wd.request_date,
                                                      ServiceDate = wd.service_date,
                                                      CompletedDate = wd.completed_date,
                                                      Cost = wd.cost,
                                                      CreatedBy = wd.created_by,
                                                      CreatedByName = creator.username,
                                                      HandledBy = wd.handled_by,
                                                      HandledByName = handler != null ? handler.username : null,
                                                      Notes = wd.notes,
                                                      ImageUrls = wd.image_urls,
                                                      CreatedAt = wd.created_at,
                                                      UpdatedAt = wd.updated_at
                                                  })
                                                  .FirstOrDefaultAsync();

                return Ok(ApiResponse<WarrantyDetailDto>.SuccessResponse(
                    updatedWarrantyDetail!,
                    "Cập nhật yêu cầu bảo hành thành công."));
            }
            catch (Exception ex)
            {
                Console.WriteLine($"[CRITICAL ERROR] UpdateWarrantyClaim: {ex.Message}");
                Console.WriteLine($"[CRITICAL ERROR] StackTrace: {ex.StackTrace}");
                return StatusCode(500, ApiResponse<object>.ErrorResponse(
                    "Lỗi hệ thống khi cập nhật yêu cầu bảo hành.",
                    new List<string> { ex.Message }));
            }
        }

        // ============================================
        // 10. GET ALL WARRANTY CLAIMS: GET api/v1/Warranty/Claims (Admin only)
        // ============================================
        /// <summary>
        /// Lấy danh sách tất cả yêu cầu bảo hành (warranty_details) với search và filter.
        /// Dùng cho frontend hiển thị danh sách yêu cầu bảo hành.
        /// </summary>
        /// <param name="page">Số trang (mặc định: 1)</param>
        /// <param name="limit">Số lượng mỗi trang (mặc định: 10)</param>
        /// <param name="status">Lọc theo trạng thái (pending, approved, processing, completed, rejected, cancelled)</param>
        /// <param name="search">Tìm kiếm theo mã, tên khách hàng, số điện thoại, sản phẩm</param>
        /// <response code="200">Trả về danh sách yêu cầu bảo hành.</response>
        /// <response code="401">Chưa đăng nhập.</response>
        /// <response code="403">Không có quyền admin.</response>
        [HttpGet("Claims")]
        [ProducesResponseType(typeof(ApiResponse<object>), 200)]
        [ProducesResponseType(typeof(ApiResponse<object>), 401)]
        [ProducesResponseType(typeof(ApiResponse<object>), 403)]
        public async Task<IActionResult> GetAllWarrantyClaims(
            [FromQuery] int page = 1,
            [FromQuery] int limit = 10,
            [FromQuery] string? status = null,
            [FromQuery] string? search = null)
        {
            // Kiểm tra đăng nhập
            if (!AuthHelper.IsLoggedIn(HttpContext))
            {
                return Unauthorized(ApiResponse<object>.ErrorResponse("Bạn cần đăng nhập để xem danh sách yêu cầu bảo hành."));
            }

            // Kiểm tra quyền admin
            if (!AuthHelper.IsAdmin(HttpContext))
            {
                return StatusCode(403, ApiResponse<object>.ErrorResponse("Chỉ có quyền admin mới được xem danh sách yêu cầu bảo hành."));
            }

            try
            {
                limit = Math.Clamp(limit, 1, 100);
                page = Math.Max(1, page);
                int offset = (page - 1) * limit;

                var query = from wd in _context.warranty_details
                           join w in _context.warranties on wd.warranty_id equals w.warranty_id
                           join p in _context.products on w.product_id equals p.product_id
                           join u in _context.users on w.user_id equals u.user_id
                           join o in _context.orders on w.order_id equals o.order_id into orderGroup
                           from o in orderGroup.DefaultIfEmpty()
                           join handler in _context.users on wd.handled_by equals handler.user_id into handlerGroup
                           from handler in handlerGroup.DefaultIfEmpty()
                           where (wd.is_disabled == null || wd.is_disabled == false)
                                 && (w.is_disabled == null || w.is_disabled == false)
                           select new { wd, w, p, u, o, handler };

                // Filter by status if provided
                if (!string.IsNullOrEmpty(status))
                {
                    query = query.Where(x => x.wd.status != null && x.wd.status.ToLower() == status.ToLower());
                }

                // Search: tìm kiếm theo mã (detail_id, warranty_id), tên khách hàng, số điện thoại, sản phẩm
                if (!string.IsNullOrEmpty(search))
                {
                    var searchLower = search.ToLower();
                    query = query.Where(x =>
                        x.wd.detail_id.ToString().Contains(searchLower) ||
                        x.w.warranty_id.ToString().Contains(searchLower) ||
                        (x.u.username != null && x.u.username.ToLower().Contains(searchLower)) ||
                        (x.u.phone != null && x.u.phone.Contains(search)) ||
                        (x.p.product_name != null && x.p.product_name.ToLower().Contains(searchLower)) ||
                        (x.w.serial_number != null && x.w.serial_number.ToLower().Contains(searchLower)) ||
                        (x.wd.description != null && x.wd.description.ToLower().Contains(searchLower))
                    );
                }

                var totalCount = await query.CountAsync();

                var claims = await query
                    .OrderByDescending(x => x.wd.request_date) // Sắp xếp theo ngày yêu cầu mới nhất
                    .Skip(offset)
                    .Take(limit)
                    .Select(x => new WarrantyClaimListDto
                    {
                        DetailId = x.wd.detail_id,
                        WarrantyId = x.wd.warranty_id,
                        ClaimNumber = x.wd.claim_number,
                        Status = x.wd.status ?? "pending",
                        StatusDisplay = x.wd.status == "pending" ? "Chờ xử lý" :
                                       x.wd.status == "approved" ? "Đã duyệt" :
                                       x.wd.status == "processing" ? "Đang xử lý" :
                                       x.wd.status == "completed" ? "Hoàn thành" :
                                       x.wd.status == "rejected" ? "Từ chối" :
                                       x.wd.status == "cancelled" ? "Đã hủy" : x.wd.status ?? "Chờ xử lý",
                        Description = x.wd.description,
                        RequestDate = x.wd.request_date,
                        SerialNumber = x.w.serial_number,
                        UserId = x.w.user_id,
                        CustomerName = x.u.username,
                        CustomerPhone = x.u.phone,
                        ProductId = x.w.product_id,
                        ProductName = x.p.product_name,
                        ProductImageUrl = x.p.image_url,
                        OrderId = x.w.order_id,
                        PurchaseDate = x.o != null ? x.o.order_date : null,
                        HandledByName = x.handler != null ? x.handler.username : null,
                        ServiceDate = x.wd.service_date,
                        CompletedDate = x.wd.completed_date,
                        Notes = x.wd.notes,
                        ImageUrls = x.wd.image_urls
                    })
                    .ToListAsync();

                var response = new
                {
                    TotalCount = totalCount,
                    CurrentPage = page,
                    Limit = limit,
                    Data = claims
                };

                return Ok(ApiResponse<object>.SuccessResponse(
                    response,
                    $"Lấy danh sách {claims.Count} yêu cầu bảo hành thành công."));
            }
            catch (Exception ex)
            {
                Console.WriteLine($"[CRITICAL ERROR] GetAllWarrantyClaims: {ex.Message}");
                Console.WriteLine($"[CRITICAL ERROR] StackTrace: {ex.StackTrace}");
                return StatusCode(500, ApiResponse<object>.ErrorResponse(
                    "Lỗi hệ thống khi lấy danh sách yêu cầu bảo hành.",
                    new List<string> { ex.Message }));
            }
        }

        // ============================================
        // 11. GET WARRANTY CLAIM BY ID: GET api/v1/Warranty/Claim/{detailId}
        // ============================================
        /// <summary>
        /// Lấy chi tiết một yêu cầu bảo hành theo detailId (Admin).
        /// Dùng cho frontend hiển thị modal chi tiết yêu cầu bảo hành.
        /// </summary>
        /// <param name="detailId">ID của warranty_detail</param>
        /// <response code="200">Trả về chi tiết yêu cầu bảo hành.</response>
        /// <response code="401">Chưa đăng nhập.</response>
        /// <response code="403">Không có quyền admin.</response>
        /// <response code="404">Không tìm thấy yêu cầu bảo hành.</response>
        [HttpGet("Claim/{detailId}")]
        [ProducesResponseType(typeof(ApiResponse<WarrantyClaimListDto>), 200)]
        [ProducesResponseType(typeof(ApiResponse<object>), 401)]
        [ProducesResponseType(typeof(ApiResponse<object>), 403)]
        [ProducesResponseType(typeof(ApiResponse<object>), 404)]
        public async Task<IActionResult> GetWarrantyClaimById(int detailId)
        {
            // Kiểm tra đăng nhập
            if (!AuthHelper.IsLoggedIn(HttpContext))
            {
                return Unauthorized(ApiResponse<object>.ErrorResponse("Bạn cần đăng nhập để xem chi tiết yêu cầu bảo hành."));
            }

            // Kiểm tra quyền admin
            if (!AuthHelper.IsAdmin(HttpContext))
            {
                return StatusCode(403, ApiResponse<object>.ErrorResponse("Chỉ có quyền admin mới được xem chi tiết yêu cầu bảo hành."));
            }

            try
            {
                var claim = await (from wd in _context.warranty_details
                                 join w in _context.warranties on wd.warranty_id equals w.warranty_id
                                 join p in _context.products on w.product_id equals p.product_id
                                 join u in _context.users on w.user_id equals u.user_id
                                 join o in _context.orders on w.order_id equals o.order_id into orderGroup
                                 from o in orderGroup.DefaultIfEmpty()
                                 join handler in _context.users on wd.handled_by equals handler.user_id into handlerGroup
                                 from handler in handlerGroup.DefaultIfEmpty()
                                 where wd.detail_id == detailId
                                       && (wd.is_disabled == null || wd.is_disabled == false)
                                       && (w.is_disabled == null || w.is_disabled == false)
                                 select new WarrantyClaimListDto
                                 {
                                     DetailId = wd.detail_id,
                                     WarrantyId = wd.warranty_id,
                                     ClaimNumber = wd.claim_number,
                                     Status = wd.status ?? "pending",
                                     StatusDisplay = wd.status == "pending" ? "Chờ xử lý" :
                                                    wd.status == "approved" ? "Đã duyệt" :
                                                    wd.status == "processing" ? "Đang xử lý" :
                                                    wd.status == "completed" ? "Hoàn thành" :
                                                    wd.status == "rejected" ? "Từ chối" :
                                                    wd.status == "cancelled" ? "Đã hủy" : wd.status ?? "Chờ xử lý",
                                     Description = wd.description,
                                     RequestDate = wd.request_date,
                                     SerialNumber = w.serial_number,
                                     UserId = w.user_id,
                                     CustomerName = u.username,
                                     CustomerPhone = u.phone,
                                     ProductId = w.product_id,
                                     ProductName = p.product_name,
                                     ProductImageUrl = p.image_url,
                                     OrderId = w.order_id,
                                     PurchaseDate = o != null ? o.order_date : null,
                                     HandledByName = handler != null ? handler.username : null,
                                     ServiceDate = wd.service_date,
                                     CompletedDate = wd.completed_date,
                                     Notes = wd.notes,
                                     ImageUrls = wd.image_urls
                                 })
                                 .FirstOrDefaultAsync();

                if (claim == null)
                {
                    return NotFound(ApiResponse<object>.ErrorResponse($"Không tìm thấy yêu cầu bảo hành với ID: {detailId}."));
                }

                return Ok(ApiResponse<WarrantyClaimListDto>.SuccessResponse(
                    claim,
                    "Lấy chi tiết yêu cầu bảo hành thành công."));
            }
            catch (Exception ex)
            {
                Console.WriteLine($"[CRITICAL ERROR] GetWarrantyClaimById: {ex.Message}");
                Console.WriteLine($"[CRITICAL ERROR] StackTrace: {ex.StackTrace}");
                return StatusCode(500, ApiResponse<object>.ErrorResponse(
                    "Lỗi hệ thống khi lấy chi tiết yêu cầu bảo hành.",
                    new List<string> { ex.Message }));
            }
        }

        // ============================================
        // 12. UPDATE WARRANTY STATUS: PUT api/v1/Warranty/Status/{detailId}
        // ============================================
        /// <summary>
        /// Cập nhật trạng thái bảo hành và ghi vào lịch sử (Admin workflow).
        /// Tự động append vào history_json.
        /// </summary>
        /// <param name="detailId">ID của warranty_detail</param>
        /// <param name="statusUpdateDto">Thông tin cập nhật trạng thái</param>
        /// <response code="200">Cập nhật trạng thái thành công.</response>
        /// <response code="400">Dữ liệu không hợp lệ.</response>
        /// <response code="401">Chưa đăng nhập.</response>
        /// <response code="403">Chỉ admin mới được cập nhật trạng thái.</response>
        /// <response code="404">Không tìm thấy warranty_detail.</response>
        [HttpPut("Status/{detailId}")]
        [ProducesResponseType(typeof(ApiResponse<WarrantyDetailDto>), 200)]
        [ProducesResponseType(typeof(ApiResponse<object>), 400)]
        [ProducesResponseType(typeof(ApiResponse<object>), 401)]
        [ProducesResponseType(typeof(ApiResponse<object>), 403)]
        [ProducesResponseType(typeof(ApiResponse<object>), 404)]
        public async Task<IActionResult> UpdateWarrantyStatus(int detailId, [FromBody] WarrantyStatusUpdateDto statusUpdateDto)
        {
            // Kiểm tra đăng nhập
            if (!AuthHelper.IsLoggedIn(HttpContext))
            {
                return Unauthorized(ApiResponse<object>.ErrorResponse("Bạn cần đăng nhập để cập nhật trạng thái bảo hành."));
            }

            // Kiểm tra quyền admin
            if (!AuthHelper.IsAdmin(HttpContext))
            {
                return StatusCode(403, ApiResponse<object>.ErrorResponse("Chỉ có quyền admin mới được cập nhật trạng thái bảo hành."));
            }

            try
            {
                var adminId = AuthHelper.GetCurrentUserId(HttpContext);
                if (!adminId.HasValue)
                {
                    return Unauthorized(ApiResponse<object>.ErrorResponse("Không thể xác định người dùng hiện tại."));
                }

                if (statusUpdateDto == null || string.IsNullOrEmpty(statusUpdateDto.Status))
                {
                    return BadRequest(ApiResponse<object>.ErrorResponse("Trạng thái không được để trống."));
                }

                // Lấy admin name
                var admin = await _context.users
                    .Where(u => u.user_id == adminId.Value)
                    .Select(u => u.username)
                    .FirstOrDefaultAsync();

                var adminName = admin ?? "Admin";

                // Lấy warranty_detail
                var warrantyDetail = await _context.warranty_details
                    .Where(wd => wd.detail_id == detailId && (wd.is_disabled == null || wd.is_disabled == false))
                    .FirstOrDefaultAsync();

                if (warrantyDetail == null)
                {
                    return NotFound(ApiResponse<object>.ErrorResponse($"Không tìm thấy yêu cầu bảo hành với ID: {detailId}."));
                }

                var now = DateTime.UtcNow;

                // Map status từ workflow sang database status
                string dbStatus = statusUpdateDto.Status switch
                {
                    "waiting_reception" => "pending",
                    "inspecting" => "approved",
                    "repairing" => "processing",
                    "quality_check" => "processing",
                    "completed" => "completed",
                    "returned" => "completed",
                    _ => statusUpdateDto.Status
                };

                // Map status display
                string statusDisplay = statusUpdateDto.Status switch
                {
                    "waiting_reception" => "Chờ tiếp nhận",
                    "inspecting" => "Đang kiểm tra",
                    "repairing" => "Đang sửa chữa",
                    "quality_check" => "Kiểm tra chất lượng",
                    "completed" => "Hoàn tất bảo hành",
                    "returned" => "Đã trả khách",
                    _ => statusUpdateDto.Status
                };

                // Cập nhật status
                warrantyDetail.status = dbStatus;

                // Cập nhật dates dựa vào status
                if (statusUpdateDto.Status == "inspecting" && warrantyDetail.service_date == null)
                {
                    warrantyDetail.service_date = now;
                }
                else if (statusUpdateDto.Status == "completed" && warrantyDetail.completed_date == null)
                {
                    warrantyDetail.completed_date = now;
                }

                // Cập nhật solution, cost, notes
                if (statusUpdateDto.Solution != null)
                {
                    warrantyDetail.solution = statusUpdateDto.Solution;
                }

                if (statusUpdateDto.Cost.HasValue)
                {
                    warrantyDetail.cost = statusUpdateDto.Cost.Value;
                }

                if (statusUpdateDto.Notes != null)
                {
                    warrantyDetail.notes = statusUpdateDto.Notes;
                }

                warrantyDetail.handled_by = adminId.Value;
                warrantyDetail.updated_at = now;
                warrantyDetail.updated_by = adminId.Value;

                // Append vào history_json
                var historyEntry = new
                {
                    date = now,
                    status = statusUpdateDto.Status,
                    statusDisplay = statusDisplay,
                    notes = statusUpdateDto.Notes,
                    solution = statusUpdateDto.Solution,
                    cost = statusUpdateDto.Cost,
                    handledBy = adminName
                };

                List<object> historyList = new List<object>();
                
                // Parse existing history_json
                if (!string.IsNullOrEmpty(warrantyDetail.history_json))
                {
                    try
                    {
                        historyList = System.Text.Json.JsonSerializer.Deserialize<List<object>>(warrantyDetail.history_json) ?? new List<object>();
                    }
                    catch
                    {
                        historyList = new List<object>();
                    }
                }

                // Append new entry
                historyList.Add(historyEntry);

                // Serialize back to JSON
                warrantyDetail.history_json = System.Text.Json.JsonSerializer.Serialize(historyList);

                await _context.SaveChangesAsync();

                // Lấy lại warranty_detail với đầy đủ thông tin
                var updatedWarrantyDetail = await (from wd in _context.warranty_details
                                                  join creator in _context.users on wd.created_by equals creator.user_id
                                                  join handler in _context.users on wd.handled_by equals handler.user_id into handlerGroup
                                                  from handler in handlerGroup.DefaultIfEmpty()
                                                  where wd.detail_id == detailId
                                                  select new WarrantyDetailDto
                                                  {
                                                      DetailId = wd.detail_id,
                                                      WarrantyId = wd.warranty_id,
                                                      ClaimNumber = wd.claim_number,
                                                      Status = wd.status ?? "pending",
                                                      StatusDisplay = statusDisplay,
                                                      Description = wd.description,
                                                      Solution = wd.solution,
                                                      RequestDate = wd.request_date,
                                                      ServiceDate = wd.service_date,
                                                      CompletedDate = wd.completed_date,
                                                      Cost = wd.cost,
                                                      CreatedBy = wd.created_by,
                                                      CreatedByName = creator.username,
                                                      HandledBy = wd.handled_by,
                                                      HandledByName = handler != null ? handler.username : null,
                                                      Notes = wd.notes,
                                                      ImageUrls = wd.image_urls,
                                                      CreatedAt = wd.created_at,
                                                      UpdatedAt = wd.updated_at
                                                  })
                                                  .FirstOrDefaultAsync();

                return Ok(ApiResponse<WarrantyDetailDto>.SuccessResponse(
                    updatedWarrantyDetail!,
                    "Cập nhật trạng thái bảo hành thành công."));
            }
            catch (Exception ex)
            {
                Console.WriteLine($"[CRITICAL ERROR] UpdateWarrantyStatus: {ex.Message}");
                Console.WriteLine($"[CRITICAL ERROR] StackTrace: {ex.StackTrace}");
                return StatusCode(500, ApiResponse<object>.ErrorResponse(
                    "Lỗi hệ thống khi cập nhật trạng thái bảo hành.",
                    new List<string> { ex.Message }));
            }
        }

        // ============================================
        // 13. GET DETAIL HISTORY: GET api/v1/Warranty/History/{detailId}
        // ============================================
        /// <summary>
        /// Lấy lịch sử thay đổi trạng thái của một warranty_detail từ history_json.
        /// </summary>
        /// <param name="detailId">ID của warranty_detail</param>
        /// <response code="200">Trả về danh sách lịch sử.</response>
        /// <response code="401">Chưa đăng nhập.</response>
        /// <response code="404">Không tìm thấy warranty_detail.</response>
        [HttpGet("History/{detailId}")]
        [ProducesResponseType(typeof(ApiResponse<List<WarrantyHistoryEntryDto>>), 200)]
        [ProducesResponseType(typeof(ApiResponse<object>), 401)]
        [ProducesResponseType(typeof(ApiResponse<object>), 404)]
        public async Task<IActionResult> GetDetailHistory(int detailId)
        {
            // Kiểm tra đăng nhập
            if (!AuthHelper.IsLoggedIn(HttpContext))
            {
                return Unauthorized(ApiResponse<object>.ErrorResponse("Bạn cần đăng nhập để xem lịch sử bảo hành."));
            }

            try
            {
                var warrantyDetail = await _context.warranty_details
                    .Where(wd => wd.detail_id == detailId && (wd.is_disabled == null || wd.is_disabled == false))
                    .FirstOrDefaultAsync();

                if (warrantyDetail == null)
                {
                    return NotFound(ApiResponse<object>.ErrorResponse($"Không tìm thấy yêu cầu bảo hành với ID: {detailId}."));
                }

                List<WarrantyHistoryEntryDto> history = new List<WarrantyHistoryEntryDto>();

                // Parse history_json
                if (!string.IsNullOrEmpty(warrantyDetail.history_json))
                {
                    try
                    {
                        var historyJson = System.Text.Json.JsonSerializer.Deserialize<List<System.Text.Json.JsonElement>>(warrantyDetail.history_json);
                        
                        if (historyJson != null)
                        {
                            foreach (var entry in historyJson)
                            {
                                var historyEntry = new WarrantyHistoryEntryDto
                                {
                                    Date = entry.TryGetProperty("date", out var dateProp) 
                                        ? DateTime.Parse(dateProp.GetString() ?? DateTime.UtcNow.ToString()) 
                                        : DateTime.UtcNow,
                                    Status = entry.TryGetProperty("status", out var statusProp) 
                                        ? statusProp.GetString() ?? string.Empty 
                                        : string.Empty,
                                    StatusDisplay = entry.TryGetProperty("statusDisplay", out var statusDisplayProp) 
                                        ? statusDisplayProp.GetString() ?? string.Empty 
                                        : string.Empty,
                                    Notes = entry.TryGetProperty("notes", out var notesProp) 
                                        ? notesProp.GetString() 
                                        : null,
                                    Solution = entry.TryGetProperty("solution", out var solutionProp) 
                                        ? solutionProp.GetString() 
                                        : null,
                                    Cost = entry.TryGetProperty("cost", out var costProp) && costProp.ValueKind == System.Text.Json.JsonValueKind.Number
                                        ? costProp.GetDecimal()
                                        : null,
                                    HandledBy = entry.TryGetProperty("handledBy", out var handledByProp) 
                                        ? handledByProp.GetString() 
                                        : null
                                };
                                history.Add(historyEntry);
                            }
                        }
                    }
                    catch (Exception ex)
                    {
                        Console.WriteLine($"[WARNING] Failed to parse history_json for detailId {detailId}: {ex.Message}");
                    }
                }

                // Nếu không có history, tạo entry đầu tiên từ request_date
                if (history.Count == 0)
                {
                    history.Add(new WarrantyHistoryEntryDto
                    {
                        Date = warrantyDetail.request_date,
                        Status = "waiting_reception",
                        StatusDisplay = "Chờ tiếp nhận",
                        Notes = warrantyDetail.description,
                        HandledBy = null
                    });
                }

                // Sort by date descending (newest first)
                history = history.OrderByDescending(h => h.Date).ToList();

                return Ok(ApiResponse<List<WarrantyHistoryEntryDto>>.SuccessResponse(
                    history,
                    $"Lấy lịch sử {history.Count} mục thành công."));
            }
            catch (Exception ex)
            {
                Console.WriteLine($"[CRITICAL ERROR] GetDetailHistory: {ex.Message}");
                Console.WriteLine($"[CRITICAL ERROR] StackTrace: {ex.StackTrace}");
                return StatusCode(500, ApiResponse<object>.ErrorResponse(
                    "Lỗi hệ thống khi lấy lịch sử bảo hành.",
                    new List<string> { ex.Message }));
            }
        }

        // ============================================
        // 14. UPLOAD WARRANTY IMAGES: POST api/v1/Warranty/UploadImages
        // ============================================
        /// <summary>
        /// Upload ảnh minh chứng cho yêu cầu bảo hành.
        /// </summary>
        /// <param name="files">Danh sách file ảnh (multipart/form-data)</param>
        /// <response code="200">Upload thành công, trả về danh sách file names.</response>
        /// <response code="400">File không hợp lệ.</response>
        /// <response code="401">Chưa đăng nhập.</response>
        [HttpPost("UploadImages")]
        [Consumes("multipart/form-data")]
        [ProducesResponseType(typeof(ApiResponse<List<string>>), 200)]
        [ProducesResponseType(typeof(ApiResponse<object>), 400)]
        [ProducesResponseType(typeof(ApiResponse<object>), 401)]
        [RequestFormLimits(MultipartBodyLengthLimit = 50_000_000)] // 50MB max
        public async Task<IActionResult> UploadWarrantyImages()
        {
            // Kiểm tra đăng nhập
            if (!AuthHelper.IsLoggedIn(HttpContext))
            {
                return Unauthorized(ApiResponse<object>.ErrorResponse("Bạn cần đăng nhập để upload ảnh."));
            }

            try
            {
                // Get files directly from Request.Form.Files
                var files = HttpContext.Request.Form.Files;
                
                if (files == null || files.Count == 0)
                {
                    return BadRequest(ApiResponse<object>.ErrorResponse("Vui lòng chọn ít nhất một file ảnh."));
                }

                var uploadPath = _webHostEnvironment.WebRootPath ?? Path.Combine(Directory.GetCurrentDirectory(), "wwwroot");
                var uploadedFileNames = new List<string>();

                foreach (var file in files)
                {
                    if (file == null || file.Length == 0)
                        continue;

                    try
                    {
                        if (!ImageUploadHelper.IsValidImage(file))
                        {
                            return BadRequest(ApiResponse<object>.ErrorResponse(
                                $"File {file.FileName} không hợp lệ. Chỉ chấp nhận file ảnh (jpg, jpeg, png, gif, bmp, webp) và kích thước tối đa 5MB."));
                        }

                        var fileName = await ImageUploadHelper.UploadImageAsync(file, uploadPath);
                        if (!string.IsNullOrEmpty(fileName))
                        {
                            // Trả về tên file (frontend sẽ tự build URL)
                            uploadedFileNames.Add(fileName);
                        }
                    }
                    catch (ArgumentException ex)
                    {
                        return BadRequest(ApiResponse<object>.ErrorResponse($"Lỗi upload file {file.FileName}: {ex.Message}"));
                    }
                }

                if (uploadedFileNames.Count == 0)
                {
                    return BadRequest(ApiResponse<object>.ErrorResponse("Không có file nào được upload thành công."));
                }

                return Ok(ApiResponse<List<string>>.SuccessResponse(
                    uploadedFileNames,
                    $"Upload thành công {uploadedFileNames.Count} file ảnh."));
            }
            catch (Exception ex)
            {
                Console.WriteLine($"[CRITICAL ERROR] UploadWarrantyImages: {ex.Message}");
                Console.WriteLine($"[CRITICAL ERROR] StackTrace: {ex.StackTrace}");
                return StatusCode(500, ApiResponse<object>.ErrorResponse(
                    "Lỗi hệ thống khi upload ảnh.",
                    new List<string> { ex.Message }));
            }
        }

        // ============================================
        // 15. GET MY WARRANTY CLAIMS: GET api/v1/Warranty/MyClaims
        // ============================================
        /// <summary>
        /// Lấy danh sách tất cả yêu cầu bảo hành (claims) của user hiện tại.
        /// </summary>
        /// <response code="200">Trả về danh sách yêu cầu bảo hành của user.</response>
        /// <response code="401">Chưa đăng nhập.</response>
        [HttpGet("MyClaims")]
        [ProducesResponseType(typeof(ApiResponse<List<WarrantyClaimListDto>>), 200)]
        [ProducesResponseType(typeof(ApiResponse<object>), 401)]
        public async Task<IActionResult> GetMyWarrantyClaims()
        {
            // Kiểm tra đăng nhập
            if (!AuthHelper.IsLoggedIn(HttpContext))
            {
                return Unauthorized(ApiResponse<object>.ErrorResponse("Bạn cần đăng nhập để xem yêu cầu bảo hành."));
            }

            try
            {
                var userId = AuthHelper.GetCurrentUserId(HttpContext);
                if (!userId.HasValue)
                {
                    return Unauthorized(ApiResponse<object>.ErrorResponse("Không thể xác định người dùng hiện tại."));
                }

                // Lấy tất cả claims của user (từ tất cả warranties của user)
                var claims = await (from wd in _context.warranty_details
                                 join w in _context.warranties on wd.warranty_id equals w.warranty_id
                                 join p in _context.products on w.product_id equals p.product_id
                                 join u in _context.users on w.user_id equals u.user_id
                                 join o in _context.orders on w.order_id equals o.order_id into orderGroup
                                 from o in orderGroup.DefaultIfEmpty()
                                 join handler in _context.users on wd.handled_by equals handler.user_id into handlerGroup
                                 from handler in handlerGroup.DefaultIfEmpty()
                                 where w.user_id == userId.Value
                                       && (wd.is_disabled == null || wd.is_disabled == false)
                                       && (w.is_disabled == null || w.is_disabled == false)
                                 select new WarrantyClaimListDto
                                 {
                                     DetailId = wd.detail_id,
                                     WarrantyId = wd.warranty_id,
                                     ClaimNumber = wd.claim_number,
                                     Status = wd.status ?? "pending",
                                     StatusDisplay = wd.status == "pending" ? "Chờ xử lý" :
                                                    wd.status == "approved" ? "Đã duyệt" :
                                                    wd.status == "processing" ? "Đang xử lý" :
                                                    wd.status == "completed" ? "Hoàn thành" :
                                                    wd.status == "rejected" ? "Từ chối" :
                                                    wd.status == "cancelled" ? "Đã hủy" : wd.status ?? "Chờ xử lý",
                                     Description = wd.description,
                                     RequestDate = wd.request_date,
                                     SerialNumber = w.serial_number,
                                     UserId = w.user_id,
                                     CustomerName = u.username,
                                     CustomerPhone = u.phone,
                                     ProductId = w.product_id,
                                     ProductName = p.product_name,
                                     ProductImageUrl = p.image_url,
                                     OrderId = w.order_id,
                                     PurchaseDate = o != null ? o.order_date : null,
                                     HandledByName = handler != null ? handler.username : null,
                                     ServiceDate = wd.service_date,
                                     CompletedDate = wd.completed_date,
                                     Notes = wd.notes,
                                     ImageUrls = wd.image_urls
                                 })
                                 .OrderByDescending(x => x.RequestDate) // Mới nhất trước
                                 .ToListAsync();

                return Ok(ApiResponse<List<WarrantyClaimListDto>>.SuccessResponse(
                    claims,
                    $"Lấy danh sách {claims.Count} yêu cầu bảo hành thành công."));
            }
            catch (Exception ex)
            {
                Console.WriteLine($"[CRITICAL ERROR] GetMyWarrantyClaims: {ex.Message}");
                Console.WriteLine($"[CRITICAL ERROR] StackTrace: {ex.StackTrace}");
                return StatusCode(500, ApiResponse<object>.ErrorResponse(
                    "Lỗi hệ thống khi lấy danh sách yêu cầu bảo hành.",
                    new List<string> { ex.Message }));
            }
        }
    }
}

