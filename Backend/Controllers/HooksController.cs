using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.Options;
using ModernIssues.Services;
using ModernIssues.Models.DTOs;
using ModernIssues.Models.Entities;
using ModernIssues.Models.Configurations;
using System;
using System.Globalization;
using System.Threading.Tasks;

namespace ModernIssues.Controllers
{
    [ApiController]
    [Route("[controller]")]
    public class HooksController : Controller
    {
        private readonly IHooksService _hooksService;
        private readonly HooksConfig _hooksConfig;

        public HooksController(IHooksService hooksService, IOptions<HooksConfig> hooksConfig)
        {
            _hooksService = hooksService;
            _hooksConfig = hooksConfig.Value;
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
    }
}
