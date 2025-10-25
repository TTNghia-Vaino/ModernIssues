using Microsoft.OpenApi.Models;
using Swashbuckle.AspNetCore.SwaggerGen;
using System.Linq;
using System.Reflection;

namespace ModernIssues.Helpers
{
    public class FileUploadOperation : IOperationFilter
    {
        public void Apply(OpenApiOperation operation, OperationFilterContext context)
        {
            // Kiểm tra xem có IFormFile trong parameters hoặc trong DTO không
            var hasFormFile = context.MethodInfo.GetParameters()
                .Any(p => p.ParameterType == typeof(IFormFile) || 
                         HasFormFileProperty(p.ParameterType));

            if (hasFormFile)
            {
                operation.RequestBody = new OpenApiRequestBody
                {
                    Content = {
                        ["multipart/form-data"] = new OpenApiMediaType
                        {
                            Schema = new OpenApiSchema
                            {
                                Type = "object",
                                Properties = {
                                    ["productName"] = new OpenApiSchema { Type = "string" },
                                    ["description"] = new OpenApiSchema { Type = "string" },
                                    ["price"] = new OpenApiSchema { Type = "number", Format = "decimal" },
                                    ["categoryId"] = new OpenApiSchema { Type = "integer" },
                                    ["stock"] = new OpenApiSchema { Type = "integer" },
                                    ["warrantyPeriod"] = new OpenApiSchema { Type = "integer" },
                                    ["imageFile"] = new OpenApiSchema { Type = "string", Format = "binary" },
                                    ["currentImageUrl"] = new OpenApiSchema { Type = "string" }
                                }
                            }
                        }
                    }
                };
            }
        }

        private bool HasFormFileProperty(Type type)
        {
            return type.GetProperties()
                .Any(p => p.PropertyType == typeof(IFormFile) || 
                         (p.PropertyType.IsGenericType && p.PropertyType.GetGenericTypeDefinition() == typeof(Nullable<>) && 
                          p.PropertyType.GetGenericArguments()[0] == typeof(IFormFile)));
        }
    }
}
