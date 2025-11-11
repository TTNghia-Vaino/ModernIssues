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
    public class SupportController : ControllerBase
    {
        private readonly WebDbContext _context;

        public SupportController(WebDbContext context)
        {
            _context = context;
        }

        /// <summary>
        /// Tạo ticket hỗ trợ mới
        /// </summary>
        [HttpPost("Ticket")]
        public async Task<IActionResult> CreateTicket([FromBody] CreateTicketDto dto)
        {
            try
            {
                var userId = AuthHelper.GetCurrentUserId(HttpContext);

                var ticket = new support_ticket
                {
                    user_id = userId,
                    subject = dto.Subject,
                    message = dto.Message,
                    ticket_type = dto.TicketType ?? "general",
                    status = "open",
                    email = dto.Email,
                    phone = dto.Phone,
                    created_at = DateTime.UtcNow,
                    updated_at = DateTime.UtcNow
                };

                _context.support_tickets.Add(ticket);
                await _context.SaveChangesAsync();

                return Ok(ApiResponse<object>.SuccessResponse(new
                {
                    ticketId = ticket.ticket_id,
                    status = ticket.status,
                    createdAt = ticket.created_at
                }, "Ticket đã được tạo thành công. Chúng tôi sẽ liên hệ với bạn sớm nhất."));
            }
            catch (Exception ex)
            {
                Console.WriteLine($"[ERROR] CreateTicket: {ex.Message}");
                return StatusCode(500, ApiResponse<object>.ErrorResponse("Lỗi hệ thống khi tạo ticket."));
            }
        }

        /// <summary>
        /// Lấy danh sách tickets của user hiện tại
        /// </summary>
        [HttpGet("Tickets")]
        public async Task<IActionResult> GetMyTickets()
        {
            if (!AuthHelper.IsLoggedIn(HttpContext))
            {
                return Unauthorized(ApiResponse<object>.ErrorResponse("Bạn cần đăng nhập."));
            }

            var userId = AuthHelper.GetCurrentUserId(HttpContext);
            if (!userId.HasValue)
            {
                return Unauthorized(ApiResponse<object>.ErrorResponse("Không thể xác định người dùng."));
            }

            var tickets = await _context.support_tickets
                .Where(t => t.user_id == userId)
                .OrderByDescending(t => t.created_at)
                .Select(t => new
                {
                    ticketId = t.ticket_id,
                    subject = t.subject,
                    ticketType = t.ticket_type,
                    status = t.status,
                    createdAt = t.created_at,
                    updatedAt = t.updated_at,
                    resolvedAt = t.resolved_at
                })
                .ToListAsync();

            return Ok(ApiResponse<object>.SuccessResponse(tickets, "Danh sách tickets của bạn."));
        }

        /// <summary>
        /// Lấy chi tiết ticket
        /// </summary>
        [HttpGet("Ticket/{ticketId}")]
        public async Task<IActionResult> GetTicket(int ticketId)
        {
            if (!AuthHelper.IsLoggedIn(HttpContext))
            {
                return Unauthorized(ApiResponse<object>.ErrorResponse("Bạn cần đăng nhập."));
            }

            var userId = AuthHelper.GetCurrentUserId(HttpContext);
            var isAdmin = AuthHelper.IsAdmin(HttpContext);

            var ticket = await _context.support_tickets
                .Where(t => t.ticket_id == ticketId && (t.user_id == userId || isAdmin))
                .Select(t => new
                {
                    ticketId = t.ticket_id,
                    subject = t.subject,
                    message = t.message,
                    ticketType = t.ticket_type,
                    status = t.status,
                    email = t.email,
                    phone = t.phone,
                    createdAt = t.created_at,
                    updatedAt = t.updated_at,
                    resolvedAt = t.resolved_at,
                    assignedTo = t.assigned_to
                })
                .FirstOrDefaultAsync();

            if (ticket == null)
            {
                return NotFound(ApiResponse<object>.ErrorResponse("Không tìm thấy ticket."));
            }

            return Ok(ApiResponse<object>.SuccessResponse(ticket, "Chi tiết ticket."));
        }

        /// <summary>
        /// Admin: Lấy tất cả tickets
        /// </summary>
        [HttpGet("Tickets/All")]
        public async Task<IActionResult> GetAllTickets([FromQuery] string? status, [FromQuery] int page = 1, [FromQuery] int limit = 20)
        {
            if (!AuthHelper.IsAdmin(HttpContext))
            {
                return Unauthorized(ApiResponse<object>.ErrorResponse("Chỉ admin mới có quyền xem tất cả tickets."));
            }

            var query = _context.support_tickets.AsQueryable();

            if (!string.IsNullOrEmpty(status))
            {
                query = query.Where(t => t.status == status);
            }

            var total = await query.CountAsync();

            var tickets = await query
                .Include(t => t.user)
                .OrderByDescending(t => t.created_at)
                .Skip((page - 1) * limit)
                .Take(limit)
                .Select(t => new
                {
                    ticketId = t.ticket_id,
                    userId = t.user_id,
                    username = t.user != null ? t.user.username : "Guest",
                    email = t.email,
                    subject = t.subject,
                    ticketType = t.ticket_type,
                    status = t.status,
                    assignedTo = t.assigned_to,
                    createdAt = t.created_at,
                    updatedAt = t.updated_at
                })
                .ToListAsync();

            return Ok(ApiResponse<object>.SuccessResponse(new
            {
                tickets = tickets,
                total = total,
                page = page,
                limit = limit,
                totalPages = (int)Math.Ceiling(total / (double)limit)
            }, "Danh sách tickets."));
        }

        /// <summary>
        /// Admin: Cập nhật trạng thái ticket
        /// </summary>
        [HttpPut("Ticket/{ticketId}/Status")]
        public async Task<IActionResult> UpdateTicketStatus(int ticketId, [FromBody] UpdateTicketStatusDto dto)
        {
            if (!AuthHelper.IsAdmin(HttpContext))
            {
                return Unauthorized(ApiResponse<object>.ErrorResponse("Chỉ admin mới có quyền cập nhật ticket."));
            }

            var ticket = await _context.support_tickets.FindAsync(ticketId);
            if (ticket == null)
            {
                return NotFound(ApiResponse<object>.ErrorResponse("Không tìm thấy ticket."));
            }

            ticket.status = dto.Status;
            ticket.assigned_to = dto.AssignedTo;
            ticket.updated_at = DateTime.UtcNow;

            if (dto.Status == "resolved" || dto.Status == "closed")
            {
                ticket.resolved_at = DateTime.UtcNow;
            }

            await _context.SaveChangesAsync();

            return Ok(ApiResponse<object>.SuccessResponse(new
            {
                ticketId = ticket.ticket_id,
                status = ticket.status
            }, "Cập nhật trạng thái ticket thành công."));
        }

        /// <summary>
        /// Lấy lịch sử chat với admin
        /// </summary>
        [HttpGet("Chat/History")]
        public async Task<IActionResult> GetChatHistory([FromQuery] int? limit = 50)
        {
            if (!AuthHelper.IsLoggedIn(HttpContext))
            {
                return Unauthorized(ApiResponse<object>.ErrorResponse("Bạn cần đăng nhập."));
            }

            var userId = AuthHelper.GetCurrentUserId(HttpContext);
            if (!userId.HasValue)
            {
                return Unauthorized(ApiResponse<object>.ErrorResponse("Không thể xác định người dùng."));
            }

            var messages = await _context.chat_messages
                .Where(m => m.user_id == userId)
                .Include(m => m.admin)
                .OrderByDescending(m => m.created_at)
                .Take(limit.Value)
                .Select(m => new
                {
                    messageId = m.message_id,
                    message = m.message,
                    senderType = m.sender_type,
                    adminName = m.admin != null ? m.admin.username : null,
                    isRead = m.is_read,
                    createdAt = m.created_at
                })
                .OrderBy(m => m.createdAt)
                .ToListAsync();

            // Đánh dấu tin nhắn đã đọc
            await _context.chat_messages
                .Where(m => m.user_id == userId && !m.is_read)
                .ExecuteUpdateAsync(m => m.SetProperty(x => x.is_read, true));

            return Ok(ApiResponse<object>.SuccessResponse(messages, "Lịch sử chat."));
        }

        /// <summary>
        /// Admin: Lấy tin nhắn chưa đọc
        /// </summary>
        [HttpGet("Chat/Unread")]
        public async Task<IActionResult> GetUnreadMessages()
        {
            if (!AuthHelper.IsAdmin(HttpContext))
            {
                return Unauthorized(ApiResponse<object>.ErrorResponse("Chỉ admin mới có quyền xem tin nhắn chưa đọc."));
            }

            var unreadMessages = await _context.chat_messages
                .Where(m => m.sender_type == "user" && !m.is_read)
                .Include(m => m.user)
                .OrderBy(m => m.created_at)
                .Select(m => new
                {
                    messageId = m.message_id,
                    userId = m.user_id,
                    username = m.user != null ? m.user.username : "Guest",
                    message = m.message,
                    createdAt = m.created_at
                })
                .ToListAsync();

            return Ok(ApiResponse<object>.SuccessResponse(unreadMessages, "Tin nhắn chưa đọc."));
        }
    }

    // DTOs
    public class CreateTicketDto
    {
        public string Subject { get; set; } = string.Empty;
        public string Message { get; set; } = string.Empty;
        public string? TicketType { get; set; }
        public string? Email { get; set; }
        public string? Phone { get; set; }
    }

    public class UpdateTicketStatusDto
    {
        public string Status { get; set; } = string.Empty;
        public int? AssignedTo { get; set; }
    }
}

