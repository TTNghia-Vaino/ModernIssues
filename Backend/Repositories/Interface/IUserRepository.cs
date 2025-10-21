using ModernIssues.Models.DTOs;
using System.Threading.Tasks;

namespace ModernIssues.Repositories.Service
{
    public interface IUserRepository
    {
        Task<UserDto> RegisterAsync(UserRegisterDto user, string hashedPassword);
        Task<UserDto> GetByIdAsync(int userId);
        Task<UserDto> UpdateProfileAsync(int userId, UserUpdateProfileDto profile);
        Task<bool> ExistsByUsernameOrEmailAsync(string username, string email);
        Task<bool> DeleteUserAsync(int userId, int adminId); // Vô hiệu hóa (Disable)
    }
}