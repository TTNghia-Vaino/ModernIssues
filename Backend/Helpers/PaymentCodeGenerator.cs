using System;
using System.Linq;

namespace ModernIssues.Helpers
{
    public static class PaymentCodeGenerator
    {
        /// <summary>
        /// Tạo mã thanh toán ngắn gọn: PAY1234 (7-10 ký tự)
        /// Format: PAY{4-6 ký tự random}
        /// </summary>
        public static string GeneratePaymentCode()
        {
            var randomCode = GenerateRandomString(4); // 4 ký tự ngẫu nhiên
            return $"PAY{randomCode}"; // Tổng 7 ký tự (PAY + 4 chars)
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
                
            // Format: PAYXXXX (7-10 chars)
            return gencode.StartsWith("PAY") && gencode.Length >= 7 && gencode.Length <= 10;
        }
    }
}

