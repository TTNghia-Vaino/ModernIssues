using ModernIssues.Models.DTOs;
using System.Threading.Tasks;
using System.Collections.Generic;

namespace ModernIssues.Repositories.Service
{
    public interface IUserService
    {
        Task<UserDto> RegisterCustomerAsync(UserRegisterDto user);
        Task<UserDto> GetCustomerProfileAsync(int userId);
        Task<UserDto> UpdateCustomerProfileAsync(int userId, UserUpdateProfileDto profile);
        Task<List<UserDto>> GetAllUsersAsync();
        Task<bool> DeleteUserAsync(int userId);
        // Có thể thêm Validate Password, Login, v.v.
    }
}