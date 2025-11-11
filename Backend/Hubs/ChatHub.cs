using Microsoft.AspNetCore.SignalR;
using ModernIssues.Models.Entities;
using Microsoft.EntityFrameworkCore;
using System;
using System.Linq;
using System.Threading.Tasks;

namespace ModernIssues.Hubs
{
    public class ChatHub : Hub
    {
        private readonly WebDbContext _context;

        public ChatHub(WebDbContext context)
        {
            _context = context;
        }

        /// <summary>
        /// Join vào chat room (theo user_id)
        /// </summary>
        public async Task JoinChat(int userId)
        {
            await Groups.AddToGroupAsync(Context.ConnectionId, $"user_{userId}");
            Console.WriteLine($"[ChatHub] User {userId} joined chat");
        }

        /// <summary>
        /// Join vào admin chat room
        /// </summary>
        public async Task JoinAdminChat()
        {
            await Groups.AddToGroupAsync(Context.ConnectionId, "admin_chat");
            Console.WriteLine($"[ChatHub] Admin joined chat");
        }

        /// <summary>
        /// Gửi tin nhắn từ user
        /// </summary>
        public async Task SendMessage(int userId, string message)
        {
            try
            {
                // Lưu tin nhắn vào DB
                var chatMessage = new chat_message
                {
                    user_id = userId,
                    message = message,
                    sender_type = "user",
                    is_read = false,
                    created_at = DateTime.UtcNow
                };

                _context.chat_messages.Add(chatMessage);
                await _context.SaveChangesAsync();

                // Lấy thông tin user
                var user = await _context.users.FindAsync(userId);

                // Gửi cho admin
                await Clients.Group("admin_chat").SendAsync("ReceiveMessage", new
                {
                    messageId = chatMessage.message_id,
                    userId = userId,
                    username = user?.username ?? "Guest",
                    message = message,
                    senderType = "user",
                    createdAt = chatMessage.created_at
                });

                // Xác nhận cho user
                await Clients.Caller.SendAsync("MessageSent", new
                {
                    messageId = chatMessage.message_id,
                    success = true
                });

                Console.WriteLine($"[ChatHub] User {userId} sent message: {message}");
            }
            catch (Exception ex)
            {
                Console.WriteLine($"[ChatHub ERROR] SendMessage: {ex.Message}");
                await Clients.Caller.SendAsync("Error", new { message = "Không thể gửi tin nhắn" });
            }
        }

        /// <summary>
        /// Admin trả lời tin nhắn
        /// </summary>
        public async Task AdminReply(int adminId, int userId, string message)
        {
            try
            {
                // Lưu tin nhắn vào DB
                var chatMessage = new chat_message
                {
                    user_id = userId,
                    admin_id = adminId,
                    message = message,
                    sender_type = "admin",
                    is_read = false,
                    created_at = DateTime.UtcNow
                };

                _context.chat_messages.Add(chatMessage);
                await _context.SaveChangesAsync();

                // Đánh dấu các tin nhắn cũ của user là đã đọc
                await _context.chat_messages
                    .Where(m => m.user_id == userId && m.sender_type == "user" && !m.is_read)
                    .ExecuteUpdateAsync(m => m.SetProperty(x => x.is_read, true));

                // Lấy thông tin admin
                var admin = await _context.users.FindAsync(adminId);

                // Gửi cho user
                await Clients.Group($"user_{userId}").SendAsync("ReceiveMessage", new
                {
                    messageId = chatMessage.message_id,
                    adminId = adminId,
                    adminName = admin?.username ?? "Admin",
                    message = message,
                    senderType = "admin",
                    createdAt = chatMessage.created_at
                });

                // Xác nhận cho admin
                await Clients.Caller.SendAsync("MessageSent", new
                {
                    messageId = chatMessage.message_id,
                    success = true
                });

                Console.WriteLine($"[ChatHub] Admin {adminId} replied to user {userId}: {message}");
            }
            catch (Exception ex)
            {
                Console.WriteLine($"[ChatHub ERROR] AdminReply: {ex.Message}");
                await Clients.Caller.SendAsync("Error", new { message = "Không thể gửi tin nhắn" });
            }
        }

        /// <summary>
        /// Đánh dấu tin nhắn đã đọc
        /// </summary>
        public async Task MarkAsRead(int messageId)
        {
            try
            {
                var message = await _context.chat_messages.FindAsync(messageId);
                if (message != null)
                {
                    message.is_read = true;
                    await _context.SaveChangesAsync();
                }
            }
            catch (Exception ex)
            {
                Console.WriteLine($"[ChatHub ERROR] MarkAsRead: {ex.Message}");
            }
        }

        public override async Task OnDisconnectedAsync(Exception? exception)
        {
            Console.WriteLine($"[ChatHub] Client disconnected: {Context.ConnectionId}");
            await base.OnDisconnectedAsync(exception);
        }
    }
}

