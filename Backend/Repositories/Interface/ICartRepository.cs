using ModernIssues.Models.DTOs;
using System.Threading.Tasks;

namespace ModernIssues.Repositories.Interface
{
    public interface ICartRepository
    {
        Task<CartDto?> GetCartByUserIdAsync(int userId);
        Task<CartDto?> AddToCartAsync(int userId, AddToCartDto addToCartDto);
        Task<CartDto?> UpdateCartItemAsync(int userId, int cartId, int productId, UpdateCartItemDto updateDto);
        Task<bool> RemoveFromCartAsync(int userId, int cartId, int productId);
        Task<bool> ClearCartAsync(int userId);
        Task<CartSummaryDto?> GetCartSummaryAsync(int userId);
        Task<bool> CartExistsAsync(int userId);
        Task<bool> CartItemExistsAsync(int userId, int cartId, int productId);
    }
}

