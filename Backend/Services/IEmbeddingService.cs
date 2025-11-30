namespace ModernIssues.Services
{
    /// <summary>
    /// Interface cho service tạo embedding cho sản phẩm
    /// </summary>
    public interface IEmbeddingService
    {
        /// <summary>
        /// Tạo embedding cho sản phẩm bằng cách gọi Python API
        /// </summary>
        /// <param name="productId">ID của sản phẩm cần tạo embedding</param>
        /// <returns>True nếu thành công, False nếu thất bại</returns>
        Task<bool> CreateEmbeddingAsync(int productId);
    }
}

