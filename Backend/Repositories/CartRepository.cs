using ModernIssues.Models.DTOs;
using ModernIssues.Models.Entities;
using Microsoft.EntityFrameworkCore;
using System;
using System.Collections.Generic;
using System.Threading.Tasks;
using System.Linq;

namespace ModernIssues.Repositories
{
    public interface ICartRepository
    {
        Task<CartDto?> GetCartByUserIdAsync(int userId);
        Task<CartDto> CreateCartAsync(int userId);
        Task<CartDto?> AddToCartAsync(int userId, AddToCartDto addToCartDto);
        Task<CartDto?> UpdateCartItemAsync(int userId, int cartItemId, UpdateCartItemDto updateDto);
        Task<bool> RemoveFromCartAsync(int userId, int cartItemId);
        Task<bool> ClearCartAsync(int userId);
        Task<CartSummaryDto?> GetCartSummaryAsync(int userId);
        Task<bool> CartExistsAsync(int userId);
        Task<bool> CartItemExistsAsync(int userId, int cartItemId);
    }

    public class CartRepository : ICartRepository
    {
        private readonly WebDbContext _context;

        public CartRepository(WebDbContext context)
        {
            _context = context;
        }

        public async Task<CartDto?> GetCartByUserIdAsync(int userId)
        {
            var cart = await _context.carts
                .Include(c => c.user)
                .Include(c => c.cart_items)
                    .ThenInclude(ci => ci.product)
                .Where(c => c.user_id == userId)
                .FirstOrDefaultAsync();

            if (cart == null)
                return null;

            return MapToCartDto(cart);
        }

        public async Task<CartDto> CreateCartAsync(int userId)
        {
            var newCart = new cart
            {
                user_id = userId,
                created_at = DateTime.UtcNow,
                updated_at = DateTime.UtcNow,
                created_by = userId,
                updated_by = userId
            };

            _context.carts.Add(newCart);
            await _context.SaveChangesAsync();

            // Reload with includes
            return await GetCartByUserIdAsync(userId) ?? new CartDto();
        }

        public async Task<CartDto?> AddToCartAsync(int userId, AddToCartDto addToCartDto)
        {
            // Kiểm tra sản phẩm có tồn tại và còn hàng không
            var product = await _context.products
                .Where(p => p.product_id == addToCartDto.ProductId && p.is_disabled != true)
                .FirstOrDefaultAsync();

            if (product == null)
                throw new ArgumentException($"Sản phẩm với ID {addToCartDto.ProductId} không tồn tại hoặc đã bị vô hiệu hóa.");

            if (product.stock < addToCartDto.Quantity)
                throw new ArgumentException($"Số lượng sản phẩm không đủ. Chỉ còn {product.stock} sản phẩm.");

            // Lấy hoặc tạo giỏ hàng
            var cart = await _context.carts
                .Include(c => c.cart_items)
                .Where(c => c.user_id == userId)
                .FirstOrDefaultAsync();

            if (cart == null)
            {
                cart = new cart
                {
                    user_id = userId,
                    created_at = DateTime.UtcNow,
                    updated_at = DateTime.UtcNow,
                    created_by = userId,
                    updated_by = userId
                };
                _context.carts.Add(cart);
                await _context.SaveChangesAsync();
            }

            // Kiểm tra sản phẩm đã có trong giỏ hàng chưa
            var existingItem = cart.cart_items
                .FirstOrDefault(ci => ci.product_id == addToCartDto.ProductId);

            if (existingItem != null)
            {
                // Cập nhật số lượng
                existingItem.quantity += addToCartDto.Quantity;
                existingItem.updated_at = DateTime.UtcNow;
                existingItem.updated_by = userId;
            }
            else
            {
                // Thêm mới vào giỏ hàng
                var newCartItem = new cart_item
                {
                    cart_id = cart.cart_id,
                    product_id = addToCartDto.ProductId,
                    quantity = addToCartDto.Quantity,
                    price_at_add = product.price,
                    created_at = DateTime.UtcNow,
                    updated_at = DateTime.UtcNow,
                    created_by = userId,
                    updated_by = userId
                };
                _context.cart_items.Add(newCartItem);
            }

            cart.updated_at = DateTime.UtcNow;
            cart.updated_by = userId;

            await _context.SaveChangesAsync();

            return await GetCartByUserIdAsync(userId);
        }

        public async Task<CartDto?> UpdateCartItemAsync(int userId, int cartItemId, UpdateCartItemDto updateDto)
        {
            var cartItem = await _context.cart_items
                .Include(ci => ci.cart)
                .Include(ci => ci.product)
                .Where(ci => ci.cart_item_id == cartItemId && ci.cart.user_id == userId)
                .FirstOrDefaultAsync();

            if (cartItem == null)
                return null;

            // Kiểm tra số lượng tồn kho
            if (cartItem.product.stock < updateDto.Quantity)
                throw new ArgumentException($"Số lượng sản phẩm không đủ. Chỉ còn {cartItem.product.stock} sản phẩm.");

            cartItem.quantity = updateDto.Quantity;
            cartItem.updated_at = DateTime.UtcNow;
            cartItem.updated_by = userId;

            cartItem.cart.updated_at = DateTime.UtcNow;
            cartItem.cart.updated_by = userId;

            await _context.SaveChangesAsync();

            return await GetCartByUserIdAsync(userId);
        }

        public async Task<bool> RemoveFromCartAsync(int userId, int cartItemId)
        {
            var cartItem = await _context.cart_items
                .Include(ci => ci.cart)
                .Where(ci => ci.cart_item_id == cartItemId && ci.cart.user_id == userId)
                .FirstOrDefaultAsync();

            if (cartItem == null)
                return false;

            _context.cart_items.Remove(cartItem);

            cartItem.cart.updated_at = DateTime.UtcNow;
            cartItem.cart.updated_by = userId;

            await _context.SaveChangesAsync();

            return true;
        }

        public async Task<bool> ClearCartAsync(int userId)
        {
            var cart = await _context.carts
                .Include(c => c.cart_items)
                .Where(c => c.user_id == userId)
                .FirstOrDefaultAsync();

            if (cart == null)
                return false;

            _context.cart_items.RemoveRange(cart.cart_items);

            cart.updated_at = DateTime.UtcNow;
            cart.updated_by = userId;

            await _context.SaveChangesAsync();

            return true;
        }

        public async Task<CartSummaryDto?> GetCartSummaryAsync(int userId)
        {
            var cart = await _context.carts
                .Include(c => c.user)
                .Include(c => c.cart_items)
                .Where(c => c.user_id == userId)
                .FirstOrDefaultAsync();

            if (cart == null)
                return null;

            var totalAmount = cart.cart_items.Sum(ci => ci.quantity * ci.price_at_add);
            var totalItems = cart.cart_items.Sum(ci => ci.quantity);

            return new CartSummaryDto
            {
                CartId = cart.cart_id,
                UserId = cart.user_id,
                Username = cart.user?.username,
                TotalAmount = totalAmount,
                TotalItems = totalItems,
                UpdatedAt = cart.updated_at
            };
        }

        public async Task<bool> CartExistsAsync(int userId)
        {
            return await _context.carts
                .AnyAsync(c => c.user_id == userId);
        }

        public async Task<bool> CartItemExistsAsync(int userId, int cartItemId)
        {
            return await _context.cart_items
                .Include(ci => ci.cart)
                .AnyAsync(ci => ci.cart_item_id == cartItemId && ci.cart.user_id == userId);
        }

        private CartDto MapToCartDto(cart cart)
        {
            var cartItems = cart.cart_items.Select(ci => new CartItemDto
            {
                CartItemId = ci.cart_item_id,
                CartId = ci.cart_id,
                ProductId = ci.product_id,
                ProductName = ci.product?.product_name ?? "",
                ProductImage = ci.product?.image_url,
                Quantity = ci.quantity,
                PriceAtAdd = ci.price_at_add,
                CurrentPrice = ci.product?.price ?? 0,
                SubTotal = ci.quantity * ci.price_at_add,
                CreatedAt = ci.created_at,
                UpdatedAt = ci.updated_at,
                CreatedBy = ci.created_by,
                UpdatedBy = ci.updated_by
            }).ToList();

            var totalAmount = cartItems.Sum(ci => ci.SubTotal);
            var totalItems = cartItems.Sum(ci => ci.Quantity);

            return new CartDto
            {
                CartId = cart.cart_id,
                UserId = cart.user_id,
                Username = cart.user?.username,
                CreatedAt = cart.created_at,
                UpdatedAt = cart.updated_at,
                CreatedBy = cart.created_by,
                UpdatedBy = cart.updated_by,
                CartItems = cartItems,
                TotalAmount = totalAmount,
                TotalItems = totalItems
            };
        }
    }
}
