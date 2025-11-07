namespace ModernIssues.Models.Configurations
{
    public class SepayConfig
    {
        public string AccountNumber { get; set; } = string.Empty;
        public string BankName { get; set; } = string.Empty;
        public string AccountName { get; set; } = string.Empty;
        public string BankBIN { get; set; } = string.Empty;
        public bool UseSePayUrl { get; set; } = false;
        public string SePayUrlTemplate { get; set; } = "https://qr.sepay.vn/api/generate";
        public string VietQrApiEndpoint { get; set; } = "https://api.vietqr.io/v2/generate";
        public string? VietQrApiKey { get; set; }
    }
}
