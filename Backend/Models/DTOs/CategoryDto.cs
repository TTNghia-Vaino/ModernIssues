using System.ComponentModel.DataAnnotations;
using System.Text.Json;
using System.Text.Json.Serialization;

namespace ModernIssues.Models.DTOs
{
    /// <summary>
    /// DTO cho thông tin danh mục
    /// </summary>
    public class CategoryDto
    {
        public int CategoryId { get; set; } = 0;
        public string CategoryName { get; set; } = string.Empty;
        public int? ParentId { get; set; }
        public string? ParentName { get; set; }
        public DateTime? CreatedAt { get; set; }
        public DateTime? UpdatedAt { get; set; }
        public int? CreatedBy { get; set; }
        public int? UpdatedBy { get; set; }
        public bool? IsDisabled { get; set; }
    }

    /// <summary>
    /// DTO cho cây danh mục phân cấp
    /// </summary>
    public class CategoryTreeDto
    {
        public int CategoryId { get; set; } = 0;
        public string CategoryName { get; set; } = string.Empty;
        public int? ParentId { get; set; }
        public bool? IsDisabled { get; set; }
        public List<CategoryTreeDto> Children { get; set; } = new List<CategoryTreeDto>();
    }

    /// <summary>
    /// DTO cho tạo danh mục mới
    /// </summary>
    public class CategoryCreateDto
    {
        public int? CategoryId { get; set; } = null;

        [Required(ErrorMessage = "Tên danh mục là bắt buộc")]
        [StringLength(100, ErrorMessage = "Tên danh mục không được vượt quá 100 ký tự")]
        public string CategoryName { get; set; } = string.Empty;

        [JsonConverter(typeof(NullableIntConverter))]
        public int? ParentId { get; set; }
    }

    /// <summary>
    /// Custom converter để xử lý string "null" thành null
    /// </summary>
    public class NullableIntConverter : JsonConverter<int?>
    {
        public override int? Read(ref Utf8JsonReader reader, Type typeToConvert, JsonSerializerOptions options)
        {
            if (reader.TokenType == JsonTokenType.Null)
            {
                return null;
            }
            
            if (reader.TokenType == JsonTokenType.String)
            {
                var stringValue = reader.GetString();
                if (string.IsNullOrEmpty(stringValue) || stringValue.ToLower() == "null")
                {
                    return null;
                }
                
                if (int.TryParse(stringValue, out int result))
                {
                    return result;
                }
                
                return null;
            }
            
            if (reader.TokenType == JsonTokenType.Number)
            {
                return reader.GetInt32();
            }
            
            return null;
        }

        public override void Write(Utf8JsonWriter writer, int? value, JsonSerializerOptions options)
        {
            if (value.HasValue)
            {
                writer.WriteNumberValue(value.Value);
            }
            else
            {
                writer.WriteNullValue();
            }
        }
    }

    /// <summary>
    /// DTO cho cập nhật danh mục
    /// </summary>
    public class CategoryUpdateDto
    {
        [StringLength(100, ErrorMessage = "Tên danh mục không được vượt quá 100 ký tự")]
        public string? CategoryName { get; set; }

        [JsonConverter(typeof(NullableIntConverter))]
        public int? ParentId { get; set; }

        public bool? IsDisabled { get; set; }
    }
}
