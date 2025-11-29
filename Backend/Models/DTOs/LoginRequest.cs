using System.Text.Json.Serialization;

namespace ModernIssues.Models.DTOs
{
    public class LoginRequest
    {
        [JsonPropertyName("usernameOrEmail")]
        public string UsernameOrEmail { get; set; } = null!;
        
        [JsonPropertyName("password")]
        public string Password { get; set; } = null!;
    }
}
