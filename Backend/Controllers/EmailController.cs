using Microsoft.AspNetCore.Mvc;
using ModernIssues.Services;
using ModernIssues.Models.DTOs;


namespace ModernIssues.Controllers
{
    [ApiController]
    [Route("api/[controller]")]

    public class EmailController : ControllerBase
    {
        private readonly IEmailService _emailService;

        public EmailController(IEmailService emailService)
        {
            _emailService = emailService;
        }

        [HttpPost("send")]
        public async Task<IActionResult> SendEmail([FromBody] EmailRequest request)
        {
            try
            {
                await _emailService.SendEmailAsync(request.ToEmail, request.Subject, request.Body);
                return Ok(new { message = "Email sent successfully!" });
            }
            catch (Exception ex)
            {
                return BadRequest(new { message = $"Failed to send email: {ex.Message}" });
            }
        }
    }

}
