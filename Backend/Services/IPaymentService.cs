using ModernIssues.Models.DTOs;
using System.Threading.Tasks;

namespace ModernIssues.Services
{
    public interface IPaymentService
    {
        Task<GenerateQrResponseDto> GenerateQrCodeAsync(int userId, decimal amount, int orderId);
        Task<bool> VerifyPaymentAsync(string gencode);
        Task<bool> ProcessBalanceChangeAsync(WebhookBalanceDto webhook, string rawWebhookData);
    }
}

