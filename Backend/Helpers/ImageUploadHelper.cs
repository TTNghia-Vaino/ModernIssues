using Microsoft.AspNetCore.Http;
using System.IO;
using System.Text.RegularExpressions;

namespace ModernIssues.Helpers
{
    public static class ImageUploadHelper
    {
        private static readonly string[] AllowedExtensions = { ".jpg", ".jpeg", ".png", ".gif", ".bmp", ".webp" };
        private static readonly long MaxFileSize = 5 * 1024 * 1024; // 5MB

        /// <summary>
        /// Upload ảnh và trả về tên file đã lưu
        /// </summary>
        /// <param name="file">File ảnh từ form</param>
        /// <param name="webRootPath">Đường dẫn gốc của web</param>
        /// <returns>Tên file đã lưu hoặc null nếu lỗi</returns>
        public static async Task<string?> UploadImageAsync(IFormFile file, string webRootPath)
        {
            if (file == null || file.Length == 0)
                return null;

            // Kiểm tra kích thước file
            if (file.Length > MaxFileSize)
                throw new ArgumentException($"File quá lớn. Kích thước tối đa: {MaxFileSize / (1024 * 1024)}MB");

            // Kiểm tra extension
            var extension = Path.GetExtension(file.FileName).ToLowerInvariant();
            if (!AllowedExtensions.Contains(extension))
                throw new ArgumentException($"Định dạng file không được hỗ trợ. Chỉ chấp nhận: {string.Join(", ", AllowedExtensions)}");

            // Tạo tên file unique
            var fileName = GenerateUniqueFileName(file.FileName);
            var uploadsPath = Path.Combine(webRootPath, "Uploads", "Images");
            
            // Tạo thư mục nếu chưa tồn tại
            if (!Directory.Exists(uploadsPath))
                Directory.CreateDirectory(uploadsPath);

            var filePath = Path.Combine(uploadsPath, fileName);

            // Lưu file
            using (var stream = new FileStream(filePath, FileMode.Create))
            {
                await file.CopyToAsync(stream);
            }

            return fileName;
        }

        /// <summary>
        /// Tạo tên file unique
        /// </summary>
        /// <param name="originalFileName">Tên file gốc</param>
        /// <returns>Tên file unique</returns>
        private static string GenerateUniqueFileName(string originalFileName)
        {
            var extension = Path.GetExtension(originalFileName);
            var nameWithoutExtension = Path.GetFileNameWithoutExtension(originalFileName);
            
            // Loại bỏ ký tự đặc biệt
            var cleanName = Regex.Replace(nameWithoutExtension, @"[^a-zA-Z0-9_-]", "");
            
            // Tạo timestamp
            var timestamp = DateTime.Now.ToString("yyyyMMdd_HHmmss");
            var random = new Random().Next(1000, 9999);
            
            return $"{cleanName}_{timestamp}_{random}{extension}";
        }

        /// <summary>
        /// Xóa file ảnh
        /// </summary>
        /// <param name="fileName">Tên file cần xóa</param>
        /// <param name="webRootPath">Đường dẫn gốc của web</param>
        /// <returns>True nếu xóa thành công</returns>
        public static bool DeleteImage(string fileName, string webRootPath)
        {
            if (string.IsNullOrEmpty(fileName))
                return false;

            var filePath = Path.Combine(webRootPath, "Uploads", "Images", fileName);
            
            if (File.Exists(filePath))
            {
                try
                {
                    File.Delete(filePath);
                    return true;
                }
                catch
                {
                    return false;
                }
            }
            
            return false;
        }

        /// <summary>
        /// Lấy đường dẫn URL của ảnh
        /// </summary>
        /// <param name="fileName">Tên file</param>
        /// <param name="baseUrl">URL gốc của API</param>
        /// <returns>URL đầy đủ của ảnh</returns>
        public static string GetImageUrl(string fileName, string baseUrl)
        {
            if (string.IsNullOrEmpty(fileName))
                return string.Empty;

            return $"{baseUrl.TrimEnd('/')}/Uploads/Images/{fileName}";
        }

        /// <summary>
        /// Kiểm tra file có phải là ảnh hợp lệ không
        /// </summary>
        /// <param name="file">File cần kiểm tra</param>
        /// <returns>True nếu là ảnh hợp lệ</returns>
        public static bool IsValidImage(IFormFile file)
        {
            if (file == null || file.Length == 0)
                return false;

            var extension = Path.GetExtension(file.FileName).ToLowerInvariant();
            return AllowedExtensions.Contains(extension) && file.Length <= MaxFileSize;
        }
    }
}
