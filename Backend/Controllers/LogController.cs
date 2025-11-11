using Microsoft.AspNetCore.Mvc;
using ModernIssues.Helpers;
using ModernIssues.Models.Common;
using ModernIssues.Models.Entities;
using Microsoft.EntityFrameworkCore;
using System;
using System.Linq;
using System.Threading.Tasks;

namespace ModernIssues.Controllers
{
    [Route("/v1/[controller]")]
    [ApiController]
    public class LogController : ControllerBase
    {
        private readonly WebDbContext _context;

        public LogController(WebDbContext context)
        {
            _context = context;
        }

        /// <summary>
        /// Test endpoint để verify logging hoạt động
        /// </summary>
        [HttpPost("Test")]
        public async Task<IActionResult> TestLog()
        {
            try
            {
                var userId = AuthHelper.GetCurrentUserId(HttpContext);
                Console.WriteLine($"[TEST LOG] UserId: {userId}");

                var testLog = new log
                {
                    user_id = userId,
                    action_type = "test_log",
                    created_at = DateTime.UtcNow
                };

                _context.logs.Add(testLog);
                var result = await _context.SaveChangesAsync();

                Console.WriteLine($"[TEST LOG] SaveChanges result: {result}");

                // Verify log đã được lưu
                var savedLog = await _context.logs
                    .Where(l => l.action_type == "test_log" && l.user_id == userId)
                    .OrderByDescending(l => l.created_at)
                    .FirstOrDefaultAsync();

                if (savedLog != null)
                {
                    return Ok(new
                    {
                        success = true,
                        message = "Log test thành công!",
                        logId = savedLog.log_id,
                        userId = savedLog.user_id,
                        actionType = savedLog.action_type,
                        createdAt = savedLog.created_at,
                        totalLogs = await _context.logs.CountAsync()
                    });
                }

                return BadRequest(new { success = false, message = "Log không được lưu vào DB" });
            }
            catch (Exception ex)
            {
                Console.WriteLine($"[TEST LOG ERROR] {ex.Message}");
                Console.WriteLine($"[TEST LOG ERROR] StackTrace: {ex.StackTrace}");
                return StatusCode(500, new { success = false, error = ex.Message, stackTrace = ex.StackTrace });
            }
        }

        /// <summary>
        /// Lấy tổng số logs hiện tại
        /// </summary>
        [HttpGet("Count")]
        public async Task<IActionResult> GetLogCount()
        {
            try
            {
                var totalCount = await _context.logs.CountAsync();
                var recentLogs = await _context.logs
                    .OrderByDescending(l => l.created_at)
                    .Take(10)
                    .Select(l => new
                    {
                        logId = l.log_id,
                        userId = l.user_id,
                        productId = l.product_id,
                        actionType = l.action_type,
                        createdAt = l.created_at
                    })
                    .ToListAsync();

                return Ok(new
                {
                    totalCount = totalCount,
                    recentLogs = recentLogs
                });
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { error = ex.Message });
            }
        }
    }
}

