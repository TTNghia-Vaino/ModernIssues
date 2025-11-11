using System;

namespace ModernIssues.Models.DTOs
{
    // ============================================
    // REQUEST/RESPONSE DTOs cho Payment API
    // ============================================
    
    public class GenerateQrRequestDto
    {
        public decimal Amount { get; set; }
        public int OrderId { get; set; }
    }

    public class GenerateQrResponseDto
    {
        public string Gencode { get; set; } = string.Empty;        // Gencode ngắn (PAY_ABC123)
        public string QrUrl { get; set; } = string.Empty;          // Gencode ngắn (không phải EMV)
        public string? QrImage { get; set; }                       // Base64 QR image
        public decimal Amount { get; set; }
        public int OrderId { get; set; }
        public object? PaymentData { get; set; }                    // Chỉ data cần thiết
    }

    public class WebhookPaymentDto
    {
        public string Gencode { get; set; } = string.Empty;
        public string Status { get; set; } = string.Empty;
        public decimal Amount { get; set; }
        public DateTime PaidAt { get; set; }
    }

    // ============================================
    // VietQR API DTOs
    // ============================================
    
    /// <summary>
    /// Request DTO gửi đến VietQR API để tạo QR code
    /// </summary>
    public class VietQrRequestDto
    {
        public string accountNo { get; set; } = string.Empty;      // Số tài khoản
        public string accountName { get; set; } = string.Empty;    // Tên chủ tài khoản
        public string acqId { get; set; } = string.Empty;          // Mã BIN ngân hàng (970422)
        public long amount { get; set; }                           // Số tiền (VND, không có phần thập phân)
        public string addInfo { get; set; } = string.Empty;        // Nội dung chuyển khoản
        public string format { get; set; } = "text";               // "text" hoặc "compact"
        public string template { get; set; } = "compact";          // Template QR code
    }

    /// <summary>
    /// Response DTO nhận từ VietQR API
    /// </summary>
    public class VietQrResponseDto
    {
        public string code { get; set; } = string.Empty;           // Response code ("00" = success)
        public string desc { get; set; } = string.Empty;           // Mô tả
        public VietQrDataDto? data { get; set; }                   // Dữ liệu QR
    }

    /// <summary>
    /// Data object trong VietQR response
    /// </summary>
    public class VietQrDataDto
    {
        public int acqId { get; set; }                             // Mã BIN ngân hàng
        public string accountName { get; set; } = string.Empty;    // Tên chủ TK
        public string qrCode { get; set; } = string.Empty;         // EMV QR string (chuỗi 000201...)
        public string qrDataURL { get; set; } = string.Empty;      // Base64 image (data:image/png;base64,...)
    }
}

