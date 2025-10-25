using ModernIssues.Models.DTOs;
using ModernIssues.Repositories;
using BCrypt.Net; // Cần thêm package
using System.Threading.Tasks;
using ModernIssues.Repositories.Service;
using ModernIssues.Repositories.Interface;
using System;
using System.Data;

namespace ModernIssues.Services
{
    public class UserService : IUserService
    {
        private readonly IUserRepository _userRepository;

        public UserService(IUserRepository userRepository)
        {
            _userRepository = userRepository;
        }

        // --- CREATE (Register) ---
        public async Task<UserDto> RegisterCustomerAsync(UserRegisterDto user)
        {
            // 1. Kiểm tra tồn tại
            if (await _userRepository.ExistsByUsernameOrEmailAsync(user.Username, user.Email))
            {
                throw new ArgumentException("Tên đăng nhập hoặc Email đã tồn tại trong hệ thống.");
            }

            // 2. Hashing Mật khẩu
            string hashedPassword = BCrypt.Net.BCrypt.HashPassword(user.Password); 
            
            // 3. Gọi Repository
            return await _userRepository.RegisterAsync(user, hashedPassword);
        }

        // --- READ ONE (Profile) ---
        public async Task<UserDto> GetCustomerProfileAsync(int userId)
        {
            var user = await _userRepository.GetByIdAsync(userId);
            if (user == null || user.Role != "customer")
            {
                throw new KeyNotFoundException("Không tìm thấy thông tin khách hàng.");
            }
            return user;
        }

        // --- UPDATE Profile ---
        public async Task<UserDto> UpdateCustomerProfileAsync(int userId, UserUpdateProfileDto profile)
        {
            // Logic nghiệp vụ: Cần kiểm tra quyền (đã đăng nhập) và có thể kiểm tra email mới có trùng lặp không
            
            return await _userRepository.UpdateProfileAsync(userId, profile);
        }

        // --- GET ALL USERS (Admin only) ---
        public async Task<List<UserDto>> GetAllUsersAsync()
        {
            return await _userRepository.GetAllUsersAsync();
        }

        // --- DELETE USER (Admin only) ---
        public async Task<bool> DeleteUserAsync(int userId)
        {
            return await _userRepository.DeleteUserAsync(userId, 1); // Giả lập adminId = 1
        }
    }
}