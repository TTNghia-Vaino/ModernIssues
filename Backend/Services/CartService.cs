using ModernIssues.Models.DTOs;
using ModernIssues.Repositories;
using System;
using System.Threading.Tasks;

namespace ModernIssues.Services
{
    public interface ICartService
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

    public class CartService : ICartService
    {
        private readonly ICartRepository _cartRepository;

        public CartService(ICartRepository cartRepository)
        {
            _cartRepository = cartRepository;
        }

        public async Task<CartDto?> GetCartByUserIdAsync(int userId)
        {
            if (userId <= 0)
                throw new ArgumentException("User ID phải lớn hơn 0.");

            return await _cartRepository.GetCartByUserIdAsync(userId);
        }


        public async Task<CartDto?> AddToCartAsync(int userId, AddToCartDto addToCartDto)
        {
            if (userId <= 0)
                throw new ArgumentException("User ID phải lớn hơn 0.");

            if (addToCartDto == null)
                throw new ArgumentNullException(nameof(addToCartDto), "Dữ liệu thêm vào giỏ hàng không được để trống.");

            if (addToCartDto.ProductId <= 0)
                throw new ArgumentException("Product ID phải lớn hơn 0.");

            if (addToCartDto.Quantity <= 0)
                throw new ArgumentException("Số lượng phải lớn hơn 0.");

            return await _cartRepository.AddToCartAsync(userId, addToCartDto);
        }

        public async Task<CartDto?> UpdateCartItemAsync(int userId, int cartId, int productId, UpdateCartItemDto updateDto)
        {
            if (userId <= 0)
                throw new ArgumentException("User ID phải lớn hơn 0.");

            if (cartId <= 0)
                throw new ArgumentException("Cart ID phải lớn hơn 0.");

            if (productId <= 0)
                throw new ArgumentException("Product ID phải lớn hơn 0.");

            if (updateDto == null)
                throw new ArgumentNullException(nameof(updateDto), "Dữ liệu cập nhật không được để trống.");

            if (updateDto.Quantity <= 0)
                throw new ArgumentException("Số lượng phải lớn hơn 0.");

            // Kiểm tra cart item có thuộc về user này không
            if (!await _cartRepository.CartItemExistsAsync(userId, cartId, productId))
                throw new ArgumentException("Cart item không tồn tại hoặc không thuộc về user này.");

            return await _cartRepository.UpdateCartItemAsync(userId, cartId, productId, updateDto);
        }

        public async Task<bool> RemoveFromCartAsync(int userId, int cartId, int productId)
        {
            if (userId <= 0)
                throw new ArgumentException("User ID phải lớn hơn 0.");

            if (cartId <= 0)
                throw new ArgumentException("Cart ID phải lớn hơn 0.");

            if (productId <= 0)
                throw new ArgumentException("Product ID phải lớn hơn 0.");

            // Kiểm tra cart item có thuộc về user này không
            if (!await _cartRepository.CartItemExistsAsync(userId, cartId, productId))
                throw new ArgumentException("Cart item không tồn tại hoặc không thuộc về user này.");

            return await _cartRepository.RemoveFromCartAsync(userId, cartId, productId);
        }

        public async Task<bool> ClearCartAsync(int userId)
        {
            if (userId <= 0)
                throw new ArgumentException("User ID phải lớn hơn 0.");

            return await _cartRepository.ClearCartAsync(userId);
        }

        public async Task<CartSummaryDto?> GetCartSummaryAsync(int userId)
        {
            if (userId <= 0)
                throw new ArgumentException("User ID phải lớn hơn 0.");

            return await _cartRepository.GetCartSummaryAsync(userId);
        }

        public async Task<bool> CartExistsAsync(int userId)
        {
            if (userId <= 0)
                throw new ArgumentException("User ID phải lớn hơn 0.");

            return await _cartRepository.CartExistsAsync(userId);
        }

        public async Task<bool> CartItemExistsAsync(int userId, int cartId, int productId)
        {
            if (userId <= 0)
                throw new ArgumentException("User ID phải lớn hơn 0.");

            if (cartId <= 0)
                throw new ArgumentException("Cart ID phải lớn hơn 0.");

            if (productId <= 0)
                throw new ArgumentException("Product ID phải lớn hơn 0.");

            return await _cartRepository.CartItemExistsAsync(userId, cartId, productId);
        }
    }
}

