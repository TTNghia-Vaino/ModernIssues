using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.Options;
using ModernIssues.Models.Configurations;

namespace ModernIssues.Controllers
{
    [ApiController]
    [Route("/v1/[controller]")]
    public class PaymentController : ControllerBase
    {
        private readonly SepayConfig _sepayConfig;
        public PaymentController(IOptions<SepayConfig> sepayConfig)
        {
            _sepayConfig = sepayConfig.Value;
        }

        /// <summary>
        /// Generate QR Code URL cho thanh toán
        /// </summary>
        /// <param name="amount">Số tiền thanh toán</param>
        /// <param name="gencode">Mã gencode để đối chiếu</param>
        /// <response code="200">Trả về QR URL</response>
        /// <response code="400">Amount hoặc gencode không hợp lệ</response>
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
