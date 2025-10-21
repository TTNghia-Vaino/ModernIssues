namespace ModernIssues.Models.DTOs
{
    public class ResetPasswordRequest
    {
        public string TempToken { get; set; }
        public string NewPassword { get; set; }
    }
}
