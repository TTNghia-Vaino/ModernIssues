using ModernIssues.Models.DTOs;
using System.Threading.Tasks;

namespace ModernIssues.Repositories.Interface
{
    public interface ICheckoutRepository
    {
        Task<OrderDto> CheckoutAsync(int userId, string paymentType);
        Task<OrderDto> TestCheckoutAsync(int userId, int productId, int quantity, string paymentType);
    }
}

