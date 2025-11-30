using ModernIssues.Models.DTOs;
using ModernIssues.Models.Entities;
using ModernIssues.Models.Configurations;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Options;
using Microsoft.Extensions.Caching.Memory;
using System;
using System.Linq;
using System.Threading.Tasks;

namespace ModernIssues.Repositories
{
    public interface ICheckoutRepository
    {
        Task<OrderDto> CheckoutAsync(int userId, string paymentType);
    }

    public class CheckoutRepository : ICheckoutRepository
    {
        private readonly WebDbContext _context;
        private readonly SepayConfig _sepayConfig;
        private readonly IMemoryCache _cache;
        private const int CACHE_EXPIRATION_HOURS = 24; // Cache gencode trong 24 giờ

        public CheckoutRepository(WebDbContext context, IOptions<SepayConfig> sepayConfig, IMemoryCache cache)
        {
            _context = context;
            _sepayConfig = sepayConfig.Value;
            _cache = cache;
        }

        public async Task<OrderDto> CheckoutAsync(int userId, string paymentType)
        {
            // 1. Lấy tất cả cart items của user
            var cartItems = await _context.carts
                .Include(c => c.user)
                .Include(c => c.product)
                .Where(c => c.user_id == userId)
                .ToListAsync();

            if (!cartItems.Any())
            {
                throw new ArgumentException("Giỏ hàng trống, không thể checkout.");
            }

            // 2. Tính tổng tiền
            decimal totalAmount = cartItems.Sum(c => c.quantity * c.price_at_add);

            // 3. Kiểm tra tồn kho cho từng sản phẩm
            foreach (var cartItem in cartItems)
            {
                if (cartItem.product == null)
                {
                    throw new ArgumentException($"Sản phẩm với ID {cartItem.product_id} không tồn tại.");
                }

                if (cartItem.product.is_disabled == true)
                {
                    throw new ArgumentException($"Sản phẩm {cartItem.product.product_name} đã bị vô hiệu hóa.");
                }

                if (cartItem.product.stock < cartItem.quantity)
                {
                    throw new ArgumentException($"Sản phẩm {cartItem.product.product_name} không đủ số lượng. Chỉ còn {cartItem.product.stock} sản phẩm.");
                }
            }

            // 4. Tạo order (order_id tự động sinh)
            var newOrder = new order
            {
                user_id = userId,
                total_amount = totalAmount,
                status = "pending",
                types = paymentType,
                order_date = DateTime.UtcNow,
                created_at = DateTime.UtcNow,
                updated_at = DateTime.UtcNow,
                created_by = userId,
                updated_by = userId
            };

            _context.orders.Add(newOrder);
            await _context.SaveChangesAsync(); // Lưu để có order_id

            // 5. Tạo order_details từ cart items
            var orderDetails = cartItems.Select(cartItem => new order_detail
            {
                order_id = newOrder.order_id,
                product_id = cartItem.product_id,
                product_name = cartItem.product?.product_name ?? "",
                quantity = cartItem.quantity,
                price_at_purchase = cartItem.price_at_add,
                image_url = cartItem.product?.image_url,
                created_at = DateTime.UtcNow,
                updated_at = DateTime.UtcNow,
                created_by = userId,
                updated_by = userId
            }).ToList();

            _context.order_details.AddRange(orderDetails);
            await _context.SaveChangesAsync();

            // 6. Lưu ý: Không trừ stock và bán serial ở đây
            // - Với Transfer/ATM: Sẽ trừ stock và bán serial khi thanh toán thành công (trong HooksService)
            // - Với COD: Sẽ trừ stock và bán serial khi cập nhật trạng thái đơn hàng thành "paid"

            // 7. Xóa tất cả cart items
            _context.carts.RemoveRange(cartItems);
            await _context.SaveChangesAsync();

            // 9. Load lại order với đầy đủ thông tin để trả về
            var order = await _context.orders
                .Include(o => o.user)
                .Include(o => o.order_details)
                    .ThenInclude(od => od.product)
                .Where(o => o.order_id == newOrder.order_id)
                .FirstOrDefaultAsync();

            if (order == null)
            {
                throw new Exception("Lỗi khi tạo đơn hàng.");
            }

            // Tạo QR URL và gencode nếu payment type là Transfer hoặc ATM
            string? qrUrl = null;
            string? gencode = null;
            
            if ((order.types == "Transfer" || order.types == "ATM") && order.total_amount.HasValue && order.total_amount > 0)
            {
                // Tạo gencode unique: ORDER_{order_id}_{timestamp}_{guid}
                // Format này đảm bảo unique và dễ đối chiếu
                var timestamp = DateTime.UtcNow.ToString("yyyyMMddHHmmss");
                var uniqueId = Guid.NewGuid().ToString("N").Substring(0, 8).ToUpper();
                gencode = $"ORDER_{order.order_id}_{timestamp}_{uniqueId}";
                
                // Lưu thông tin đơn hàng vào cache với key là gencode
                var cacheInfo = new OrderCacheInfo
                {
                    OrderId = order.order_id,
                    UserId = order.user_id,
                    TotalAmount = order.total_amount ?? 0,
                    PaymentType = order.types ?? "",
                    Status = order.status ?? "pending",
                    CreatedAt = order.created_at ?? DateTime.UtcNow
                };
                
                var cacheKey = $"gencode_{gencode}";
                var cacheOptions = new MemoryCacheEntryOptions
                {
                    AbsoluteExpirationRelativeToNow = TimeSpan.FromHours(CACHE_EXPIRATION_HOURS),
                    SlidingExpiration = TimeSpan.FromHours(CACHE_EXPIRATION_HOURS)
                };
                
                _cache.Set(cacheKey, cacheInfo, cacheOptions);
                
                // Tạo QR URL với gencode (khóa cứng trong nội dung chuyển khoản)
                qrUrl = $"https://qr.sepay.vn/img?acc={_sepayConfig.AccountNumber}&bank={_sepayConfig.BankName}&amount={order.total_amount}&des={gencode}";
            }

            // Map sang OrderDto
            return new OrderDto
            {
                OrderId = order.order_id,
                UserId = order.user_id,
                Username = order.user?.username,
                OrderDate = order.order_date,
                Status = order.status,
                TotalAmount = order.total_amount,
                Types = order.types,
                TypesDisplay = order.types == "COD" ? "Thanh toán khi nhận hàng" :
                              order.types == "Transfer" ? "Chuyển khoản" :
                              order.types == "ATM" ? "Thẻ ATM" : order.types,
                QrUrl = qrUrl,
                Gencode = gencode,
                CreatedAt = order.created_at,
                UpdatedAt = order.updated_at,
                CreatedBy = order.created_by,
                UpdatedBy = order.updated_by,
                OrderDetails = order.order_details.Select(od => new OrderDetailDto
                {
                    OrderId = od.order_id,
                    ProductId = od.product_id,
                    ProductName = od.product_name,
                    Quantity = od.quantity,
                    PriceAtPurchase = od.price_at_purchase,
                    ImageUrl = od.image_url,
                    CreatedAt = od.created_at,
                    UpdatedAt = od.updated_at,
                    CreatedBy = od.created_by,
                    UpdatedBy = od.updated_by
                }).ToList()
            };
        }
    }
}

