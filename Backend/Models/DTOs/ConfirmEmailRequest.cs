namespace ModernIssues.Models.DTOs
{
    public class ConfirmEmailRequest
    {
        public string Email { get; set; } = null!;
        public string Otp { get; set; } = null!;
    }
}

