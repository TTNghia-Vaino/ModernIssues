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
        Task<UserDto> UpdateCustomerAvatarAsync(int userId, string avatarUrl);
        Task<List<UserDto>> GetAllUsersAsync();
        Task<bool> DeleteUserAsync(int userId, int adminId);
        Task<bool> ActivateUserAsync(int userId, int adminId);
        Task<UserDto> GetUserByIdAsync(int userId);
        Task<UserDto> UpdateUserAvatarAsync(int userId, string avatarUrl);
        // Có thể thêm Validate Password, Login, v.v.
    }
}