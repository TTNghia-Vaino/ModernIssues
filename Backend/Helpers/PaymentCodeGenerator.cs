using System;
using System.Linq;

namespace ModernIssues.Helpers
{
    public static class PaymentCodeGenerator
    {
        /// <summary>
        /// Tạo mã thanh toán ngắn gọn: PAY_ABC123 (6-10 ký tự)
        /// Format: PAY_{6 ký tự random}
        /// </summary>
        public static string GeneratePaymentCode()
        {
            var randomCode = GenerateRandomString(6); // 6 ký tự ngẫu nhiên
            return $"PAY_{randomCode}"; // Tổng 10 ký tự (PAY_ + 6 chars)
        }

        /// <summary>
        /// Tạo chuỗi ngẫu nhiên với độ dài chỉ định
        /// </summary>
        private static string GenerateRandomString(int length)
        {
            const string chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
            var random = new Random();
            return new string(Enumerable.Repeat(chars, length)
                .Select(s => s[random.Next(s.Length)]).ToArray());
        }
        
        /// <summary>
        /// Kiểm tra gencode có hợp lệ không
        /// </summary>
        public static bool IsValidGencode(string gencode)
        {
            if (string.IsNullOrWhiteSpace(gencode))
                return false;
                
            // Format: PAY_XXXXXX (10 chars) hoặc PAY_XXXXXXXXXX (14 chars max)
            return gencode.StartsWith("PAY_") && gencode.Length >= 10 && gencode.Length <= 14;
        }
    }
}

