using Dapper;
using Npgsql;
using ModernIssues.Models.DTOs;
using ModernIssues.Repositories.Service;
using ModernIssues.Repositories.Interface;
using System;
using System.Data;
using Microsoft.Extensions.Configuration;
using System.Collections.Generic;


namespace ModernIssues.Repositories
{
    public class UserRepository : IUserRepository
    {
        private readonly string _connectionString;

        public UserRepository(IConfiguration configuration)
        {
            _connectionString = configuration.GetConnectionString("DefaultConnection") 
                                ?? throw new InvalidOperationException("Connection string 'DefaultConnection' not found.");
        }

        private IDbConnection Connection => new NpgsqlConnection(_connectionString);

        // --- Kiểm tra tồn tại ---
        public async Task<bool> ExistsByUsernameOrEmailAsync(string username, string email)
        {
            var sql = "SELECT COUNT(*) FROM users WHERE username = @Username OR email = @Email;";
            using (var db = Connection)
            {
                int count = await db.ExecuteScalarAsync<int>(sql, new { Username = username, Email = email });
                return count > 0;
            }
        }

        // --- Kiểm tra tồn tại username ---
        public async Task<bool> ExistsByUsernameAsync(string username)
        {
            var sql = "SELECT COUNT(*) FROM users WHERE username = @Username;";
            using (var db = Connection)
            {
                int count = await db.ExecuteScalarAsync<int>(sql, new { Username = username });
                return count > 0;
            }
        }
        
        // --- CREATE (Register) ---
        public async Task<UserDto> RegisterAsync(UserRegisterDto user, string hashedPassword)
        {
            var sql = @"
                INSERT INTO users (
                    username, password, email, phone, address, avatar_url, role, created_by, updated_by
                ) VALUES (
                    @Username, @HashedPassword, @Email, @Phone, @Address, @AvatarUrl, 'customer', @SystemAdminId, @SystemAdminId
                ) RETURNING user_id AS UserId, username, email, phone, address, avatar_url AS AvatarUrl, role, is_disabled AS IsDisabled, email_confirmed AS EmailConfirmed, created_at;
            ";
            
            // NOTE: Giả sử SystemAdminId = 1, đây là tài khoản đầu tiên hoặc system user
            var parameters = new
            {
                user.Username, HashedPassword = hashedPassword, user.Email, user.Phone, 
                user.Address, AvatarUrl = user.AvatarUrl ?? "default-avatar.jpg", SystemAdminId = 1 
            };

            using (var db = Connection)
            {
                return await db.QueryFirstOrDefaultAsync<UserDto>(sql, parameters) ?? new UserDto();
            }
        }

        // --- READ ONE (By Id) ---
        public async Task<UserDto> GetByIdAsync(int userId)
        {
            var sql = @"
                SELECT user_id AS UserId, username, email, phone, address, avatar_url AS AvatarUrl, role, is_disabled AS IsDisabled, 
                       email_confirmed AS EmailConfirmed, created_at AS CreatedAt
                FROM users 
                WHERE user_id = @UserId AND (is_disabled IS NULL OR is_disabled = FALSE);
            ";
            // NOTE: Sử dụng is_disabled thay vì is_deleted vì entity không có trường is_deleted
            using (var db = Connection)
            {
                return await db.QueryFirstOrDefaultAsync<UserDto>(sql, new { UserId = userId }) ?? new UserDto();
            }
        }

        // --- UPDATE Profile ---
        public async Task<UserDto> UpdateProfileAsync(int userId, UserUpdateProfileDto profile)
        {
            // Xây dựng SQL động để chỉ cập nhật các trường không null
            var updateFields = new List<string>();
            var parameters = new Dictionary<string, object> { { "UserId", userId } };

            if (!string.IsNullOrEmpty(profile.Username))
            {
                updateFields.Add("username = @Username");
                parameters["Username"] = profile.Username;
            }

            if (!string.IsNullOrEmpty(profile.Phone))
            {
                updateFields.Add("phone = @Phone");
                parameters["Phone"] = profile.Phone;
            }

            if (!string.IsNullOrEmpty(profile.Address))
            {
                updateFields.Add("address = @Address");
                parameters["Address"] = profile.Address;
            }

            if (!string.IsNullOrEmpty(profile.Email))
            {
                updateFields.Add("email = @Email");
                parameters["Email"] = profile.Email;
            }

            if (!string.IsNullOrEmpty(profile.AvatarUrl))
            {
                updateFields.Add("avatar_url = @AvatarUrl");
                parameters["AvatarUrl"] = profile.AvatarUrl;
            }

            // Luôn cập nhật updated_at
            updateFields.Add("updated_at = CURRENT_TIMESTAMP");

            if (updateFields.Count <= 1) // Chỉ có updated_at
            {
                throw new ArgumentException("Không có trường nào để cập nhật.");
            }

            var sql = $@"
                UPDATE users
                SET {string.Join(", ", updateFields)}
                WHERE user_id = @UserId
                RETURNING user_id AS UserId, username, email, phone, address, avatar_url AS AvatarUrl, role, is_disabled AS IsDisabled, 
                          email_confirmed AS EmailConfirmed, created_at AS CreatedAt;
            ";

            using (var db = Connection)
            {
                return await db.QueryFirstOrDefaultAsync<UserDto>(sql, parameters) ?? new UserDto();
            }
        }

        // --- Get By Username (Ví dụ cho Login) ---
        public async Task<UserDto> GetByUsernameAsync(string username)
        {
            var sql = @"
                SELECT user_id AS UserId, username, password, email, role, is_disabled AS IsDisabled
                FROM users 
                WHERE username = @Username AND (is_disabled IS NULL OR is_disabled = FALSE);
            ";
            using (var db = Connection)
            {
                // NOTE: Cần tạo một DTO khác nếu bạn muốn lấy cả mật khẩu (cho Login)
                return await db.QueryFirstOrDefaultAsync<UserDto>(sql, new { Username = username }) ?? new UserDto();
            }
        }
        
        // File: Repositories/UserRepository.cs (Thêm vào cuối lớp)

        // --- DELETE (Vô hiệu hóa tài khoản) ---
        public async Task<bool> DeleteUserAsync(int userId, int adminId)
        {
            // Cập nhật is_disabled thành TRUE và ghi lại người thực hiện/thời gian
            var sql = @"
                UPDATE users
                SET
                    is_disabled = TRUE,
                    updated_by = @AdminId,
                    updated_at = CURRENT_TIMESTAMP
                WHERE user_id = @UserId AND role = 'customer' AND is_disabled = FALSE;
            ";
            
            var parameters = new { AdminId = adminId, UserId = userId };

            using (var db = Connection)
            {
                // Execute trả về số dòng bị ảnh hưởng
                var rowsAffected = await db.ExecuteAsync(sql, parameters);
                // Trả về true nếu có ít nhất 1 khách hàng bị vô hiệu hóa
                return rowsAffected > 0;
            }
        }

        // --- ACTIVATE (Kích hoạt lại tài khoản) ---
        public async Task<bool> ActivateUserAsync(int userId, int adminId)
        {
            // Cập nhật is_disabled thành FALSE và ghi lại người thực hiện/thời gian
            var sql = @"
                UPDATE users
                SET
                    is_disabled = FALSE,
                    updated_by = @AdminId,
                    updated_at = CURRENT_TIMESTAMP
                WHERE user_id = @UserId AND role = 'customer' AND is_disabled = TRUE;
            ";
            
            var parameters = new { AdminId = adminId, UserId = userId };

            using (var db = Connection)
            {
                // Execute trả về số dòng bị ảnh hưởng
                var rowsAffected = await db.ExecuteAsync(sql, parameters);
                // Trả về true nếu có ít nhất 1 khách hàng được kích hoạt
                return rowsAffected > 0;
            }
        }

        // --- UPDATE AVATAR ONLY ---
        public async Task<UserDto> UpdateAvatarAsync(int userId, string avatarUrl)
        {
            var sql = @"
                UPDATE users
                SET
                    avatar_url = @AvatarUrl,
                    updated_at = CURRENT_TIMESTAMP
                WHERE user_id = @UserId
                RETURNING user_id AS UserId, username, email, phone, address, avatar_url AS AvatarUrl, role, is_disabled AS IsDisabled, 
                          email_confirmed AS EmailConfirmed, created_at AS CreatedAt;
            ";
            
            var parameters = new
            {
                AvatarUrl = avatarUrl, UserId = userId
            };

            using (var db = Connection)
            {
                return await db.QueryFirstOrDefaultAsync<UserDto>(sql, parameters) ?? new UserDto();
            }
        }

        // --- GET ALL USERS (Admin only) ---
        public async Task<List<UserDto>> GetAllUsersAsync()
        {
            var sql = @"
                SELECT 
                    user_id AS UserId,
                    username,
                    email,
                    phone,
                    address,
                    avatar_url AS AvatarUrl,
                    role,
                    is_disabled AS IsDisabled,
                    email_confirmed AS EmailConfirmed,
                    created_at AS CreatedAt
                FROM users 
                WHERE is_disabled = FALSE
                ORDER BY created_at DESC;
            ";

            using (var db = Connection)
            {
                var users = await db.QueryAsync<UserDto>(sql);
                return users.ToList();
            }
        }
    }
}