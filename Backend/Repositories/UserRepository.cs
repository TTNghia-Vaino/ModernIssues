using ModernIssues.Models.DTOs;
using ModernIssues.Models.Entities;
using ModernIssues.Repositories.Service;
using Microsoft.EntityFrameworkCore;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;

namespace ModernIssues.Repositories
{
    public class UserRepository : IUserRepository
    {
        private readonly WebDbContext _context;

        public UserRepository(WebDbContext context)
        {
            _context = context;
        }

        // --- Kiểm tra tồn tại ---
        public async Task<bool> ExistsByUsernameOrEmailAsync(string username, string email)
        {
            return await _context.users
                .AnyAsync(u => u.username == username || u.email == email);
        }

        // --- Kiểm tra tồn tại username ---
        public async Task<bool> ExistsByUsernameAsync(string username)
        {
            return await _context.users
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
                is_disabled = false,
                email_confirmed = false,
                created_at = DateTime.UtcNow,
                updated_at = DateTime.UtcNow,
                created_by = 1, // System admin ID = 1
                updated_by = 1
            };

            _context.users.Add(newUser);
            await _context.SaveChangesAsync();

            // Update created_by to self after getting user_id
            if (newUser.created_by == 1)
            {
                newUser.created_by = newUser.user_id;
                newUser.updated_by = newUser.user_id;
                await _context.SaveChangesAsync();
            }

            return MapToUserDto(newUser);
        }

        // --- READ ONE (By Id) ---
        public async Task<UserDto> GetByIdAsync(int userId)
        {
            var user = await _context.users
                .Where(u => u.user_id == userId && (u.is_disabled == null || u.is_disabled == false))
                .FirstOrDefaultAsync();

            if (user == null)
                return null;

            return MapToUserDto(user);
        }

        // --- UPDATE Profile ---
        public async Task<UserDto> UpdateProfileAsync(int userId, UserUpdateProfileDto profile)
        {
            var user = await _context.users
                .Where(u => u.user_id == userId)
                .FirstOrDefaultAsync();

            if (user == null)
                return null;

            // Update only non-null fields
            if (!string.IsNullOrEmpty(profile.Username))
            {
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

            user.updated_at = DateTime.UtcNow;

            await _context.SaveChangesAsync();

            return MapToUserDto(user);
        }

        // --- DELETE (Vô hiệu hóa tài khoản) ---
        public async Task<bool> DeleteUserAsync(int userId, int adminId)
        {
            var user = await _context.users
                .Where(u => u.user_id == userId && u.role == "customer" && (u.is_disabled == null || u.is_disabled == false))
                .FirstOrDefaultAsync();

            if (user == null)
                return false;

            user.is_disabled = true;
            user.updated_by = adminId;
            user.updated_at = DateTime.UtcNow;

            await _context.SaveChangesAsync();
            return true;
        }

        // --- ACTIVATE (Kích hoạt lại tài khoản) ---
        public async Task<bool> ActivateUserAsync(int userId, int adminId)
        {
            var user = await _context.users
                .Where(u => u.user_id == userId && u.role == "customer" && u.is_disabled == true)
                .FirstOrDefaultAsync();

            if (user == null)
                return false;

            user.is_disabled = false;
            user.updated_by = adminId;
            user.updated_at = DateTime.UtcNow;

            await _context.SaveChangesAsync();
            return true;
        }

        // --- UPDATE AVATAR ONLY ---
        public async Task<UserDto> UpdateAvatarAsync(int userId, string avatarUrl)
        {
            var user = await _context.users
                .Where(u => u.user_id == userId)
                .FirstOrDefaultAsync();

            if (user == null)
                return null;

            user.avatar_url = avatarUrl;
            user.updated_at = DateTime.UtcNow;

            await _context.SaveChangesAsync();

            return MapToUserDto(user);
        }

        // --- GET ALL USERS (Admin only) ---
        public async Task<List<UserDto>> GetAllUsersAsync()
        {
            var users = await _context.users
                .Where(u => u.is_disabled == false)
                .OrderByDescending(u => u.created_at)
                .ToListAsync();

            return users.Select(MapToUserDto).ToList();
        }

        // Helper method to map user entity to UserDto
        private UserDto MapToUserDto(user u)
        {
            return new UserDto
            {
                UserId = u.user_id,
                Username = u.username,
                Email = u.email,
                Phone = u.phone ?? "",
                Address = u.address ?? "",
                AvatarUrl = u.avatar_url,
                Role = u.role ?? "customer",
                IsDisabled = u.is_disabled ?? false,
                EmailConfirmed = u.email_confirmed ?? false
            };
        }
    }
}
