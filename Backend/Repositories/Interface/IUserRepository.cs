using ModernIssues.Models.DTOs;
using System.Threading.Tasks;
using System.Collections.Generic;

namespace ModernIssues.Repositories.Service
{
    public interface IUserRepository
    {
        Task<UserDto> RegisterAsync(UserRegisterDto user, string hashedPassword);
        Task<UserDto> GetByIdAsync(int userId);
        Task<UserDto> UpdateProfileAsync(int userId, UserUpdateProfileDto profile);
        Task<UserDto> UpdateAvatarAsync(int userId, string avatarUrl);
        Task<bool> ExistsByUsernameOrEmailAsync(string username, string email);
        Task<bool> ExistsByUsernameAsync(string username);
        Task<bool> DeleteUserAsync(int userId, int adminId); // Vô hiệu hóa (Disable)
        Task<bool> ActivateUserAsync(int userId, int adminId); // Kích hoạt lại (Activate)
        Task<List<UserDto>> GetAllUsersAsync();
    }
}