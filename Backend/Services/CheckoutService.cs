using ModernIssues.Models.DTOs;
using ModernIssues.Repositories;
using System;
using System.Threading.Tasks;

namespace ModernIssues.Services
{
    public interface ICheckoutService
    {
        Task<OrderDto> CheckoutAsync(int userId, string paymentType);
    }

    public class CheckoutService : ICheckoutService
    {
        private readonly ICheckoutRepository _checkoutRepository;

        public CheckoutService(ICheckoutRepository checkoutRepository)
        {
            _checkoutRepository = checkoutRepository;
        }

        public async Task<OrderDto> CheckoutAsync(int userId, string paymentType)
        {
            if (userId <= 0)
                throw new ArgumentException("User ID phải lớn hơn 0.");

            if (string.IsNullOrWhiteSpace(paymentType))
                throw new ArgumentException("Loại thanh toán không được để trống.");

            // Validate payment type
            var validPaymentTypes = new[] { "COD", "Transfer", "ATM" };
            if (!validPaymentTypes.Contains(paymentType))
            {
                throw new ArgumentException($"Loại thanh toán không hợp lệ. Chỉ chấp nhận: {string.Join(", ", validPaymentTypes)}");
            }

            return await _checkoutRepository.CheckoutAsync(userId, paymentType);
        }
    }
}

