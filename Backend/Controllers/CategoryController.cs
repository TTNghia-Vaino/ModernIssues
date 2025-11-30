using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Http;
using ModernIssues.Models.DTOs;
using ModernIssues.Services;
using ModernIssues.Helpers;
using ModernIssues.Models.Common;
using System;
using System.Threading.Tasks;
using System.Collections.Generic;

namespace ModernIssues.Controllers
{
    [Route("/v1/[controller]")]
    [ApiController]
    public class CategoryController : ControllerBase
    {
        private readonly ICategoryService _categoryService;

        public CategoryController(ICategoryService categoryService)
        {
            _categoryService = categoryService;
        }

        // ============================================
        // 1. GET ALL CATEGORIES: GET api/v1/Category
        // ============================================
        /// <summary>
        /// Lấy danh sách tất cả danh mục (cây phân cấp). Khách hàng có thể xem.
        /// </summary>
        /// <response code="200">Trả về danh sách danh mục.</response>
        /// <response code="500">Lỗi hệ thống.</response>
        [HttpGet]
        [ProducesResponseType(typeof(ApiResponse<List<CategoryDto>>), HttpStatusCodes.OK)]
        [ProducesResponseType(typeof(ApiResponse<object>), HttpStatusCodes.InternalServerError)]
        public async Task<IActionResult> GetAllCategories()
        {
            try
            {
                var categories = await _categoryService.GetAllCategoriesAsync();
                return Ok(ApiResponse<List<CategoryDto>>.SuccessResponse(categories, "Lấy danh sách danh mục thành công."));
            }
            catch (Exception ex)
            {
                Console.WriteLine($"[CRITICAL ERROR] GetAllCategories: {ex.Message}");
                return StatusCode(HttpStatusCodes.InternalServerError,
                    ApiResponse<object>.ErrorResponse("Lỗi hệ thống khi lấy danh sách danh mục."));
            }
        }

        // ============================================
        // 2. GET CATEGORY TREE: GET api/v1/Category/tree
        // ============================================
        /// <summary>
        /// Lấy cây danh mục phân cấp (chỉ danh mục gốc và con của chúng). Khách hàng có thể xem.
        /// </summary>
        /// <response code="200">Trả về cây danh mục.</response>
        /// <response code="500">Lỗi hệ thống.</response>
        [HttpGet("tree")]
        [ProducesResponseType(typeof(ApiResponse<List<CategoryTreeDto>>), HttpStatusCodes.OK)]
        [ProducesResponseType(typeof(ApiResponse<object>), HttpStatusCodes.InternalServerError)]
        public async Task<IActionResult> GetCategoryTree()
        {
            try
            {
                var categoryTree = await _categoryService.GetCategoryTreeAsync();
                return Ok(ApiResponse<List<CategoryTreeDto>>.SuccessResponse(categoryTree, "Lấy cây danh mục thành công."));
            }
            catch (Exception ex)
            {
                Console.WriteLine($"[CRITICAL ERROR] GetCategoryTree: {ex.Message}");
                return StatusCode(HttpStatusCodes.InternalServerError,
                    ApiResponse<object>.ErrorResponse("Lỗi hệ thống khi lấy cây danh mục."));
            }
        }

        // ============================================
        // 2.1. GET CATEGORY TREE FULL: GET api/v1/Category/tree-full
        // ============================================
        /// <summary>
        /// Lấy cây danh mục phân cấp đầy đủ (hỗ trợ 3 cấp trở lên). Khách hàng có thể xem.
        /// </summary>
        /// <response code="200">Trả về cây danh mục đầy đủ.</response>
        /// <response code="500">Lỗi hệ thống.</response>
        [HttpGet("tree-full")]
        [ProducesResponseType(typeof(ApiResponse<List<CategoryTreeDto>>), HttpStatusCodes.OK)]
        [ProducesResponseType(typeof(ApiResponse<object>), HttpStatusCodes.InternalServerError)]
        public async Task<IActionResult> GetCategoryTreeFull()
        {
            try
            {
                var categoryTree = await _categoryService.GetCategoryTreeFullAsync();
                return Ok(ApiResponse<List<CategoryTreeDto>>.SuccessResponse(categoryTree, "Lấy cây danh mục đầy đủ thành công."));
            }
            catch (Exception ex)
            {
                Console.WriteLine($"[CRITICAL ERROR] GetCategoryTreeFull: {ex.Message}");
                return StatusCode(HttpStatusCodes.InternalServerError,
                    ApiResponse<object>.ErrorResponse("Lỗi hệ thống khi lấy cây danh mục đầy đủ."));
            }
        }

        // ============================================
        // 3. GET CATEGORY BY ID: GET api/v1/Category/{id}
        // ============================================
        /// <summary>
        /// Lấy thông tin chi tiết của một danh mục. Khách hàng có thể xem.
        /// </summary>
        /// <param name="id">ID của danh mục.</param>
        /// <response code="200">Trả về thông tin danh mục.</response>
        /// <response code="404">Không tìm thấy danh mục.</response>
        [HttpGet("{id}")]
        [ProducesResponseType(typeof(ApiResponse<CategoryDto>), HttpStatusCodes.OK)]
        [ProducesResponseType(typeof(ApiResponse<object>), HttpStatusCodes.NotFound)]
        public async Task<IActionResult> GetCategoryById(int id)
        {
            try
            {
                var category = await _categoryService.GetCategoryByIdAsync(id);
                if (category == null)
                {
                    return NotFound(ApiResponse<object>.ErrorResponse($"Không tìm thấy danh mục với ID: {id}."));
                }
                return Ok(ApiResponse<CategoryDto>.SuccessResponse(category, "Lấy thông tin danh mục thành công."));
            }
            catch (Exception ex)
            {
                Console.WriteLine($"[CRITICAL ERROR] GetCategoryById: {ex.Message}");
                return StatusCode(HttpStatusCodes.InternalServerError,
                    ApiResponse<object>.ErrorResponse("Lỗi hệ thống khi lấy thông tin danh mục."));
            }
        }

        // ============================================
        // 4. CREATE CATEGORY: POST api/v1/Category (Admin only)
        // ============================================
        /// <summary>
        /// Tạo danh mục mới. Chỉ dành cho Admin.
        /// </summary>
        /// <param name="categoryData">Dữ liệu danh mục.</param>
        /// <response code="201">Tạo danh mục thành công.</response>
        /// <response code="400">Dữ liệu không hợp lệ.</response>
        /// <response code="401">Chưa đăng nhập.</response>
        /// <response code="403">Không có quyền admin.</response>
        [HttpPost]
        [ProducesResponseType(typeof(ApiResponse<CategoryDto>), HttpStatusCodes.Created)]
        [ProducesResponseType(typeof(ApiResponse<object>), HttpStatusCodes.BadRequest)]
        [ProducesResponseType(typeof(ApiResponse<object>), HttpStatusCodes.Unauthorized)]
        [ProducesResponseType(typeof(ApiResponse<object>), HttpStatusCodes.Forbidden)]
        public async Task<IActionResult> CreateCategory([FromBody] CategoryCreateDto categoryData)
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
                    ApiResponse<object>.ErrorResponse("Chỉ có quyền admin mới được tạo danh mục."));
            }

            try
            {
                if (categoryData == null)
                {
                    return BadRequest(ApiResponse<object>.ErrorResponse("Dữ liệu danh mục không được để trống."));
                }

                var adminId = AuthHelper.GetCurrentUserId(HttpContext) ?? 1; // Fallback nếu không lấy được
                var newCategory = await _categoryService.CreateCategoryAsync(categoryData, adminId);
                return StatusCode(HttpStatusCodes.Created,
                    ApiResponse<CategoryDto>.SuccessResponse(newCategory, "Tạo danh mục thành công."));
            }
            catch (ArgumentException ex)
            {
                return BadRequest(ApiResponse<object>.ErrorResponse(ex.Message));
            }
            catch (Exception ex)
            {
                Console.WriteLine($"[CRITICAL ERROR] CreateCategory: {ex.Message}");
                return StatusCode(HttpStatusCodes.InternalServerError,
                    ApiResponse<object>.ErrorResponse("Lỗi hệ thống khi tạo danh mục."));
            }
        }

        // ============================================
        // 5. UPDATE CATEGORY: PUT api/v1/Category/{id} (Admin only)
        // ============================================
        /// <summary>
        /// Cập nhật danh mục. Chỉ dành cho Admin.
        /// </summary>
        /// <param name="id">ID của danh mục cần cập nhật.</param>
        /// <param name="categoryData">Dữ liệu danh mục mới.</param>
        /// <response code="200">Cập nhật thành công.</response>
        /// <response code="400">Dữ liệu không hợp lệ.</response>
        /// <response code="404">Không tìm thấy danh mục.</response>
        /// <response code="401">Chưa đăng nhập.</response>
        /// <response code="403">Không có quyền admin.</response>
        [HttpPut("{id}")]
        [ProducesResponseType(typeof(ApiResponse<CategoryDto>), HttpStatusCodes.OK)]
        [ProducesResponseType(typeof(ApiResponse<object>), HttpStatusCodes.BadRequest)]
        [ProducesResponseType(typeof(ApiResponse<object>), HttpStatusCodes.NotFound)]
        [ProducesResponseType(typeof(ApiResponse<object>), HttpStatusCodes.Unauthorized)]
        [ProducesResponseType(typeof(ApiResponse<object>), HttpStatusCodes.Forbidden)]
        public async Task<IActionResult> UpdateCategory(int id, [FromBody] CategoryUpdateDto categoryData)
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
                    ApiResponse<object>.ErrorResponse("Chỉ có quyền admin mới được cập nhật danh mục."));
            }

            try
            {
                if (categoryData == null)
                {
                    return BadRequest(ApiResponse<object>.ErrorResponse("Dữ liệu danh mục không được để trống."));
                }

                var adminId = AuthHelper.GetCurrentUserId(HttpContext) ?? 1; // Fallback nếu không lấy được
                var updatedCategory = await _categoryService.UpdateCategoryAsync(id, categoryData, adminId);
                
                if (updatedCategory == null)
                {
                    return NotFound(ApiResponse<object>.ErrorResponse($"Không tìm thấy danh mục với ID: {id}."));
                }

                return Ok(ApiResponse<CategoryDto>.SuccessResponse(updatedCategory, "Cập nhật danh mục thành công."));
            }
            catch (ArgumentException ex)
            {
                return BadRequest(ApiResponse<object>.ErrorResponse(ex.Message));
            }
            catch (Exception ex)
            {
                Console.WriteLine($"[CRITICAL ERROR] UpdateCategory: {ex.Message}");
                return StatusCode(HttpStatusCodes.InternalServerError,
                    ApiResponse<object>.ErrorResponse("Lỗi hệ thống khi cập nhật danh mục."));
            }
        }

        // ============================================
        // 6. DELETE CATEGORY: DELETE api/v1/Category/{id} (Admin only)
        // ============================================
        /// <summary>
        /// Xóa danh mục (soft delete). Chỉ dành cho Admin.
        /// </summary>
        /// <param name="id">ID của danh mục cần xóa.</param>
        /// <response code="200">Xóa thành công.</response>
        /// <response code="404">Không tìm thấy danh mục.</response>
        /// <response code="401">Chưa đăng nhập.</response>
        /// <response code="403">Không có quyền admin.</response>
        [HttpDelete("{id}")]
        [ProducesResponseType(typeof(ApiResponse<object>), HttpStatusCodes.OK)]
        [ProducesResponseType(typeof(ApiResponse<object>), HttpStatusCodes.NotFound)]
        [ProducesResponseType(typeof(ApiResponse<object>), HttpStatusCodes.Unauthorized)]
        [ProducesResponseType(typeof(ApiResponse<object>), HttpStatusCodes.Forbidden)]
        public async Task<IActionResult> DeleteCategory(int id)
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
                    ApiResponse<object>.ErrorResponse("Chỉ có quyền admin mới được xóa danh mục."));
            }

            try
            {
                var adminId = AuthHelper.GetCurrentUserId(HttpContext) ?? 1; // Fallback nếu không lấy được
                var success = await _categoryService.DeleteCategoryAsync(id, adminId);
                
                if (!success)
                {
                    return NotFound(ApiResponse<object>.ErrorResponse($"Không tìm thấy danh mục với ID: {id}."));
                }

                return Ok(ApiResponse<object>.SuccessResponse(new { categoryId = id }, "Xóa danh mục thành công."));
            }
            catch (Exception ex)
            {
                Console.WriteLine($"[CRITICAL ERROR] DeleteCategory: {ex.Message}");
                return StatusCode(HttpStatusCodes.InternalServerError,
                    ApiResponse<object>.ErrorResponse("Lỗi hệ thống khi xóa danh mục."));
            }
        }
    }
}
