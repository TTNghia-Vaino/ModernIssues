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
                // Chỉ áp dụng schema cụ thể cho ProductController
                if (context.MethodInfo.DeclaringType?.Name == "ProductController")
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
                // Cho UserController, sử dụng schema động dựa trên DTO
                else if (context.MethodInfo.DeclaringType?.Name == "UserController")
                {
                    var userSchema = CreateUserSchema(context);
                    if (userSchema != null)
                    {
                        operation.RequestBody = new OpenApiRequestBody
                        {
                            Content = {
                                ["multipart/form-data"] = new OpenApiMediaType
                                {
                                    Schema = userSchema
                                }
                            }
                        };
                    }
                }
            }
        }

        private bool HasFormFileProperty(Type type)
        {
            return type.GetProperties()
                .Any(p => p.PropertyType == typeof(IFormFile) || 
                         (p.PropertyType.IsGenericType && p.PropertyType.GetGenericTypeDefinition() == typeof(Nullable<>) && 
                          p.PropertyType.GetGenericArguments()[0] == typeof(IFormFile)));
        }

        private OpenApiSchema CreateUserSchema(OperationFilterContext context)
        {
            var methodName = context.MethodInfo.Name;
            
            // Schema cho Register
            if (methodName == "Register")
            {
                return new OpenApiSchema
                {
                    Type = "object",
                    Properties = {
                        ["username"] = new OpenApiSchema { Type = "string" },
                        ["password"] = new OpenApiSchema { Type = "string" },
                        ["email"] = new OpenApiSchema { Type = "string" },
                        ["phone"] = new OpenApiSchema { Type = "string" },
                        ["address"] = new OpenApiSchema { Type = "string" },
                        ["avatarFile"] = new OpenApiSchema { Type = "string", Format = "binary" }
                    }
                };
            }
            
            // Schema cho UpdateProfile
            if (methodName == "UpdateProfile")
            {
                return new OpenApiSchema
                {
                    Type = "object",
                    Properties = {
                        ["phone"] = new OpenApiSchema { Type = "string" },
                        ["address"] = new OpenApiSchema { Type = "string" },
                        ["email"] = new OpenApiSchema { Type = "string" },
                        ["avatarFile"] = new OpenApiSchema { Type = "string", Format = "binary" }
                    }
                };
            }
            
            // Schema cho UploadAvatar
            if (methodName == "UploadAvatar")
            {
                return new OpenApiSchema
                {
                    Type = "object",
                    Properties = {
                        ["avatarFile"] = new OpenApiSchema { Type = "string", Format = "binary" },
                        ["currentAvatarUrl"] = new OpenApiSchema { Type = "string" }
                    }
                };
            }
            
            return null!;
        }
    }
}
