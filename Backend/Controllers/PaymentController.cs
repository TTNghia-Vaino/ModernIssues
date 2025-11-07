using Microsoft.AspNetCore.Mvc;
using ModernIssues.Helpers;
using ModernIssues.Models.Common;
using ModernIssues.Models.DTOs;
using ModernIssues.Models.Entities;
using ModernIssues.Services;
using Microsoft.EntityFrameworkCore;
using System;
using System.Linq;
using System.Threading.Tasks;

namespace ModernIssues.Controllers
{
    [Route("/v1/[controller]")]
    [ApiController]
    public class PaymentController : ControllerBase
    {
        private readonly IPaymentService _paymentService;
        private readonly WebDbContext _context;

        public PaymentController(IPaymentService paymentService, WebDbContext context)
        {
            _paymentService = paymentService;
            _context = context;
        }

        /// <summary>
        /// Generate QR code cho thanh toán Transfer
        /// </summary>
        [HttpPost("GenerateQr")]
        [ProducesResponseType(typeof(ApiResponse<GenerateQrResponseDto>), 200)]
        [ProducesResponseType(typeof(ApiResponse<object>), 400)]
        [ProducesResponseType(typeof(ApiResponse<object>), 401)]
        public async Task<IActionResult> GenerateQr([FromBody] GenerateQrRequestDto request)
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

            try
            {
                Console.WriteLine($"[PaymentController] GenerateQr - UserId: {userId.Value}, OrderId: {request.OrderId}, Amount: {request.Amount}");
                
                var result = await _paymentService.GenerateQrCodeAsync(userId.Value, request.Amount, request.OrderId);
                
                Console.WriteLine($"[PaymentController] QR generated successfully");
                return Ok(ApiResponse<GenerateQrResponseDto>.SuccessResponse(result, "QR code đã được tạo thành công."));
            }
            catch (ArgumentException ex)
            {
                Console.WriteLine($"[PaymentController] Validation Error: {ex.Message}");
                return BadRequest(ApiResponse<object>.ErrorResponse(ex.Message));
            }
            catch (Exception ex)
            {
                Console.WriteLine($"[ERROR] PaymentController.GenerateQr: {ex.Message}");
                Console.WriteLine($"[ERROR] StackTrace: {ex.StackTrace}");
                if (ex.InnerException != null)
                {
                    Console.WriteLine($"[ERROR] InnerException: {ex.InnerException.Message}");
                }
                return StatusCode(500, ApiResponse<object>.ErrorResponse($"Lỗi hệ thống: {ex.Message}"));
            }
        }

        /// <summary>
        /// Webhook nhận biến động số dư từ ngân hàng/payment gateway
        /// </summary>
        [HttpPost("WebhookBalance")]
        [ProducesResponseType(200)]
        public async Task<IActionResult> WebhookBalance([FromBody] WebhookBalanceDto webhook)
        {
            try
            {
                Console.WriteLine($"[PaymentController] WebhookBalance received");
                Console.WriteLine($"[PaymentController] Description: {webhook.Description}");
                Console.WriteLine($"[PaymentController] Amount: {webhook.Amount}");

                // Serialize raw webhook data
                var rawData = System.Text.Json.JsonSerializer.Serialize(webhook);

                var processed = await _paymentService.ProcessBalanceChangeAsync(webhook, rawData);
                
                if (processed)
                {
                    return Ok(new { success = true, message = "Payment processed successfully" });
                }
                
                return Ok(new { success = false, message = "Payment not processed (no matching order)" });
            }
            catch (Exception ex)
            {
                Console.WriteLine($"[ERROR] WebhookBalance: {ex.Message}");
                Console.WriteLine($"[ERROR] StackTrace: {ex.StackTrace}");
                return StatusCode(500, new { success = false, message = $"Error processing webhook: {ex.Message}" });
            }
        }

        /// <summary>
        /// Webhook để nhận thông báo thanh toán từ payment gateway (legacy)
        /// </summary>
        [HttpPost("Webhook")]
        [ProducesResponseType(200)]
        public async Task<IActionResult> Webhook([FromBody] WebhookPaymentDto webhook)
        {
            try
            {
                var verified = await _paymentService.VerifyPaymentAsync(webhook.Gencode);
                if (verified)
                {
                    return Ok(new { success = true, message = "Payment verified" });
                }
                return BadRequest(new { success = false, message = "Invalid payment code" });
            }
            catch (Exception ex)
            {
                Console.WriteLine($"[ERROR] Webhook: {ex.Message}");
                return StatusCode(500, new { success = false, message = "Error processing webhook" });
            }
        }

        /// <summary>
        /// Lấy thông tin payment theo gencode (để tạo QR code)
        /// </summary>
        [HttpGet("Qr/{gencode}")]
        [ProducesResponseType(200)]
        public async Task<IActionResult> GetPaymentInfo(string gencode)
        {
            var order = await _context.orders
                .Include(o => o.user)
                .Include(o => o.order_details)
                .FirstOrDefaultAsync(o => o.gencode == gencode);

            if (order == null)
            {
                return NotFound(new { error = "Payment code not found" });
            }

            // Trả về payment data theo format yêu cầu
            var paymentData = new
            {
                user_id = order.user_id ?? 0,
                orders = order.order_details.Select(od => new
                {
                    id = od.product_id,
                    name = od.product_name,
                    quantity = od.quantity,
                    price = od.price_at_purchase,
                    subtotal = od.quantity * od.price_at_purchase
                }).ToList(),
                total_amount = order.total_amount,
                status = order.status,
                created_at = order.created_at
            };

            return Ok(paymentData);
        }
    }
}
