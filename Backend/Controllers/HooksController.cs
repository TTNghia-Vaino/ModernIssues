using Microsoft.AspNetCore.Mvc;
using ModernIssues.Services;
using ModernIssues.Models.DTOs;
using ModernIssues.Models.Entities;
using System.Globalization;

namespace ModernIssues.Controllers
{
    [ApiController]
    [Route("[controller]")]
    public class HooksController : Controller
    {
        private readonly IHooksService _hooksService;
        private const string ApiKey = "Acer-Aspire7-Vaino";

        public HooksController(IHooksService hooksService)
        {
            _hooksService = hooksService;
        }

        [HttpPost("transaction")]
        public async Task<IActionResult> ReceiveTransaction([FromBody] BankTransactionDto dto)
        {
            // 1️⃣ Kiểm tra API key trong header
            if (!Request.Headers.TryGetValue("Authorization", out var authHeader))
            {
                return Unauthorized("Authorization header missing");
            }

            const string prefix = "Apikey ";
            if (!authHeader.ToString().StartsWith(prefix))
            {
                return Unauthorized("Invalid Authorization format");
            }

            var incomingApiKey = authHeader.ToString().Substring(prefix.Length).Trim();

            if (!string.Equals(incomingApiKey, ApiKey))
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

            await _hooksService.AddTransactionAsync(entity);


            return Ok(new
            {
                message = $"Transaction {entity.Referencecode} - {entity.Transferamount} - {entity.Content} saved"
            });
        }
    }
}
