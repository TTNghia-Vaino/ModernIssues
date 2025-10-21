using ModernIssues.Models.DTOs;
using System.Threading.Tasks;

namespace ModernIssues.Repositories.Service
{
    public interface IUserService
    {
        Task<UserDto> RegisterCustomerAsync(UserRegisterDto user);
        Task<UserDto> GetCustomerProfileAsync(int userId);
        Task<UserDto> UpdateCustomerProfileAsync(int userId, UserUpdateProfileDto profile);
        // Có thể thêm Validate Password, Login, v.v.
    }
}