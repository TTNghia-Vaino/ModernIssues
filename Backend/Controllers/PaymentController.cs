using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.Options;
using ModernIssues.Models.Configurations;

namespace ModernIssues.Controllers
{
    public class PaymentController : Controller
    {
        private readonly SepayConfig _sepayConfig;
        public PaymentController(IOptions<SepayConfig> sepayConfig)
        {
            _sepayConfig = sepayConfig.Value;
        }

        [HttpGet("GenerateQr")]
        public IActionResult GenerateQr([FromQuery] decimal amount, [FromQuery] string gencode)
        {
            if (amount <= 0 || string.IsNullOrWhiteSpace(gencode))
                return BadRequest("Amount or gencode is invalid.");

            var qrUrl = $"https://qr.sepay.vn/img?acc={_sepayConfig.AccountNumber}&bank={_sepayConfig.BankName}&amount={amount}&des={gencode}";

            return Ok(new { qrUrl });
        }
    }
}
