using ModernIssues.Models.DTOs;
using ModernIssues.Models.Entities;
using ModernIssues.Repositories.Interface;
using ModernIssues.Helpers;
using Microsoft.EntityFrameworkCore;
using System;
using System.Linq;
using System.Threading.Tasks;

namespace ModernIssues.Repositories
{
    public class CheckoutRepository : ICheckoutRepository
    {
        private readonly WebDbContext _context;

        public CheckoutRepository(WebDbContext context)
        {
            _context = context;
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

            // 3. Kiểm tra tồn kho cho từng sản phẩm dựa trên serials còn hàng
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

                // Kiểm tra số lượng serial còn hàng (is_sold = false và is_disabled = false)
                var availableSerials = await _context.product_serials
                    .Where(ps => ps.product_id == cartItem.product_id 
                        && ps.is_sold == false 
                        && ps.is_disabled != true)
                    .CountAsync();

                if (availableSerials < cartItem.quantity)
                {
                    throw new ArgumentException($"Sản phẩm {cartItem.product.product_name} không đủ số lượng. Chỉ còn {availableSerials} sản phẩm.");
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
                updated_by = userId,
                // Tự động tạo gencode nếu là Transfer
                gencode = paymentType == "Transfer" ? PaymentCodeGenerator.GeneratePaymentCode() : null
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

            // 6. Đánh dấu serials đã bán và tạo warranty với serial_id
            var warranties = new List<warranty>();
            
            foreach (var cartItem in cartItems)
            {
                if (cartItem.product == null) continue;

                // Lấy các serials còn hàng cho sản phẩm này
                var availableSerials = await _context.product_serials
                    .Where(ps => ps.product_id == cartItem.product_id 
                        && ps.is_sold == false 
                        && ps.is_disabled != true)
                    .Take(cartItem.quantity)
                    .ToListAsync();

                if (availableSerials.Count < cartItem.quantity)
                {
                    throw new Exception($"Không đủ serial cho sản phẩm {cartItem.product.product_name}. Yêu cầu: {cartItem.quantity}, Có: {availableSerials.Count}");
                }

                // Đánh dấu các serials đã bán
                foreach (var serial in availableSerials)
                {
                    serial.is_sold = true;
                    serial.updated_at = DateTime.UtcNow;
                    serial.updated_by = userId;
                }

                // Tạo warranty cho từng serial (nếu có warranty_period)
                if (cartItem.product.warranty_period.HasValue && cartItem.product.warranty_period > 0)
                {
                    var warrantyPeriod = cartItem.product.warranty_period ?? 0;
                    var startDate = DateTime.UtcNow;
                    var endDate = startDate.AddMonths(warrantyPeriod);

                    foreach (var serial in availableSerials)
                    {
                        warranties.Add(new warranty
                        {
                            product_id = cartItem.product_id,
                            user_id = userId,
                            order_id = newOrder.order_id,
                            serial_id = serial.serial_id,
                            start_date = startDate,
                            end_date = endDate,
                            status = "active",
                            serial_number = serial.serial_number, // Giữ lại serial_number để tương thích
                            created_at = DateTime.UtcNow,
                            updated_at = DateTime.UtcNow,
                            created_by = userId,
                            updated_by = userId,
                            is_disabled = false
                        });
                    }
                }

                // Cập nhật stock dựa trên số serial còn hàng
                var remainingStock = await _context.product_serials
                    .Where(ps => ps.product_id == cartItem.product_id 
                        && ps.is_sold == false 
                        && ps.is_disabled != true)
                    .CountAsync();
                
                cartItem.product.stock = remainingStock;
                cartItem.product.updated_at = DateTime.UtcNow;
            }

            if (warranties.Any())
            {
                _context.warranties.AddRange(warranties);
            }

            await _context.SaveChangesAsync();

            // 8. Xóa tất cả cart items
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
                Gencode = order.gencode, // Trả về gencode
                TypesDisplay = order.types == "COD" ? "Thanh toán khi nhận hàng" :
                              order.types == "Transfer" ? "Chuyển khoản" :
                              order.types == "ATM" ? "Thẻ ATM" : order.types,
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

        public async Task<OrderDto> TestCheckoutAsync(int userId, int productId, int quantity, string paymentType)
        {
            // 1. Lấy thông tin sản phẩm
            var product = await _context.products
                .Where(p => p.product_id == productId && p.is_disabled != true)
                .FirstOrDefaultAsync();

            if (product == null)
            {
                throw new ArgumentException($"Sản phẩm với ID {productId} không tồn tại hoặc đã bị vô hiệu hóa.");
            }

            // 2. Kiểm tra số lượng serial còn hàng
            var availableSerials = await _context.product_serials
                .Where(ps => ps.product_id == productId 
                    && ps.is_sold == false 
                    && ps.is_disabled != true)
                .CountAsync();

            if (availableSerials < quantity)
            {
                throw new ArgumentException($"Sản phẩm {product.product_name} không đủ số lượng. Chỉ còn {availableSerials} sản phẩm.");
            }

            // 3. Tính tổng tiền
            decimal totalAmount = product.price * quantity;

            // 4. Tạo order với gencode tự động cho Transfer
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
                updated_by = userId,
                // Tự động tạo gencode nếu là Transfer
                gencode = paymentType == "Transfer" ? PaymentCodeGenerator.GeneratePaymentCode() : null
            };

            _context.orders.Add(newOrder);
            await _context.SaveChangesAsync(); // Lưu để có order_id

            // 5. Tạo order_detail
            var orderDetail = new order_detail
            {
                order_id = newOrder.order_id,
                product_id = productId,
                product_name = product.product_name,
                quantity = quantity,
                price_at_purchase = product.price,
                image_url = product.image_url,
                created_at = DateTime.UtcNow,
                updated_at = DateTime.UtcNow,
                created_by = userId,
                updated_by = userId
            };

            _context.order_details.Add(orderDetail);
            await _context.SaveChangesAsync();

            // 6. Đánh dấu serials đã bán và tạo warranty
            var warranties = new List<warranty>();
            
            // Lấy các serials còn hàng
            var availableSerialsList = await _context.product_serials
                .Where(ps => ps.product_id == productId 
                    && ps.is_sold == false 
                    && ps.is_disabled != true)
                .Take(quantity)
                .ToListAsync();

            if (availableSerialsList.Count < quantity)
            {
                throw new Exception($"Không đủ serial cho sản phẩm {product.product_name}. Yêu cầu: {quantity}, Có: {availableSerialsList.Count}");
            }

            // Đánh dấu các serials đã bán
            foreach (var serial in availableSerialsList)
            {
                serial.is_sold = true;
                serial.updated_at = DateTime.UtcNow;
                serial.updated_by = userId;
            }

            // Tạo warranty cho từng serial (nếu có warranty_period)
            if (product.warranty_period.HasValue && product.warranty_period > 0)
            {
                var warrantyPeriod = product.warranty_period ?? 0;
                var startDate = DateTime.UtcNow;
                var endDate = startDate.AddMonths(warrantyPeriod);

                foreach (var serial in availableSerialsList)
                {
                    warranties.Add(new warranty
                    {
                        product_id = productId,
                        user_id = userId,
                        order_id = newOrder.order_id,
                        serial_id = serial.serial_id,
                        start_date = startDate,
                        end_date = endDate,
                        status = "active",
                        serial_number = serial.serial_number,
                        created_at = DateTime.UtcNow,
                        updated_at = DateTime.UtcNow,
                        created_by = userId,
                        updated_by = userId,
                        is_disabled = false
                    });
                }
            }

            if (warranties.Any())
            {
                _context.warranties.AddRange(warranties);
            }

            // 7. Cập nhật stock dựa trên số serial còn hàng
            var remainingStock = await _context.product_serials
                .Where(ps => ps.product_id == productId 
                    && ps.is_sold == false 
                    && ps.is_disabled != true)
                .CountAsync();
            
            product.stock = remainingStock;
            product.updated_at = DateTime.UtcNow;

            await _context.SaveChangesAsync();

            // 8. Load lại order với đầy đủ thông tin để trả về
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
                Gencode = order.gencode, // Trả về gencode để test
                TypesDisplay = order.types == "COD" ? "Thanh toán khi nhận hàng" :
                              order.types == "Transfer" ? "Chuyển khoản" :
                              order.types == "ATM" ? "Thẻ ATM" : order.types,
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

