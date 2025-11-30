using ModernIssues.Models.DTOs;
using ModernIssues.Repositories.Service;
using ModernIssues.Repositories.Interface;
using System;
using System.Collections.Generic;
using System.Threading.Tasks;
using System.Linq;
using ModernIssues.Models.Entities;
using Microsoft.EntityFrameworkCore;
using BCrypt.Net;

namespace ModernIssues.Repositories
{
    public class UserRepository : IUserRepository
    {
        private readonly WebDbContext _dbContext;

        public UserRepository(WebDbContext dbContext)
        {
            _dbContext = dbContext;
        }

        // --- Kiểm tra tồn tại ---
        public async Task<bool> ExistsByUsernameOrEmailAsync(string username, string email)
        {
            return await _dbContext.users
                .AnyAsync(u => u.username == username || u.email == email);
        }

        // --- Kiểm tra tồn tại username ---
        public async Task<bool> ExistsByUsernameAsync(string username)
        {
            return await _dbContext.users
                .AnyAsync(u => u.username == username);
        }
        
        // --- CREATE (Register) ---
        public async Task<UserDto> RegisterAsync(UserRegisterDto user, string hashedPassword)
        {
            var newUser = new user
            {
                username = user.Username,
                password = hashedPassword,
                email = user.Email,
                phone = user.Phone,
                address = user.Address,
                avatar_url = user.AvatarUrl ?? "default-avatar.jpg",
                role = "customer",
                created_by = 1, // SystemAdminId = 1
                updated_by = 1,
                created_at = DateTime.UtcNow,
                updated_at = DateTime.UtcNow,
                is_disabled = false,
                email_confirmed = false,
                two_factor_enabled = false
            };

            _dbContext.users.Add(newUser);
            await _dbContext.SaveChangesAsync();

            return new UserDto
            {
                UserId = newUser.user_id,
                Username = newUser.username,
                Email = newUser.email,
                Phone = newUser.phone ?? string.Empty,
                Address = newUser.address ?? string.Empty,
                AvatarUrl = newUser.avatar_url,
                Role = newUser.role ?? string.Empty,
                IsDisabled = newUser.is_disabled ?? false,
                EmailConfirmed = newUser.email_confirmed ?? false,
                TwoFactorEnabled = newUser.two_factor_enabled
            };
        }

        // --- READ ONE (By Id) ---
        public async Task<UserDto> GetByIdAsync(int userId)
        {
            var user = await _dbContext.users
                .FirstOrDefaultAsync(u => u.user_id == userId && (u.is_disabled == null || u.is_disabled == false));

            if (user == null)
            {
                return new UserDto();
            }

            return new UserDto
            {
                UserId = user.user_id,
                Username = user.username,
                Email = user.email,
                Phone = user.phone ?? string.Empty,
                Address = user.address ?? string.Empty,
                AvatarUrl = user.avatar_url,
                Role = user.role ?? string.Empty,
                IsDisabled = user.is_disabled ?? false,
                EmailConfirmed = user.email_confirmed ?? false,
                TwoFactorEnabled = user.two_factor_enabled
            };
        }

        // --- UPDATE Profile ---
        public async Task<UserDto> UpdateProfileAsync(int userId, UserUpdateProfileDto profile)
        {
            var user = await _dbContext.users
                .FirstOrDefaultAsync(u => u.user_id == userId);

            if (user == null)
            {
                throw new KeyNotFoundException("Không tìm thấy người dùng.");
            }

            // Cập nhật các trường không null
            if (!string.IsNullOrEmpty(profile.Username))
            {
                // Kiểm tra username có trùng với user khác không
                var exists = await _dbContext.users
                    .AnyAsync(u => u.username == profile.Username && u.user_id != userId);
                
                if (exists)
                {
                    throw new ArgumentException("Tên đăng nhập đã tồn tại trong hệ thống.");
                }
                
                user.username = profile.Username;
            }

            if (!string.IsNullOrEmpty(profile.Phone))
            {
                user.phone = profile.Phone;
            }

            if (!string.IsNullOrEmpty(profile.Address))
            {
                user.address = profile.Address;
            }

            if (!string.IsNullOrEmpty(profile.Email))
            {
                user.email = profile.Email;
            }

            if (!string.IsNullOrEmpty(profile.AvatarUrl))
            {
                user.avatar_url = profile.AvatarUrl;
            }

            // Luôn cập nhật updated_at
            user.updated_at = DateTime.UtcNow;

            await _dbContext.SaveChangesAsync();

            return new UserDto
            {
                UserId = user.user_id,
                Username = user.username,
                Email = user.email,
                Phone = user.phone ?? string.Empty,
                Address = user.address ?? string.Empty,
                AvatarUrl = user.avatar_url,
                Role = user.role ?? string.Empty,
                IsDisabled = user.is_disabled ?? false,
                EmailConfirmed = user.email_confirmed ?? false,
                TwoFactorEnabled = user.two_factor_enabled
            };
        }

        // --- Get By Username (Ví dụ cho Login) ---
        public async Task<UserDto> GetByUsernameAsync(string username)
        {
            var user = await _dbContext.users
                .FirstOrDefaultAsync(u => u.username == username && (u.is_disabled == null || u.is_disabled == false));

            if (user == null)
            {
                return new UserDto();
            }

            return new UserDto
            {
                UserId = user.user_id,
                Username = user.username,
                Email = user.email,
                Phone = user.phone ?? string.Empty,
                Address = user.address ?? string.Empty,
                AvatarUrl = user.avatar_url,
                Role = user.role ?? string.Empty,
                IsDisabled = user.is_disabled ?? false,
                EmailConfirmed = user.email_confirmed ?? false,
                TwoFactorEnabled = user.two_factor_enabled
            };
        }

        // --- DELETE (Vô hiệu hóa tài khoản) ---
        public async Task<bool> DeleteUserAsync(int userId, int adminId)
        {
            var user = await _dbContext.users
                .FirstOrDefaultAsync(u => u.user_id == userId && u.role == "customer" && u.is_disabled == false);

            if (user == null)
            {
                return false;
            }

            user.is_disabled = true;
            user.updated_by = adminId;
            user.updated_at = DateTime.UtcNow;

            var rowsAffected = await _dbContext.SaveChangesAsync();
            return rowsAffected > 0;
        }

        // --- ACTIVATE (Kích hoạt lại tài khoản) ---
        public async Task<bool> ActivateUserAsync(int userId, int adminId)
        {
            var user = await _dbContext.users
                .FirstOrDefaultAsync(u => u.user_id == userId && u.role == "customer" && u.is_disabled == true);

            if (user == null)
            {
                return false;
            }

            user.is_disabled = false;
            user.updated_by = adminId;
            user.updated_at = DateTime.UtcNow;

            var rowsAffected = await _dbContext.SaveChangesAsync();
            return rowsAffected > 0;
        }

        // --- UPDATE AVATAR ONLY ---
        public async Task<UserDto> UpdateAvatarAsync(int userId, string avatarUrl)
        {
            var user = await _dbContext.users
                .FirstOrDefaultAsync(u => u.user_id == userId);

            if (user == null)
            {
                return new UserDto();
            }

            user.avatar_url = avatarUrl;
            user.updated_at = DateTime.UtcNow;

            await _dbContext.SaveChangesAsync();

            return new UserDto
            {
                UserId = user.user_id,
                Username = user.username,
                Email = user.email,
                Phone = user.phone ?? string.Empty,
                Address = user.address ?? string.Empty,
                AvatarUrl = user.avatar_url,
                Role = user.role ?? string.Empty,
                IsDisabled = user.is_disabled ?? false,
                EmailConfirmed = user.email_confirmed ?? false,
                TwoFactorEnabled = user.two_factor_enabled
            };
        }

        // --- GET ALL USERS (Admin only) ---
        public async Task<List<UserDto>> GetAllUsersAsync()
        {
            var users = await _dbContext.users
                .Where(u => u.is_disabled == false)
                .OrderByDescending(u => u.created_at)
                .Select(u => new UserDto
                {
                    UserId = u.user_id,
                    Username = u.username,
                    Email = u.email,
                    Phone = u.phone ?? string.Empty,
                    Address = u.address ?? string.Empty,
                    AvatarUrl = u.avatar_url,
                    Role = u.role ?? string.Empty,
                    IsDisabled = u.is_disabled ?? false,
                    EmailConfirmed = u.email_confirmed ?? false,
                    TwoFactorEnabled = u.two_factor_enabled
                })
                .ToListAsync();

            return users;
        }
    }
}
