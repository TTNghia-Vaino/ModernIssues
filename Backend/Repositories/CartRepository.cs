using ModernIssues.Models.DTOs;
using ModernIssues.Models.Entities;
using ModernIssues.Repositories.Interface;
using Microsoft.EntityFrameworkCore;
using System;
using System.Linq;
using System.Threading.Tasks;

namespace ModernIssues.Repositories
{
    public class CartRepository : ICartRepository
    {
        private readonly WebDbContext _context;

        public CartRepository(WebDbContext context)
        {
            _context = context;
        }

        public async Task<CartDto?> GetCartByUserIdAsync(int userId)
        {
            var carts = await _context.carts
                .Include(c => c.user)
                .Include(c => c.product)
                .Where(c => c.user_id == userId)
                .ToListAsync();

            if (!carts.Any())
                return null;

            return MapToCartDto(userId, carts);
        }

        public async Task<CartDto?> AddToCartAsync(int userId, AddToCartDto addToCartDto)
        {
            // Kiểm tra sản phẩm có tồn tại và còn hàng không
            var product = await _context.products
                .Where(p => p.product_id == addToCartDto.ProductId && p.is_disabled != true)
                .FirstOrDefaultAsync();

            if (product == null)
                throw new ArgumentException($"Sản phẩm với ID {addToCartDto.ProductId} không tồn tại hoặc đã bị vô hiệu hóa.");

            // Kiểm tra số lượng serial còn hàng (is_sold = false và is_disabled = false)
            var availableSerials = await _context.product_serials
                .Where(ps => ps.product_id == addToCartDto.ProductId 
                    && ps.is_sold == false 
                    && ps.is_disabled != true)
                .CountAsync();

            // Kiểm tra sản phẩm đã có trong giỏ hàng chưa (tìm entry đầu tiên của product này)
            // Nếu có thì cập nhật số lượng, nếu không thì tạo mới
            var existingCart = await _context.carts
                .Include(c => c.user)
                .Include(c => c.product)
                .Where(c => c.user_id == userId && c.product_id == addToCartDto.ProductId)
                .FirstOrDefaultAsync();

            var requestedQuantity = addToCartDto.Quantity;
            if (existingCart != null)
            {
                requestedQuantity += existingCart.quantity;
            }

            if (availableSerials < requestedQuantity)
                throw new ArgumentException($"Số lượng sản phẩm không đủ. Chỉ còn {availableSerials} sản phẩm.");

            if (existingCart != null)
            {
                // Cập nhật số lượng của entry đầu tiên tìm được
                existingCart.quantity += addToCartDto.Quantity;
                existingCart.updated_at = DateTime.UtcNow;
            }
            else
            {
                // Thêm mới vào giỏ hàng - cart_id sẽ được tự động generate bởi database (SERIAL)
                var newCart = new cart
                {
                    user_id = userId,
                    product_id = addToCartDto.ProductId,
                    quantity = addToCartDto.Quantity,
                    price_at_add = product.price,
                    created_at = DateTime.UtcNow,
                    updated_at = DateTime.UtcNow
                };
                _context.carts.Add(newCart);
            }

            await _context.SaveChangesAsync();

            return await GetCartByUserIdAsync(userId);
        }

        public async Task<CartDto?> UpdateCartItemAsync(int userId, int cartId, int productId, UpdateCartItemDto updateDto)
        {
            var cart = await _context.carts
                .Include(c => c.user)
                .Include(c => c.product)
                .Where(c => c.user_id == userId && c.cart_id == cartId && c.product_id == productId)
                .FirstOrDefaultAsync();

            if (cart == null)
                return null;

            // Kiểm tra số lượng tồn kho dựa trên serials
            if (cart.product == null)
                throw new ArgumentException("Sản phẩm không tồn tại.");

            // Kiểm tra số lượng serial còn hàng (is_sold = false và is_disabled = false)
            var availableSerials = await _context.product_serials
                .Where(ps => ps.product_id == cart.product_id 
                    && ps.is_sold == false 
                    && ps.is_disabled != true)
                .CountAsync();
            
            if (availableSerials < updateDto.Quantity)
                throw new ArgumentException($"Số lượng sản phẩm không đủ. Chỉ còn {availableSerials} sản phẩm.");

            cart.quantity = updateDto.Quantity;
            cart.updated_at = DateTime.UtcNow;

            await _context.SaveChangesAsync();

            return await GetCartByUserIdAsync(userId);
        }

        public async Task<bool> RemoveFromCartAsync(int userId, int cartId, int productId)
        {
            var cart = await _context.carts
                .Where(c => c.user_id == userId && c.cart_id == cartId && c.product_id == productId)
                .FirstOrDefaultAsync();

            if (cart == null)
                return false;

            _context.carts.Remove(cart);
            await _context.SaveChangesAsync();

            return true;
        }

        public async Task<bool> ClearCartAsync(int userId)
        {
            var carts = await _context.carts
                .Where(c => c.user_id == userId)
                .ToListAsync();

            if (!carts.Any())
                return false;

            _context.carts.RemoveRange(carts);
            await _context.SaveChangesAsync();

            return true;
        }

        public async Task<CartSummaryDto?> GetCartSummaryAsync(int userId)
        {
            var carts = await _context.carts
                .Include(c => c.user)
                .Where(c => c.user_id == userId)
                .ToListAsync();

            if (!carts.Any())
                return null;

            var totalAmount = carts.Sum(c => c.quantity * c.price_at_add);
            var totalItems = carts.Sum(c => c.quantity);

            return new CartSummaryDto
            {
                UserId = userId,
                Username = carts.First().user?.username,
                TotalAmount = totalAmount,
                TotalItems = totalItems,
                UpdatedAt = carts.Max(c => c.updated_at)
            };
        }

        public async Task<bool> CartExistsAsync(int userId)
        {
            return await _context.carts
                .AnyAsync(c => c.user_id == userId);
        }

        public async Task<bool> CartItemExistsAsync(int userId, int cartId, int productId)
        {
            return await _context.carts
                .AnyAsync(c => c.user_id == userId && c.cart_id == cartId && c.product_id == productId);
        }

        private CartDto MapToCartDto(int userId, List<cart> carts)
        {
            var cartItems = carts.Select(c => new CartItemDto
            {
                CartId = c.cart_id,
                ProductId = c.product_id,
                ProductName = c.product?.product_name ?? "",
                ProductImage = c.product?.image_url,
                Quantity = c.quantity,
                PriceAtAdd = c.price_at_add,
                CurrentPrice = c.product?.price ?? 0,
                SubTotal = c.quantity * c.price_at_add,
                CreatedAt = c.created_at,
                UpdatedAt = c.updated_at
            }).ToList();

            var totalAmount = cartItems.Sum(ci => ci.SubTotal);
            var totalItems = cartItems.Sum(ci => ci.Quantity);

            return new CartDto
            {
                UserId = userId,
                Username = carts.First().user?.username,
                CartItems = cartItems,
                TotalAmount = totalAmount,
                TotalItems = totalItems,
                CreatedAt = carts.Min(c => c.created_at),
                UpdatedAt = carts.Max(c => c.updated_at)
            };
        }
    }
}
