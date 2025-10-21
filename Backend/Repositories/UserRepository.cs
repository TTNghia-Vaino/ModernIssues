using Dapper;
using Npgsql;
using ModernIssues.Models.DTOs;
using ModernIssues.Repositories.Service;
using ModernIssues.Repositories.Interface;
using System;
using System.Data;
using Microsoft.Extensions.Configuration;


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
        
        // --- CREATE (Register) ---
        public async Task<UserDto> RegisterAsync(UserRegisterDto user, string hashedPassword)
        {
            var sql = @"
                INSERT INTO users (
                    username, password, email, phone, address, role, created_by, updated_by
                ) VALUES (
                    @Username, @HashedPassword, @Email, @Phone, @Address, 'customer', @SystemAdminId, @SystemAdminId
                ) RETURNING user_id, username, email, phone, address, role, is_disabled, email_confirmed, created_at;
            ";
            
            // NOTE: Giả sử SystemAdminId = 1, đây là tài khoản đầu tiên hoặc system user
            var parameters = new
            {
                user.Username, HashedPassword = hashedPassword, user.Email, user.Phone, 
                user.Address, SystemAdminId = 1 
            };

            using (var db = Connection)
            {
                return await db.QueryFirstOrDefaultAsync<UserDto>(sql, parameters);
            }
        }

        // --- READ ONE (By Id) ---
        public async Task<UserDto> GetByIdAsync(int userId)
        {
            var sql = @"
                SELECT user_id AS UserId, username, email, phone, address, role, is_disabled AS IsDisabled, 
                       email_confirmed AS EmailConfirmed, created_at AS CreatedAt
                FROM users 
                WHERE user_id = @UserId AND is_deleted = FALSE;
            ";
            // NOTE: Bạn có cột is_deleted trong schema ban đầu, tôi dùng nó ở đây.
            using (var db = Connection)
            {
                return await db.QueryFirstOrDefaultAsync<UserDto>(sql, new { UserId = userId });
            }
        }

        // --- UPDATE Profile ---
        public async Task<UserDto> UpdateProfileAsync(int userId, UserUpdateProfileDto profile)
        {
            var sql = @"
                UPDATE users
                SET
                    phone = @Phone,
                    address = @Address,
                    email = @Email,
                    updated_at = CURRENT_TIMESTAMP
                WHERE user_id = @UserId
                RETURNING user_id AS UserId, username, email, phone, address, role, is_disabled AS IsDisabled, 
                          email_confirmed AS EmailConfirmed, created_at AS CreatedAt;
            ";
            
            var parameters = new
            {
                profile.Phone, profile.Address, profile.Email, UserId = userId
            };

            using (var db = Connection)
            {
                return await db.QueryFirstOrDefaultAsync<UserDto>(sql, parameters);
            }
        }

        // --- Get By Username (Ví dụ cho Login) ---
        public async Task<UserDto> GetByUsernameAsync(string username)
        {
            var sql = @"
                SELECT user_id AS UserId, username, password, email, role, is_disabled AS IsDisabled
                FROM users 
                WHERE username = @Username AND is_deleted = FALSE;
            ";
            using (var db = Connection)
            {
                // NOTE: Cần tạo một DTO khác nếu bạn muốn lấy cả mật khẩu (cho Login)
                return await db.QueryFirstOrDefaultAsync<UserDto>(sql, new { Username = username });
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
    }
}