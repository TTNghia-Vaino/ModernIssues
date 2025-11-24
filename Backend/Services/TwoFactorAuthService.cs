using OtpNet;
using QRCoder;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Security.Cryptography;
using System.Text.Json;
using ModernIssues.Models.DTOs;

namespace ModernIssues.Services
{
    public interface ITwoFactorAuthService
    {
        /// <summary>
        /// Generate secret key for TOTP
        /// </summary>
        string GenerateSecret();

        /// <summary>
        /// Generate QR code for authenticator app
        /// </summary>
        Setup2FAResponse GenerateQrCode(string email, string secret, string issuer = "ModernIssues");

        /// <summary>
        /// Verify TOTP code
        /// </summary>
        bool VerifyCode(string secret, string code);

        /// <summary>
        /// Generate recovery codes
        /// </summary>
        List<string> GenerateRecoveryCodes(int count = 10);

        /// <summary>
        /// Encrypt secret before saving to database
        /// </summary>
        string EncryptSecret(string secret);

        /// <summary>
        /// Decrypt secret from database
        /// </summary>
        string DecryptSecret(string encryptedSecret);

        /// <summary>
        /// Verify recovery code
        /// </summary>
        bool VerifyRecoveryCode(string recoveryCodesJson, string code, out string updatedRecoveryCodesJson);
    }

    public class TwoFactorAuthService : ITwoFactorAuthService
    {
        // TODO: Move these to appsettings.json or environment variables
        private const string EncryptionKey = "ModernIssues2FA_SecretKey_2025"; // 32 chars for AES-256
        private const string EncryptionIV = "ModernIssues2FA!"; // 16 chars for AES

        public string GenerateSecret()
        {
            // Generate 20 bytes (160 bits) random secret
            var key = KeyGeneration.GenerateRandomKey(20);
            // Return as Base32 string (compatible with Google Authenticator)
            return Base32Encoding.ToString(key);
        }

        public Setup2FAResponse GenerateQrCode(string email, string secret, string issuer = "ModernIssues")
        {
            // Create otpauth URI
            var authenticatorUri = $"otpauth://totp/{Uri.EscapeDataString(issuer)}:{Uri.EscapeDataString(email)}?secret={secret}&issuer={Uri.EscapeDataString(issuer)}";

            // Generate QR code
            using var qrGenerator = new QRCodeGenerator();
            var qrCodeData = qrGenerator.CreateQrCode(authenticatorUri, QRCodeGenerator.ECCLevel.Q);
            using var qrCode = new PngByteQRCode(qrCodeData);
            var qrCodeImage = qrCode.GetGraphic(20);

            // Convert to base64 data URL
            var qrCodeDataUrl = $"data:image/png;base64,{Convert.ToBase64String(qrCodeImage)}";

            return new Setup2FAResponse
            {
                Secret = secret,
                QrCodeDataUrl = qrCodeDataUrl,
                ManualEntryKey = FormatSecretForManualEntry(secret),
                AuthenticatorUri = authenticatorUri
            };
        }

        public bool VerifyCode(string secret, string code)
        {
            if (string.IsNullOrWhiteSpace(secret) || string.IsNullOrWhiteSpace(code))
                return false;

            try
            {
                var secretBytes = Base32Encoding.ToBytes(secret);
                var totp = new Totp(secretBytes);
                
                // Verify with time window (allow 1 step before and after current time)
                var currentTime = DateTimeOffset.UtcNow;
                return totp.VerifyTotp(code, out _, new VerificationWindow(1, 1));
            }
            catch
            {
                return false;
            }
        }

        public List<string> GenerateRecoveryCodes(int count = 10)
        {
            var codes = new List<string>();
            for (int i = 0; i < count; i++)
            {
                // Generate 8-character alphanumeric code
                var code = GenerateRandomCode(8);
                // Format as XXXX-XXXX for readability
                codes.Add($"{code.Substring(0, 4)}-{code.Substring(4, 4)}");
            }
            return codes;
        }

        public string EncryptSecret(string secret)
        {
            if (string.IsNullOrWhiteSpace(secret))
                return string.Empty;

            using var aes = Aes.Create();
            aes.Key = System.Text.Encoding.UTF8.GetBytes(EncryptionKey);
            aes.IV = System.Text.Encoding.UTF8.GetBytes(EncryptionIV);

            using var encryptor = aes.CreateEncryptor();
            var plainBytes = System.Text.Encoding.UTF8.GetBytes(secret);
            var encryptedBytes = encryptor.TransformFinalBlock(plainBytes, 0, plainBytes.Length);
            
            return Convert.ToBase64String(encryptedBytes);
        }

        public string DecryptSecret(string encryptedSecret)
        {
            if (string.IsNullOrWhiteSpace(encryptedSecret))
                return string.Empty;

            try
            {
                using var aes = Aes.Create();
                aes.Key = System.Text.Encoding.UTF8.GetBytes(EncryptionKey);
                aes.IV = System.Text.Encoding.UTF8.GetBytes(EncryptionIV);

                using var decryptor = aes.CreateDecryptor();
                var encryptedBytes = Convert.FromBase64String(encryptedSecret);
                var decryptedBytes = decryptor.TransformFinalBlock(encryptedBytes, 0, encryptedBytes.Length);
                
                return System.Text.Encoding.UTF8.GetString(decryptedBytes);
            }
            catch
            {
                return string.Empty;
            }
        }

        public bool VerifyRecoveryCode(string recoveryCodesJson, string code, out string updatedRecoveryCodesJson)
        {
            updatedRecoveryCodesJson = recoveryCodesJson;

            if (string.IsNullOrWhiteSpace(recoveryCodesJson) || string.IsNullOrWhiteSpace(code))
                return false;

            try
            {
                var codes = JsonSerializer.Deserialize<List<string>>(recoveryCodesJson);
                if (codes == null || codes.Count == 0)
                    return false;

                // Check if code exists (case-insensitive, remove spaces and dashes)
                var normalizedCode = code.Replace("-", "").Replace(" ", "").ToUpper();
                var matchingCode = codes.FirstOrDefault(c => 
                    c.Replace("-", "").Replace(" ", "").ToUpper() == normalizedCode);

                if (matchingCode != null)
                {
                    // Remove used code
                    codes.Remove(matchingCode);
                    updatedRecoveryCodesJson = JsonSerializer.Serialize(codes);
                    return true;
                }

                return false;
            }
            catch
            {
                return false;
            }
        }

        // Helper methods
        private string GenerateRandomCode(int length)
        {
            const string chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; // Exclude confusing characters
            var random = new Random();
            return new string(Enumerable.Repeat(chars, length)
                .Select(s => s[random.Next(s.Length)]).ToArray());
        }

        private string FormatSecretForManualEntry(string secret)
        {
            // Format as groups of 4 characters for easier manual entry
            // Example: ABCD EFGH IJKL MNOP
            var formatted = string.Empty;
            for (int i = 0; i < secret.Length; i += 4)
            {
                if (i > 0) formatted += " ";
                formatted += secret.Substring(i, Math.Min(4, secret.Length - i));
            }
            return formatted;
        }
    }
}
