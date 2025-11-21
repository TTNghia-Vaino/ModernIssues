using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.Options;
using Microsoft.AspNetCore.SignalR;
using ModernIssues.Services;
using ModernIssues.Models.DTOs;
using ModernIssues.Models.Entities;
using ModernIssues.Models.Configurations;
using ModernIssues.Hubs;
using System;
using System.Globalization;
using System.Threading.Tasks;
using System.Text.Json;

namespace ModernIssues.Controllers
{
    [ApiController]
    [Route("[controller]")]
    public class HooksController : Controller
    {
        private readonly IHooksService _hooksService;
        private readonly HooksConfig _hooksConfig;
        private readonly IHubContext<PaymentHub> _hubContext;

        public HooksController(
            IHooksService hooksService, 
            IOptions<HooksConfig> hooksConfig,
            IHubContext<PaymentHub> hubContext)
        {
            _hooksService = hooksService;
            _hooksConfig = hooksConfig.Value;
            _hubContext = hubContext;
        }

        [HttpPost("transaction")]
        public async Task<IActionResult> ReceiveTransaction([FromBody] BankTransactionDto dto)
        {
            Console.WriteLine($"[HooksController] Received webhook transaction: Referencecode={dto.Referencecode}, Amount={dto.Transferamount}, Description={dto.Description}");
            
            // 1️⃣ Kiểm tra API key trong header
            if (!Request.Headers.TryGetValue("Authorization", out var authHeader))
            {
                Console.WriteLine("[HooksController] Authorization header missing");
                return Unauthorized("Authorization header missing");
            }

            const string prefix = "Apikey ";
            if (!authHeader.ToString().StartsWith(prefix))
            {
                return Unauthorized("Invalid Authorization format");
            }

            var incomingApiKey = authHeader.ToString().Substring(prefix.Length).Trim();

            if (!string.Equals(incomingApiKey, _hooksConfig.ApiKey, StringComparison.Ordinal))
            {
                return Unauthorized("Invalid API key");
            }

            if (!ModelState.IsValid)
                return BadRequest(ModelState);

            var entity = new BankTransaction
            {
                // Id để DB tự tăng
                Gateway = dto.Gateway,
                Transactiondate = DateTime.ParseExact(dto.Transactiondate, "yyyy-MM-dd HH:mm:ss", CultureInfo.InvariantCulture),
                Accountnumber = dto.Accountnumber,
                Code = dto.Code,
                Content = dto.Content,
                Transfertype = dto.Transfertype,
                Transferamount = dto.Transferamount,
                Accumulated = dto.Accumulated,
                Subaccount = dto.Subaccount,
                Referencecode = dto.Referencecode,
                Description = dto.Description
            };

            var result = await _hooksService.ProcessTransactionAsync(entity);
            
            Console.WriteLine($"[HooksController] Process result: Message={result.Message}, OrderUpdated={result.OrderUpdated}, OrderId={result.OrderId}");

            return Ok(new
            {
                message = result.Message,
                orderUpdated = result.OrderUpdated,
                orderId = result.OrderId
            });
        }

        /// <summary>
        /// Test SignalR notification - Gửi thông báo thanh toán thành công đến frontend để test
        /// </summary>
        /// <param name="gencode">Mã gencode (ví dụ: ORDER_255_20251121231438_926D105D)</param>
        /// <param name="orderId">ID đơn hàng (mặc định: 255)</param>
        /// <param name="amount">Số tiền (mặc định: 2000)</param>
        /// <returns>Kết quả gửi SignalR notification</returns>
        [HttpPost("test-signalr")]
        [ProducesResponseType(typeof(object), 200)]
        [ProducesResponseType(typeof(object), 400)]
        [ProducesResponseType(typeof(object), 500)]
        public async Task<IActionResult> TestSignalR(
            [FromQuery] string gencode, 
            [FromQuery] int orderId = 255,
            [FromQuery] decimal amount = 2000.00m)
        {
            if (string.IsNullOrWhiteSpace(gencode))
            {
                return BadRequest(new { message = "gencode is required" });
            }

            try
            {
                var groupName = $"payment_{gencode}";
                var notificationData = new
                {
                    orderId = orderId,
                    gencode = gencode,
                    amount = amount,
                    message = "Test notification - Thanh toán thành công! Đơn hàng của bạn đã được xác nhận.",
                    timestamp = DateTime.UtcNow
                };
                
                Console.WriteLine($"[TestSignalR] ===== Sending test SignalR notification ===== ");
                Console.WriteLine($"[TestSignalR] Group name: {groupName}");
                Console.WriteLine($"[TestSignalR] OrderId: {orderId}");
                Console.WriteLine($"[TestSignalR] Gencode: {gencode}");
                Console.WriteLine($"[TestSignalR] Amount: {amount}");
                Console.WriteLine($"[TestSignalR] Notification data: {JsonSerializer.Serialize(notificationData)}");
                
                // Send notification to all clients in the group
                await _hubContext.Clients.Group(groupName).SendAsync("PaymentSuccess", notificationData);
                
                Console.WriteLine($"[TestSignalR] ✅ Test SignalR notification sent successfully to group: {groupName}");
                Console.WriteLine($"[TestSignalR] Note: If no clients are in the group, the message is silently ignored");
                
                return Ok(new
                {
                    success = true,
                    message = "SignalR notification sent successfully",
                    groupName = groupName,
                    data = notificationData
                });
            }
            catch (Exception ex)
            {
                Console.WriteLine($"[TestSignalR] ❌ Error sending test SignalR notification: {ex.Message}");
                Console.WriteLine($"[TestSignalR] Exception type: {ex.GetType().Name}");
                Console.WriteLine($"[TestSignalR] StackTrace: {ex.StackTrace}");
                if (ex.InnerException != null)
                {
                    Console.WriteLine($"[TestSignalR] Inner exception: {ex.InnerException.Message}");
                }
                
                return StatusCode(500, new
                {
                    success = false,
                    message = "Error sending SignalR notification",
                    error = ex.Message
                });
            }
        }
    }
}
