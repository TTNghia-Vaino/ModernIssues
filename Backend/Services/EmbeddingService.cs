using System.Text;
using System.Text.Json;

namespace ModernIssues.Services
{
    /// <summary>
    /// Service để gọi Python API tạo embedding cho sản phẩm
    /// </summary>
    public class EmbeddingService : IEmbeddingService
    {
        private readonly HttpClient _httpClient;
        private readonly ILogger<EmbeddingService> _logger;
        private readonly string _baseUrl;

        public EmbeddingService(HttpClient httpClient, ILogger<EmbeddingService> logger, IConfiguration configuration)
        {
            _httpClient = httpClient;
            _logger = logger;
            // Lấy URL từ config hoặc dùng mặc định
            _baseUrl = configuration["EmbeddingApi:BaseUrl"] ?? "http://localhost:8000";
            _httpClient.Timeout = TimeSpan.FromSeconds(30);
        }

        /// <summary>
        /// Tạo embedding cho sản phẩm bằng cách gọi Python API
        /// </summary>
        public async Task<bool> CreateEmbeddingAsync(int productId)
        {
            try
            {
                var url = $"{_baseUrl.TrimEnd('/')}/update-vector-by-product-id";

                var requestBody = new
                {
                    product_id = productId
                };

                var jsonContent = JsonSerializer.Serialize(requestBody);
                var content = new StringContent(jsonContent, Encoding.UTF8, "application/json");

                _logger.LogInformation($"[EmbeddingService] Calling embedding API for product {productId} at {url}");

                var response = await _httpClient.PostAsync(url, content);

                if (response.IsSuccessStatusCode)
                {
                    var responseContent = await response.Content.ReadAsStringAsync();
                    _logger.LogInformation($"[EmbeddingService] Successfully created embedding for product {productId}. Response: {responseContent}");
                    return true;
                }
                else
                {
                    var errorContent = await response.Content.ReadAsStringAsync();
                    _logger.LogWarning($"[EmbeddingService] Failed to create embedding for product {productId}. Status: {response.StatusCode}, Error: {errorContent}");
                    return false;
                }
            }
            catch (TaskCanceledException ex)
            {
                _logger.LogError(ex, $"[EmbeddingService] Timeout when creating embedding for product {productId}");
                return false;
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, $"[EmbeddingService] Exception when creating embedding for product {productId}: {ex.Message}");
                return false;
            }
        }
    }
}

